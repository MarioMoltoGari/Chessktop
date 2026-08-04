import type { LibraryState } from "../types/library";

export const initialLibraryState: LibraryState = {
    folders: [
        {
            id: "folder-openings",
            name: "Aperturas",
            parentId: null,
            isExpanded: true,
        },

        {
            id: "folder-italian",
            name: "Italiana",
            parentId: "folder-openings",
            isExpanded: true,
        },

        {
            id: "folder-sicilian",
            name: "Siciliana",
            parentId: "folder-openings",
            isExpanded: true,
        },

        {
            id: "folder-najdorf",
            name: "Najdorf",
            parentId: "folder-sicilian",
            isExpanded: true,
        },
    ],

    studies: [
        {
            id: "study-italian-main",
            name: "Línea principal",
            folderId: "folder-italian",
        },

        {
            id: "study-najdorf-bg5",
            name: "6. Ag5",
            folderId: "folder-najdorf",
        },

        {
            id: "study-najdorf-be3",
            name: "6. Ae3",
            folderId: "folder-najdorf",
        },
    ],
};