import type {
    StockfishAnalysisOptions,
} from "./types";

type MessageListener = (
    message: string,
) => void;

type ErrorListener = (
    error: Error,
) => void;

const WORKER_URL =
    "/stockfish/stockfish-18-lite-single.js";

export default class StockfishService {
    private worker: Worker | null = null;

    private messageListeners =
        new Set<MessageListener>();

    private errorListeners =
        new Set<ErrorListener>();

    private initializationPromise:
        Promise<void> | null = null;

    private initialized = false;
    private searching = false;
    private destroyed = false;

    /*
     * Serializa las operaciones para evitar:
     *
     * stop → position → go
     * stop → position → go
     *
     * ejecutándose simultáneamente.
     */
    private commandQueue:
        Promise<void> = Promise.resolve();

    subscribe(
        listener: MessageListener,
    ): () => void {
        this.messageListeners.add(listener);

        return () => {
            this.messageListeners.delete(listener);
        };
    }

    subscribeToErrors(
        listener: ErrorListener,
    ): () => void {
        this.errorListeners.add(listener);

        return () => {
            this.errorListeners.delete(listener);
        };
    }

    async initialize(): Promise<void> {
        if (this.destroyed) {
            throw new Error(
                "El servicio de Stockfish ha sido destruido.",
            );
        }

        if (this.initialized) {
            return;
        }

        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise =
            this.createAndInitializeWorker();

        try {
            await this.initializationPromise;
        } catch (error) {
            this.initializationPromise = null;
            throw error;
        }
    }

    async analyze(
        options: StockfishAnalysisOptions,
    ): Promise<void> {
        return this.enqueue(async () => {
            await this.initialize();

            /*
             * Solo detenemos si realmente hay
             * una búsqueda en curso.
             */
            await this.stopInternal();

            this.send(
                `setoption name MultiPV value ${options.multiPv}`,
            );

            /*
             * Confirmamos que la opción anterior
             * se haya procesado.
             */
            await this.waitUntilReady();

            this.send(
                `position fen ${options.fen}`,
            );

            this.send(
                `go depth ${options.depth}`,
            );

            this.searching = true;
        });
    }

    async stop(): Promise<void> {
        return this.enqueue(async () => {
            await this.stopInternal();
        });
    }

    async restart(): Promise<void> {
        this.terminateWorker();

        this.destroyed = false;
        this.initialized = false;
        this.initializationPromise = null;
        this.searching = false;

        await this.initialize();
    }

    destroy(): void {
        this.destroyed = true;
        this.terminateWorker();

        this.messageListeners.clear();
        this.errorListeners.clear();
    }

    private async createAndInitializeWorker():
        Promise<void> {
        const worker = new Worker(
            WORKER_URL,
        );

        this.worker = worker;

        worker.onmessage = (
            event: MessageEvent<unknown>,
        ) => {
            const rawData = String(
                event.data ?? "",
            );

            const messages = rawData
                .split(/\r?\n/)
                .map((message) => message.trim())
                .filter(Boolean);

            for (const message of messages) {
                if (
                    message.startsWith("bestmove")
                ) {
                    this.searching = false;
                }

                for (
                    const listener
                    of this.messageListeners
                ) {
                    listener(message);
                }
            }
        };

        worker.onerror = (
            event: ErrorEvent,
        ) => {
            const error = new Error(
                event.message ||
                "Error interno de Stockfish.",
            );

            console.error(
                "Error interno de Stockfish:",
                event,
            );

            /*
             * El Worker WASM queda inutilizable
             * después de un RuntimeError.
             */
            this.terminateWorker();

            this.initialized = false;
            this.initializationPromise = null;
            this.searching = false;

            for (
                const listener
                of this.errorListeners
            ) {
                listener(error);
            }
        };

        const uciReady =
            this.waitForMessage(
                (message) =>
                    message === "uciok",
            );

        this.send("uci");

        await uciReady;

        this.send(
            "setoption name Hash value 32",
        );

        await this.waitUntilReady();

        this.initialized = true;
    }

    private async stopInternal():
        Promise<void> {
        if (
            !this.worker ||
            !this.searching
        ) {
            return;
        }

        const bestMovePromise =
            this.waitForMessage(
                (message) =>
                    message.startsWith(
                        "bestmove",
                    ),
                1500,
            );

        this.send("stop");

        try {
            await bestMovePromise;
        } catch {
            /*
             * No enviamos otro stop. Continuamos
             * para evitar una cascada de órdenes.
             */
        }

        this.searching = false;
    }

    private async waitUntilReady():
        Promise<void> {
        const readyPromise =
            this.waitForMessage(
                (message) =>
                    message === "readyok",
            );

        this.send("isready");

        await readyPromise;
    }

    private enqueue(
        operation: () => Promise<void>,
    ): Promise<void> {
        const queuedOperation =
            this.commandQueue.then(
                operation,
                operation,
            );

        this.commandQueue =
            queuedOperation.catch(() => {
                /*
                 * Evita que un error bloquee para siempre
                 * las operaciones posteriores.
                 */
            });

        return queuedOperation;
    }

    private send(command: string): void {
        if (!this.worker) {
            throw new Error(
                "Stockfish no está iniciado.",
            );
        }

        this.worker.postMessage(command);
    }

    private terminateWorker(): void {
        if (!this.worker) {
            return;
        }

        try {
            this.worker.terminate();
        } finally {
            this.worker = null;
        }
    }

    private waitForMessage(
        predicate: (
            message: string,
        ) => boolean,
        timeoutMilliseconds = 10000,
    ): Promise<string> {
        return new Promise(
            (resolve, reject) => {
                const unsubscribe =
                    this.subscribe((message) => {
                        if (!predicate(message)) {
                            return;
                        }

                        window.clearTimeout(
                            timeoutId,
                        );

                        unsubscribe();
                        resolve(message);
                    });

                const timeoutId =
                    window.setTimeout(() => {
                        unsubscribe();

                        reject(
                            new Error(
                                "Stockfish no respondió a tiempo.",
                            ),
                        );
                    }, timeoutMilliseconds);
            },
        );
    }
}