import type {
    ChessktopStorage,
    LibraryFolder,
    ChessStudy,
} from "../types/library";

import type {
    MoveNode,
    StudyContent,
} from "../types";

export function exportLibrary(
    state: ChessktopStorage,
): void {
    const json = JSON.stringify(
        state,
        null,
        2,
    );

    const blob = new Blob(
        [json],
        {
            type: "application/json",
        },
    );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    const date = new Date()
        .toISOString()
        .slice(0, 10);

    link.href = url;
    link.download =
        `chessktop-backup-${date}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

export async function readLibraryBackup(
    file: File,
): Promise<ChessktopStorage> {
    const text = await file.text();

    let parsedData: unknown;

    try {
        parsedData = JSON.parse(text);
    } catch {
        throw new Error(
            "El archivo no contiene un JSON válido.",
        );
    }

    if (!isValidChessktopStorage(parsedData)) {
        throw new Error(
            "El archivo no es una copia válida de Chessktop.",
        );
    }

    return parsedData;
}

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
        typeof value.isExpanded === "boolean"
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
        typeof value.currentNodeId !== "string" ||
        typeof value.updatedAt !== "string" ||
        !isRecord(value.nodes)
    ) {
        return false;
    }

    const nodes = Object.values(value.nodes);

    if (
        nodes.length === 0 ||
        !nodes.every(isValidMoveNode)
    ) {
        return false;
    }

    const root = value.nodes.root;

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

export function isValidChessktopStorage(
    value: unknown,
): value is ChessktopStorage {
    if (!isRecord(value)) {
        return false;
    }

    if (value.version !== 1) {
        return false;
    }

    if (!isRecord(value.library)) {
        return false;
    }

    const folders =
        value.library.folders;

    const studies =
        value.library.studies;

    if (
        !Array.isArray(folders) ||
        !folders.every(isValidFolder) ||
        !Array.isArray(studies) ||
        !studies.every(isValidStudy)
    ) {
        return false;
    }

    if (!isRecord(value.studyContents)) {
        return false;
    }

    const studyContents =
        Object.values(value.studyContents);

    if (
        !studyContents.every(
            isValidStudyContent,
        )
    ) {
        return false;
    }

    const validSelectedStudy =
        value.selectedStudyId === null ||
        typeof value.selectedStudyId ===
        "string";

    if (!validSelectedStudy) {
        return false;
    }

    /*
     * Comprobamos que los contenidos pertenezcan
     * a estudios existentes.
     */
    const studyIds = new Set(
        studies.map((study) => study.id),
    );

    for (const content of studyContents) {
        if (!studyIds.has(content.studyId)) {
            return false;
        }
    }

    /*
     * Si hay un estudio seleccionado,
     * debe existir en la biblioteca.
     */
    if (
        typeof value.selectedStudyId ===
        "string" &&
        !studyIds.has(value.selectedStudyId)
    ) {
        return false;
    }

    return true;
}