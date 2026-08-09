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
    onSessionCompleted: (
        session: TrainingSession,
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

        explanation?: string;

        suggestedNoteNodeId?: string;

        solutionNodeId?: string;

        solutionMove?: string;
    }
    | null;

const OPPONENT_MOVE_DELAY_MS =
    500;

const SHOW_SOLUTION_AFTER_MISTAKES =
    2;

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

    if (
        training.side === "white"
    ) {
        return "root";
    }

    const firstMoveId =
        line.nodeIds[1];

    return (
        firstMoveId &&
            nodes[firstMoveId]
            ? firstMoveId
            : "root"
    );
}

function formatTrainingDuration(
    startedAt: string,
    completedAt: string | null,
): string {
    if (!completedAt) {
        return "—";
    }

    const started =
        new Date(
            startedAt,
        ).getTime();

    const completed =
        new Date(
            completedAt,
        ).getTime();

    const durationMs =
        Math.max(
            0,
            completed - started,
        );

    const totalSeconds =
        Math.floor(
            durationMs / 1000,
        );

    const minutes =
        Math.floor(
            totalSeconds / 60,
        );

    const seconds =
        totalSeconds % 60;

    if (minutes === 0) {
        return `${seconds} s`;
    }

    return `${minutes} min ${seconds} s`;
}

export default function TrainingWorkspace({
    training,
    studyName,
    studyContent,
    onAddNote,
    onSessionCompleted,
    onClose,
}: TrainingWorkspaceProps) {
    const nodes =
        studyContent.nodes;

    const rootFen =
        nodes.root?.fen ??
        new Chess().fen();

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

    const sessionReportedRef =
        useRef(false);

    const trainingPosition =
        createTrainingPosition(
            nodes,
            session.currentNodeId,
            training,
        );

    const interactivePhase =
        session.phase === "main" ||
        session.phase === "review";

    const userTurn =
        interactivePhase &&
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

    function getExpectedNodeId():
        string | null {
        if (
            session.phase === "review"
        ) {
            return (
                trainingPosition
                    ?.validMoveNodeIds[0] ??
                null
            );
        }

        if (
            session.phase === "main"
        ) {
            return getNextNodeInLine(
                session.currentLineIndex,
                session.currentNodeId,
            );
        }

        return null;
    }

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

            phase: "main",

            currentNodeId:
                initialNodeId,

            currentLineIndex:
                lineIndex,

            completed: false,
        };

        clearOpponentTimeout();

        setSession(
            nextSession,
        );

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

        setPosition(
            initialNode.fen,
        );

        setOpponentThinking(
            false,
        );
    }

    function showSolution(
        nodeId: string,
    ) {
        const solutionNode =
            nodes[nodeId];

        if (!solutionNode) {
            return;
        }

        const solutionMove =
            solutionNode.san?.trim() ||
            (
                solutionNode.from &&
                    solutionNode.to
                    ? `${solutionNode.from} → ${solutionNode.to}`
                    : "Movimiento correcto"
            );

        setFeedback(
            (previousFeedback) => {
                if (
                    !previousFeedback ||
                    previousFeedback.type !==
                    "incorrect"
                ) {
                    return previousFeedback;
                }

                return {
                    ...previousFeedback,

                    solutionMove,
                };
            },
        );
    }

    function prepareReview(
        currentSession:
            TrainingSession,
    ) {
        const reviewNodeIds = [
            ...currentSession
                .problematicNodeIds,
        ];

        if (
            reviewNodeIds.length === 0
        ) {
            completeSession(
                currentSession,
            );

            return;
        }

        clearOpponentTimeout();

        setOpponentThinking(
            false,
        );

        setFeedback(
            null,
        );

        setSession({
            ...currentSession,

            phase:
                "review-intro",

            reviewNodeIds,

            currentReviewIndex: 0,

            completed: false,
        });
    }

    function startReview() {
        const firstReviewNodeId =
            session.reviewNodeIds[0];

        if (!firstReviewNodeId) {
            completeSession(
                session,
            );

            return;
        }

        const reviewNode =
            nodes[
            firstReviewNodeId
            ];

        if (!reviewNode) {
            completeSession(
                session,
            );

            return;
        }

        setSession({
            ...session,

            phase: "review",

            currentNodeId:
                firstReviewNodeId,

            currentReviewIndex: 0,

            completed: false,
        });

        setPosition(
            reviewNode.fen,
        );

        setFeedback(
            null,
        );

        setOpponentThinking(
            false,
        );
    }

    function startNextReviewPosition(
        currentSession:
            TrainingSession,
    ) {
        const nextReviewIndex =
            currentSession
                .currentReviewIndex + 1;

        const nextReviewNodeId =
            currentSession
                .reviewNodeIds[
            nextReviewIndex
            ];

        if (!nextReviewNodeId) {
            completeSession(
                currentSession,
            );

            return;
        }

        const nextReviewNode =
            nodes[
            nextReviewNodeId
            ];

        if (!nextReviewNode) {
            completeSession(
                currentSession,
            );

            return;
        }

        setSession({
            ...currentSession,

            phase: "review",

            currentReviewIndex:
                nextReviewIndex,

            currentNodeId:
                nextReviewNodeId,
        });

        setPosition(
            nextReviewNode.fen,
        );

        setFeedback({
            type: "correct",

            message:
                "Posición superada. Siguiente repaso.",
        });

        setOpponentThinking(
            false,
        );
    }

    function completeReviewPosition(
        sessionAfterUserMove:
            TrainingSession,
        matchedNodeId: string,
    ) {
        const matchedNode =
            nodes[
            matchedNodeId
            ];

        if (!matchedNode) {
            startNextReviewPosition(
                sessionAfterUserMove,
            );

            return;
        }

        setSession(
            sessionAfterUserMove,
        );

        setPosition(
            matchedNode.fen,
        );

        setFeedback({
            type: "correct",

            message:
                "Movimiento correcto.",
        });

        setOpponentThinking(
            true,
        );

        clearOpponentTimeout();

        opponentTimeoutRef.current =
            window.setTimeout(() => {
                opponentTimeoutRef.current =
                    null;

                setOpponentThinking(
                    false,
                );

                startNextReviewPosition(
                    sessionAfterUserMove,
                );
            }, OPPONENT_MOVE_DELAY_MS);
    }

    function makeTrainingMove(
        sourceSquare: string,
        targetSquare: string,
    ): boolean {
        if (
            session.completed ||
            !trainingPosition ||
            !interactivePhase
        ) {
            return false;
        }

        const positionNodeId =
            session.currentNodeId;

        const expectedNodeId =
            getExpectedNodeId();

        const expectedNode =
            expectedNodeId
                ? nodes[
                expectedNodeId
                ]
                : null;

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

        const result =
            validateTrainingMove(
                nodes,
                trainingPosition,
                attemptedMove.from,
                attemptedMove.to,
                attemptedMove.promotion,
            );

        if (!result.correct) {
            const sessionAfterIncorrect =
                registerIncorrectMove(
                    session,
                    positionNodeId,
                );

            setSession(
                sessionAfterIncorrect,
            );

            const mistakesInPosition =
                sessionAfterIncorrect
                    .positionMistakes[
                positionNodeId
                ] ?? 0;

            const explanation =
                expectedNode
                    ?.note
                    ?.trim();

            const canShowSolution =
                Boolean(
                    expectedNode,
                ) &&
                mistakesInPosition >=
                SHOW_SOLUTION_AFTER_MISTAKES;

            if (explanation) {
                setFeedback({
                    type: "incorrect",

                    message:
                        mistakesInPosition >=
                            SHOW_SOLUTION_AFTER_MISTAKES
                            ? "Segundo intento incorrecto."
                            : "Ese movimiento no está en tu repertorio.",

                    explanation,

                    solutionNodeId:
                        canShowSolution
                            ? expectedNodeId ??
                            undefined
                            : undefined,
                });
            } else if (
                expectedNode &&
                !noteSuggestionShown &&
                mistakesInPosition === 1
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
                        mistakesInPosition >=
                            SHOW_SOLUTION_AFTER_MISTAKES
                            ? "Segundo intento incorrecto."
                            : "Ese movimiento no está en tu repertorio.",

                    solutionNodeId:
                        canShowSolution
                            ? expectedNodeId ??
                            undefined
                            : undefined,
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

        if (
            session.phase === "review"
        ) {
            const sessionAfterUserMove =
                registerCorrectMove(
                    session,
                    result.matchedNodeId,
                );

            completeReviewPosition(
                sessionAfterUserMove,
                result.matchedNodeId,
            );

            return true;
        }

        let targetLineIndex =
            session.currentLineIndex;

        if (
            result.matchedNodeId !==
            expectedNodeId
        ) {
            const compatibleLineIndex =
                findCompatiblePendingLineIndex(
                    positionNodeId,
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
            finishMainLine(
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

        if (!opponentNodeId) {
            setPosition(
                userMoveNode.fen,
            );

            setSession(
                sessionAfterUserMove,
            );

            finishMainLine(
                sessionAfterUserMove,
            );

            return;
        }

        const opponentNode =
            nodes[
            opponentNodeId
            ];

        if (!opponentNode) {
            finishMainLine(
                sessionAfterUserMove,
            );

            return;
        }

        setSession(
            sessionAfterUserMove,
        );

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
                    finishMainLine(
                        sessionAfterOpponent,
                    );

                    return;
                }

                setSession(
                    sessionAfterOpponent,
                );
            }, OPPONENT_MOVE_DELAY_MS);
    }

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

    function finishMainLine(
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

        prepareReview(
            sessionWithCompletedLine,
        );
    }

    function completeSession(
        currentSession:
            TrainingSession,
    ) {
        clearOpponentTimeout();

        setOpponentThinking(
            false,
        );

        const completedSession =
            completeTrainingSession(
                currentSession,
            );

        setSession(
            completedSession,
        );

        /*
         * Solo registramos esta sesión
         * una vez aunque React vuelva
         * a renderizar el componente.
         */
        if (
            !sessionReportedRef.current
        ) {
            sessionReportedRef.current =
                true;

            onSessionCompleted(
                completedSession,
            );
        }

        setFeedback({
            type: "complete",

            message:
                "Entrenamiento completado.",
        });
    }

    function restartTraining() {
        sessionReportedRef.current =
            false;

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

    const expectedNodeId =
        getExpectedNodeId();

    const expectedMove =
        expectedNodeId
            ? nodes[
                expectedNodeId
            ]?.san ?? "—"
            : "—";

    const currentPositionMistakes =
        session.positionMistakes[
        session.currentNodeId
        ] ?? 0;

    const reviewProgress =
        session.phase === "review"
            ? session.currentReviewIndex + 1
            : 0;

    const duration =
        formatTrainingDuration(
            session.startedAt,
            session.completedAt,
        );

    const reviewedPositions =
        session.reviewNodeIds.length;

    if (
        session.phase === "completed"
    ) {
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

                <div className="training-results">
                    <div className="training-results-header">
                        <span className="training-results-label">
                            Sesión terminada
                        </span>

                        <h3>
                            Entrenamiento completado
                        </h3>

                        <p>
                            Has terminado todas las líneas
                            y los repasos pendientes de
                            esta sesión.
                        </p>
                    </div>

                    <div
                        className="training-results-accuracy"
                        style={{
                            background: `conic-gradient(
            #667d62 ${accuracy}%,
            #e5e8e2 ${accuracy}% 100%
        )`,
                        }}
                    >
                        <div className="training-results-accuracy-inner">
                            <strong>
                                {accuracy}%
                            </strong>

                            <span>
                                Precisión
                            </span>
                        </div>
                    </div>

                    <div className="training-results-grid">
                        <div className="training-result-card">
                            <span>
                                Aciertos
                            </span>

                            <strong>
                                {
                                    session.correctMoves
                                }
                            </strong>
                        </div>

                        <div className="training-result-card">
                            <span>
                                Errores
                            </span>

                            <strong>
                                {
                                    session.incorrectMoves
                                }
                            </strong>
                        </div>

                        <div className="training-result-card">
                            <span>
                                Líneas
                            </span>

                            <strong>
                                {
                                    session
                                        .completedLineIds
                                        .length
                                }
                                {" / "}
                                {
                                    session.totalLines
                                }
                            </strong>
                        </div>

                        <div className="training-result-card">
                            <span>
                                Posiciones problemáticas
                            </span>

                            <strong>
                                {
                                    session
                                        .problematicNodeIds
                                        .length
                                }
                            </strong>
                        </div>

                        <div className="training-result-card">
                            <span>
                                Posiciones repasadas
                            </span>

                            <strong>
                                {
                                    reviewedPositions
                                }
                            </strong>
                        </div>

                        <div className="training-result-card">
                            <span>
                                Duración
                            </span>

                            <strong>
                                {duration}
                            </strong>
                        </div>
                    </div>

                    {session.problematicNodeIds.length ===
                        0 ? (
                        <div className="training-results-message success">
                            No has tenido posiciones
                            problemáticas en esta sesión.
                        </div>
                    ) : (
                        <div className="training-results-message">
                            Has tenido dificultades en{" "}
                            <strong>
                                {
                                    session
                                        .problematicNodeIds
                                        .length
                                }
                            </strong>{" "}
                            {session.problematicNodeIds.length ===
                                1
                                ? "posición"
                                : "posiciones"}
                            . Chessktop las ha incluido
                            en el repaso final.
                        </div>
                    )}

                    <div className="training-results-actions">
                        <button
                            type="button"
                            className="training-results-restart"
                            onClick={
                                restartTraining
                            }
                        >
                            Repetir entrenamiento
                        </button>

                        <button
                            type="button"
                            className="training-results-close"
                            onClick={
                                onClose
                            }
                        >
                            Volver al estudio
                        </button>
                    </div>
                </div>
            </section>
        );
    }

    if (
        session.phase ===
        "review-intro"
    ) {
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
                        onClick={
                            onClose
                        }
                    >
                        Volver al estudio
                    </button>
                </header>

                <div className="training-review-intro">
                    <span className="training-review-intro-label">
                        Repaso
                    </span>

                    <h3>
                        Vamos a entrenar las posiciones
                        que has fallado antes
                    </h3>

                    <p>
                        Has completado todas las líneas
                        del entrenamiento. Ahora vamos a
                        volver directamente a las posiciones
                        que te han dado más problemas.
                    </p>

                    <div className="training-review-count">
                        <strong>
                            {
                                session
                                    .reviewNodeIds
                                    .length
                            }
                        </strong>

                        <span>
                            {session.reviewNodeIds.length === 1
                                ? "posición por repasar"
                                : "posiciones por repasar"}
                        </span>
                    </div>

                    <button
                        type="button"
                        className="training-review-start-button"
                        onClick={
                            startReview
                        }
                    >
                        Empezar repaso
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section className="training-workspace">
            <header className="training-workspace-header">
                <div>
                    <span className="training-workspace-label">
                        {session.phase === "review"
                            ? "Repaso"
                            : "Entrenamiento"}
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

                    {feedback.solutionNodeId &&
                        !feedback.solutionMove && (
                            <div className="training-feedback-solution">
                                <span>
                                    ¿Necesitas ayuda?
                                </span>

                                <button
                                    type="button"
                                    onClick={() =>
                                        showSolution(
                                            feedback
                                                .solutionNodeId!,
                                        )
                                    }
                                >
                                    Mostrar solución
                                </button>
                            </div>
                        )}

                    {feedback.solutionMove && (
                        <div className="training-feedback-solution-revealed">
                            <strong>
                                Solución
                            </strong>

                            <span>
                                La jugada era{" "}
                                <b>
                                    {
                                        feedback.solutionMove
                                    }
                                </b>
                            </span>

                            <small>
                                Ahora realiza tú el movimiento
                                para continuar.
                            </small>
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
                </div>

                <aside className="training-session-panel">
                    <h3>
                        {session.phase === "review"
                            ? "Repaso"
                            : "Sesión"}
                    </h3>

                    <div className="training-session-stat">
                        <span>
                            Esperado
                        </span>

                        <strong>
                            {expectedMove}
                        </strong>
                    </div>

                    {session.phase === "main" && (
                        <>
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
                        </>
                    )}

                    {session.phase === "review" && (
                        <div className="training-session-stat">
                            <span>
                                Posición
                            </span>

                            <strong>
                                {reviewProgress}
                                {" / "}
                                {
                                    session
                                        .reviewNodeIds
                                        .length
                                }
                            </strong>
                        </div>
                    )}

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
                            Errores aquí
                        </span>

                        <strong>
                            {
                                currentPositionMistakes
                            }
                        </strong>
                    </div>

                    <div className="training-session-stat">
                        <span>
                            Posiciones problemáticas
                        </span>

                        <strong>
                            {
                                session
                                    .problematicNodeIds
                                    .length
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
                        {opponentThinking
                            ? session.phase === "review"
                                ? "Preparando siguiente posición..."
                                : "Juega Chessktop..."
                            : userTurn
                                ? "Tu turno"
                                : "Preparando posición"}
                    </div>
                </aside>
            </div>
        </section>
    );
}