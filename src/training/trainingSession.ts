import type {
    TrainingSession,
} from "./types";

export function createTrainingSession(
    trainingId: string,
    startNodeId = "root",
): TrainingSession {
    return {
        trainingId,

        currentNodeId:
            startNodeId,

        startedAt:
            new Date().toISOString(),

        correctMoves: 0,
        incorrectMoves: 0,

        completed: false,
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
): TrainingSession {
    return {
        ...session,

        incorrectMoves:
            session.incorrectMoves + 1,
    };
}

export function completeTrainingSession(
    session: TrainingSession,
): TrainingSession {
    return {
        ...session,

        completed: true,
    };
}