import { useMemo, useState, useRef } from "react";
import type {
    ChessStudy,
    LibraryFolder,
    LibraryState,
} from "../types/library";

type LibrarySidebarProps = {
    library: LibraryState;
    selectedStudyId: string | null;

    onLibraryChange: (library: LibraryState) => void;
    onStudySelect: (studyId: string | null) => void;
    onExportLibrary: () => void;
    onImportLibrary: (
        file: File,
    ) => void;
};

type FolderNodeProps = {
    folder: LibraryFolder;
    folders: LibraryFolder[];
    studies: ChessStudy[];
    selectedStudyId: string | null;
    depth: number;
    deleteMode: boolean;

    onToggleFolder: (folderId: string) => void;
    onSelectStudy: (studyId: string) => void;
    onCreateFolder: (parentId: string | null) => void;
    onCreateStudy: (folderId: string | null) => void;
    onDeleteFolder: (folderId: string) => void;
    onDeleteStudy: (studyId: string) => void;
};

function FolderNode({
    folder,
    folders,
    studies,
    selectedStudyId,
    depth,
    deleteMode,
    onToggleFolder,
    onSelectStudy,
    onCreateFolder,
    onCreateStudy,
    onDeleteFolder,
    onDeleteStudy,
}: FolderNodeProps) {
    const childFolders = folders.filter(
        (candidate) => candidate.parentId === folder.id,
    );

    const childStudies = studies.filter(
        (study) => study.folderId === folder.id,
    );

    function handleFolderClick() {
        if (deleteMode) {
            onDeleteFolder(folder.id);
            return;
        }

        onToggleFolder(folder.id);
    }

    return (
        <div className="library-folder-node">
            <div
                className={`library-folder-row ${deleteMode ? "delete-mode" : ""
                    }`}
                style={{
                    paddingLeft: `${depth * 16 + 8}px`,
                }}
                onClick={handleFolderClick}
            >
                <button
                    type="button"
                    className="library-expand-button"
                    onClick={(event) => {
                        event.stopPropagation();
                        handleFolderClick();
                    }}
                    aria-label={
                        deleteMode
                            ? `Borrar ${folder.name}`
                            : folder.isExpanded
                                ? `Contraer ${folder.name}`
                                : `Expandir ${folder.name}`
                    }
                >
                    {deleteMode
                        ? "×"
                        : folder.isExpanded
                            ? "▾"
                            : "▸"}
                </button>

                <button
                    type="button"
                    className="library-folder-name"
                    onClick={(event) => {
                        event.stopPropagation();
                        handleFolderClick();
                    }}
                >
                    <span aria-hidden="true">
                        {deleteMode
                            ? "🗑️"
                            : folder.isExpanded
                                ? "📂"
                                : "📁"}
                    </span>

                    <span>{folder.name}</span>
                </button>

                {!deleteMode && (
                    <div className="library-row-actions">
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onCreateFolder(folder.id);
                            }}
                            title="Crear subcarpeta"
                            aria-label={`Crear subcarpeta dentro de ${folder.name}`}
                        >
                            +📁
                        </button>

                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onCreateStudy(folder.id);
                            }}
                            title="Crear estudio"
                            aria-label={`Crear estudio dentro de ${folder.name}`}
                        >
                            +♟
                        </button>
                    </div>
                )}
            </div>

            {folder.isExpanded && (
                <div>
                    {childFolders.map((childFolder) => (
                        <FolderNode
                            key={childFolder.id}
                            folder={childFolder}
                            folders={folders}
                            studies={studies}
                            selectedStudyId={selectedStudyId}
                            depth={depth + 1}
                            deleteMode={deleteMode}
                            onToggleFolder={onToggleFolder}
                            onSelectStudy={onSelectStudy}
                            onCreateFolder={onCreateFolder}
                            onCreateStudy={onCreateStudy}
                            onDeleteFolder={onDeleteFolder}
                            onDeleteStudy={onDeleteStudy}
                        />
                    ))}

                    {childStudies.map((study) => (
                        <button
                            type="button"
                            key={study.id}
                            className={`library-study-row ${selectedStudyId === study.id ? "active" : ""
                                } ${deleteMode ? "delete-mode" : ""}`}
                            style={{
                                paddingLeft: `${(depth + 1) * 16 + 34}px`,
                            }}
                            onClick={() => {
                                if (deleteMode) {
                                    onDeleteStudy(study.id);
                                    return;
                                }

                                onSelectStudy(study.id);
                            }}
                        >
                            <span aria-hidden="true">
                                {deleteMode ? "🗑️" : "♟"}
                            </span>

                            <span>{study.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function getDescendantFolderIds(
    folders: LibraryFolder[],
    folderId: string,
): string[] {
    const directChildren = folders.filter(
        (folder) => folder.parentId === folderId,
    );

    return [
        folderId,
        ...directChildren.flatMap((child) =>
            getDescendantFolderIds(folders, child.id),
        ),
    ];
}

export default function LibrarySidebar({
    library,
    selectedStudyId,
    onLibraryChange,
    onStudySelect,
    onExportLibrary,
    onImportLibrary,
}: LibrarySidebarProps) {
    const [search, setSearch] = useState("");
    const [deleteMode, setDeleteMode] = useState(false);
    const importInputRef =
        useRef<HTMLInputElement>(null);

    const normalizedSearch =
        search.trim().toLocaleLowerCase();

    const visibleStudies = useMemo(() => {
        if (!normalizedSearch) {
            return library.studies;
        }

        return library.studies.filter((study) =>
            study.name
                .toLocaleLowerCase()
                .includes(normalizedSearch),
        );
    }, [library.studies, normalizedSearch]);

    const rootFolders = library.folders.filter(
        (folder) => folder.parentId === null,
    );

    const rootStudies = visibleStudies.filter(
        (study) => study.folderId === null,
    );

    function toggleFolder(folderId: string) {
        onLibraryChange({
            ...library,

            folders: library.folders.map((folder) =>
                folder.id === folderId
                    ? {
                        ...folder,
                        isExpanded: !folder.isExpanded,
                    }
                    : folder,
            ),
        });
    }

    function createFolder(parentId: string | null) {
        const name = window.prompt(
            "Nombre de la carpeta:",
        );

        if (!name?.trim()) {
            return;
        }

        const newFolder: LibraryFolder = {
            id: crypto.randomUUID(),
            name: name.trim(),
            parentId,
            isExpanded: true,
        };

        onLibraryChange({
            ...library,
            folders: [
                ...library.folders,
                newFolder,
            ],
        });
    }

    function createStudy(folderId: string | null) {
        const name = window.prompt(
            "Nombre del estudio o línea:",
        );

        if (!name?.trim()) {
            return;
        }

        const newStudy: ChessStudy = {
            id: crypto.randomUUID(),
            name: name.trim(),
            folderId,
        };

        onLibraryChange({
            ...library,
            studies: [
                ...library.studies,
                newStudy,
            ],
        });

        onStudySelect(newStudy.id);
    }

    function deleteStudy(studyId: string) {
        const studyIndex = library.studies.findIndex(
            (study) => study.id === studyId,
        );

        if (studyIndex === -1) {
            return;
        }

        const study = library.studies[studyIndex];

        const confirmed = window.confirm(
            `¿Quieres borrar el estudio "${study.name}"?`,
        );

        if (!confirmed) {
            return;
        }

        const remainingStudies =
            library.studies.filter(
                (item) => item.id !== studyId,
            );

        /*
         * Elegimos el estudio que ocupará el lugar
         * del que estamos borrando.
         *
         * Prioridad:
         * 1. El siguiente estudio de la lista.
         * 2. Si no existe, el anterior.
         * 3. Si no queda ninguno, null.
         */
        const fallbackStudy =
            remainingStudies[studyIndex] ??
            remainingStudies[studyIndex - 1] ??
            remainingStudies[0] ??
            null;

        onLibraryChange({
            ...library,
            studies: remainingStudies,
        });

        /*
         * Solo cambiamos la selección si estamos
         * borrando el estudio activo.
         */
        if (selectedStudyId === studyId) {
            onStudySelect(
                fallbackStudy?.id ?? null,
            );
        }

        setDeleteMode(false);
    }

    function deleteFolder(folderId: string) {
        const folder = library.folders.find(
            (item) => item.id === folderId,
        );

        if (!folder) {
            return;
        }

        const folderIdsToDelete =
            getDescendantFolderIds(
                library.folders,
                folderId,
            );

        const folderIdSet = new Set(
            folderIdsToDelete,
        );

        const studiesToDelete =
            library.studies.filter(
                (study) =>
                    study.folderId !== null &&
                    folderIdSet.has(study.folderId),
            );

        const studyIdsToDelete = new Set(
            studiesToDelete.map(
                (study) => study.id,
            ),
        );

        const confirmed = window.confirm(
            `¿Quieres borrar la carpeta "${folder.name}"?\n\n` +
            `También se eliminarán ${folderIdsToDelete.length - 1
            } subcarpetas y ${studiesToDelete.length
            } estudios.`,
        );

        if (!confirmed) {
            return;
        }

        const remainingFolders =
            library.folders.filter(
                (item) =>
                    !folderIdSet.has(item.id),
            );

        const remainingStudies =
            library.studies.filter(
                (study) =>
                    !studyIdsToDelete.has(study.id),
            );

        const selectedStudyWasDeleted =
            selectedStudyId !== null &&
            studyIdsToDelete.has(
                selectedStudyId,
            );

        /*
         * Buscamos una selección alternativa.
         *
         * Intentamos conservar aproximadamente
         * la posición que ocupaba el estudio borrado
         * dentro de la lista general.
         */
        let fallbackStudyId: string | null =
            selectedStudyId;

        if (selectedStudyWasDeleted) {
            const selectedStudyIndex =
                library.studies.findIndex(
                    (study) =>
                        study.id === selectedStudyId,
                );

            const fallbackStudy =
                remainingStudies[
                selectedStudyIndex
                ] ??
                remainingStudies[
                selectedStudyIndex - 1
                ] ??
                remainingStudies[0] ??
                null;

            fallbackStudyId =
                fallbackStudy?.id ?? null;
        }

        onLibraryChange({
            folders: remainingFolders,
            studies: remainingStudies,
        });

        if (selectedStudyWasDeleted) {
            onStudySelect(fallbackStudyId);
        }

        setDeleteMode(false);
    }

    return (
        <aside
            className={`library-sidebar ${deleteMode ? "delete-mode" : ""
                }`}
        >
            <div className="library-sidebar-header">
                <div>
                    <h2>Biblioteca</h2>

                    <p>
                        {deleteMode
                            ? "Selecciona qué quieres borrar"
                            : "Carpetas y estudios"}
                    </p>
                </div>

                <div className="library-header-toolbar">
                    <div className="library-header-actions">
                        <button
                            type="button"
                            onClick={() => createFolder(null)}
                            disabled={deleteMode}
                        >
                            + Carpeta
                        </button>

                        <button
                            type="button"
                            onClick={() => createStudy(null)}
                            disabled={deleteMode}
                        >
                            + Estudio
                        </button>
                    </div>

                    <button
                        type="button"
                        className={`library-delete-mode-button ${deleteMode ? "active" : ""
                            }`}
                        onClick={() =>
                            setDeleteMode(
                                (currentMode) => !currentMode,
                            )
                        }
                    >
                        {deleteMode
                            ? "Cancelar"
                            : "− Borrar"}
                    </button>
                </div>
            </div>

            <input
                type="search"
                className="library-search"
                value={search}
                onChange={(event) =>
                    setSearch(event.target.value)
                }
                placeholder="Buscar estudios..."
                disabled={deleteMode}
            />

            <div className="library-tree">
                {rootFolders.map((folder) => (
                    <FolderNode
                        key={folder.id}
                        folder={folder}
                        folders={library.folders}
                        studies={visibleStudies}
                        selectedStudyId={selectedStudyId}
                        depth={0}
                        deleteMode={deleteMode}
                        onToggleFolder={toggleFolder}
                        onSelectStudy={(studyId) =>
                            onStudySelect(studyId)
                        }
                        onCreateFolder={createFolder}
                        onCreateStudy={createStudy}
                        onDeleteFolder={deleteFolder}
                        onDeleteStudy={deleteStudy}
                    />
                ))}

                {rootStudies.map((study) => (
                    <button
                        type="button"
                        key={study.id}
                        className={`library-study-row root-study ${selectedStudyId === study.id
                            ? "active"
                            : ""
                            } ${deleteMode ? "delete-mode" : ""}`}
                        onClick={() => {
                            if (deleteMode) {
                                deleteStudy(study.id);
                                return;
                            }

                            onStudySelect(study.id);
                        }}
                    >
                        <span aria-hidden="true">
                            {deleteMode ? "🗑️" : "♟"}
                        </span>

                        <span>{study.name}</span>
                    </button>
                ))}

                {library.folders.length === 0 &&
                    library.studies.length === 0 && (
                        <p className="library-empty">
                            Crea una carpeta o un estudio para
                            empezar.
                        </p>
                    )}
            </div>
            <div className="library-footer">
                <button
                    type="button"
                    className="library-import-button"
                    onClick={() =>
                        importInputRef.current?.click()
                    }
                >
                    Importar biblioteca
                </button>

                <button
                    type="button"
                    className="library-export-button"
                    onClick={onExportLibrary}
                >
                    Exportar biblioteca
                </button>

                <input
                    ref={importInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="library-file-input"
                    onChange={(event) => {
                        const file =
                            event.target.files?.[0];

                        if (file) {
                            onImportLibrary(file);
                        }

                        /*
                         * Reiniciamos el input para permitir
                         * volver a importar el mismo archivo.
                         */
                        event.target.value = "";
                    }}
                />
            </div>
        </aside>
    );
}