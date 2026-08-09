import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import StockfishService from "./StockfishService";

import {
    convertUciToSan,
    normalizeScoreForWhite,
    parseStockfishInfo,
} from "./parser";

import type {
    EngineLine,
    EngineStatus,
    StockfishHookOptions,
    StockfishHookResult,
} from "./types";

const MAX_RECOVERY_ATTEMPTS =
    1;

export function useStockfish({
    fen,
    enabled,
    depth,
    multiPv,
}: StockfishHookOptions): StockfishHookResult {
    const serviceRef =
        useRef<StockfishService | null>(
            null,
        );

    const activeFenRef =
        useRef(fen);

    const analysisFenRef =
        useRef(fen);

    const optionsRef =
        useRef({
            enabled,
            depth,
            multiPv,
        });

    const mountedRef =
        useRef(false);

    /*
     * Cada análisis recibe un ID.
     *
     * Los errores de análisis antiguos
     * no pueden modificar la UI actual.
     */
    const activeAnalysisIdRef =
        useRef<string | null>(
            null,
        );

    /*
     * Evita dos recuperaciones simultáneas.
     */
    const recoveryPromiseRef =
        useRef<Promise<void> | null>(
            null,
        );

    const recoveryAttemptsRef =
        useRef(0);

    const [status, setStatus] =
        useState<EngineStatus>(
            "loading",
        );

    const [lines, setLines] =
        useState<EngineLine[]>(
            [],
        );

    const [
        currentDepth,
        setCurrentDepth,
    ] =
        useState(0);

    const [error, setError] =
        useState<string | null>(
            null,
        );

    useEffect(() => {
        activeFenRef.current =
            fen;
    }, [fen]);

    useEffect(() => {
        optionsRef.current = {
            enabled,
            depth,
            multiPv,
        };
    }, [
        enabled,
        depth,
        multiPv,
    ]);

    const recoverService =
        useCallback(
            async (
                service:
                    StockfishService,
            ) => {
                /*
                 * Si ya existe una recuperación,
                 * todos esperan la misma.
                 */
                if (
                    recoveryPromiseRef.current
                ) {
                    return (
                        recoveryPromiseRef.current
                    );
                }

                if (
                    recoveryAttemptsRef.current >=
                    MAX_RECOVERY_ATTEMPTS
                ) {
                    if (
                        mountedRef.current
                    ) {
                        setError(
                            "Stockfish no está disponible.",
                        );

                        setStatus(
                            "error",
                        );
                    }

                    return;
                }

                recoveryAttemptsRef.current +=
                    1;

                const recoveryPromise =
                    (async () => {
                        if (
                            mountedRef.current
                        ) {
                            setStatus(
                                "loading",
                            );

                            setLines(
                                [],
                            );

                            setCurrentDepth(
                                0,
                            );

                            setError(
                                null,
                            );
                        }

                        try {
                            await service.restart();

                            if (
                                !mountedRef.current ||
                                serviceRef.current !==
                                service
                            ) {
                                return;
                            }

                            const currentOptions =
                                optionsRef.current;

                            if (
                                !currentOptions.enabled
                            ) {
                                setStatus(
                                    "paused",
                                );

                                return;
                            }

                            const currentFen =
                                activeFenRef.current;

                            analysisFenRef.current =
                                currentFen;

                            setStatus(
                                "analyzing",
                            );

                            await service.analyze({
                                fen:
                                    currentFen,

                                depth:
                                    currentOptions.depth,

                                multiPv:
                                    currentOptions.multiPv,
                            });

                            if (
                                mountedRef.current &&
                                serviceRef.current ===
                                service
                            ) {
                                recoveryAttemptsRef.current =
                                    0;

                                setError(
                                    null,
                                );
                            }
                        } catch (
                        restartError
                        ) {
                            console.error(
                                "No se pudo recuperar Stockfish:",
                                restartError,
                            );

                            if (
                                mountedRef.current &&
                                serviceRef.current ===
                                service
                            ) {
                                setError(
                                    "No se pudo reiniciar Stockfish.",
                                );

                                setStatus(
                                    "error",
                                );
                            }
                        }
                    })();

                recoveryPromiseRef.current =
                    recoveryPromise;

                try {
                    await recoveryPromise;
                } finally {
                    if (
                        recoveryPromiseRef.current ===
                        recoveryPromise
                    ) {
                        recoveryPromiseRef.current =
                            null;
                    }
                }
            },
            [],
        );

    /*
     * Permite al usuario intentar recuperar
     * manualmente Stockfish después de que
     * haya fallado la recuperación automática.
     */
    const retry =
        useCallback(() => {
            const service =
                serviceRef.current;

            if (
                !service ||
                !mountedRef.current
            ) {
                return;
            }

            /*
             * El usuario está iniciando un nuevo
             * intento manual, así que volvemos a
             * permitir la recuperación.
             */
            recoveryAttemptsRef.current =
                0;

            activeAnalysisIdRef.current =
                null;

            setError(
                null,
            );

            setLines(
                [],
            );

            setCurrentDepth(
                0,
            );

            setStatus(
                "loading",
            );

            void recoverService(
                service,
            );
        }, [
            recoverService,
        ]);

    /*
     * Ciclo de vida del servicio.
     */
    useEffect(() => {
        mountedRef.current =
            true;

        const service =
            new StockfishService();

        serviceRef.current =
            service;

        const unsubscribe =
            service.subscribe(
                (message) => {
                    if (
                        !mountedRef.current ||
                        serviceRef.current !==
                        service
                    ) {
                        return;
                    }

                    if (
                        message.startsWith(
                            "bestmove",
                        )
                    ) {
                        setStatus(
                            optionsRef.current
                                .enabled
                                ? "ready"
                                : "paused",
                        );

                        return;
                    }

                    const parsed =
                        parseStockfishInfo(
                            message,
                        );

                    if (!parsed) {
                        return;
                    }

                    const analyzedFen =
                        analysisFenRef.current;

                    const line:
                        EngineLine = {
                        multipv:
                            parsed.multipv,

                        depth:
                            parsed.depth,

                        selectiveDepth:
                            parsed.selectiveDepth,

                        score:
                            normalizeScoreForWhite(
                                parsed.score,
                                analyzedFen,
                            ),

                        uciMoves:
                            parsed.uciMoves,

                        sanMoves:
                            convertUciToSan(
                                analyzedFen,
                                parsed.uciMoves,
                            ),
                    };

                    setCurrentDepth(
                        (
                            previousDepth,
                        ) =>
                            Math.max(
                                previousDepth,
                                parsed.depth,
                            ),
                    );

                    setLines(
                        (
                            previousLines,
                        ) => {
                            const updatedLines =
                                previousLines.filter(
                                    (
                                        existingLine,
                                    ) =>
                                        existingLine.multipv !==
                                        line.multipv,
                                );

                            updatedLines.push(
                                line,
                            );

                            return updatedLines.sort(
                                (
                                    first,
                                    second,
                                ) =>
                                    first.multipv -
                                    second.multipv,
                            );
                        },
                    );
                },
            );

        const unsubscribeFromErrors =
            service.subscribeToErrors(
                () => {
                    if (
                        !mountedRef.current ||
                        serviceRef.current !==
                        service
                    ) {
                        return;
                    }

                    console.warn(
                        "Stockfish ha fallado. Intentando recuperar el motor...",
                    );

                    void recoverService(
                        service,
                    );
                },
            );

        /*
         * Inicialización inicial.
         *
         * analyze() también sabe inicializar
         * el servicio, pero hacemos esto para
         * reflejar correctamente "Cargando"
         * incluso antes del primer análisis.
         */
        void service
            .initialize()
            .then(() => {
                if (
                    !mountedRef.current ||
                    serviceRef.current !==
                    service
                ) {
                    return;
                }

                recoveryAttemptsRef.current =
                    0;

                setError(
                    null,
                );

                setStatus(
                    optionsRef.current.enabled
                        ? "ready"
                        : "paused",
                );
            })
            .catch(
                (
                    initializationError,
                ) => {
                    if (
                        !mountedRef.current ||
                        serviceRef.current !==
                        service
                    ) {
                        return;
                    }

                    console.warn(
                        "La inicialización inicial de Stockfish ha fallado. Intentando recuperar...",
                        initializationError,
                    );

                    void recoverService(
                        service,
                    );
                },
            );

        return () => {
            mountedRef.current =
                false;

            activeAnalysisIdRef.current =
                null;

            recoveryPromiseRef.current =
                null;

            unsubscribe();
            unsubscribeFromErrors();

            service.destroy();

            if (
                serviceRef.current ===
                service
            ) {
                serviceRef.current =
                    null;
            }
        };
    }, [
        recoverService,
    ]);

    /*
     * Análisis de posición.
     */
    useEffect(() => {
        const service =
            serviceRef.current;

        if (!service) {
            return;
        }

        const analysisId =
            crypto.randomUUID();

        activeAnalysisIdRef.current =
            analysisId;

        /*
         * Dejamos que el render actual
         * termine antes de limpiar las
         * líneas anteriores.
         */
        const uiTimeoutId =
            window.setTimeout(
                () => {
                    if (
                        !mountedRef.current ||
                        activeAnalysisIdRef.current !==
                        analysisId
                    ) {
                        return;
                    }

                    setLines(
                        [],
                    );

                    setCurrentDepth(
                        0,
                    );

                    setError(
                        null,
                    );

                    setStatus(
                        enabled
                            ? "analyzing"
                            : "paused",
                    );
                },
                0,
            );

        if (!enabled) {
            void service
                .stop()
                .catch(
                    () => {
                        /*
                         * Si el Worker ha muerto,
                         * su mecanismo de error
                         * gestionará la recuperación.
                         */
                    },
                );

            return () => {
                window.clearTimeout(
                    uiTimeoutId,
                );

                if (
                    activeAnalysisIdRef.current ===
                    analysisId
                ) {
                    activeAnalysisIdRef.current =
                        null;
                }
            };
        }

        analysisFenRef.current =
            fen;

        void service
            .analyze({
                fen,
                depth,
                multiPv,
            })
            .then(() => {
                if (
                    !mountedRef.current ||
                    activeAnalysisIdRef.current !==
                    analysisId
                ) {
                    return;
                }

                /*
                 * Haber aceptado correctamente
                 * un análisis demuestra que el
                 * servicio vuelve a estar sano.
                 */
                recoveryAttemptsRef.current =
                    0;

                setError(
                    null,
                );
            })
            .catch(
                (
                    analysisError,
                ) => {
                    if (
                        !mountedRef.current ||
                        activeAnalysisIdRef.current !==
                        analysisId
                    ) {
                        return;
                    }

                    console.warn(
                        "No se pudo analizar la posición. Intentando recuperar Stockfish...",
                        analysisError,
                    );

                    void recoverService(
                        service,
                    );
                },
            );

        return () => {
            window.clearTimeout(
                uiTimeoutId,
            );

            if (
                activeAnalysisIdRef.current ===
                analysisId
            ) {
                activeAnalysisIdRef.current =
                    null;
            }
        };
    }, [
        fen,
        enabled,
        depth,
        multiPv,
        recoverService,
    ]);

    return {
        status,
        lines,
        currentDepth,
        error,
        retry,
    };
}