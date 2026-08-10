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

export type ChessktopLoadResult =
    | {
        status: "loaded";
        state: ChessktopStorage;
    }
    | {
        status: "empty";
        state: null;
    }
    | {
        status:
        | "invalid"
        | "error";

        state: null;
        error: Error;
    };

export type ChessktopSaveResult =
    | {
        ok: true;
    }
    | {
        ok: false;

        reason:
        | "invalid"
        | "quota"
        | "storage";

        error: Error;
    };

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}

function isNonNegativeNumber(
    value: unknown,
): value is number {
    return (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0
    );
}

function hasUniqueIds(
    values: Array<{
        id: string;
    }>,
): boolean {
    const ids =
        new Set<string>();

    for (
        const value
        of values
    ) {
        if (
            ids.has(
                value.id,
            )
        ) {
            return false;
        }

        ids.add(
            value.id,
        );
    }

    return true;
}

function isValidFolder(
    value: unknown,
): value is LibraryFolder {
    if (!isRecord(value)) {
        return false;
    }

    return (
        typeof value.id === "string" &&
        value.id.length > 0 &&
        typeof value.name === "string" &&
        value.name.trim().length > 0 &&
        (
            value.parentId === null ||
            typeof value.parentId ===
            "string"
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
        value.id.length > 0 &&
        typeof value.name === "string" &&
        value.name.trim().length > 0 &&
        (
            value.folderId === null ||
            typeof value.folderId ===
            "string"
        )
    );
}

/*
 * Comprueba la integridad de la jerarquía
 * de carpetas:
 *
 * - el padre debe existir;
 * - una carpeta no puede ser su propio padre;
 * - no puede haber ciclos.
 */
function hasValidFolderTree(
    folders: LibraryFolder[],
): boolean {
    const foldersById =
        new Map(
            folders.map(
                (folder) => [
                    folder.id,
                    folder,
                ],
            ),
        );

    for (
        const folder
        of folders
    ) {
        if (
            folder.parentId !== null &&
            (
                folder.parentId ===
                folder.id ||
                !foldersById.has(
                    folder.parentId,
                )
            )
        ) {
            return false;
        }

        const visited =
            new Set<string>();

        let current:
            LibraryFolder =
            folder;

        while (
            current.parentId !== null
        ) {
            if (
                visited.has(
                    current.id,
                )
            ) {
                return false;
            }

            visited.add(
                current.id,
            );

            const parent =
                foldersById.get(
                    current.parentId,
                );

            if (!parent) {
                return false;
            }

            current =
                parent;
        }
    }

    return true;
}

function isValidMoveNode(
    value: unknown,
): value is MoveNode {
    if (!isRecord(value)) {
        return false;
    }

    const validParentId =
        value.parentId === null ||
        typeof value.parentId ===
        "string";

    const validSan =
        value.san === null ||
        typeof value.san ===
        "string";

    const validFrom =
        value.from === null ||
        typeof value.from ===
        "string";

    const validTo =
        value.to === null ||
        typeof value.to ===
        "string";

    const validPromotion =
        value.promotion ===
        undefined ||
        typeof value.promotion ===
        "string";

    /*
     * Lo guardamos primero en una variable
     * para que TypeScript pueda estrechar
     * correctamente unknown → number.
     */
    const ply =
        value.ply;

    const validPly =
        typeof ply === "number" &&
        Number.isInteger(
            ply,
        ) &&
        ply >= 0;

    return (
        typeof value.id === "string" &&
        value.id.length > 0 &&
        validParentId &&
        validSan &&
        validFrom &&
        validTo &&
        validPromotion &&
        typeof value.fen === "string" &&
        value.fen.length > 0 &&
        validPly &&
        Array.isArray(
            value.children,
        ) &&
        value.children.every(
            (childId) =>
                typeof childId ===
                "string",
        ) &&
        typeof value.note ===
        "string"
    );
}

/*
 * Valida no solamente la forma de los
 * nodos sino la coherencia completa
 * del árbol de movimientos.
 */
function hasValidMoveTree(
    nodes:
        Record<string, MoveNode>,
): boolean {
    const root =
        nodes.root;

    if (
        !root ||
        root.id !== "root" ||
        root.parentId !== null ||
        root.ply !== 0
    ) {
        return false;
    }

    for (
        const [
            nodeId,
            node,
        ]
        of Object.entries(
            nodes,
        )
    ) {
        /*
         * La clave del Record debe coincidir
         * con el ID almacenado en el nodo.
         */
        if (
            node.id !==
            nodeId
        ) {
            return false;
        }

        /*
         * Un mismo hijo no puede aparecer
         * dos veces.
         */
        if (
            new Set(
                node.children,
            ).size !==
            node.children.length
        ) {
            return false;
        }

        for (
            const childId
            of node.children
        ) {
            const child =
                nodes[
                childId
                ];

            if (!child) {
                return false;
            }

            if (
                child.parentId !==
                nodeId
            ) {
                return false;
            }

            if (
                child.ply !==
                node.ply + 1
            ) {
                return false;
            }
        }

        if (
            nodeId === "root"
        ) {
            continue;
        }

        if (
            node.parentId ===
            null
        ) {
            return false;
        }

        const parent =
            nodes[
            node.parentId
            ];

        if (
            !parent ||
            !parent.children.includes(
                nodeId,
            )
        ) {
            return false;
        }
    }

    /*
     * Recorremos todo desde root.
     *
     * Esto permite detectar:
     *
     * - nodos huérfanos;
     * - ciclos;
     * - árboles desconectados.
     */
    const visited =
        new Set<string>();

    const stack =
        ["root"];

    while (
        stack.length > 0
    ) {
        const nodeId =
            stack.pop();

        if (!nodeId) {
            continue;
        }

        if (
            visited.has(
                nodeId,
            )
        ) {
            return false;
        }

        visited.add(
            nodeId,
        );

        const node =
            nodes[
            nodeId
            ];

        if (!node) {
            return false;
        }

        stack.push(
            ...node.children,
        );
    }

    return (
        visited.size ===
        Object.keys(
            nodes,
        ).length
    );
}

function isValidStudyContent(
    value: unknown,
): value is StudyContent {
    if (!isRecord(value)) {
        return false;
    }

    if (
        typeof value.studyId !==
        "string" ||
        typeof value.currentNodeId !==
        "string" ||
        typeof value.updatedAt !==
        "string" ||
        !isRecord(
            value.nodes,
        )
    ) {
        return false;
    }

    const nodeValues =
        Object.values(
            value.nodes,
        );

    if (
        nodeValues.length === 0 ||
        !nodeValues.every(
            isValidMoveNode,
        )
    ) {
        return false;
    }

    const nodes =
        value.nodes as
        Record<string, MoveNode>;

    if (
        !hasValidMoveTree(
            nodes,
        )
    ) {
        return false;
    }

    return Boolean(
        nodes[
        value.currentNodeId
        ],
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
        value.mode ===
        "all-lines" ||
        value.mode ===
        "main-line" ||
        value.mode ===
        "selected-lines";

    const validOrder =
        value.order ===
        "random" ||
        value.order ===
        "sequential";

    return (
        typeof value.id === "string" &&
        value.id.length > 0 &&
        typeof value.studyId ===
        "string" &&
        typeof value.name ===
        "string" &&
        value.name.trim().length > 0 &&
        validSide &&
        validMode &&
        validOrder &&
        Array.isArray(
            value.selectedNodeIds,
        ) &&
        value.selectedNodeIds.every(
            (nodeId) =>
                typeof nodeId ===
                "string",
        ) &&
        typeof value.createdAt ===
        "string" &&
        typeof value.updatedAt ===
        "string"
    );
}

function isValidTrainingPerformance(
    value: unknown,
): value is TrainingPerformance {
    if (!isRecord(value)) {
        return false;
    }

    const validLastTrainedAt =
        value.lastTrainedAt ===
        null ||
        typeof value.lastTrainedAt ===
        "string";

    if (
        typeof value.trainingId !==
        "string" ||
        !isNonNegativeNumber(
            value.totalSessions,
        ) ||
        !isNonNegativeNumber(
            value.completedSessions,
        ) ||
        !isNonNegativeNumber(
            value.totalCorrectMoves,
        ) ||
        !isNonNegativeNumber(
            value.totalIncorrectMoves,
        ) ||
        !isNonNegativeNumber(
            value.totalTrainingTimeMs,
        ) ||
        !validLastTrainedAt ||
        !isRecord(
            value.positions,
        )
    ) {
        return false;
    }

    for (
        const [
            nodeId,
            position,
        ]
        of Object.entries(
            value.positions,
        )
    ) {
        if (
            !isRecord(
                position,
            )
        ) {
            return false;
        }

        if (
            typeof position.nodeId !==
            "string" ||
            position.nodeId !==
            nodeId ||
            !isNonNegativeNumber(
                position.sessionsSeen,
            ) ||
            !isNonNegativeNumber(
                position.correctMoves,
            ) ||
            !isNonNegativeNumber(
                position.incorrectMoves,
            ) ||
            !isNonNegativeNumber(
                position.timesProblematic,
            ) ||
            typeof position.lastSeenAt !==
            "string"
        ) {
            return false;
        }
    }

    return true;
}

/*
 * Valida y normaliza un estado completo.
 *
 * También funciona como una migración
 * ligera para backups antiguos.
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
        !isRecord(
            value.library,
        )
    ) {
        return null;
    }

    const folders =
        value.library.folders;

    const studies =
        value.library.studies;

    if (
        !Array.isArray(
            folders,
        ) ||
        !folders.every(
            isValidFolder,
        ) ||
        !Array.isArray(
            studies,
        ) ||
        !studies.every(
            isValidStudy,
        )
    ) {
        return null;
    }

    if (
        !hasUniqueIds(
            folders,
        ) ||
        !hasUniqueIds(
            studies,
        ) ||
        !hasValidFolderTree(
            folders,
        )
    ) {
        return null;
    }

    const folderIds =
        new Set(
            folders.map(
                (folder) =>
                    folder.id,
            ),
        );

    /*
     * Los estudios solamente pueden estar
     * en raíz o dentro de una carpeta
     * existente.
     */
    for (
        const study
        of studies
    ) {
        if (
            study.folderId !==
            null &&
            !folderIds.has(
                study.folderId,
            )
        ) {
            return null;
        }
    }

    if (
        !isRecord(
            value.studyContents,
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
        const [
            studyId,
            content,
        ]
        of Object.entries(
            value.studyContents,
        )
    ) {
        if (
            !isValidStudyContent(
                content,
            )
        ) {
            return null;
        }

        /*
         * La clave externa, el studyId interno
         * y la biblioteca deben coincidir.
         */
        if (
            content.studyId !==
            studyId ||
            !studyIds.has(
                studyId,
            )
        ) {
            return null;
        }
    }

    /*
     * Guardamos primero el unknown y después
     * construimos explícitamente string | null.
     *
     * Esto evita problemas de narrowing
     * de TypeScript.
     */
    
    const rawSelectedStudyId =
        value.selectedStudyId;

    let selectedStudyId:
        string | null;

    if (
        rawSelectedStudyId ===
        null
    ) {
        selectedStudyId =
            null;
    } else if (
        typeof rawSelectedStudyId ===
        "string"
    ) {
        selectedStudyId =
            rawSelectedStudyId;
    } else {
        return null;
    }

    if (
        selectedStudyId !== null &&
        !studyIds.has(
            selectedStudyId,
        )
    ) {
        return null;
    }
    if (
        selectedStudyId !== null &&
        !studyIds.has(
            selectedStudyId,
        )
    ) {
        return null;
    }

    /*
     * Backups anteriores a la existencia
     * de entrenamientos reciben {}.
     */
    const rawTrainings =
        value.trainings ===
            undefined
            ? {}
            : value.trainings;

    if (
        !isRecord(
            rawTrainings,
        )
    ) {
        return null;
    }

    for (
        const [
            trainingId,
            training,
        ]
        of Object.entries(
            rawTrainings,
        )
    ) {
        if (
            !isValidTraining(
                training,
            ) ||
            training.id !==
            trainingId ||
            !studyIds.has(
                training.studyId,
            )
        ) {
            return null;
        }
    }

    /*
     * Backups anteriores al historial
     * de entrenamiento reciben {}.
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

    const trainingIds =
        new Set(
            Object.keys(
                rawTrainings,
            ),
        );

    const cleanedPerformances:
        Record<
            string,
            TrainingPerformance
        > = {};

    for (
        const [
            trainingId,
            performance,
        ]
        of Object.entries(
            rawPerformances,
        )
    ) {
        if (
            !isValidTrainingPerformance(
                performance,
            )
        ) {
            return null;
        }

        if (
            performance.trainingId !==
            trainingId
        ) {
            return null;
        }

        /*
         * Si encontramos rendimiento de un
         * entrenamiento que ya no existe,
         * lo descartamos sin invalidar
         * todo el backup.
         */
        if (
            !trainingIds.has(
                trainingId,
            )
        ) {
            continue;
        }

        cleanedPerformances[
            trainingId
        ] =
            performance;
    }

    return {
        version: 1,

        library: {
            folders,
            studies,
        },

        studyContents:
            value.studyContents as
            ChessktopStorage[
            "studyContents"
            ],

        selectedStudyId,

        trainings:
            rawTrainings as
            ChessktopStorage[
            "trainings"
            ],

        trainingPerformances:
            cleanedPerformances,
    };
}

function isQuotaExceededError(
    error: unknown,
): boolean {
    return (
        error instanceof
        DOMException &&
        (
            error.name ===
            "QuotaExceededError" ||
            error.name ===
            "NS_ERROR_DOM_QUOTA_REACHED"
        )
    );
}

export function saveChessktopState(
    state: ChessktopStorage,
): ChessktopSaveResult {
    /*
     * Nunca escribimos en localStorage
     * un estado que nuestra propia capa
     * de persistencia considere inválido.
     */
    const normalizedState =
        normalizeChessktopState(
            state,
        );

    if (!normalizedState) {
        const error =
            new Error(
                "El estado de Chessktop no es válido y no se ha guardado.",
            );

        console.error(
            error,
        );

        return {
            ok: false,
            reason: "invalid",
            error,
        };
    }

    try {
        const serializedState =
            JSON.stringify(
                normalizedState,
            );

        /*
         * Si setItem falla, el valor anterior
         * permanece guardado.
         */
        localStorage.setItem(
            STORAGE_KEY,
            serializedState,
        );

        return {
            ok: true,
        };
    } catch (error) {
        const normalizedError =
            error instanceof Error
                ? error
                : new Error(
                    "Error desconocido al guardar Chessktop.",
                );

        console.error(
            "No se pudo guardar Chessktop:",
            error,
        );

        return {
            ok: false,

            reason:
                isQuotaExceededError(
                    error,
                )
                    ? "quota"
                    : "storage",

            error:
                normalizedError,
        };
    }
}

export function loadChessktopState():
    ChessktopLoadResult {
    let serializedState:
        string | null;

    try {
        serializedState =
            localStorage.getItem(
                STORAGE_KEY,
            );
    } catch (error) {
        return {
            status: "error",
            state: null,

            error:
                error instanceof Error
                    ? error
                    : new Error(
                        "No se pudo acceder al almacenamiento de Chessktop.",
                    ),
        };
    }

    if (!serializedState) {
        return {
            status: "empty",
            state: null,
        };
    }

    let parsedState:
        unknown;

    try {
        parsedState =
            JSON.parse(
                serializedState,
            );
    } catch {
        return {
            status: "invalid",
            state: null,

            error:
                new Error(
                    "Los datos guardados de Chessktop contienen JSON dañado.",
                ),
        };
    }

    const normalizedState =
        normalizeChessktopState(
            parsedState,
        );

    if (!normalizedState) {
        return {
            status: "invalid",
            state: null,

            error:
                new Error(
                    "Los datos guardados de Chessktop no superan la validación de integridad.",
                ),
        };
    }

    return {
        status: "loaded",

        state:
            normalizedState,
    };
}

export function clearChessktopState():
    void {
    localStorage.removeItem(
        STORAGE_KEY,
    );
}