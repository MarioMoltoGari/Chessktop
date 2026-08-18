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

import { t } from "../../i18n";

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
                aria-label={t("onboarding.title")}
            >
                <header className="onboarding-header">
                    <div className="onboarding-brand">
                        <span>
                            Chessktop
                        </span>

                        <small>
                            {t("onboarding.title")}
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
                            aria-label={t("onboarding.closeButton")}
                            title={t("onboarding.closeButton")}
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
                        {t("onboarding.skipButton")}
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
                                    {t("onboarding.previousButton")}
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
                                    ? t("onboarding.startChessButton")
                                    : step ===
                                        0
                                        ? t("onboarding.startTourButton")
                                        : t("onboarding.nextButton")}
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
                {t("onboarding.welcome.title")}
            </span>

            <h1>
                {t("onboarding.welcome.heading")}
            </h1>

            <p className="onboarding-lead">
                {t("onboarding.welcome.description")}
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
                        {t("onboarding.welcome.study")}
                    </strong>

                    <span>
                        {t("onboarding.welcome.studyDesc")}
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
                        {t("onboarding.welcome.analyze")}
                    </strong>

                    <span>
                        {t("onboarding.welcome.analyzeDesc")}
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
                        {t("onboarding.welcome.train")}
                    </strong>

                    <span>
                        {t("onboarding.welcome.trainDesc")}
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
                {t("onboarding.library.title")}
            </span>

            <h1>
                {t("onboarding.library.heading")}
            </h1>

            <p className="onboarding-lead">
                {t("onboarding.library.description")}
            </p>

            <div className="onboarding-library-demo">
                <div className="onboarding-library-row root">
                    <FolderOpen
                        size={18}
                        aria-hidden="true"
                    />

                    <strong>
                        {t("onboarding.library.rootLabel")}
                    </strong>
                </div>

                <div className="onboarding-library-row depth-1">
                    <Folder
                        size={17}
                        aria-hidden="true"
                    />

                    <span>
                        {t("onboarding.library.whiteSide")}
                    </span>
                </div>

                <div className="onboarding-library-row depth-2">
                    <BookOpen
                        size={16}
                        aria-hidden="true"
                    />

                    <span>
                        {t("onboarding.library.catalanStudy")}
                    </span>
                </div>

                <div className="onboarding-library-row depth-2">
                    <BookOpen
                        size={16}
                        aria-hidden="true"
                    />

                    <span>
                        {t("onboarding.library.italianStudy")}
                    </span>
                </div>

                <div className="onboarding-library-row depth-1">
                    <Folder
                        size={17}
                        aria-hidden="true"
                    />

                    <span>
                        {t("onboarding.library.blackSide")}
                    </span>
                </div>

                <div className="onboarding-library-row depth-2">
                    <BookOpen
                        size={16}
                        aria-hidden="true"
                    />

                    <span>
                        {t("onboarding.library.sicilianStudy")}
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
                        {t("onboarding.library.tip.title")}
                    </strong>

                    <span>
                        {t("onboarding.library.tip.description")}
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
                {t("onboarding.analysis.title")}
            </span>

            <h1>
                {t("onboarding.analysis.heading")}
            </h1>

            <p className="onboarding-lead">
                {t("onboarding.analysis.description")}
            </p>

            <div className="onboarding-capabilities">
                <div>
                    <GitBranch
                        size={21}
                        aria-hidden="true"
                    />

                    <strong>
                        {t("onboarding.analysis.variants")}
                    </strong>

                    <span>
                        {t("onboarding.analysis.variantsDesc")}
                    </span>
                </div>

                <div>
                    <StickyNote
                        size={21}
                        aria-hidden="true"
                    />

                    <strong>
                        {t("onboarding.analysis.notes")}
                    </strong>

                    <span>
                        {t("onboarding.analysis.notesDesc")}
                    </span>
                </div>

                <div>
                    <Cpu
                        size={21}
                        aria-hidden="true"
                    />

                    <strong>
                        {t("onboarding.analysis.stockfish")}
                    </strong>

                    <span>
                        {t("onboarding.analysis.stockfishDesc")}
                    </span>
                </div>

                <div>
                    <FileDown
                        size={21}
                        aria-hidden="true"
                    />

                    <strong>
                        {t("onboarding.analysis.pgn")}
                    </strong>

                    <span>
                        {t("onboarding.analysis.pgnDesc")}
                    </span>
                </div>
            </div>

            <div className="onboarding-shortcut">
                <span>
                    {t("onboarding.analysis.shortcuts")}
                </span>

                <div>
                    <kbd>
                        ←
                    </kbd>

                    <kbd>
                        →
                    </kbd>

                    <span>
                        {t("onboarding.analysis.shortcutsDesc")}
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
                {t("onboarding.training.title")}
            </span>

            <h1>
                {t("onboarding.training.heading")}
            </h1>

            <p className="onboarding-lead">
                {t("onboarding.training.description")}
            </p>

            <div className="onboarding-training-flow">
                <div>
                    <BookOpen
                        size={22}
                        aria-hidden="true"
                    />

                    <strong>
                        {t("onboarding.training.position")}
                    </strong>

                    <span>
                        {t("onboarding.training.positionDesc")}
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
                        {t("onboarding.training.respond")}
                    </strong>

                    <span>
                        {t("onboarding.training.respondDesc")}
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
                        {t("onboarding.training.review")}
                    </strong>

                    <span>
                        {t("onboarding.training.reviewDesc")}
                    </span>
                </div>
            </div>

            <div className="onboarding-final-message">
                <strong>
                    {t("onboarding.training.ready")}
                </strong>

                <span>
                    {t("onboarding.training.readyDesc")}
                </span>
            </div>
        </div>
    );
}