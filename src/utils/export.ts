import type {
    ChessktopStorage,
} from "../types/library";

import {
    normalizeChessktopState,
} from "./storage";

export function exportLibrary(
    state: ChessktopStorage,
): void {
    const json =
        JSON.stringify(
            state,
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

    URL.revokeObjectURL(
        url,
    );
}

export async function readLibraryBackup(
    file: File,
): Promise<ChessktopStorage> {
    const text =
        await file.text();

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
            "El archivo no es una copia válida de Chessktop.",
        );
    }

    return normalizedState;
}