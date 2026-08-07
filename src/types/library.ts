import type {
    StudyContentsMap,
} from "../types";
import type {
    TrainingsMap,
} from "../components/training/types";

export type LibraryFolder = {
    id: string;
    name: string;

    /*
     * null significa que es una carpeta raíz.
     * Si contiene un ID, está dentro de esa carpeta.
     */
    parentId: string | null;

    isExpanded: boolean;
};

export type ChessStudy = {
    id: string;
    name: string;

    /*
     * null significa que el estudio no está
     * dentro de ninguna carpeta.
     */
    folderId: string | null;
};

export type LibraryState = {
    folders: LibraryFolder[];
    studies: ChessStudy[];
};

export type ChessktopStorage = {
    version: 1;

    library: LibraryState;

    studyContents: StudyContentsMap;

    selectedStudyId: string | null;

    trainings: TrainingsMap;
};