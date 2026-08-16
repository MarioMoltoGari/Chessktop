import { useMemo, useState, useRef } from "react";
import {
    BookOpen,
    ChevronDown,
    ChevronRight,
    Dumbbell,
    Ellipsis,
    FilePlus2,
    Folder,
    FolderOpen,
    FolderPlus,
    Trash2,
} from "lucide-react";
import type {
    ChessStudy,
    LibraryFolder,
    LibraryState,
} from "../types/library";
import ContextMenu, {
    type ContextMenuItem,
} from "./library/ContextMenu";
import {
    useDialogs,
} from "../components/dialogs/dialogContext";
import MoveLibraryItemDialog from "./library/MoveLibraryItemDialog";
import type {
    Training,
    TrainingMode,
    TrainingOrder,
    TrainingPerformancesMap,
    TrainingSide,
    TrainingsMap,
} from "./training/types";
import {
    getHistoricalAccuracy,
} from "./training/trainingPerformance";
import CreateTrainingDialog from "./training/CreateTrainingDialog";
import { t } from "../i18n";

type LibrarySidebarProps = {
    library: LibraryState;
    selectedStudyId: string | null;
    trainingPerformances: TrainingPerformancesMap;
    onLibraryChange: (library: LibraryState) => void;
    onStudySelect: (studyId: string | null) => void;
    onExportLibrary: () => void;
    onImportLibrary: (
        file: File,
    ) => void;
    onCreateTraining: (
        studyId: string,
        name: string,
        side: TrainingSide,
        mode: TrainingMode,
        order: TrainingOrder,
    ) => void;
    trainings: TrainingsMap;
    onImportPgn: (
        file: File,
    ) => void;
    onExportPgn: () => void;
    onOpenTraining: (
        trainingId: string,
    ) => void;

    onRenameTraining: (
        trainingId: string,
        name: string,
    ) => void;

    onDeleteTraining: (
        trainingId: string,
    ) => void;
};

type FolderNodeProps = {
    folder: LibraryFolder;
    folders: LibraryFolder[];
    studies: ChessStudy[];
    selectedStudyId: string | null;
    depth: number;
    deleteMode: boolean;
    trainingPerformances: TrainingPerformancesMap;

    onToggleFolder: (folderId: string) => void;
    onSelectStudy: (studyId: string) => void;
    onCreateFolder: (parentId: string | null) => void;
    onCreateStudy: (folderId: string | null) => void;
    onDeleteFolder: (folderId: string) => void;
    onDeleteStudy: (studyId: string) => void;
    onOpenContextMenu: (
        event: React.MouseEvent,
        target: LibraryContextTarget,
    ) => void;
    trainings: TrainingsMap;
    onOpenTraining: (trainingId: string) => void;
};

type LibraryContextTarget =
    | {
        type: "folder";
        id: string;
    }
    | {
        type: "study";
        id: string;
    }
    | {
        type: "training";
        id: string;
    };

type LibraryContextMenuState = {
    x: number;
    y: number;
    target: LibraryContextTarget;
};

type StudyNodeProps = {
    study: ChessStudy;
    trainings: Training[];
    trainingPerformances: TrainingPerformancesMap;
    selectedStudyId: string | null;

    depth: number;
    deleteMode: boolean;

    onSelectStudy: (
        studyId: string,
    ) => void;

    onDeleteStudy: (
        studyId: string,
    ) => void;

    onOpenContextMenu: (
        event: React.MouseEvent,
        target: LibraryContextTarget,
    ) => void;

    onOpenTraining: (
        trainingId: string,
    ) => void;
};

function formatLastTrainingDate(
    value: string | null,
): string {
    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return "";
    }

    const today =
        new Date();

    const todayKey =
        today.toDateString();

    const dateKey =
        date.toDateString();

    if (
        dateKey ===
        todayKey
    ) {
        return t("common.today");
    }

    const yesterday =
        new Date();

    yesterday.setDate(
        yesterday.getDate() - 1,
    );

    if (
        dateKey ===
        yesterday.toDateString()
    ) {
        return t("common.yesterday");
    }

    return date.toLocaleDateString(
        "es-ES",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        },
    );
}

function StudyNode({
    study,
    trainings,
    trainingPerformances,
    selectedStudyId,
    depth,
    deleteMode,
    onSelectStudy,
    onDeleteStudy,
    onOpenContextMenu,
    onOpenTraining,
}: StudyNodeProps) {
    return (
        <div className="library-study-node">
            <div
                className={`library-study-row ${selectedStudyId === study.id
                    ? "active"
                    : ""
                    } ${deleteMode
                        ? "delete-mode"
                        : ""
                    }`}
                style={{
                    paddingLeft:
                        `${depth * 16 + 34}px`,
                }}
                onContextMenu={(event) =>
                    onOpenContextMenu(
                        event,
                        {
                            type: "study",
                            id: study.id,
                        },
                    )
                }
                onClick={() => {
                    if (deleteMode) {
                        onDeleteStudy(
                            study.id,
                        );

                        return;
                    }

                    onSelectStudy(
                        study.id,
                    );
                }}
            >
                <span aria-hidden="true">
                    {deleteMode ? (
                        <Trash2 size={16} />
                    ) : (
                        <BookOpen size={16} />
                    )}
                </span>

                <span>{study.name}</span>

                {!deleteMode && (
                    <button
                        type="button"
                        className="library-item-menu-button"
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();

                            onOpenContextMenu(
                                event,
                                {
                                    type: "study",
                                    id: study.id,
                                },
                            );
                        }}
                        aria-label={study.name}
                        title={study.name}
                    >
                        <Ellipsis
                            size={17}
                            aria-hidden="true"
                        />
                    </button>
                )}
            </div>

            {!deleteMode &&
                trainings.map(
                    (training) => {
                        const performance =
                            trainingPerformances[
                            training.id
                            ];

                        const accuracy =
                            getHistoricalAccuracy(
                                performance,
                            );

                        const lastTraining =
                            formatLastTrainingDate(
                                performance
                                    ?.lastTrainedAt ??
                                null,
                            );

                        return (
                            <div
                                key={
                                    training.id
                                }
                                className="library-training-row"
                                style={{
                                    paddingLeft:
                                        `${depth * 16 + 58}px`,
                                }}
                                onClick={() =>
                                    onOpenTraining(
                                        training.id,
                                    )
                                }
                                onContextMenu={(
                                    event,
                                ) =>
                                    onOpenContextMenu(
                                        event,
                                        {
                                            type:
                                                "training",
                                            id:
                                                training.id,
                                        },
                                    )
                                }
                                title={
                                    training.name
                                }
                            >
                                <span
                                    className="library-training-icon"
                                    aria-hidden="true"
                                >
                                    <Dumbbell size={15} />
                                </span>

                                <span className="library-training-content">
                                    <span className="library-training-name">
                                        {
                                            training.name
                                        }
                                    </span>

                                    <span className="library-training-meta">
                                        {performance
                                            ? `${performance.totalSessions} ${performance.totalSessions ===
                                                1
                                                ? t("common.sessions.one")
                                                : t("common.sessions.other")
                                            } · ${accuracy ??
                                            "—"
                                            }%`
                                            : t("common.notTrainedYet")}

                                        {performance &&
                                            lastTraining &&
                                            ` · ${lastTraining}`}
                                    </span>
                                </span>

                                <button
                                    type="button"
                                    className="library-item-menu-button"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();

                                        onOpenContextMenu(
                                            event,
                                            {
                                                type: "training",
                                                id: training.id,
                                            },
                                        );
                                    }}
                                    aria-label={training.name}
                                    title={training.name}
                                >
                                    <Ellipsis
                                        size={17}
                                        aria-hidden="true"
                                    />
                                </button>
                            </div>
                        );
                    },
                )}
        </div>
    );
}

function FolderNode({
    folder,
    folders,
    studies,
    trainings,
    selectedStudyId,
    depth,
    deleteMode,
    trainingPerformances,
    onToggleFolder,
    onSelectStudy,
    onCreateFolder,
    onCreateStudy,
    onDeleteFolder,
    onDeleteStudy,
    onOpenContextMenu,
    onOpenTraining,
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
                onContextMenu={(event) =>
                    onOpenContextMenu(event, {
                        type: "folder",
                        id: folder.id,
                    })
                }
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
                            ? t("library.folder.deleteAria", { name: folder.name })
                            : folder.isExpanded
                                ? t("library.folder.collapse", { name: folder.name })
                                : t("library.folder.expand", { name: folder.name })
                    }
                >
                    {deleteMode ? (
                        <Trash2 size={15} />
                    ) : folder.isExpanded ? (
                        <ChevronDown size={16} />
                    ) : (
                        <ChevronRight size={16} />
                    )}
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
                        {deleteMode ? (
                            <Trash2 size={16} />
                        ) : folder.isExpanded ? (
                            <FolderOpen size={16} />
                        ) : (
                            <Folder size={16} />
                        )}
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
                            title={t("library.folder.createSubfolderAria", { name: folder.name })}
                            aria-label={t("library.folder.createSubfolderAria", { name: folder.name })}
                        >
                            <FolderPlus
                                size={15}
                                aria-hidden="true"
                            />
                        </button>

                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onCreateStudy(folder.id);
                            }}
                            title={t("library.folder.createStudyAria", { name: folder.name })}
                            aria-label={t("library.folder.createStudyAria", { name: folder.name })}
                        >
                            <FilePlus2
                                size={15}
                                aria-hidden="true"
                            />
                        </button>

                        <button
                            type="button"
                            className="library-item-menu-button"
                            onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();

                                onOpenContextMenu(
                                    event,
                                    {
                                        type: "folder",
                                        id: folder.id,
                                    },
                                );
                            }}
                            aria-label={folder.name}
                            title={folder.name}
                        >
                            <Ellipsis
                                size={17}
                                aria-hidden="true"
                            />
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
                            onOpenContextMenu={
                                onOpenContextMenu
                            }
                            onOpenTraining={onOpenTraining}
                            trainings={trainings}
                            trainingPerformances={trainingPerformances}
                        />
                    ))}

                    {childStudies.map((study) => {
                        const studyTrainings =
                            Object.values(
                                trainings,
                            ).filter(
                                (training) =>
                                    training.studyId ===
                                    study.id,
                            );

                        return (
                            <StudyNode
                                key={study.id}
                                study={study}
                                trainings={
                                    studyTrainings
                                }
                                selectedStudyId={
                                    selectedStudyId
                                }
                                trainingPerformances={
                                    trainingPerformances
                                }
                                depth={depth + 1}
                                deleteMode={
                                    deleteMode
                                }
                                onSelectStudy={
                                    onSelectStudy
                                }
                                onDeleteStudy={
                                    onDeleteStudy
                                }
                                onOpenContextMenu={
                                    onOpenContextMenu
                                }
                                onOpenTraining={onOpenTraining}
                            />
                        );
                    })}
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
    trainings,
    trainingPerformances,
    selectedStudyId,
    onLibraryChange,
    onStudySelect,
    onExportLibrary,
    onImportLibrary,
    onImportPgn,
    onExportPgn,
    onCreateTraining,
    onOpenTraining,
    onRenameTraining,
    onDeleteTraining,
}: LibrarySidebarProps) {
    const {
        confirmDialog,
        promptDialog,
    } =
        useDialogs();
    const [search, setSearch] = useState("");
    const [deleteMode, setDeleteMode] = useState(false);
    const [
        contextMenu,
        setContextMenu,
    ] = useState<
        LibraryContextMenuState | null
    >(null);
    const [
        trainingStudyId,
        setTrainingStudyId,
    ] = useState<string | null>(null);
    const trainingStudy =
        trainingStudyId
            ? library.studies.find(
                (study) =>
                    study.id === trainingStudyId,
            ) ?? null
            : null;
    const [
        moveTarget,
        setMoveTarget,
    ] = useState<
        LibraryContextTarget | null
    >(null);
    const importInputRef =
        useRef<HTMLInputElement>(null);

    const pgnInputRef =
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

    function deleteTrainingFromMenu(
        trainingId: string,
    ) {
        const training =
            trainings[
            trainingId
            ];

        if (!training) {
            return;
        }

        void confirmDialog({
            title:
                t("library.training.deleteTitle"),

            message:
                t("library.training.deleteMessage", { name: training.name }),

            confirmLabel:
                t("app.dialog.delete"),

            destructive:
                true,
        }).then(
            (
                confirmed,
            ) => {
                if (!confirmed) {
                    return;
                }

                onDeleteTraining(
                    trainingId,
                );
            },
        );
    }

    function renameTrainingFromMenu(
        trainingId: string,
    ) {
        const training =
            trainings[
            trainingId
            ];

        if (!training) {
            return;
        }

        void promptDialog({
            title:
                t("library.training.renameTitle"),

            label:
                t("library.training.nameLabel"),

            initialValue:
                training.name,

            confirmLabel:
                t("app.dialog.save"),
        }).then(
            (
                name,
            ) => {
                const trimmedName =
                    name?.trim();

                if (
                    !trimmedName ||
                    trimmedName ===
                    training.name
                ) {
                    return;
                }

                onRenameTraining(
                    trainingId,
                    trimmedName,
                );
            },
        );
    }

    function openContextMenu(
        event: React.MouseEvent,
        target: LibraryContextTarget,
    ) {
        event.preventDefault();
        event.stopPropagation();

        /*
         * Reservamos aproximadamente 210 × 260 px
         * para evitar que el menú salga de la pantalla.
         */
        const menuWidth = 210;
        const menuHeight = 260;
        const margin = 8;

        const x = Math.min(
            event.clientX,
            window.innerWidth -
            menuWidth -
            margin,
        );

        const y = Math.min(
            event.clientY,
            window.innerHeight -
            menuHeight -
            margin,
        );

        setContextMenu({
            x: Math.max(margin, x),
            y: Math.max(margin, y),
            target,
        });
    }

    function openMoveDialog(
        target: LibraryContextTarget,
    ) {
        setMoveTarget(target);
    }

    function moveStudy(
        studyId: string,
        targetFolderId: string | null,
    ) {
        const study =
            library.studies.find(
                (item) =>
                    item.id === studyId,
            );

        if (
            !study ||
            study.folderId === targetFolderId
        ) {
            setMoveTarget(null);
            return;
        }

        onLibraryChange({
            ...library,

            studies: library.studies.map(
                (item) =>
                    item.id === studyId
                        ? {
                            ...item,
                            folderId:
                                targetFolderId,
                        }
                        : item,
            ),
        });

        setMoveTarget(null);
    }

    function renameFolder(
        folderId: string,
    ) {
        const folder =
            library.folders.find(
                (
                    item,
                ) =>
                    item.id ===
                    folderId,
            );

        if (!folder) {
            return;
        }

        void promptDialog({
            title:
                t("library.folder.renameTitle"),

            label:
                t("library.folder.nameLabel"),

            initialValue:
                folder.name,

            confirmLabel:
                t("app.dialog.save"),
        }).then(
            (
                name,
            ) => {
                const trimmedName =
                    name?.trim();

                if (
                    !trimmedName ||
                    trimmedName ===
                    folder.name
                ) {
                    return;
                }

                onLibraryChange({
                    ...library,

                    folders:
                        library.folders.map(
                            (
                                item,
                            ) =>
                                item.id ===
                                    folderId
                                    ? {
                                        ...item,

                                        name:
                                            trimmedName,
                                    }
                                    : item,
                        ),
                });
            },
        );
    }

    function renameStudy(
        studyId: string,
    ) {
        const study =
            library.studies.find(
                (
                    item,
                ) =>
                    item.id ===
                    studyId,
            );

        if (!study) {
            return;
        }

        void promptDialog({
            title:
                t("library.study.renameTitle"),

            label:
                t("library.study.nameLabel"),

            initialValue:
                study.name,

            confirmLabel:
                t("app.dialog.save"),
        }).then(
            (
                name,
            ) => {
                const trimmedName =
                    name?.trim();

                if (
                    !trimmedName ||
                    trimmedName ===
                    study.name
                ) {
                    return;
                }

                onLibraryChange({
                    ...library,

                    studies:
                        library.studies.map(
                            (
                                item,
                            ) =>
                                item.id ===
                                    studyId
                                    ? {
                                        ...item,

                                        name:
                                            trimmedName,
                                    }
                                    : item,
                        ),
                });
            },
        );
    }

    function moveFolder(
        folderId: string,
        targetParentId: string | null,
    ) {
        const folder =
            library.folders.find(
                (item) =>
                    item.id === folderId,
            );

        if (
            !folder ||
            folder.parentId ===
            targetParentId
        ) {
            setMoveTarget(null);
            return;
        }

        const descendantIds =
            new Set(
                getDescendantFolderIds(
                    library.folders,
                    folderId,
                ),
            );

        /*
         * No puede moverse dentro de sí misma
         * ni dentro de una descendiente.
         */
        if (
            targetParentId !== null &&
            descendantIds.has(
                targetParentId,
            )
        ) {
            return;
        }

        onLibraryChange({
            ...library,

            folders: library.folders.map(
                (item) =>
                    item.id === folderId
                        ? {
                            ...item,
                            parentId:
                                targetParentId,
                        }
                        : item,
            ),
        });

        setMoveTarget(null);
    }

    function getMoveExcludedFolderIds():
        Set<string> {
        if (
            !moveTarget ||
            moveTarget.type !== "folder"
        ) {
            return new Set();
        }

        return new Set(
            getDescendantFolderIds(
                library.folders,
                moveTarget.id,
            ),
        );
    }

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

    function createFolder(
        parentId:
            string | null,
    ) {
        void promptDialog({
            title:
                parentId
                    ? t("library.folder.newSubfolderTitle")
                    : t("library.folder.newTitle"),

            label:
                parentId
                    ? t("library.folder.subfolderLabel")
                    : t("library.folder.nameLabel"),

            confirmLabel:
                t("app.dialog.save"),
        }).then(
            (
                name,
            ) => {
                const trimmedName =
                    name?.trim();

                if (!trimmedName) {
                    return;
                }

                const newFolder = {
                    id:
                        crypto.randomUUID(),

                    name:
                        trimmedName,

                    parentId,

                    isExpanded:
                        true,
                };

                onLibraryChange({
                    ...library,

                    folders: [
                        ...library
                            .folders,

                        newFolder,
                    ],
                });
            },
        );
    }

    function createStudy(
        folderId:
            string | null,
    ) {
        void promptDialog({
            title:
                t("library.study.newTitle"),

            label:
                t("library.study.nameLabel"),

            confirmLabel:
                t("app.dialog.save"),
        }).then(
            (
                name,
            ) => {
                const trimmedName =
                    name?.trim();

                if (!trimmedName) {
                    return;
                }

                const newStudy = {
                    id:
                        crypto.randomUUID(),

                    name:
                        trimmedName,

                    folderId,
                };

                onLibraryChange({
                    ...library,

                    studies: [
                        ...library
                            .studies,

                        newStudy,
                    ],
                });

                onStudySelect(
                    newStudy.id,
                );
            },
        );
    }

    function deleteStudy(
        studyId: string,
    ) {
        const studyIndex =
            library.studies.findIndex(
                (
                    study,
                ) =>
                    study.id ===
                    studyId,
            );

        if (
            studyIndex === -1
        ) {
            return;
        }

        const study =
            library.studies[
            studyIndex
            ];

        void confirmDialog({
            title:
                t("library.study.deleteTitle"),

            message:
                t("library.study.deleteMessage", { name: study.name }),

            confirmLabel:
                t("app.dialog.delete"),

            destructive:
                true,
        }).then(
            (
                confirmed,
            ) => {
                if (!confirmed) {
                    return;
                }

                const remainingStudies =
                    library.studies.filter(
                        (
                            item,
                        ) =>
                            item.id !==
                            studyId,
                    );

                const fallbackStudy =
                    remainingStudies[
                    studyIndex
                    ] ??
                    remainingStudies[
                    studyIndex - 1
                    ] ??
                    remainingStudies[0] ??
                    null;

                onLibraryChange({
                    ...library,

                    studies:
                        remainingStudies,
                });

                if (
                    selectedStudyId ===
                    studyId
                ) {
                    onStudySelect(
                        fallbackStudy
                            ?.id ??
                        null,
                    );
                }

                setDeleteMode(
                    false,
                );
            },
        );
    }

    function deleteFolder(
        folderId: string,
    ) {
        const folder =
            library.folders.find(
                (
                    item,
                ) =>
                    item.id ===
                    folderId,
            );

        if (!folder) {
            return;
        }

        const folderIdsToDelete =
            getDescendantFolderIds(
                library.folders,
                folderId,
            );

        const folderIdSet =
            new Set(
                folderIdsToDelete,
            );

        const studiesToDelete =
            library.studies.filter(
                (
                    study,
                ) =>
                    study.folderId !==
                    null &&
                    folderIdSet.has(
                        study.folderId,
                    ),
            );

        const studyIdsToDelete =
            new Set(
                studiesToDelete.map(
                    (
                        study,
                    ) =>
                        study.id,
                ),
            );

        void confirmDialog({
            title:
                t("library.folder.deleteTitle"),

            message:
                t("library.folder.deleteMessage", {
                    name: folder.name,
                    subfolderCount: folderIdsToDelete.length - 1,
                    subfolderLabel: folderIdsToDelete.length - 1 === 1 ? t("common.folder") : t("common.folderPlural"),
                    studyCount: studiesToDelete.length,
                    studyLabel: studiesToDelete.length === 1 ? t("common.study") : t("common.studyPlural"),
                }),

            confirmLabel:
                t("app.dialog.delete"),

            destructive:
                true,
        }).then(
            (
                confirmed,
            ) => {
                if (!confirmed) {
                    return;
                }

                const remainingFolders =
                    library.folders.filter(
                        (
                            item,
                        ) =>
                            !folderIdSet.has(
                                item.id,
                            ),
                    );

                const remainingStudies =
                    library.studies.filter(
                        (
                            study,
                        ) =>
                            !studyIdsToDelete.has(
                                study.id,
                            ),
                    );

                const selectedStudyWasDeleted =
                    selectedStudyId !==
                    null &&
                    studyIdsToDelete.has(
                        selectedStudyId,
                    );

                let fallbackStudyId:
                    string | null =
                    selectedStudyId;

                if (
                    selectedStudyWasDeleted
                ) {
                    const selectedStudyIndex =
                        library.studies.findIndex(
                            (
                                study,
                            ) =>
                                study.id ===
                                selectedStudyId,
                        );

                    const fallbackStudy =
                        remainingStudies[
                        selectedStudyIndex
                        ] ??
                        remainingStudies[
                        selectedStudyIndex -
                        1
                        ] ??
                        remainingStudies[0] ??
                        null;

                    fallbackStudyId =
                        fallbackStudy
                            ?.id ??
                        null;
                }

                onLibraryChange({
                    folders:
                        remainingFolders,

                    studies:
                        remainingStudies,
                });

                if (
                    selectedStudyWasDeleted
                ) {
                    onStudySelect(
                        fallbackStudyId,
                    );
                }

                setDeleteMode(
                    false,
                );
            },
        );
    }

    function openStudy(
        studyId: string,
    ) {
        onStudySelect(studyId);
    }

    function getContextMenuItems():
        ContextMenuItem[] {
        if (!contextMenu) {
            return [];
        }

        const { target } = contextMenu;

        if (target.type === "folder") {
            return [
                {
                    id: "new-subfolder",
                    label: t("library.context.newSubfolder"),
                    onClick: () =>
                        createFolder(target.id),
                },
                {
                    id: "new-study",
                    label: t("library.context.newStudy"),
                    onClick: () =>
                        createStudy(target.id),
                },
                {
                    id: "rename-folder",
                    label: t("library.context.rename"),
                    separatorBefore: true,
                    onClick: () =>
                        renameFolder(target.id),
                },
                {
                    id: "move-folder",
                    label: t("library.context.move"),
                    onClick: () =>
                        openMoveDialog({
                            type: "folder",
                            id: target.id,
                        }),
                },
                {
                    id: "delete-folder",
                    label: t("library.context.delete"),
                    danger: true,
                    separatorBefore: true,
                    onClick: () =>
                        deleteFolder(target.id),
                },
            ];
        }

        if (target.type === "study") {
            return [
                {
                    id: "open-study",
                    label: t("common.open"),
                    onClick: () =>
                        openStudy(target.id),
                },
                {
                    id: "new-training",
                    label: t("library.context.newTraining"),
                    separatorBefore: true,
                    onClick: () =>
                        setTrainingStudyId(
                            target.id,
                        ),
                },
                {
                    id: "rename-study",
                    label: t("common.rename"),
                    separatorBefore: true,
                    onClick: () =>
                        renameStudy(target.id),
                },
                {
                    id: "move-study",
                    label: t("common.moveTo"),
                    onClick: () =>
                        openMoveDialog({
                            type: "study",
                            id: target.id,
                        }),
                },
                {
                    id: "duplicate-study",
                    label: t("library.context.duplicate"),
                    disabled: true,
                    separatorBefore: true,
                    onClick: () => { },
                },
                {
                    id: "export-study",
                    label: t("library.context.exportPgn"),
                    disabled: true,
                    onClick: () => { },
                },
                {
                    id: "delete-study",
                    label: t("library.context.delete"),
                    danger: true,
                    separatorBefore: true,
                    onClick: () =>
                        deleteStudy(target.id),
                },
            ];
        }

        if (target.type === "training") {
            return [
                {
                    id: "open-training",
                    label: t("common.open"),
                    onClick: () =>
                        onOpenTraining(
                            target.id,
                        ),
                },
                {
                    id: "rename-training",
                    label: t("common.rename"),
                    separatorBefore: true,
                    onClick: () =>
                        renameTrainingFromMenu(
                            target.id,
                        ),
                },
                {
                    id: "duplicate-training",
                    label: t("library.context.duplicate"),
                    disabled: true,
                    onClick: () => { },
                },
                {
                    id: "delete-training",
                    label: t("library.context.delete"),
                    danger: true,
                    separatorBefore: true,
                    onClick: () =>
                        deleteTrainingFromMenu(
                            target.id,
                        ),
                },
            ];
        }

        return [];
    }

    return (
        <aside
            className={`library-sidebar ${deleteMode
                ? "delete-mode"
                : ""
                }`}
        >
            <div className="library-sidebar-header">
                <div>

                    <h2>{t("library.title")}</h2>

                    <p>
                        {deleteMode
                            ? t("library.deleteModePrompt")
                            : t("library.subtitle")}
                    </p>
                </div>

                <div className="library-header-toolbar">
                    <div className="library-header-actions">
                        <button
                            type="button"
                            onClick={() =>
                                createFolder(
                                    null,
                                )
                            }
                            disabled={
                                deleteMode
                            }
                        >
                            {t("library.createFolder")}
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                createStudy(
                                    null,
                                )
                            }
                            disabled={
                                deleteMode
                            }
                        >
                            {t("library.createStudy")}
                        </button>
                    </div>

                    <button
                        type="button"
                        className={`library-delete-mode-button ${deleteMode
                            ? "active"
                            : ""
                            }`}
                        onClick={() =>
                            setDeleteMode(
                                (
                                    currentMode,
                                ) =>
                                    !currentMode,
                            )
                        }
                    >
                        {deleteMode
                            ? t("library.deleteModeCancel")
                            : t("library.deleteModeToggle")}
                    </button>
                </div>
            </div>

            <input
                type="search"
                className="library-search"
                value={search}
                onChange={(event) =>
                    setSearch(
                        event.target.value,
                    )
                }
                placeholder={t("library.search.placeholder")}
                disabled={deleteMode}
            />

            <div className="library-tree">
                {library.folders.length ===
                    0 &&
                    library.studies.length ===
                    0 ? (
                    <div className="library-empty-state">
                        <strong>
                            {t("library.empty")}
                        </strong>
                    </div>
                ) : (
                    <>
                        {rootFolders.map(
                            (
                                folder,
                            ) => (
                                <FolderNode
                                    key={
                                        folder.id
                                    }
                                    folder={
                                        folder
                                    }
                                    folders={
                                        library.folders
                                    }
                                    trainingPerformances={
                                        trainingPerformances
                                    }
                                    studies={
                                        visibleStudies
                                    }
                                    selectedStudyId={
                                        selectedStudyId
                                    }
                                    depth={
                                        0
                                    }
                                    deleteMode={
                                        deleteMode
                                    }
                                    onToggleFolder={
                                        toggleFolder
                                    }
                                    onSelectStudy={(
                                        studyId,
                                    ) =>
                                        onStudySelect(
                                            studyId,
                                        )
                                    }
                                    onCreateFolder={
                                        createFolder
                                    }
                                    onCreateStudy={
                                        createStudy
                                    }
                                    onDeleteFolder={
                                        deleteFolder
                                    }
                                    onDeleteStudy={
                                        deleteStudy
                                    }
                                    onOpenContextMenu={
                                        openContextMenu
                                    }
                                    trainings={
                                        trainings
                                    }
                                    onOpenTraining={
                                        onOpenTraining
                                    }
                                />
                            ),
                        )}

                        {rootStudies.map(
                            (
                                study,
                            ) => {
                                const studyTrainings =
                                    Object.values(
                                        trainings,
                                    ).filter(
                                        (
                                            training,
                                        ) =>
                                            training.studyId ===
                                            study.id,
                                    );


                                return (
                                    <StudyNode
                                        key={
                                            study.id
                                        }
                                        study={
                                            study
                                        }
                                        trainings={
                                            studyTrainings
                                        }
                                        selectedStudyId={
                                            selectedStudyId
                                        }
                                        trainingPerformances={
                                            trainingPerformances
                                        }
                                        depth={
                                            0
                                        }
                                        deleteMode={
                                            deleteMode
                                        }
                                        onSelectStudy={
                                            onStudySelect
                                        }
                                        onDeleteStudy={
                                            deleteStudy
                                        }
                                        onOpenContextMenu={
                                            openContextMenu
                                        }
                                        onOpenTraining={
                                            onOpenTraining
                                        }
                                    />
                                );
                            },
                        )}
                    </>
                )}

            </div>

            <div className="library-footer">
                <div className="library-footer-group">
                    <span className="library-footer-label">
                        {t("library.footer.label")}
                    </span>

                    <div className="library-footer-actions">
                        <button
                            type="button"
                            className="library-import-button"
                            onClick={() =>
                                importInputRef
                                    .current
                                    ?.click()
                            }
                        >
                            {t("common.import")}
                        </button>

                        <button
                            type="button"
                            className="library-export-button"
                            onClick={
                                onExportLibrary
                            }
                        >
                            {t("common.export")}
                        </button>
                    </div>
                </div>

                <div className="library-footer-group">
                    <span className="library-footer-label">
                        {t("library.footer.pgnLabel")}
                    </span>

                    <div className="library-footer-actions">
                        <button
                            className="library-import-button"
                            type="button"
                            onClick={() =>
                                pgnInputRef
                                    .current
                                    ?.click()
                            }
                        >
                            {t("common.import")}
                        </button>

                        <button
                            className="library-import-button"
                            type="button"
                            onClick={
                                onExportPgn
                            }
                            disabled={
                                !selectedStudyId
                            }
                        >
                            {t("common.export")}
                        </button>
                    </div>
                </div>

                <input
                    ref={
                        importInputRef
                    }
                    type="file"
                    accept=".json,application/json"
                    className="library-file-input"
                    onChange={(event) => {
                        const file =
                            event.target
                                .files?.[0];

                        if (file) {
                            onImportLibrary(
                                file,
                            );
                        }

                        event.target.value =
                            "";
                    }}
                />

                <input
                    ref={
                        pgnInputRef
                    }
                    type="file"
                    accept=".pgn,application/x-chess-pgn"
                    className="library-file-input"
                    onChange={(event) => {
                        const file =
                            event.target
                                .files?.[0];

                        if (file) {
                            onImportPgn(
                                file,
                            );
                        }

                        event.target.value =
                            "";
                    }}
                />
            </div>

            {trainingStudy && (
                <CreateTrainingDialog
                    open
                    studyName={
                        trainingStudy.name
                    }
                    onCancel={() =>
                        setTrainingStudyId(
                            null,
                        )
                    }
                    onCreate={(data) => {
                        onCreateTraining(
                            trainingStudy.id,
                            data.name,
                            data.side,
                            data.mode,
                            data.order,
                        );

                        setTrainingStudyId(
                            null,
                        );
                    }}
                />
            )}

            {contextMenu && (
                <ContextMenu
                    x={
                        contextMenu.x
                    }
                    y={
                        contextMenu.y
                    }
                    items={
                        getContextMenuItems()
                    }
                    onClose={() =>
                        setContextMenu(
                            null,
                        )
                    }
                />
            )}

            {moveTarget && (
                <MoveLibraryItemDialog
                    open
                    title={
                        moveTarget.type ===
                            "folder"
                            ? t("library.context.move")
                            : t("common.moveTo")
                    }
                    folders={
                        library.folders
                    }
                    currentFolderId={
                        moveTarget.type ===
                            "folder"
                            ? library.folders.find(
                                (
                                    folder,
                                ) =>
                                    folder.id ===
                                    moveTarget.id,
                            )?.parentId ??
                            null
                            : library.studies.find(
                                (
                                    study,
                                ) =>
                                    study.id ===
                                    moveTarget.id,
                            )?.folderId ??
                            null
                    }
                    excludedFolderIds={
                        getMoveExcludedFolderIds()
                    }
                    onConfirm={(
                        targetFolderId,
                    ) => {
                        if (
                            moveTarget.type ===
                            "folder"
                        ) {
                            moveFolder(
                                moveTarget.id,
                                targetFolderId,
                            );
                        } else {
                            moveStudy(
                                moveTarget.id,
                                targetFolderId,
                            );
                        }
                    }}
                    onCancel={() =>
                        setMoveTarget(
                            null,
                        )
                    }
                />
            )}
        </aside>
    );
}