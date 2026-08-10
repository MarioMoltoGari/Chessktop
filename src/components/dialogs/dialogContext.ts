import {
    createContext,
    useContext,
} from "react";

export type AlertOptions = {
    title: string;
    message: string;

    buttonLabel?: string;
};

export type ConfirmOptions = {
    title: string;
    message: string;

    confirmLabel?: string;
    cancelLabel?: string;

    destructive?: boolean;
};

export type PromptOptions = {
    title: string;

    message?: string;
    label?: string;

    initialValue?: string;

    confirmLabel?: string;
    cancelLabel?: string;
};

export type DialogContextValue = {
    showAlert: (
        options: AlertOptions,
    ) => void;

    confirmDialog: (
        options: ConfirmOptions,
    ) => Promise<boolean>;

    promptDialog: (
        options: PromptOptions,
    ) => Promise<string | null>;
};

export const DialogContext =
    createContext<
        DialogContextValue | null
    >(null);

export function useDialogs():
    DialogContextValue {
    const context =
        useContext(
            DialogContext,
        );

    if (!context) {
        throw new Error(
            "useDialogs debe utilizarse dentro de DialogProvider.",
        );
    }

    return context;
}