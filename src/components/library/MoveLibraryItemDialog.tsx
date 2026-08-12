import {
    Folder,
    Library,
    X,
} from "lucide-react";

import type {
    LibraryFolder,
} from "../../types/library";

type MoveLibraryItemDialogProps = {
    open: boolean;

    title: string;

    folders: LibraryFolder[];

    currentFolderId: string | null;

    excludedFolderIds?: Set<string>;

    onConfirm: (
        folderId: string | null,
    ) => void;

    onCancel: () => void;
};

function getFolderDepth(
    folders: LibraryFolder[],
    folder: LibraryFolder,
): number {
    let depth = 0;

    let parentId =
        folder.parentId;

    while (
        parentId !== null
    ) {
        const parent =
            folders.find(
                (candidate) =>
                    candidate.id ===
                    parentId,
            );

        if (!parent) {
            break;
        }

        depth += 1;

        parentId =
            parent.parentId;
    }

    return depth;
}

export default function MoveLibraryItemDialog({
    open,
    title,
    folders,
    currentFolderId,
    excludedFolderIds =
    new Set<string>(),
    onConfirm,
    onCancel,
}: MoveLibraryItemDialogProps) {
    if (!open) {
        return null;
    }

    const availableFolders =
        folders.filter(
            (folder) =>
                !excludedFolderIds.has(
                    folder.id,
                ),
        );

    return (
        <div
            className="move-dialog-overlay"
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget
                ) {
                    onCancel();
                }
            }}
        >
            <section
                className="move-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="move-dialog-title"
            >
                <header className="move-dialog-header">
                    <h2 id="move-dialog-title">
                        {title}
                    </h2>

                    <button
                        type="button"
                        onClick={
                            onCancel
                        }
                        aria-label="Cerrar"
                    >
                        <X
                            size={18}
                            aria-hidden="true"
                        />
                    </button>
                </header>

                <div className="move-dialog-folders">
                    <button
                        type="button"
                        className={
                            currentFolderId ===
                                null
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            onConfirm(
                                null,
                            )
                        }
                    >
                        <Library
                            size={16}
                            aria-hidden="true"
                        />

                        <span>
                            Biblioteca principal
                        </span>
                    </button>

                    {availableFolders.map(
                        (folder) => {
                            const depth =
                                getFolderDepth(
                                    folders,
                                    folder,
                                );

                            return (
                                <button
                                    type="button"
                                    key={
                                        folder.id
                                    }
                                    className={
                                        currentFolderId ===
                                            folder.id
                                            ? "active"
                                            : ""
                                    }
                                    style={{
                                        paddingLeft:
                                            14 +
                                            depth *
                                            18,
                                    }}
                                    onClick={() =>
                                        onConfirm(
                                            folder.id,
                                        )
                                    }
                                >
                                    <Folder
                                        size={16}
                                        aria-hidden="true"
                                    />

                                    <span>
                                        {folder.name}
                                    </span>
                                </button>
                            );
                        },
                    )}
                </div>

                <footer className="move-dialog-actions">
                    <button
                        type="button"
                        onClick={
                            onCancel
                        }
                    >
                        Cancelar
                    </button>
                </footer>
            </section>
        </div>
    );
}