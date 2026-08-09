import type {
    StockfishAnalysisOptions,
} from "./types";

type MessageListener = (
    message: string,
) => void;

type ErrorListener = (
    error: Error,
) => void;

type PendingWait = {
    generation: number;

    reject: (
        error: Error,
    ) => void;

    cleanup: () => void;
};

const WORKER_URL =
    `${import.meta.env.BASE_URL}stockfish/stockfish-18-lite-single.js`;

const INITIALIZATION_TIMEOUT_MS =
    20000;

const READY_TIMEOUT_MS =
    10000;

const STOP_TIMEOUT_MS =
    1500;

export default class StockfishService {
    private worker: Worker | null =
        null;

    private messageListeners =
        new Set<MessageListener>();

    private errorListeners =
        new Set<ErrorListener>();

    private pendingWaits =
        new Set<PendingWait>();

    private initializationPromise:
        Promise<void> | null = null;

    private initialized = false;
    private searching = false;
    private destroyed = false;

    /*
     * Identifica la instancia actual
     * del Worker.
     *
     * Cada vez que creamos o destruimos
     * uno, la generación cambia.
     *
     * Así podemos ignorar cualquier
     * respuesta perteneciente a una
     * instancia antigua.
     */
    private workerGeneration = 0;

    /*
     * Serializa stop / position / go.
     */
    private commandQueue:
        Promise<void> =
        Promise.resolve();

    subscribe(
        listener: MessageListener,
    ): () => void {
        this.messageListeners.add(
            listener,
        );

        return () => {
            this.messageListeners.delete(
                listener,
            );
        };
    }

    subscribeToErrors(
        listener: ErrorListener,
    ): () => void {
        this.errorListeners.add(
            listener,
        );

        return () => {
            this.errorListeners.delete(
                listener,
            );
        };
    }

    async initialize():
        Promise<void> {
        if (this.destroyed) {
            throw new Error(
                "El servicio de Stockfish ha sido destruido.",
            );
        }

        if (
            this.initialized &&
            this.worker
        ) {
            return;
        }

        if (
            this.initializationPromise
        ) {
            return (
                this.initializationPromise
            );
        }

        const initializationPromise =
            this.createAndInitializeWorker();

        this.initializationPromise =
            initializationPromise;

        try {
            await initializationPromise;
        } catch (error) {
            if (
                this.initializationPromise ===
                initializationPromise
            ) {
                this.initializationPromise =
                    null;
            }

            throw error;
        }

        if (
            this.initializationPromise ===
            initializationPromise
        ) {
            this.initializationPromise =
                null;
        }
    }

    async analyze(
        options:
            StockfishAnalysisOptions,
    ): Promise<void> {
        return this.enqueue(
            async () => {
                await this.initialize();

                await this.stopInternal();

                this.assertUsable();

                this.send(
                    `setoption name MultiPV value ${options.multiPv}`,
                );

                await this.waitUntilReady();

                this.assertUsable();

                this.send(
                    `position fen ${options.fen}`,
                );

                this.send(
                    `go depth ${options.depth}`,
                );

                this.searching =
                    true;
            },
        );
    }

    async stop():
        Promise<void> {
        return this.enqueue(
            async () => {
                await this.stopInternal();
            },
        );
    }

    async restart():
        Promise<void> {
        if (this.destroyed) {
            throw new Error(
                "El servicio de Stockfish ha sido destruido.",
            );
        }

        /*
         * Cancelamos inmediatamente todo
         * lo relacionado con el Worker
         * anterior.
         */
        this.resetWorker(
            "Stockfish se está reiniciando.",
        );

        /*
         * La cola anterior puede contener
         * operaciones pertenecientes al
         * Worker destruido.
         *
         * Empezamos una cola limpia.
         */
        this.commandQueue =
            Promise.resolve();

        await this.initialize();
    }

    destroy(): void {
        if (this.destroyed) {
            return;
        }

        this.destroyed =
            true;

        this.resetWorker(
            "El servicio de Stockfish ha sido destruido.",
        );

        this.commandQueue =
            Promise.resolve();

        this.messageListeners.clear();
        this.errorListeners.clear();
    }

    private async createAndInitializeWorker():
        Promise<void> {
        if (this.destroyed) {
            throw new Error(
                "El servicio de Stockfish ha sido destruido.",
            );
        }

        /*
         * Por seguridad nunca mantenemos
         * dos Workers.
         */
        if (this.worker) {
            this.resetWorker(
                "Se ha sustituido la instancia anterior de Stockfish.",
            );
        }

        const generation =
            ++this.workerGeneration;

        const worker =
            new Worker(
                WORKER_URL,
            );

        this.worker =
            worker;

        worker.onmessage = (
            event:
                MessageEvent<unknown>,
        ) => {
            /*
             * Un Worker antiguo nunca puede
             * afectar al estado actual.
             */
            if (
                generation !==
                this.workerGeneration ||
                worker !== this.worker ||
                this.destroyed
            ) {
                return;
            }

            const rawData =
                String(
                    event.data ?? "",
                );

            const messages =
                rawData
                    .split(/\r?\n/)
                    .map(
                        (message) =>
                            message.trim(),
                    )
                    .filter(Boolean);

            for (
                const message
                of messages
            ) {
                if (
                    message.startsWith(
                        "bestmove",
                    )
                ) {
                    this.searching =
                        false;
                }

                for (
                    const listener
                    of this.messageListeners
                ) {
                    listener(
                        message,
                    );
                }
            }
        };

        worker.onerror = (
            event: ErrorEvent,
        ) => {
            if (
                generation !==
                this.workerGeneration ||
                worker !== this.worker ||
                this.destroyed
            ) {
                return;
            }

            const error =
                new Error(
                    event.message ||
                    "Error interno de Stockfish.",
                );

            console.error(
                "Error interno de Stockfish:",
                event,
            );

            /*
             * Un RuntimeError de WASM deja
             * esta instancia inutilizable.
             */
            this.resetWorker(
                "El Worker de Stockfish ha fallado.",
            );

            for (
                const listener
                of this.errorListeners
            ) {
                listener(
                    error,
                );
            }
        };

        try {
            const uciReady =
                this.waitForMessage(
                    (message) =>
                        message ===
                        "uciok",
                    INITIALIZATION_TIMEOUT_MS,
                    generation,
                );

            this.sendToGeneration(
                "uci",
                generation,
            );

            await uciReady;

            this.sendToGeneration(
                "setoption name Hash value 32",
                generation,
            );

            await this.waitUntilReady(
                generation,
            );

            if (
                generation !==
                this.workerGeneration ||
                worker !==
                this.worker ||
                this.destroyed
            ) {
                throw new Error(
                    "La inicialización de Stockfish fue cancelada.",
                );
            }

            this.initialized =
                true;
        } catch (error) {
            /*
             * Solo destruimos si sigue siendo
             * el Worker cuya inicialización
             * acaba de fallar.
             */
            if (
                generation ===
                this.workerGeneration &&
                worker === this.worker
            ) {
                this.resetWorker(
                    "No se pudo inicializar Stockfish.",
                );
            }

            throw error;
        }
    }

    private async stopInternal():
        Promise<void> {
        if (
            !this.worker ||
            !this.searching
        ) {
            return;
        }

        const generation =
            this.workerGeneration;

        const bestMovePromise =
            this.waitForMessage(
                (message) =>
                    message.startsWith(
                        "bestmove",
                    ),
                STOP_TIMEOUT_MS,
                generation,
            );

        this.sendToGeneration(
            "stop",
            generation,
        );

        try {
            await bestMovePromise;
        } catch {
            /*
             * Si stop no devuelve bestmove
             * a tiempo no bloqueamos la cola.
             *
             * El siguiente isready servirá
             * como barrera de sincronización.
             */
        }

        if (
            generation ===
            this.workerGeneration
        ) {
            this.searching =
                false;
        }
    }

    private async waitUntilReady(
        generation =
            this.workerGeneration,
    ): Promise<void> {
        const readyPromise =
            this.waitForMessage(
                (message) =>
                    message ===
                    "readyok",
                READY_TIMEOUT_MS,
                generation,
            );

        this.sendToGeneration(
            "isready",
            generation,
        );

        await readyPromise;
    }

    private enqueue(
        operation:
            () => Promise<void>,
    ): Promise<void> {
        const queuedOperation =
            this.commandQueue.then(
                operation,
                operation,
            );

        this.commandQueue =
            queuedOperation.catch(
                () => {
                    /*
                     * Un error no debe dejar
                     * la cola permanentemente
                     * rechazada.
                     */
                },
            );

        return queuedOperation;
    }

    private assertUsable():
        void {
        if (this.destroyed) {
            throw new Error(
                "El servicio de Stockfish ha sido destruido.",
            );
        }

        if (!this.worker) {
            throw new Error(
                "Stockfish no está iniciado.",
            );
        }
    }

    private send(
        command: string,
    ): void {
        this.sendToGeneration(
            command,
            this.workerGeneration,
        );
    }

    private sendToGeneration(
        command: string,
        generation: number,
    ): void {
        if (this.destroyed) {
            throw new Error(
                "El servicio de Stockfish ha sido destruido.",
            );
        }

        if (
            !this.worker ||
            generation !==
            this.workerGeneration
        ) {
            throw new Error(
                "La instancia de Stockfish ya no está disponible.",
            );
        }

        this.worker.postMessage(
            command,
        );
    }

    private resetWorker(
        reason: string,
    ): void {
        /*
         * Primero invalidamos la generación.
         * Incluso si llegase algún evento
         * durante terminate(), será ignorado.
         */
        this.workerGeneration += 1;

        this.rejectPendingWaits(
            new Error(reason),
        );

        const worker =
            this.worker;

        this.worker =
            null;

        this.initialized =
            false;

        this.initializationPromise =
            null;

        this.searching =
            false;

        if (!worker) {
            return;
        }

        worker.onmessage =
            null;

        worker.onerror =
            null;

        worker.terminate();
    }

    private rejectPendingWaits(
        error: Error,
    ): void {
        const waits = [
            ...this.pendingWaits,
        ];

        this.pendingWaits.clear();

        for (
            const wait
            of waits
        ) {
            wait.cleanup();
            wait.reject(error);
        }
    }

    private waitForMessage(
        predicate: (
            message: string,
        ) => boolean,
        timeoutMilliseconds:
            number,
        generation =
            this.workerGeneration,
    ): Promise<string> {
        return new Promise(
            (
                resolve,
                reject,
            ) => {
                if (
                    this.destroyed ||
                    !this.worker ||
                    generation !==
                    this.workerGeneration
                ) {
                    reject(
                        new Error(
                            "La instancia de Stockfish ya no está disponible.",
                        ),
                    );

                    return;
                }

                let settled =
                    false;

                let timeoutId:
                    number | null =
                    null;

                let unsubscribe:
                    (() => void) | null =
                    null;

                let pendingWait:
                    PendingWait | null =
                    null;

                const cleanup =
                    () => {
                        if (
                            timeoutId !==
                            null
                        ) {
                            window.clearTimeout(
                                timeoutId,
                            );

                            timeoutId =
                                null;
                        }

                        if (
                            unsubscribe
                        ) {
                            unsubscribe();
                            unsubscribe =
                                null;
                        }

                        if (
                            pendingWait
                        ) {
                            this.pendingWaits.delete(
                                pendingWait,
                            );

                            pendingWait =
                                null;
                        }
                    };

                const resolveOnce =
                    (
                        message: string,
                    ) => {
                        if (settled) {
                            return;
                        }

                        settled =
                            true;

                        cleanup();

                        resolve(
                            message,
                        );
                    };

                const rejectOnce =
                    (
                        error: Error,
                    ) => {
                        if (settled) {
                            return;
                        }

                        settled =
                            true;

                        cleanup();

                        reject(
                            error,
                        );
                    };

                unsubscribe =
                    this.subscribe(
                        (
                            message,
                        ) => {
                            if (
                                generation !==
                                this.workerGeneration
                            ) {
                                return;
                            }

                            if (
                                !predicate(
                                    message,
                                )
                            ) {
                                return;
                            }

                            resolveOnce(
                                message,
                            );
                        },
                    );

                const wait:
                    PendingWait = {
                    generation,

                    reject:
                        rejectOnce,

                    cleanup,
                };

                pendingWait =
                    wait;

                this.pendingWaits.add(
                    wait,
                );

                timeoutId =
                    window.setTimeout(
                        () => {
                            rejectOnce(
                                new Error(
                                    "Stockfish no respondió a tiempo.",
                                ),
                            );
                        },
                        timeoutMilliseconds,
                    );
            },
        );
    }
}