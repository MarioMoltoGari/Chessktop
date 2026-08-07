import {
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

export function useStockfish({
    fen,
    enabled,
    depth,
    multiPv,
}: StockfishHookOptions): StockfishHookResult {
    const activeAnalysisIdRef =
        useRef<string | null>(null);

    const serviceRef =
        useRef<StockfishService | null>(null);

    const activeFenRef = useRef(fen);
    const analysisFenRef = useRef(fen);

    const optionsRef = useRef({
        enabled,
        depth,
        multiPv,
    });

    const [status, setStatus] =
        useState<EngineStatus>("loading");

    const [lines, setLines] =
        useState<EngineLine[]>([]);

    const [currentDepth, setCurrentDepth] =
        useState(0);

    const [error, setError] =
        useState<string | null>(null);

    useEffect(() => {
        activeFenRef.current = fen;
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

    useEffect(() => {
        const service =
            new StockfishService();

        serviceRef.current = service;

        const unsubscribe =
            service.subscribe((message) => {
                if (
                    message.startsWith("bestmove")
                ) {
                    setStatus(
                        optionsRef.current.enabled
                            ? "ready"
                            : "paused",
                    );

                    return;
                }

                const parsed =
                    parseStockfishInfo(message);

                if (!parsed) {
                    return;
                }

                const analyzedFen =
                    analysisFenRef.current;

                const line: EngineLine = {
                    multipv: parsed.multipv,
                    depth: parsed.depth,
                    selectiveDepth:
                        parsed.selectiveDepth,

                    score: normalizeScoreForWhite(
                        parsed.score,
                        analyzedFen,
                    ),

                    uciMoves: parsed.uciMoves,

                    sanMoves: convertUciToSan(
                        analyzedFen,
                        parsed.uciMoves,
                    ),
                };

                setCurrentDepth(
                    (previousDepth) =>
                        Math.max(
                            previousDepth,
                            parsed.depth,
                        ),
                );

                setLines((previousLines) => {
                    const updatedLines =
                        previousLines.filter(
                            (existingLine) =>
                                existingLine.multipv !==
                                line.multipv,
                        );

                    updatedLines.push(line);

                    return updatedLines.sort(
                        (first, second) =>
                            first.multipv -
                            second.multipv,
                    );
                });
            });

        const unsubscribeFromErrors =
            service.subscribeToErrors(
                async () => {
                    console.warn(
                        "Stockfish ha fallado. Reiniciando...",
                    );

                    setStatus("loading");
                    setLines([]);
                    setCurrentDepth(0);

                    try {
                        await service.restart();

                        setError(null);

                        const currentOptions =
                            optionsRef.current;

                        if (currentOptions.enabled) {
                            setStatus("analyzing");

                            analysisFenRef.current =
                                activeFenRef.current;

                            await service.analyze({
                                fen: activeFenRef.current,
                                depth:
                                    currentOptions.depth,
                                multiPv:
                                    currentOptions.multiPv,
                            });
                        } else {
                            setStatus("paused");
                        }
                    } catch (restartError) {
                        console.error(
                            "No se pudo reiniciar Stockfish:",
                            restartError,
                        );

                        setError(
                            "No se pudo reiniciar Stockfish.",
                        );

                        setStatus("error");
                    }
                },
            );

        service
            .initialize()
            .then(() => {
                setStatus(
                    optionsRef.current.enabled
                        ? "ready"
                        : "paused",
                );
            })
            .catch((initializationError) => {
                console.error(
                    "No se pudo iniciar Stockfish:",
                    initializationError,
                );

                setError(
                    "No se pudo iniciar Stockfish.",
                );

                setStatus("error");
            });

        return () => {
            unsubscribe();
            unsubscribeFromErrors();

            activeAnalysisIdRef.current =
                null;

            service.destroy();
            serviceRef.current = null;
        };
    }, []);

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

        const uiTimeoutId =
            window.setTimeout(() => {
                if (
                    activeAnalysisIdRef.current !==
                    analysisId
                ) {
                    return;
                }

                setLines([]);
                setCurrentDepth(0);
                setError(null);

                setStatus(
                    enabled
                        ? "analyzing"
                        : "paused",
                );
            }, 0);

        if (!enabled) {
            service
                .stop()
                .catch(() => {
                    /*
                     * Los errores del Worker se gestionan
                     * en subscribeToErrors().
                     */
                });

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

        analysisFenRef.current = fen;

        service
            .analyze({
                fen,
                depth,
                multiPv,
            })
            .catch(
                (analysisError) => {
                    if (
                        activeAnalysisIdRef.current !==
                        analysisId
                    ) {
                        return;
                    }

                    console.error(
                        "No se pudo analizar la posición:",
                        analysisError,
                    );

                    setError(
                        "No se pudo analizar la posición.",
                    );

                    setStatus("error");
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
    ]);

    return {
        status,
        lines,
        currentDepth,
        error,
    };
}