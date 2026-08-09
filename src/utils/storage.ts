import type {
    MoveNode,
    StudyContent,
} from "../types";

import type {
    ChessktopStorage,
    ChessStudy,
    LibraryFolder,
} from "../types/library";

import type {
    Training,
    TrainingPerformance,
} from "../components/training/types";

const STORAGE_KEY =
    "chessktop-state";

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}

function isValidFolder(
    value: unknown,
): value is LibraryFolder {
    if (!isRecord(value)) {
        return false;
    }

    return (
        typeof value.id === "string" &&
        typeof value.name === "string" &&
        (
            value.parentId === null ||
            typeof value.parentId === "string"
        ) &&
        typeof value.isExpanded ===
        "boolean"
    );
}

function isValidStudy(
    value: unknown,
): value is ChessStudy {
    if (!isRecord(value)) {
        return false;
    }

    return (
        typeof value.id === "string" &&
        typeof value.name === "string" &&
        (
            value.folderId === null ||
            typeof value.folderId === "string"
        )
    );
}

function isValidMoveNode(
    value: unknown,
): value is MoveNode {
    if (!isRecord(value)) {
        return false;
    }

    const validParentId =
        value.parentId === null ||
        typeof value.parentId === "string";

    const validSan =
        value.san === null ||
        typeof value.san === "string";

    const validFrom =
        value.from === null ||
        typeof value.from === "string";

    const validTo =
        value.to === null ||
        typeof value.to === "string";

    const validPromotion =
        value.promotion === undefined ||
        typeof value.promotion === "string";

    return (
        typeof value.id === "string" &&
        validParentId &&
        validSan &&
        validFrom &&
        validTo &&
        validPromotion &&
        typeof value.fen === "string" &&
        typeof value.ply === "number" &&
        Array.isArray(value.children) &&
        value.children.every(
            (childId) =>
                typeof childId === "string",
        ) &&
        typeof value.note === "string"
    );
}

function isValidStudyContent(
    value: unknown,
): value is StudyContent {
    if (!isRecord(value)) {
        return false;
    }

    if (
        typeof value.studyId !== "string" ||
        typeof value.currentNodeId !==
        "string" ||
        typeof value.updatedAt !== "string" ||
        !isRecord(value.nodes)
    ) {
        return false;
    }

    const nodes =
        Object.values(
            value.nodes,
        );

    if (
        nodes.length === 0 ||
        !nodes.every(
            isValidMoveNode,
        )
    ) {
        return false;
    }

    const root =
        value.nodes.root;

    if (
        !isValidMoveNode(root) ||
        root.id !== "root"
    ) {
        return false;
    }

    return (
        typeof value.nodes[
        value.currentNodeId
        ] === "object"
    );
}

function isValidTraining(
    value: unknown,
): value is Training {
    if (!isRecord(value)) {
        return false;
    }

    const validSide =
        value.side === "white" ||
        value.side === "black";

    const validMode =
        value.mode === "all-lines" ||
        value.mode === "main-line" ||
        value.mode === "selected-lines";

    const validOrder =
        value.order === "random" ||
        value.order === "sequential";

    return (
        typeof value.id === "string" &&
        typeof value.studyId === "string" &&
        typeof value.name === "string" &&
        validSide &&
        validMode &&
        validOrder &&
        Array.isArray(
            value.selectedNodeIds,
        ) &&
        value.selectedNodeIds.every(
            (nodeId) =>
                typeof nodeId === "string",
        ) &&
        typeof value.createdAt === "string" &&
        typeof value.updatedAt === "string"
    );
}

function isValidTrainingPerformance(
    value: unknown,
): value is TrainingPerformance {
    if (!isRecord(value)) {
        return false;
    }

    const validLastTrainedAt =
        value.lastTrainedAt === null ||
        typeof value.lastTrainedAt ===
        "string";

    if (
        typeof value.trainingId !== "string" ||
        typeof value.totalSessions !==
        "number" ||
        typeof value.completedSessions !==
        "number" ||
        typeof value.totalCorrectMoves !==
        "number" ||
        typeof value.totalIncorrectMoves !==
        "number" ||
        typeof value.totalTrainingTimeMs !==
        "number" ||
        !validLastTrainedAt ||
        !isRecord(value.positions)
    ) {
        return false;
    }

    return Object.values(
        value.positions,
    ).every(
        (position) => {
            if (!isRecord(position)) {
                return false;
            }

            return (
                typeof position.nodeId ===
                "string" &&
                typeof position.sessionsSeen ===
                "number" &&
                typeof position.correctMoves ===
                "number" &&
                typeof position.incorrectMoves ===
                "number" &&
                typeof position.timesProblematic ===
                "number" &&
                typeof position.lastSeenAt ===
                "string"
            );
        },
    );
}

/*
 * Valida y normaliza un estado completo.
 *
 * También funciona como migración ligera:
 * las versiones antiguas que todavía no
 * contengan entrenamientos/rendimiento
 * reciben objetos vacíos.
 */
export function normalizeChessktopState(
    value: unknown,
): ChessktopStorage | null {
    if (!isRecord(value)) {
        return null;
    }

    if (
        value.version !== 1
    ) {
        return null;
    }

    if (
        !isRecord(value.library)
    ) {
        return null;
    }

    const folders =
        value.library.folders;

    const studies =
        value.library.studies;

    if (
        !Array.isArray(folders) ||
        !folders.every(
            isValidFolder,
        ) ||
        !Array.isArray(studies) ||
        !studies.every(
            isValidStudy,
        )
    ) {
        return null;
    }

    if (
        !isRecord(
            value.studyContents,
        )
    ) {
        return null;
    }

    const studyContents =
        Object.values(
            value.studyContents,
        );

    if (
        !studyContents.every(
            isValidStudyContent,
        )
    ) {
        return null;
    }

    const validSelectedStudy =
        value.selectedStudyId === null ||
        typeof value.selectedStudyId ===
        "string";

    if (!validSelectedStudy) {
        return null;
    }

    /*
     * Entrenamientos antiguos:
     *
     * si no existían todavía, usamos {}.
     */
    const rawTrainings =
        value.trainings === undefined
            ? {}
            : value.trainings;

    if (
        !isRecord(
            rawTrainings,
        )
    ) {
        return null;
    }

    const trainings =
        Object.values(
            rawTrainings,
        );

    if (
        !trainings.every(
            isValidTraining,
        )
    ) {
        return null;
    }

    /*
     * Paso 7:
     *
     * backups/localStorage anteriores
     * todavía no tienen este campo.
     */
    const rawPerformances =
        value.trainingPerformances ===
            undefined
            ? {}
            : value.trainingPerformances;

    if (
        !isRecord(
            rawPerformances,
        )
    ) {
        return null;
    }

    if (
        !Object.values(
            rawPerformances,
        ).every(
            isValidTrainingPerformance,
        )
    ) {
        return null;
    }

    const studyIds =
        new Set(
            studies.map(
                (study) =>
                    study.id,
            ),
        );

    for (
        const content
        of studyContents
    ) {
        if (
            !studyIds.has(
                content.studyId,
            )
        ) {
            return null;
        }
    }

    if (
        typeof value.selectedStudyId ===
        "string" &&
        !studyIds.has(
            value.selectedStudyId,
        )
    ) {
        return null;
    }

    /*
     * Un entrenamiento debe pertenecer
     * a un estudio existente.
     */
    for (
        const training
        of trainings
    ) {
        if (
            !studyIds.has(
                training.studyId,
            )
        ) {
            return null;
        }
    }

    const trainingIds =
        new Set(
            trainings.map(
                (training) =>
                    training.id,
            ),
        );

    /*
     * Ignoramos rendimiento huérfano
     * procedente de entrenamientos
     * eliminados.
     */
    const cleanedPerformances =
        Object.fromEntries(
            Object.entries(
                rawPerformances,
            ).filter(
                ([trainingId]) =>
                    trainingIds.has(
                        trainingId,
                    ),
            ),
        );

    return {
        version: 1,

        library: {
            folders,
            studies,
        },

        studyContents:
            value.studyContents,

        selectedStudyId:
            value.selectedStudyId,

        trainings:
            rawTrainings,

        trainingPerformances:
            cleanedPerformances,
    } as ChessktopStorage;
}

export function saveChessktopState(
    state: ChessktopStorage,
): void {
    try {
        const serializedState =
            JSON.stringify(
                state,
            );

        localStorage.setItem(
            STORAGE_KEY,
            serializedState,
        );
    } catch (error) {
        console.error(
            "No se pudo guardar Chessktop:",
            error,
        );
    }
}

export function loadChessktopState():
    | ChessktopStorage
    | null {
    try {
        const serializedState =
            localStorage.getItem(
                STORAGE_KEY,
            );

        if (!serializedState) {
            return null;
        }

        const parsedState =
            JSON.parse(
                serializedState,
            ) as unknown;

        const normalizedState =
            normalizeChessktopState(
                parsedState,
            );

        if (!normalizedState) {
            console.warn(
                "Los datos guardados de Chessktop no son válidos.",
            );

            return null;
        }

        return normalizedState;
    } catch (error) {
        console.error(
            "No se pudo cargar Chessktop:",
            error,
        );

        return null;
    }
}

export function clearChessktopState():
    void {
    localStorage.removeItem(
        STORAGE_KEY,
    );
}