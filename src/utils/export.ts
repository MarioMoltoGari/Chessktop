import type {
    ChessktopStorage,
} from "../types/library";

import {
    normalizeChessktopState,
} from "./storage";

export function exportLibrary(
    state: ChessktopStorage,
): void {
    const normalizedState =
        normalizeChessktopState(
            state,
        );

    if (!normalizedState) {
        throw new Error(
            "Chessktop ha detectado una inconsistencia en la biblioteca y ha cancelado la exportación para evitar crear una copia dañada.",
        );
    }

    const json =
        JSON.stringify(
            normalizedState,
            null,
            2,
        );

    const blob =
        new Blob(
            [json],
            {
                type:
                    "application/json",
            },
        );

    const url =
        URL.createObjectURL(
            blob,
        );

    try {
        const link =
            document.createElement(
                "a",
            );

        const date =
            new Date()
                .toISOString()
                .slice(
                    0,
                    10,
                );

        link.href =
            url;

        link.download =
            `chessktop-backup-${date}.json`;

        document.body.appendChild(
            link,
        );

        link.click();

        link.remove();
    } finally {
        URL.revokeObjectURL(
            url,
        );
    }
}

export async function readLibraryBackup(
    file: File,
): Promise<ChessktopStorage> {
    let text: string;

    try {
        text =
            await file.text();
    } catch {
        throw new Error(
            "No se ha podido leer el archivo seleccionado.",
        );
    }

    if (
        text.trim().length ===
        0
    ) {
        throw new Error(
            "El archivo seleccionado está vacío.",
        );
    }

    let parsedData:
        unknown;

    try {
        parsedData =
            JSON.parse(
                text,
            );
    } catch {
        throw new Error(
            "El archivo no contiene un JSON válido.",
        );
    }

    const normalizedState =
        normalizeChessktopState(
            parsedData,
        );

    if (!normalizedState) {
        throw new Error(
            "El archivo no es una copia válida de Chessktop o contiene referencias dañadas.",
        );
    }

    return normalizedState;
}