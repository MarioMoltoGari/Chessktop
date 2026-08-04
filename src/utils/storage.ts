import type {
    ChessktopStorage,
    LibraryState,
} from "../types/library";

const STORAGE_KEY = "chessktop-state";

export function saveChessktopState(
    state: ChessktopStorage,
): void {
    try {
        const serializedState =
            JSON.stringify(state);

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
            localStorage.getItem(STORAGE_KEY);

        if (!serializedState) {
            return null;
        }

        const parsedState = JSON.parse(
            serializedState,
        ) as unknown;

        if (!isValidChessktopState(parsedState)) {
            console.warn(
                "Los datos guardados de Chessktop no son válidos.",
            );

            return null;
        }

        return parsedState;
    } catch (error) {
        console.error(
            "No se pudo cargar Chessktop:",
            error,
        );

        return null;
    }
}

function isValidChessktopState(
    value: unknown,
): value is ChessktopStorage {
    if (
        typeof value !== "object" ||
        value === null
    ) {
        return false;
    }

    const state =
        value as Partial<ChessktopStorage>;

    if (state.version !== 1) {
        return false;
    }

    if (
        typeof state.library !== "object" ||
        state.library === null
    ) {
        return false;
    }

    const library =
        state.library as Partial<LibraryState>;

    if (
        !Array.isArray(library.folders) ||
        !Array.isArray(library.studies)
    ) {
        return false;
    }

    if (
        typeof state.studyContents !== "object" ||
        state.studyContents === null
    ) {
        return false;
    }

    return (
        state.selectedStudyId === null ||
        typeof state.selectedStudyId === "string"
    );
}

export function clearChessktopState(): void {
    localStorage.removeItem(STORAGE_KEY);
}