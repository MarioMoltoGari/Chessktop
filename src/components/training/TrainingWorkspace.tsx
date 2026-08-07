import type {
    Training,
} from "./types";

type TrainingWorkspaceProps = {
    training: Training;

    studyName: string;

    onClose: () => void;
};

export default function TrainingWorkspace({
    training,
    studyName,
    onClose,
}: TrainingWorkspaceProps) {
    return (
        <section className="training-workspace">
            <header className="training-workspace-header">
                <div>
                    <span className="training-workspace-label">
                        Entrenamiento
                    </span>

                    <h2>
                        {training.name}
                    </h2>

                    <p>
                        {studyName}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                >
                    Volver al estudio
                </button>
            </header>

            <div className="training-workspace-empty">
                <span
                    className="training-workspace-icon"
                    aria-hidden="true"
                >
                    🏋
                </span>

                <h3>
                    Modo entrenamiento
                </h3>

                <p>
                    Aquí aparecerá la sesión
                    de entrenamiento.
                </p>

                <dl>
                    <div>
                        <dt>Color</dt>

                        <dd>
                            {training.side ===
                                "white"
                                ? "Blancas"
                                : "Negras"}
                        </dd>
                    </div>

                    <div>
                        <dt>Líneas</dt>

                        <dd>
                            {training.mode ===
                                "all-lines"
                                ? "Todas"
                                : training.mode ===
                                    "main-line"
                                    ? "Línea principal"
                                    : "Seleccionadas"}
                        </dd>
                    </div>

                    <div>
                        <dt>Orden</dt>

                        <dd>
                            {training.order ===
                                "random"
                                ? "Aleatorio"
                                : "Secuencial"}
                        </dd>
                    </div>
                </dl>
            </div>
        </section>
    );
}