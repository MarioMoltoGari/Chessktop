import {
    useState,
} from "react";

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
            title="Nuevo entrenamiento"
            onClose={handleCancel}
            footer={
                <>
                    <button
                        type="button"
                        className="training-dialog-secondary-button"
                        onClick={handleCancel}
                    >
                        Cancelar
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
                        Crear
                    </button>
                </>
            }
        >
            <div className="training-dialog">
                <p className="training-dialog-study">
                    Estudio:
                    {" "}
                    <strong>
                        {studyName}
                    </strong>
                </p>

                <label className="training-dialog-field">
                    <span>
                        Nombre
                    </span>

                    <input
                        type="text"
                        value={name}
                        onChange={(event) =>
                            setName(
                                event.target.value,
                            )
                        }
                        placeholder="Ej. Preparación torneo"
                        autoFocus
                    />
                </label>

                <fieldset className="training-dialog-group">
                    <legend>
                        Jugar con
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

                        Blancas
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

                        Negras
                    </label>
                </fieldset>

                <fieldset className="training-dialog-group">
                    <legend>
                        Líneas
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

                        Todas las líneas
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

                        Solo línea principal
                    </label>

                    <label className="training-option-disabled">
                        <input
                            type="radio"
                            disabled
                        />

                        Elegir líneas
                        <small>
                            Próximamente
                        </small>
                    </label>
                </fieldset>

                <fieldset className="training-dialog-group">
                    <legend>
                        Orden de las respuestas
                        del rival
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

                        Aleatorio
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

                        Secuencial
                    </label>
                </fieldset>
            </div>
        </Modal>
    );
}