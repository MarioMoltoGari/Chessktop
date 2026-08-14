import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    BrainCircuit,
    CheckCircle2,
    Cpu,
    Dumbbell,
    FileDown,
    Folder,
    FolderOpen,
    GitBranch,
    Import,
    RotateCcw,
    StickyNote,
    X,
} from "lucide-react";

import {
    useState,
} from "react";

type OnboardingProps = {
    open: boolean;

    onComplete: () => void;
    onClose: () => void;
};

const TOTAL_STEPS =
    4;

export default function Onboarding({
    open,
    onComplete,
    onClose,
}: OnboardingProps) {
    const [
        step,
        setStep,
    ] =
        useState(0);

    if (!open) {
        return null;
    }

    function goNext() {
        if (
            step ===
            TOTAL_STEPS - 1
        ) {
            onComplete();

            return;
        }

        setStep(
            (
                currentStep,
            ) =>
                currentStep + 1,
        );
    }

    function goPrevious() {
        setStep(
            (
                currentStep,
            ) =>
                Math.max(
                    0,
                    currentStep - 1,
                ),
        );
    }

    function handleClose() {
        onClose();
    }

    return (
        <div className="onboarding-overlay">
            <section
                className="onboarding"
                role="dialog"
                aria-modal="true"
                aria-label="Guía de inicio de Chessktop"
            >
                <header className="onboarding-header">
                    <div className="onboarding-brand">
                        <span>
                            Chessktop
                        </span>

                        <small>
                            Guía de inicio
                        </small>
                    </div>

                    <div className="onboarding-header-right">
                        <span className="onboarding-step-counter">
                            {step + 1}
                            {" / "}
                            {TOTAL_STEPS}
                        </span>

                        <button
                            type="button"
                            className="onboarding-close"
                            onClick={
                                handleClose
                            }
                            aria-label="Cerrar guía"
                            title="Cerrar guía"
                        >
                            <X
                                size={20}
                                aria-hidden="true"
                            />
                        </button>
                    </div>
                </header>

                <div className="onboarding-progress">
                    {Array.from(
                        {
                            length:
                                TOTAL_STEPS,
                        },
                        (
                            _,
                            index,
                        ) => (
                            <span
                                key={
                                    index
                                }
                                className={`onboarding-progress-item ${index <=
                                    step
                                    ? "active"
                                    : ""
                                    }`}
                            />
                        ),
                    )}
                </div>

                <div className="onboarding-content">
                    {step === 0 && (
                        <WelcomeStep />
                    )}

                    {step === 1 && (
                        <LibraryStep />
                    )}

                    {step === 2 && (
                        <AnalysisStep />
                    )}

                    {step === 3 && (
                        <TrainingStep />
                    )}
                </div>

                <footer className="onboarding-footer">
                    <button
                        type="button"
                        className="onboarding-skip-button"
                        onClick={
                            onComplete
                        }
                    >
                        Omitir guía
                    </button>

                    <div className="onboarding-navigation">
                        {step > 0 && (
                            <button
                                type="button"
                                className="onboarding-secondary-button"
                                onClick={
                                    goPrevious
                                }
                            >
                                <ArrowLeft
                                    size={16}
                                    aria-hidden="true"
                                />

                                <span>
                                    Anterior
                                </span>
                            </button>
                        )}

                        <button
                            type="button"
                            className="onboarding-primary-button"
                            onClick={
                                goNext
                            }
                        >
                            <span>
                                {step ===
                                    TOTAL_STEPS -
                                    1
                                    ? "Empezar a usar Chessktop"
                                    : step ===
                                        0
                                        ? "Empezar recorrido"
                                        : "Siguiente"}
                            </span>

                            <ArrowRight
                                size={16}
                                aria-hidden="true"
                            />
                        </button>
                    </div>
                </footer>
            </section>
        </div>
    );
}

function WelcomeStep() {
    return (
        <div className="onboarding-step onboarding-welcome-step">
            <span className="onboarding-eyebrow">
                Bienvenido
            </span>

            <h1>
                Tu repertorio de ajedrez,
                organizado y listo para entrenar.
            </h1>

            <p className="onboarding-lead">
                Crea estudios, analiza posiciones y
                convierte tus líneas en entrenamientos
                para practicar tu repertorio.
            </p>

            <div className="onboarding-feature-flow">
                <div className="onboarding-feature-card">
                    <span className="onboarding-feature-icon">
                        <BookOpen
                            size={25}
                            aria-hidden="true"
                        />
                    </span>

                    <strong>
                        Estudia
                    </strong>

                    <span>
                        Construye y organiza tus líneas.
                    </span>
                </div>

                <ArrowRight
                    className="onboarding-flow-arrow"
                    size={22}
                    aria-hidden="true"
                />

                <div className="onboarding-feature-card">
                    <span className="onboarding-feature-icon">
                        <BrainCircuit
                            size={25}
                            aria-hidden="true"
                        />
                    </span>

                    <strong>
                        Analiza
                    </strong>

                    <span>
                        Comprueba tus ideas con Stockfish.
                    </span>
                </div>

                <ArrowRight
                    className="onboarding-flow-arrow"
                    size={22}
                    aria-hidden="true"
                />

                <div className="onboarding-feature-card">
                    <span className="onboarding-feature-icon">
                        <Dumbbell
                            size={25}
                            aria-hidden="true"
                        />
                    </span>

                    <strong>
                        Entrena
                    </strong>

                    <span>
                        Practica tu repertorio posición a posición.
                    </span>
                </div>
            </div>
        </div>
    );
}

function LibraryStep() {
    return (
        <div className="onboarding-step">
            <div className="onboarding-step-icon">
                <FolderOpen
                    size={30}
                    aria-hidden="true"
                />
            </div>

            <span className="onboarding-eyebrow">
                Tu biblioteca
            </span>

            <h1>
                Organiza tu repertorio a tu manera.
            </h1>

            <p className="onboarding-lead">
                Crea carpetas y estudios para cada apertura,
                variante o preparación. Después construye
                las líneas directamente sobre el tablero.
            </p>

            <div className="onboarding-library-demo">
                <div className="onboarding-library-row root">
                    <FolderOpen
                        size={18}
                        aria-hidden="true"
                    />

                    <strong>
                        Repertorio
                    </strong>
                </div>

                <div className="onboarding-library-row depth-1">
                    <Folder
                        size={17}
                        aria-hidden="true"
                    />

                    <span>
                        Con blancas
                    </span>
                </div>

                <div className="onboarding-library-row depth-2">
                    <BookOpen
                        size={16}
                        aria-hidden="true"
                    />

                    <span>
                        Catalana
                    </span>
                </div>

                <div className="onboarding-library-row depth-2">
                    <BookOpen
                        size={16}
                        aria-hidden="true"
                    />

                    <span>
                        Italiana
                    </span>
                </div>

                <div className="onboarding-library-row depth-1">
                    <Folder
                        size={17}
                        aria-hidden="true"
                    />

                    <span>
                        Con negras
                    </span>
                </div>

                <div className="onboarding-library-row depth-2">
                    <BookOpen
                        size={16}
                        aria-hidden="true"
                    />

                    <span>
                        Siciliana Najdorf
                    </span>
                </div>
            </div>

            <div className="onboarding-tip">
                <Import
                    size={19}
                    aria-hidden="true"
                />

                <div>
                    <strong>
                        ¿Ya tienes un repertorio?
                    </strong>

                    <span>
                        También puedes importar tus archivos PGN
                        y convertirlos directamente en estudios.
                    </span>
                </div>
            </div>
        </div>
    );
}

function AnalysisStep() {
    return (
        <div className="onboarding-step">
            <div className="onboarding-step-icon">
                <Cpu
                    size={30}
                    aria-hidden="true"
                />
            </div>

            <span className="onboarding-eyebrow">
                Editor y análisis
            </span>

            <h1>
                Trabaja cada posición en profundidad.
            </h1>

            <p className="onboarding-lead">
                Navega por tu repertorio, crea variantes,
                guarda tus ideas y utiliza Stockfish para
                comprobar cada posición.
            </p>

            <div className="onboarding-capabilities">
                <div>
                    <GitBranch
                        size={21}
                        aria-hidden="true"
                    />

                    <strong>
                        Variantes
                    </strong>

                    <span>
                        Guarda diferentes respuestas desde una misma posición.
                    </span>
                </div>

                <div>
                    <StickyNote
                        size={21}
                        aria-hidden="true"
                    />

                    <strong>
                        Notas
                    </strong>

                    <span>
                        Añade planes, ideas y recordatorios a tus movimientos.
                    </span>
                </div>

                <div>
                    <Cpu
                        size={21}
                        aria-hidden="true"
                    />

                    <strong>
                        Stockfish
                    </strong>

                    <span>
                        Analiza la posición y compara las mejores líneas.
                    </span>
                </div>

                <div>
                    <FileDown
                        size={21}
                        aria-hidden="true"
                    />

                    <strong>
                        PGN
                    </strong>

                    <span>
                        Importa y exporta tus estudios cuando quieras.
                    </span>
                </div>
            </div>

            <div className="onboarding-shortcut">
                <span>
                    Navegación rápida
                </span>

                <div>
                    <kbd>
                        ←
                    </kbd>

                    <kbd>
                        →
                    </kbd>

                    <span>
                        Muévete por la línea principal con las flechas del teclado.
                    </span>
                </div>
            </div>
        </div>
    );
}

function TrainingStep() {
    return (
        <div className="onboarding-step">
            <div className="onboarding-step-icon">
                <Dumbbell
                    size={30}
                    aria-hidden="true"
                />
            </div>

            <span className="onboarding-eyebrow">
                Entrenamiento
            </span>

            <h1>
                No te limites a guardar tu repertorio.
                Apréndelo.
            </h1>

            <p className="onboarding-lead">
                Crea un entrenamiento desde cualquier estudio
                y Chessktop te mostrará posiciones de tu repertorio
                para que encuentres el movimiento correcto.
            </p>

            <div className="onboarding-training-flow">
                <div>
                    <BookOpen
                        size={22}
                        aria-hidden="true"
                    />

                    <strong>
                        Posición
                    </strong>

                    <span>
                        Chessktop selecciona una posición de tu repertorio.
                    </span>
                </div>

                <ArrowRight
                    size={20}
                    aria-hidden="true"
                />

                <div>
                    <CheckCircle2
                        size={22}
                        aria-hidden="true"
                    />

                    <strong>
                        Responde
                    </strong>

                    <span>
                        Juega sobre el tablero el movimiento que recuerdes.
                    </span>
                </div>

                <ArrowRight
                    size={20}
                    aria-hidden="true"
                />

                <div>
                    <RotateCcw
                        size={22}
                        aria-hidden="true"
                    />

                    <strong>
                        Repasa
                    </strong>

                    <span>
                        Las posiciones problemáticas vuelven al final.
                    </span>
                </div>
            </div>

            <div className="onboarding-final-message">
                <strong>
                    Ya estás listo.
                </strong>

                <span>
                    Crea tu primer estudio o importa un PGN
                    y empieza a construir tu repertorio.
                </span>
            </div>
        </div>
    );
}