import {
    useCallback,
    useMemo,
    useState,
    type ReactNode,
} from "react";

import Modal from "../ui/Modal";

import {
    DialogContext,
    type AlertOptions,
    type ConfirmOptions,
    type DialogContextValue,
    type PromptOptions,
} from "./dialogContext";

type AlertRequest = {
    id: string;

    type: "alert";

    options:
        AlertOptions;
};

type ConfirmRequest = {
    id: string;

    type: "confirm";

    options:
        ConfirmOptions;

    resolve: (
        confirmed: boolean,
    ) => void;
};

type PromptRequest = {
    id: string;

    type: "prompt";

    options:
        PromptOptions;

    resolve: (
        value:
            string | null,
    ) => void;
};

type DialogRequest =
    | AlertRequest
    | ConfirmRequest
    | PromptRequest;

type DialogProviderProps = {
    children:
        ReactNode;
};

type DialogRendererProps = {
    request:
        DialogRequest;

    onFinish:
        () => void;
};

/*
 * Renderiza un único diálogo.
 *
 * Este componente recibe una key distinta
 * para cada petición, así que su estado
 * interno se crea de nuevo automáticamente.
 *
 * De esta forma no necesitamos hacer
 * setState dentro de useEffect.
 */
function DialogRenderer({
    request,
    onFinish,
}: DialogRendererProps) {
    const [
        promptValue,
        setPromptValue,
    ] =
        useState(
            () =>
                request.type ===
                    "prompt"
                    ? request
                        .options
                        .initialValue ??
                    ""
                    : "",
        );

    function closeDialog() {
        if (
            request.type ===
            "confirm"
        ) {
            request.resolve(
                false,
            );
        }

        if (
            request.type ===
            "prompt"
        ) {
            request.resolve(
                null,
            );
        }

        onFinish();
    }

    function confirmDialog() {
        if (
            request.type ===
            "alert"
        ) {
            onFinish();

            return;
        }

        if (
            request.type ===
            "confirm"
        ) {
            request.resolve(
                true,
            );

            onFinish();

            return;
        }

        const value =
            promptValue.trim();

        if (!value) {
            return;
        }

        request.resolve(
            value,
        );

        onFinish();
    }

    const confirmButtonClass =
        request.type ===
            "confirm" &&
            request.options
                .destructive
            ? "modal-danger-button"
            : "modal-primary-button";

    const confirmButtonLabel =
        request.type ===
            "alert"
            ? request.options
                .buttonLabel ??
            "Entendido"
            : request.type ===
                "confirm"
                ? request.options
                    .confirmLabel ??
                "Confirmar"
                : request.options
                    .confirmLabel ??
                "Aceptar";

    const cancelButtonLabel =
        request.type ===
            "confirm" ||
            request.type ===
            "prompt"
            ? request.options
                .cancelLabel ??
            "Cancelar"
            : null;

    const promptIsEmpty =
        request.type ===
            "prompt" &&
        promptValue
            .trim()
            .length === 0;

    return (
        <Modal
            open
            title={
                request
                    .options
                    .title
            }
            onClose={
                closeDialog
            }
            footer={
                <>
                    {cancelButtonLabel && (
                        <button
                            type="button"
                            className="modal-secondary-button"
                            onClick={
                                closeDialog
                            }
                        >
                            {
                                cancelButtonLabel
                            }
                        </button>
                    )}

                    <button
                        type="button"
                        className={
                            confirmButtonClass
                        }
                        disabled={
                            promptIsEmpty
                        }
                        onClick={
                            confirmDialog
                        }
                    >
                        {
                            confirmButtonLabel
                        }
                    </button>
                </>
            }
        >
            {request.type ===
                "alert" && (
                <p className="modal-message">
                    {
                        request
                            .options
                            .message
                    }
                </p>
            )}

            {request.type ===
                "confirm" && (
                <p className="modal-message">
                    {
                        request
                            .options
                            .message
                    }
                </p>
            )}

            {request.type ===
                "prompt" && (
                <>
                    {request
                        .options
                        .message && (
                        <p className="modal-message">
                            {
                                request
                                    .options
                                    .message
                            }
                        </p>
                    )}

                    <div className="modal-field">
                        {request
                            .options
                            .label && (
                            <label
                                htmlFor="chessktop-dialog-input"
                            >
                                {
                                    request
                                        .options
                                        .label
                                }
                            </label>
                        )}

                        <input
                            id="chessktop-dialog-input"
                            type="text"
                            value={
                                promptValue
                            }
                            onChange={(
                                event,
                            ) =>
                                setPromptValue(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            onKeyDown={(
                                event,
                            ) => {
                                if (
                                    event.key ===
                                    "Enter" &&
                                    promptValue
                                        .trim()
                                        .length >
                                    0
                                ) {
                                    confirmDialog();
                                }
                            }}
                            autoFocus
                        />
                    </div>
                </>
            )}
        </Modal>
    );
}

export function DialogProvider({
    children,
}: DialogProviderProps) {
    const [
        queue,
        setQueue,
    ] =
        useState<
            DialogRequest[]
        >([]);

    const activeDialog =
        queue[0] ??
        null;

    const finishActiveDialog =
        useCallback(
            () => {
                setQueue(
                    (
                        previousQueue,
                    ) =>
                        previousQueue.slice(
                            1,
                        ),
                );
            },
            [],
        );

    const showAlert =
        useCallback(
            (
                options:
                    AlertOptions,
            ) => {
                const request:
                    AlertRequest = {
                    id:
                        crypto.randomUUID(),

                    type:
                        "alert",

                    options,
                };

                setQueue(
                    (
                        previousQueue,
                    ) => [
                        ...previousQueue,
                        request,
                    ],
                );
            },
            [],
        );

    const confirmDialog =
        useCallback(
            (
                options:
                    ConfirmOptions,
            ) => {
                return new Promise<boolean>(
                    (
                        resolve,
                    ) => {
                        const request:
                            ConfirmRequest = {
                            id:
                                crypto.randomUUID(),

                            type:
                                "confirm",

                            options,

                            resolve,
                        };

                        setQueue(
                            (
                                previousQueue,
                            ) => [
                                ...previousQueue,
                                request,
                            ],
                        );
                    },
                );
            },
            [],
        );

    const promptDialog =
        useCallback(
            (
                options:
                    PromptOptions,
            ) => {
                return new Promise<
                    string | null
                >(
                    (
                        resolve,
                    ) => {
                        const request:
                            PromptRequest = {
                            id:
                                crypto.randomUUID(),

                            type:
                                "prompt",

                            options,

                            resolve,
                        };

                        setQueue(
                            (
                                previousQueue,
                            ) => [
                                ...previousQueue,
                                request,
                            ],
                        );
                    },
                );
            },
            [],
        );

    const contextValue:
        DialogContextValue =
        useMemo(
            () => ({
                showAlert,

                confirmDialog,

                promptDialog,
            }),
            [
                showAlert,
                confirmDialog,
                promptDialog,
            ],
        );

    return (
        <DialogContext.Provider
            value={
                contextValue
            }
        >
            {children}

            {activeDialog && (
                <DialogRenderer
                    /*
                     * La key fuerza un componente
                     * nuevo para cada diálogo.
                     *
                     * Por eso promptValue se
                     * inicializa correctamente
                     * sin ningún useEffect.
                     */
                    key={
                        activeDialog.id
                    }
                    request={
                        activeDialog
                    }
                    onFinish={
                        finishActiveDialog
                    }
                />
            )}
        </DialogContext.Provider>
    );
}