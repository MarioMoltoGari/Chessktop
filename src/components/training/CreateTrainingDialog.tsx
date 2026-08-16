import {
    useState,
} from "react";
import { t } from "../../i18n";

import Modal from "../ui/Modal";

import type {
    TrainingMode,
    TrainingOrder,
    TrainingSide,
} from "./types";

export type CreateTrainingData = {
    name: string;
    side: TrainingSide;
    mode: TrainingMode;
    order: TrainingOrder;
};

type CreateTrainingDialogProps = {
    open: boolean;

    studyName: string;

    onCancel: () => void;

    onCreate: (
        data: CreateTrainingData,
    ) => void;
};

export default function CreateTrainingDialog({
    open,
    studyName,
    onCancel,
    onCreate,
}: CreateTrainingDialogProps) {
    const [name, setName] =
        useState("");

    const [side, setSide] =
        useState<TrainingSide>(
            "white",
        );

    const [mode, setMode] =
        useState<TrainingMode>(
            "all-lines",
        );

    const [order, setOrder] =
        useState<TrainingOrder>(
            "random",
        );

    /*
     * Cada vez que abrimos el diálogo
     * empezamos con valores limpios.
     */

    function handleCreate() {
        const trimmedName =
            name.trim();

        if (!trimmedName) {
            return;
        }

        onCreate({
            name: trimmedName,
            side,
            mode,
            order,
        });

        setName("");
        setSide("white");
        setMode("all-lines");
        setOrder("random");
    }

    function handleCancel() {
        setName("");
        setSide("white");
        setMode("all-lines");
        setOrder("random");

        onCancel();
    }

    return (
        <Modal
            open={open}
            title={t("training.newDialog.title")}
            onClose={handleCancel}
            footer={
                <>
                    <button
                        type="button"
                        className="training-dialog-secondary-button"
                        onClick={handleCancel}
                    >
                        {t("app.dialog.cancel")}
                    </button>

                    <button
                        type="button"
                        className="training-dialog-primary-button"
                        disabled={
                            !name.trim()
                        }
                        onClick={
                            handleCreate
                        }
                    >
                        {t("app.dialog.create")}
                    </button>
                </>
            }
        >
            <div className="training-dialog">
                <p className="training-dialog-study">
                    {t("training.newDialog.study")}
                    {" "}
                    <strong>
                        {studyName}
                    </strong>
                </p>

                <label className="training-dialog-field">
                    <span>
                        {t("training.newDialog.name")}
                    </span>

                    <input
                        type="text"
                        value={name}
                        onChange={(event) =>
                            setName(
                                event.target.value,
                            )
                        }
                        placeholder={t("training.newDialog.placeholder")}
                        autoFocus
                    />
                </label>

                <fieldset className="training-dialog-group">
                    <legend>
                        {t("training.newDialog.side")}
                    </legend>

                    <label>
                        <input
                            type="radio"
                            name="training-side"
                            checked={
                                side ===
                                "white"
                            }
                            onChange={() =>
                                setSide(
                                    "white",
                                )
                            }
                        />

                        {t("training.newDialog.white")}
                    </label>

                    <label>
                        <input
                            type="radio"
                            name="training-side"
                            checked={
                                side ===
                                "black"
                            }
                            onChange={() =>
                                setSide(
                                    "black",
                                )
                            }
                        />

                        {t("training.newDialog.black")}
                    </label>
                </fieldset>

                <fieldset className="training-dialog-group">
                    <legend>
                        {t("training.newDialog.mode")}
                    </legend>

                    <label>
                        <input
                            type="radio"
                            name="training-mode"
                            checked={
                                mode ===
                                "all-lines"
                            }
                            onChange={() =>
                                setMode(
                                    "all-lines",
                                )
                            }
                        />

                        {t("training.newDialog.mode.all")}
                    </label>

                    <label>
                        <input
                            type="radio"
                            name="training-mode"
                            checked={
                                mode ===
                                "main-line"
                            }
                            onChange={() =>
                                setMode(
                                    "main-line",
                                )
                            }
                        />

                        {t("training.newDialog.mode.main")}
                    </label>

                    <label className="training-option-disabled">
                        <input
                            type="radio"
                            disabled
                        />

                        {t("training.newDialog.mode.future")}
                        <small>
                            {t("training.newDialog.future")}
                        </small>
                    </label>
                </fieldset>

                <fieldset className="training-dialog-group">
                    <legend>
                        {t("training.newDialog.order")}
                    </legend>

                    <label>
                        <input
                            type="radio"
                            name="training-order"
                            checked={
                                order ===
                                "random"
                            }
                            onChange={() =>
                                setOrder(
                                    "random",
                                )
                            }
                        />

                        {t("training.newDialog.order.random")}
                    </label>

                    <label>
                        <input
                            type="radio"
                            name="training-order"
                            checked={
                                order ===
                                "sequential"
                            }
                            onChange={() =>
                                setOrder(
                                    "sequential",
                                )
                            }
                        />

                        {t("training.newDialog.order.sequential")}
                    </label>
                </fieldset>
            </div>
        </Modal>
    );
}