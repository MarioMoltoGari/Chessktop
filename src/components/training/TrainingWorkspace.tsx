import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    Chess,
} from "chess.js";

import {
    Chessboard,
} from "react-chessboard";

import type {
    StudyContent,
} from "../../types";

import type {
    Training,
    TrainingLine,
    TrainingSession,
} from "../training/types";

import {
    createTrainingPosition,
    generateTrainingLines,
    validateTrainingMove,
} from "../training/trainingGenerator";

import {
    completeTrainingSession,
    createTrainingSession,
    registerCorrectMove,
    registerIncorrectMove,
} from "../training/trainingSession";

type TrainingWorkspaceProps = {
    training: Training;
    studyName: string;
    studyContent: StudyContent;
    onAddNote: (
        nodeId: string,
    ) => void;
    onClose: () => void;
};

type TrainingFeedback =
    | {
        type:
        | "correct"
        | "incorrect"
        | "complete";
        message: string;
        /*
         * Nota existente en el estudio.
         */
        explanation?: string;
        /*
         * Nodo para el que sugerimos
         * crear una nota.
         */
        suggestedNoteNodeId?: string;
    }
    | null;

const OPPONENT_MOVE_DELAY_MS = 500;

function getInitialNodeIdForLine(
    line: TrainingLine,
    training: Training,
    studyContent: StudyContent,
): string {
    const nodes =
        studyContent.nodes;

    if (
        line.nodeIds.length === 0
    ) {
        return "root";
    }

    /*
     * Si el usuario juega con blancas,
     * comienza desde la posición inicial.
     */
    if (
        training.side === "white"
    ) {
        return "root";
    }

    /*
     * Si juega con negras, Chessktop
     * realizará la primera jugada blanca.
     */
    const firstMoveId =
        line.nodeIds[1];

    return (
        firstMoveId &&
            nodes[firstMoveId]
            ? firstMoveId
            : "root"
    );
}

export default function TrainingWorkspace({
    training,
    studyName,
    studyContent,
    onAddNote,
    onClose,
}: TrainingWorkspaceProps) {
    const nodes =
        studyContent.nodes;

    const rootFen =
        nodes.root?.fen ??
        new Chess().fen();

    /*
     * Generamos todas las líneas que forman
     * parte del entrenamiento.
     *
     * generateTrainingLines también decide
     * su orden según la configuración
     * secuencial o aleatoria.
     */
    const trainingLines =
        useMemo(
            () =>
                generateTrainingLines(
                    nodes,
                    training,
                ),
            [
                nodes,
                training,
            ],
        );

    const firstTrainingLine =
        trainingLines[0] ?? null;

    /*
     * Creamos la sesión apuntando ya al nodo
     * desde el que deberá jugar el usuario.
     *
     * En entrenamientos con negras esto puede
     * ser el nodo posterior a la primera
     * jugada blanca, aunque visualmente
     * mostremos root durante 500 ms.
     */
    const [
        session,
        setSession,
    ] =
        useState<TrainingSession>(() => {
            const initialNodeId =
                firstTrainingLine
                    ? getInitialNodeIdForLine(
                        firstTrainingLine,
                        training,
                        studyContent,
                    )
                    : "root";

            return createTrainingSession(
                training.id,
                initialNodeId,
                trainingLines.length,
                0,
            );
        });

    const currentNode =
        nodes[
        session.currentNodeId
        ] ?? nodes.root;

    /*
     * Estado puramente visual del tablero.
     *
     * Con negras mostramos primero root
     * para que el usuario vea después la
     * primera jugada blanca.
     */
    const [
        position,
        setPosition,
    ] =
        useState(() => {
            if (
                training.side === "black"
            ) {
                return rootFen;
            }

            return (
                currentNode?.fen ??
                rootFen
            );
        });

    const [
        feedback,
        setFeedback,
    ] =
        useState<TrainingFeedback>(
            null,
        );

    const [
        noteSuggestionShown,
        setNoteSuggestionShown,
    ] =
        useState(false);

    /*
     * Mientras Chessktop realiza una
     * jugada automática bloqueamos
     * temporalmente el tablero.
     */
    const [
        opponentThinking,
        setOpponentThinking,
    ] =
        useState(
            training.side === "black",
        );

    const opponentTimeoutRef =
        useRef<number | null>(
            null,
        );

    /*
     * Posición entrenable actual.
     */
    const trainingPosition =
        createTrainingPosition(
            nodes,
            session.currentNodeId,
            training,
        );

    const userTurn =
        !session.completed &&
        !opponentThinking &&
        trainingPosition !== null;

    function clearOpponentTimeout() {
        if (
            opponentTimeoutRef.current ===
            null
        ) {
            return;
        }

        window.clearTimeout(
            opponentTimeoutRef.current,
        );

        opponentTimeoutRef.current =
            null;
    }

    /*
     * Primera jugada automática al abrir
     * un entrenamiento con negras.
     *
     * La sesión ya está preparada en el
     * nodo correspondiente; aquí solo
     * retrasamos su representación visual.
     */
    useEffect(() => {
        if (
            training.side !== "black" ||
            !firstTrainingLine
        ) {
            return;
        }

        const initialNodeId =
            getInitialNodeIdForLine(
                firstTrainingLine,
                training,
                studyContent,
            );

        const initialNode =
            nodes[initialNodeId];

        if (
            !initialNode ||
            initialNodeId === "root"
        ) {
            return;
        }

        opponentTimeoutRef.current =
            window.setTimeout(() => {
                setPosition(
                    initialNode.fen,
                );

                setOpponentThinking(
                    false,
                );

                opponentTimeoutRef.current =
                    null;
            }, OPPONENT_MOVE_DELAY_MS);

        return () => {
            clearOpponentTimeout();
        };
    }, [
        firstTrainingLine,
        nodes,
        studyContent,
        training,
    ]);

    /*
     * Devuelve el siguiente nodo dentro
     * de una línea concreta.
     */
    function getNextNodeInLine(
        lineIndex: number,
        currentNodeId: string,
    ): string | null {
        const line =
            trainingLines[
            lineIndex
            ];

        if (!line) {
            return null;
        }

        const currentIndex =
            line.nodeIds.indexOf(
                currentNodeId,
            );

        if (
            currentIndex < 0
        ) {
            return null;
        }

        return (
            line.nodeIds[
            currentIndex + 1
            ] ?? null
        );
    }

    /*
     * Busca una línea pendiente compatible
     * con una alternativa válida jugada
     * por el usuario.
     */
    function findCompatiblePendingLineIndex(
        currentNodeId: string,
        nextNodeId: string,
    ): number | null {
        for (
            let index = 0;
            index < trainingLines.length;
            index += 1
        ) {
            const line =
                trainingLines[index];

            if (
                session.completedLineIds.includes(
                    line.id,
                )
            ) {
                continue;
            }

            const currentNodeIndex =
                line.nodeIds.indexOf(
                    currentNodeId,
                );

            if (
                currentNodeIndex < 0
            ) {
                continue;
            }

            const lineNextNodeId =
                line.nodeIds[
                currentNodeIndex + 1
                ];

            if (
                lineNextNodeId ===
                nextNodeId
            ) {
                return index;
            }
        }

        return null;
    }

    /*
     * Inicia visual y lógicamente una línea.
     *
     * Es utilizado tanto al pasar a la
     * siguiente línea como al reiniciar
     * el entrenamiento.
     */
    function startLine(
        line: TrainingLine,
        lineIndex: number,
        baseSession: TrainingSession,
    ) {
        const initialNodeId =
            getInitialNodeIdForLine(
                line,
                training,
                studyContent,
            );

        const initialNode =
            nodes[
            initialNodeId
            ] ?? nodes.root;

        if (!initialNode) {
            return;
        }

        const nextSession:
            TrainingSession = {
            ...baseSession,

            currentNodeId:
                initialNodeId,

            currentLineIndex:
                lineIndex,

            completed: false,
        };

        clearOpponentTimeout();

        /*
         * Actualizamos inmediatamente
         * el estado lógico de la sesión.
         */
        setSession(
            nextSession,
        );

        /*
         * Con negras queremos ver:
         *
         * posición inicial
         * → 500 ms
         * → jugada blanca.
         */
        if (
            training.side === "black" &&
            initialNodeId !== "root"
        ) {
            setPosition(
                rootFen,
            );

            setOpponentThinking(
                true,
            );

            opponentTimeoutRef.current =
                window.setTimeout(() => {
                    setPosition(
                        initialNode.fen,
                    );

                    setOpponentThinking(
                        false,
                    );

                    opponentTimeoutRef.current =
                        null;
                }, OPPONENT_MOVE_DELAY_MS);

            return;
        }

        /*
         * Con blancas no existe una jugada
         * automática inicial.
         */
        setPosition(
            initialNode.fen,
        );

        setOpponentThinking(
            false,
        );
    }

    /*
     * Procesa una jugada realizada
     * por el usuario.
     */
    function makeTrainingMove(
        sourceSquare: string,
        targetSquare: string,
    ): boolean {
        if (
            session.completed ||
            !trainingPosition
        ) {
            return false;
        }

        const expectedNodeId =
            getNextNodeInLine(
                session.currentLineIndex,
                session.currentNodeId,
            );

        const expectedNode =
            expectedNodeId
                ? nodes[
                expectedNodeId
                ]
                : null;

        /*
         * Primero comprobamos que sea
         * legal según chess.js.
         */
        const game =
            new Chess(position);

        let attemptedMove;

        try {
            attemptedMove =
                game.move({
                    from:
                        sourceSquare,
                    to:
                        targetSquare,
                    promotion: "q",
                });
        } catch {
            return false;
        }

        /*
         * Después comprobamos si forma
         * parte del repertorio.
         */
        const result =
            validateTrainingMove(
                nodes,
                trainingPosition,
                attemptedMove.from,
                attemptedMove.to,
                attemptedMove.promotion,
            );

        if (!result.correct) {
            setSession(
                (
                    previousSession,
                ) =>
                    registerIncorrectMove(
                        previousSession,
                    ),
            );

            const explanation =
                expectedNode?.note?.trim();

            /*
             * Si existe una nota, la mostramos.
             *
             * Si no existe y todavía no hemos
             * sugerido crear notas durante esta
             * sesión, mostramos la sugerencia.
             */
            if (explanation) {
                setFeedback({
                    type: "incorrect",

                    message:
                        "Ese movimiento no está en tu repertorio.",

                    explanation,
                });
            } else if (
                expectedNode &&
                !noteSuggestionShown
            ) {
                setFeedback({
                    type: "incorrect",

                    message:
                        "Ese movimiento no está en tu repertorio.",

                    suggestedNoteNodeId:
                        expectedNode.id,
                });

                setNoteSuggestionShown(
                    true,
                );
            } else {
                setFeedback({
                    type: "incorrect",

                    message:
                        "Ese movimiento no está en tu repertorio.",
                });
            }

            return false;
        }

        const matchedNode =
            nodes[
            result.matchedNodeId
            ];

        if (!matchedNode) {
            return false;
        }

        let targetLineIndex =
            session.currentLineIndex;

        /*
         * Una alternativa diferente puede
         * ser igualmente correcta si existe
         * en otra línea pendiente.
         */
        if (
            result.matchedNodeId !==
            expectedNodeId
        ) {
            const compatibleLineIndex =
                findCompatiblePendingLineIndex(
                    session.currentNodeId,
                    result.matchedNodeId,
                );

            if (
                compatibleLineIndex !==
                null
            ) {
                targetLineIndex =
                    compatibleLineIndex;
            }
        }

        const sessionAfterUserMove =
            registerCorrectMove(
                {
                    ...session,

                    currentLineIndex:
                        targetLineIndex,
                },
                result.matchedNodeId,
            );

        setFeedback({
            type: "correct",
            message:
                "Movimiento correcto.",
        });

        playOpponentMove(
            sessionAfterUserMove,
            result.matchedNodeId,
        );

        return true;
    }

    /*
     * Realiza la respuesta automática
     * del rival dentro de la línea actual.
     */
    function playOpponentMove(
        sessionAfterUserMove:
            TrainingSession,
        userMoveNodeId: string,
    ) {
        const userMoveNode =
            nodes[
            userMoveNodeId
            ];

        if (!userMoveNode) {
            finishSession(
                sessionAfterUserMove,
            );

            return;
        }

        const opponentNodeId =
            getNextNodeInLine(
                sessionAfterUserMove
                    .currentLineIndex,

                userMoveNodeId,
            );

        /*
         * La línea termina con la jugada
         * realizada por el usuario.
         */
        if (!opponentNodeId) {
            setPosition(
                userMoveNode.fen,
            );

            setSession(
                sessionAfterUserMove,
            );

            finishSession(
                sessionAfterUserMove,
            );

            return;
        }

        const opponentNode =
            nodes[
            opponentNodeId
            ];

        if (!opponentNode) {
            finishSession(
                sessionAfterUserMove,
            );

            return;
        }

        /*
         * Actualizamos inmediatamente
         * la sesión con la jugada correcta
         * del usuario.
         *
         * Así estadísticas y lógica no
         * dependen de los 500 ms visuales.
         */
        setSession(
            sessionAfterUserMove,
        );

        /*
         * Mostramos primero la posición
         * después de la jugada del usuario.
         */
        setPosition(
            userMoveNode.fen,
        );

        setOpponentThinking(
            true,
        );

        clearOpponentTimeout();

        opponentTimeoutRef.current =
            window.setTimeout(() => {
                const sessionAfterOpponent:
                    TrainingSession = {
                    ...sessionAfterUserMove,

                    currentNodeId:
                        opponentNodeId,
                };

                /*
                 * Ahora sí aparece visualmente
                 * la respuesta del rival.
                 */
                setPosition(
                    opponentNode.fen,
                );

                const nextTrainingPosition =
                    createTrainingPosition(
                        nodes,
                        opponentNodeId,
                        training,
                    );

                setOpponentThinking(
                    false,
                );

                opponentTimeoutRef.current =
                    null;

                if (
                    !nextTrainingPosition
                ) {
                    finishSession(
                        sessionAfterOpponent,
                    );

                    return;
                }

                setSession(
                    sessionAfterOpponent,
                );
            }, OPPONENT_MOVE_DELAY_MS);
    }

    /*
     * Busca la primera línea de la sesión
     * que todavía no haya sido completada.
     */
    function startNextLine(
        currentSession:
            TrainingSession,
    ): boolean {
        const nextLineIndex =
            trainingLines.findIndex(
                (line) =>
                    !currentSession
                        .completedLineIds
                        .includes(
                            line.id,
                        ),
            );

        if (
            nextLineIndex < 0
        ) {
            return false;
        }

        const nextLine =
            trainingLines[
            nextLineIndex
            ];

        if (!nextLine) {
            return false;
        }

        startLine(
            nextLine,
            nextLineIndex,
            currentSession,
        );

        setFeedback({
            type: "correct",
            message:
                "Línea completada. Siguiente línea.",
        });

        return true;
    }

    /*
     * Finaliza la línea actual.
     *
     * La marca como cubierta y busca
     * automáticamente otra pendiente.
     */
    function finishSession(
        currentSession:
            TrainingSession,
    ) {
        const finishedLine =
            trainingLines[
            currentSession
                .currentLineIndex
            ];

        const sessionWithCompletedLine =
            finishedLine &&
                !currentSession
                    .completedLineIds
                    .includes(
                        finishedLine.id,
                    )
                ? {
                    ...currentSession,

                    completedLineIds: [
                        ...currentSession
                            .completedLineIds,

                        finishedLine.id,
                    ],
                }
                : currentSession;

        const startedNextLine =
            startNextLine(
                sessionWithCompletedLine,
            );

        if (
            startedNextLine
        ) {
            return;
        }

        const completedSession =
            completeTrainingSession(
                sessionWithCompletedLine,
            );

        setSession(
            completedSession,
        );

        setFeedback({
            type: "complete",
            message:
                "Entrenamiento completado.",
        });
    }

    /*
     * Reinicia completamente el entrenamiento.
     */
    function restartTraining() {
        const firstLine =
            trainingLines[0];

        if (!firstLine) {
            return;
        }

        const restartedSession =
            createTrainingSession(
                training.id,
                "root",
                trainingLines.length,
                0,
            );

        startLine(
            firstLine,
            0,
            restartedSession,
        );

        setFeedback(
            null,
        );

        setNoteSuggestionShown(
            false,
        );
    }

    const totalAttempts =
        session.correctMoves +
        session.incorrectMoves;

    const accuracy =
        totalAttempts === 0
            ? 0
            : Math.round(
                (
                    session.correctMoves /
                    totalAttempts
                ) * 100,
            );

    const completedLines =
        session.completedLineIds.length;

    /*
     * Información de depuración.
     *
     * La mantendremos mientras desarrollamos
     * el entrenador y la eliminaremos antes
     * de producción.
     */
    const expectedNodeId =
        getNextNodeInLine(
            session.currentLineIndex,
            session.currentNodeId,
        );

    const expectedMove =
        expectedNodeId
            ? nodes[
                expectedNodeId
            ]?.san ?? "—"
            : "—";

    return (
        <section className="training-workspace">
            <header className="training-workspace-header">
                <div>
                    <span className="training-workspace-label">
                        Entrenamiento
                    </span>

                    <h2>
                        {training.name}
                    </h2>

                    <p>
                        {studyName}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                >
                    Volver al estudio
                </button>
            </header>

            {feedback && (
                <div
                    className={`training-feedback ${feedback.type}`}
                >
                    <div className="training-feedback-message">
                        {
                            feedback.message
                        }
                    </div>

                    {feedback.explanation && (
                        <div className="training-feedback-explanation">
                            <strong>
                                Nota del estudio
                            </strong>

                            <span>
                                {
                                    feedback.explanation
                                }
                            </span>
                        </div>
                    )}

                    {feedback.suggestedNoteNodeId && (
                        <div className="training-feedback-note-suggestion">
                            <div>
                                <strong>
                                    ¿Quieres entender mejor esta jugada?
                                </strong>

                                <span>
                                    Añade una nota explicando por qué
                                    se juega. Podrás usarla como ayuda
                                    en futuros entrenamientos.
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    onAddNote(
                                        feedback
                                            .suggestedNoteNodeId!,
                                    )
                                }
                            >
                                Añadir nota
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className="training-session-layout">
                <div className="training-board-section">
                    <div className="training-board">
                        <Chessboard
                            options={{
                                position,

                                boardOrientation:
                                    training.side ===
                                        "white"
                                        ? "white"
                                        : "black",

                                onPieceDrop: ({
                                    sourceSquare,
                                    targetSquare,
                                }) => {
                                    if (
                                        !targetSquare ||
                                        !userTurn
                                    ) {
                                        return false;
                                    }

                                    return makeTrainingMove(
                                        sourceSquare,
                                        targetSquare,
                                    );
                                },

                                boardStyle: {
                                    borderRadius:
                                        "8px",

                                    boxShadow:
                                        "0 8px 24px rgba(0, 0, 0, 0.16)",
                                },

                                lightSquareStyle: {
                                    backgroundColor:
                                        "#e8e1d1",
                                },

                                darkSquareStyle: {
                                    backgroundColor:
                                        "#77906f",
                                },
                            }}
                        />
                    </div>

                    {session.completed && (
                        <button
                            type="button"
                            className="training-restart-button"
                            onClick={
                                restartTraining
                            }
                        >
                            Repetir entrenamiento
                        </button>
                    )}
                </div>

                <aside className="training-session-panel">
                    <h3>
                        Sesión
                    </h3>

                    <div className="training-session-stat">
                        <span>
                            Esperado
                        </span>

                        <strong>
                            {expectedMove}
                        </strong>
                    </div>

                    <div className="training-session-stat">
                        <span>
                            Progreso
                        </span>

                        <strong>
                            {completedLines}
                            {" / "}
                            {
                                trainingLines.length
                            }
                        </strong>
                    </div>

                    <div className="training-session-stat">
                        <span>
                            Línea actual
                        </span>

                        <strong>
                            {
                                session.currentLineIndex +
                                1
                            }
                            {" / "}
                            {
                                trainingLines.length
                            }
                        </strong>
                    </div>

                    <div className="training-session-stat">
                        <span>
                            Aciertos
                        </span>

                        <strong>
                            {
                                session.correctMoves
                            }
                        </strong>
                    </div>

                    <div className="training-session-stat">
                        <span>
                            Errores
                        </span>

                        <strong>
                            {
                                session.incorrectMoves
                            }
                        </strong>
                    </div>

                    <div className="training-session-stat">
                        <span>
                            Precisión
                        </span>

                        <strong>
                            {accuracy}%
                        </strong>
                    </div>

                    <div className="training-session-status">
                        {session.completed
                            ? "Completado"
                            : opponentThinking
                                ? "Juega Chessktop..."
                                : userTurn
                                    ? "Tu turno"
                                    : "Preparando posición"}
                    </div>
                </aside>
            </div>
        </section>
    );
}