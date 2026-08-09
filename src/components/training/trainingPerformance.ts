import type {
    TrainingPerformance,
    TrainingPositionPerformance,
    TrainingSession,
} from "./types";

function getSessionDurationMs(
    session: TrainingSession,
): number {
    if (!session.completedAt) {
        return 0;
    }

    const startedAt =
        new Date(
            session.startedAt,
        ).getTime();

    const completedAt =
        new Date(
            session.completedAt,
        ).getTime();

    if (
        Number.isNaN(startedAt) ||
        Number.isNaN(completedAt)
    ) {
        return 0;
    }

    return Math.max(
        0,
        completedAt - startedAt,
    );
}

function createEmptyTrainingPerformance(
    trainingId: string,
): TrainingPerformance {
    return {
        trainingId,

        totalSessions: 0,
        completedSessions: 0,

        totalCorrectMoves: 0,
        totalIncorrectMoves: 0,

        totalTrainingTimeMs: 0,

        lastTrainedAt: null,

        positions: {},
    };
}

function updatePositionPerformance(
    previous:
        TrainingPositionPerformance | undefined,

    nodeId: string,

    incorrectMoves: number,

    wasProblematic: boolean,

    seenAt: string,
): TrainingPositionPerformance {
    const previousPerformance =
        previous ?? {
            nodeId,

            sessionsSeen: 0,

            correctMoves: 0,
            incorrectMoves: 0,

            timesProblematic: 0,

            lastSeenAt:
                seenAt,
        };

    /*
     * En esta primera versión histórica
     * sabemos con precisión cuántos errores
     * hubo desde una posición.
     *
     * Los aciertos por posición los podremos
     * hacer todavía más precisos cuando
     * registremos intentos individuales.
     *
     * De momento consideramos que una posición
     * vista en una sesión terminada acabó siendo
     * resuelta correctamente.
     */
    return {
        ...previousPerformance,

        sessionsSeen:
            previousPerformance
                .sessionsSeen + 1,

        correctMoves:
            previousPerformance
                .correctMoves + 1,

        incorrectMoves:
            previousPerformance
                .incorrectMoves +
            incorrectMoves,

        timesProblematic:
            previousPerformance
                .timesProblematic +
            (
                wasProblematic
                    ? 1
                    : 0
            ),

        lastSeenAt:
            seenAt,
    };
}

export function updateTrainingPerformance(
    previousPerformance:
        TrainingPerformance | undefined,

    session: TrainingSession,
): TrainingPerformance {
    const performance =
        previousPerformance ??
        createEmptyTrainingPerformance(
            session.trainingId,
        );

    const completedAt =
        session.completedAt ??
        new Date().toISOString();

    const updatedPositions = {
        ...performance.positions,
    };

    /*
     * positionMistakes contiene únicamente
     * posiciones en las que hubo algún fallo.
     */
    for (
        const [
            nodeId,
            incorrectMoves,
        ]
        of Object.entries(
            session.positionMistakes,
        )
    ) {
        const wasProblematic =
            session.problematicNodeIds.includes(
                nodeId,
            );

        updatedPositions[nodeId] =
            updatePositionPerformance(
                updatedPositions[nodeId],
                nodeId,
                incorrectMoves,
                wasProblematic,
                completedAt,
            );
    }

    return {
        ...performance,

        trainingId:
            session.trainingId,

        totalSessions:
            performance.totalSessions + 1,

        completedSessions:
            performance.completedSessions +
            (
                session.completed
                    ? 1
                    : 0
            ),

        totalCorrectMoves:
            performance.totalCorrectMoves +
            session.correctMoves,

        totalIncorrectMoves:
            performance.totalIncorrectMoves +
            session.incorrectMoves,

        totalTrainingTimeMs:
            performance.totalTrainingTimeMs +
            getSessionDurationMs(
                session,
            ),

        lastTrainedAt:
            completedAt,

        positions:
            updatedPositions,
    };
}

export function getHistoricalAccuracy(
    performance:
        TrainingPerformance | undefined,
): number | null {
    if (!performance) {
        return null;
    }

    const totalAttempts =
        performance.totalCorrectMoves +
        performance.totalIncorrectMoves;

    if (
        totalAttempts === 0
    ) {
        return null;
    }

    return Math.round(
        (
            performance.totalCorrectMoves /
            totalAttempts
        ) * 100,
    );
}