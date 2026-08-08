import {
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
    TrainingSession,
} from "../training/types";

import {
    chooseOpponentResponse,
    createTrainingPosition,
    getOpponentResponses,
    isTrainingSideTurn,
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
    onClose: () => void;
};

type TrainingFeedback =
    | {
        type: "correct";
        message: string;
    }
    | {
        type: "incorrect";
        message: string;
    }
    | {
        type: "complete";
        message: string;
    }
    | null;

/*
 * Si al comenzar una sesión es turno del rival,
 * Chessktop realiza automáticamente su jugada.
 *
 * Por ejemplo:
 *
 * entrenamiento con negras
 * posición inicial
 * → Chessktop juega 1.e4
 * → ahora responde el usuario.
 */
function getInitialTrainingNodeId(
    training: Training,
    studyContent: StudyContent,
): string {
    const nodes =
        studyContent.nodes;

    const root =
        nodes.root;

    if (!root) {
        return "root";
    }

    if (
        isTrainingSideTurn(
            root.ply,
            training.side,
        )
    ) {
        return "root";
    }

    const responses =
        getOpponentResponses(
            nodes,
            "root",
            training,
        );

    return (
        chooseOpponentResponse(
            responses,
            training.order,
        ) ?? "root"
    );
}

export default function TrainingWorkspace({
    training,
    studyName,
    studyContent,
    onClose,
}: TrainingWorkspaceProps) {
    const nodes =
        studyContent.nodes;

    /*
     * Se calcula solo al montar este workspace.
     */
    const [session, setSession] =
        useState<TrainingSession>(() => {
            const initialNodeId =
                getInitialTrainingNodeId(
                    training,
                    studyContent,
                );

            return createTrainingSession(
                training.id,
                initialNodeId,
            );
        });

    const currentNode =
        nodes[
        session.currentNodeId
        ] ?? nodes.root;

    const [position, setPosition] =
        useState(
            () =>
                currentNode.fen,
        );

    const [
        feedback,
        setFeedback,
    ] =
        useState<TrainingFeedback>(
            null,
        );

    // const currentNode =
    //     nodes[
    //     session.currentNodeId
    //     ] ?? nodes.root;

    const trainingPosition =
        createTrainingPosition(
            nodes,
            session.currentNodeId,
            training,
        );

    const userTurn =
        !session.completed &&
        trainingPosition !== null;

    // function makeLocalMove(
    //     sourceSquare: string,
    //     targetSquare: string,
    // ): boolean {
    //     const game =
    //         new Chess(position);

    //     try {
    //         game.move({
    //             from: sourceSquare,
    //             to: targetSquare,
    //             promotion: "q",
    //         });

    //         setPosition(
    //             game.fen(),
    //         );

    //         return true;
    //     } catch {
    //         return false;
    //     }
    // }

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

        const game =
            new Chess(position);

        let attemptedMove;

        try {
            attemptedMove =
                game.move({
                    from: sourceSquare,
                    to: targetSquare,
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
            setSession(
                (previousSession) =>
                    registerIncorrectMove(
                        previousSession,
                    ),
            );

            setFeedback({
                type: "incorrect",
                message:
                    "Ese movimiento no está en tu repertorio.",
            });

            return false;
        }

        const matchedNode =
            nodes[
            result.matchedNodeId
            ];

        if (!matchedNode) {
            return false;
        }

        const sessionAfterUserMove =
            registerCorrectMove(
                session,
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
            nodes[userMoveNodeId];

        if (!userMoveNode) {
            finishSession(
                sessionAfterUserMove,
            );

            return;
        }

        const opponentResponses =
            getOpponentResponses(
                nodes,
                userMoveNodeId,
                training,
            );

        const opponentNodeId =
            chooseOpponentResponse(
                opponentResponses,
                training.order,
            );

        if (!opponentNodeId) {
            setPosition(
                userMoveNode.fen,
            );

            finishSession(
                sessionAfterUserMove,
            );

            return;
        }

        const opponentNode =
            nodes[opponentNodeId];

        if (!opponentNode) {
            finishSession(
                sessionAfterUserMove,
            );

            return;
        }

        setPosition(
            opponentNode.fen,
        );

        const sessionAfterOpponent:
            TrainingSession = {
            ...sessionAfterUserMove,

            currentNodeId:
                opponentNodeId,
        };

        const nextTrainingPosition =
            createTrainingPosition(
                nodes,
                opponentNodeId,
                training,
            );

        if (!nextTrainingPosition) {
            finishSession(
                sessionAfterOpponent,
            );

            return;
        }

        setSession(
            sessionAfterOpponent,
        );
    }
    
    function finishSession(
        currentSession:
            TrainingSession,
    ) {
        const completedSession =
            completeTrainingSession(
                currentSession,
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
     * Después de una jugada correcta del usuario,
     * Chessktop realiza la respuesta del rival.
     */
    // function continueAfterCorrectMove(
    //     sessionAfterUserMove:
    //         TrainingSession,
    //     matchedNodeId: string,
    // ) {
    //     const matchedNode =
    //         nodes[matchedNodeId];

    //     if (!matchedNode) {
    //         finishSession(
    //             sessionAfterUserMove,
    //         );

    //         return;
    //     }

    //     /*
    //      * Si después de nuestra jugada vuelve
    //      * a tocarnos, simplemente seguimos ahí.
    //      *
    //      * Normalmente será turno del rival,
    //      * pero dejamos la comprobación explícita.
    //      */
    //     if (
    //         isTrainingSideTurn(
    //             matchedNode.ply,
    //             training.side,
    //         )
    //     ) {
    //         const nextPosition =
    //             createTrainingPosition(
    //                 nodes,
    //                 matchedNodeId,
    //                 training,
    //             );

    //         if (!nextPosition) {
    //             finishSession(
    //                 sessionAfterUserMove,
    //             );

    //             return;
    //         }

    //         setSession(
    //             sessionAfterUserMove,
    //         );

    //         return;
    //     }

    //     const opponentResponses =
    //         getOpponentResponses(
    //             nodes,
    //             matchedNodeId,
    //             training,
    //         );

    //     const opponentNodeId =
    //         chooseOpponentResponse(
    //             opponentResponses,
    //             training.order,
    //         );

    //     /*
    //      * Si el rival no tiene continuación,
    //      * hemos llegado al final de la línea.
    //      */
    //     if (!opponentNodeId) {
    //         finishSession(
    //             sessionAfterUserMove,
    //         );

    //         return;
    //     }

    //     const sessionAfterOpponent = {
    //         ...sessionAfterUserMove,
    //         currentNodeId:
    //             opponentNodeId,
    //     };

    //     const nextPosition =
    //         createTrainingPosition(
    //             nodes,
    //             opponentNodeId,
    //             training,
    //         );

    //     /*
    //      * Puede ocurrir que la respuesta rival
    //      * sea el último movimiento del árbol.
    //      */
    //     if (!nextPosition) {
    //         finishSession(
    //             sessionAfterOpponent,
    //         );

    //         return;
    //     }

    //     setSession(
    //         sessionAfterOpponent,
    //     );
    // }

    // function makeTrainingMove(
    //     sourceSquare: string,
    //     targetSquare: string,
    // ): boolean {
    //     if (
    //         session.completed ||
    //         !trainingPosition
    //     ) {
    //         return false;
    //     }

    //     /*
    //      * Primero comprobamos que sea una
    //      * jugada legal de ajedrez.
    //      */
    //     const game =
    //         new Chess(position);

    //     let attemptedMove;

    //     try {
    //         attemptedMove = game.move({
    //             from: sourceSquare,
    //             to: targetSquare,
    //             promotion: "q",
    //         });
    //     } catch {
    //         return false;
    //     }

    //     /*
    //      * Ahora comprobamos que la jugada,
    //      * además de ser legal, exista en
    //      * nuestro repertorio.
    //      */
    //     const result =
    //         validateTrainingMove(
    //             nodes,
    //             trainingPosition,
    //             attemptedMove.from,
    //             attemptedMove.to,
    //             attemptedMove.promotion,
    //         );

    //     if (!result.correct) {
    //         setSession(
    //             (currentSession) =>
    //                 registerIncorrectMove(
    //                     currentSession,
    //                 ),
    //         );

    //         setFeedback({
    //             type: "incorrect",
    //             message:
    //                 "Ese movimiento no está en tu repertorio.",
    //         });

    //         /*
    //          * Devolvemos false para que el tablero
    //          * vuelva a colocar la pieza.
    //          */
    //         return false;
    //     }

    //     const nextSession =
    //         registerCorrectMove(
    //             session,
    //             result.matchedNodeId,
    //         );

    //     setFeedback({
    //         type: "correct",
    //         message:
    //             "Movimiento correcto.",
    //     });

    //     continueAfterCorrectMove(
    //         nextSession,
    //         result.matchedNodeId,
    //     );

    //     return true;
    // }

    function restartTraining() {
        const initialNodeId =
            getInitialTrainingNodeId(
                training,
                studyContent,
            );

        const initialNode =
            nodes[
            initialNodeId
            ] ?? nodes.root;

        setSession(
            createTrainingSession(
                training.id,
                initialNodeId,
            ),
        );

        setPosition(
            initialNode.fen,
        );

        setFeedback(null);
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
                    {feedback.message}
                </div>
            )}

            <div className="training-session-layout">
                <div className="training-board-section">
                    <div className="training-board">
                        <Chessboard
                            options={{
                                position,

                                boardOrientation:
                                    training.side === "white"
                                        ? "white"
                                        : "black",

                                onPieceDrop: ({
                                    sourceSquare,
                                    targetSquare,
                                }) => {
                                    if (!targetSquare || !userTurn) {
                                        return false;
                                    }

                                    return makeTrainingMove(
                                        sourceSquare,
                                        targetSquare,
                                    );
                                },

                                boardStyle: {
                                    borderRadius: "8px",
                                    boxShadow:
                                        "0 8px 24px rgba(0, 0, 0, 0.16)",
                                },

                                lightSquareStyle: {
                                    backgroundColor: "#e8e1d1",
                                },

                                darkSquareStyle: {
                                    backgroundColor: "#77906f",
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
                            Juegas con
                        </span>

                        <strong>
                            {training.side ===
                                "white"
                                ? "Blancas"
                                : "Negras"}
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
                            : userTurn
                                ? "Tu turno"
                                : "Preparando posición"}
                    </div>
                </aside>
            </div>
        </section>
    );
}