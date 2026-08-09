import type {
    TrainingSession,
} from "./types";

const PROBLEMATIC_POSITION_THRESHOLD =
    2;

export function createTrainingSession(
    trainingId: string,
    startNodeId = "root",
    totalLines = 1,
    currentLineIndex = 0,
): TrainingSession {
    return {
        trainingId,

        currentNodeId:
            startNodeId,

        startedAt:
            new Date().toISOString(),

        completedAt: null,

        phase: "main",

        currentLineIndex,
        totalLines,

        correctMoves: 0,
        incorrectMoves: 0,

        completed: false,

        completedLineIds: [],

        positionMistakes: {},

        problematicNodeIds: [],

        reviewNodeIds: [],
        currentReviewIndex: 0,
    };
}

export function registerCorrectMove(
    session: TrainingSession,
    nextNodeId: string,
): TrainingSession {
    return {
        ...session,

        currentNodeId:
            nextNodeId,

        correctMoves:
            session.correctMoves + 1,
    };
}

export function registerIncorrectMove(
    session: TrainingSession,
    positionNodeId: string,
): TrainingSession {
    const previousMistakes =
        session.positionMistakes[
        positionNodeId
        ] ?? 0;

    const nextMistakes =
        previousMistakes + 1;

    const positionBecomesProblematic =
        nextMistakes >=
        PROBLEMATIC_POSITION_THRESHOLD;

    const alreadyProblematic =
        session.problematicNodeIds.includes(
            positionNodeId,
        );

    return {
        ...session,

        incorrectMoves:
            session.incorrectMoves + 1,

        positionMistakes: {
            ...session.positionMistakes,

            [positionNodeId]:
                nextMistakes,
        },

        problematicNodeIds:
            positionBecomesProblematic &&
                !alreadyProblematic
                ? [
                    ...session.problematicNodeIds,
                    positionNodeId,
                ]
                : session.problematicNodeIds,
    };
}

export function completeTrainingSession(
    session: TrainingSession,
): TrainingSession {
    return {
        ...session,

        phase: "completed",

        completed: true,

        completedAt:
            new Date().toISOString(),
    };
}