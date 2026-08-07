import type {
    Training,
    TrainingMode,
    TrainingOrder,
    TrainingSide,
    TrainingsMap,
} from "./types";

type CreateTrainingOptions = {
    studyId: string;
    name: string;
    side: TrainingSide;

    mode?: TrainingMode;

    selectedNodeIds?: string[];

    order?: TrainingOrder;
};

export function createTraining({
    studyId,
    name,
    side,
    mode = "all-lines",
    selectedNodeIds = [],
    order = "random",
}: CreateTrainingOptions): Training {
    const trimmedName =
        name.trim();

    if (!trimmedName) {
        throw new Error(
            "El entrenamiento necesita un nombre.",
        );
    }

    const now =
        new Date().toISOString();

    return {
        id: crypto.randomUUID(),

        studyId,

        name: trimmedName,

        side,

        mode,

        selectedNodeIds:
            mode === "selected-lines"
                ? selectedNodeIds
                : [],

        order,

        createdAt: now,
        updatedAt: now,
    };
}

export function addTraining(
    trainings: TrainingsMap,
    training: Training,
): TrainingsMap {
    return {
        ...trainings,

        [training.id]:
            training,
    };
}

export function updateTraining(
    trainings: TrainingsMap,
    trainingId: string,
    changes: Partial<
        Omit<
            Training,
            "id" | "studyId" | "createdAt"
        >
    >,
): TrainingsMap {
    const training =
        trainings[trainingId];

    if (!training) {
        return trainings;
    }

    return {
        ...trainings,

        [trainingId]: {
            ...training,
            ...changes,

            updatedAt:
                new Date().toISOString(),
        },
    };
}

export function renameTraining(
    trainings: TrainingsMap,
    trainingId: string,
    name: string,
): TrainingsMap {
    const trimmedName =
        name.trim();

    if (!trimmedName) {
        return trainings;
    }

    return updateTraining(
        trainings,
        trainingId,
        {
            name: trimmedName,
        },
    );
}

export function deleteTraining(
    trainings: TrainingsMap,
    trainingId: string,
): TrainingsMap {
    if (!trainings[trainingId]) {
        return trainings;
    }

    const updatedTrainings = {
        ...trainings,
    };

    delete updatedTrainings[
        trainingId
    ];

    return updatedTrainings;
}

/*
 * Muy importante cuando se elimina un estudio.
 *
 * Todos sus entrenamientos asociados desaparecen.
 */
export function deleteTrainingsForStudy(
    trainings: TrainingsMap,
    studyId: string,
): TrainingsMap {
    const updatedTrainings:
        TrainingsMap = {};

    for (
        const [
            trainingId,
            training,
        ] of Object.entries(
            trainings,
        )
    ) {
        if (
            training.studyId !==
            studyId
        ) {
            updatedTrainings[
                trainingId
            ] = training;
        }
    }

    return updatedTrainings;
}

export function getTrainingsForStudy(
    trainings: TrainingsMap,
    studyId: string,
): Training[] {
    return Object.values(
        trainings,
    ).filter(
        (training) =>
            training.studyId ===
            studyId,
    );
}