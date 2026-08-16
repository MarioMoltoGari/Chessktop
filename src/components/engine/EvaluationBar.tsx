import type {
    EngineScore,
} from "../../engine/types";

import { t } from "../../i18n";

import {
    formatEngineScore,
} from "../../engine/parser";

type EvaluationBarProps = {
    score: EngineScore | null;
};

function getWhitePercentage(
    score: EngineScore | null,
): number {
    if (!score) {
        return 50;
    }

    if (score.type === "mate") {
        return score.value > 0
            ? 100
            : 0;
    }

    const pawns = score.value / 100;

    const percentage =
        50 +
        50 * Math.tanh(pawns / 4);

    return Math.max(
        0,
        Math.min(100, percentage),
    );
}

export default function EvaluationBar({
    score,
}: EvaluationBarProps) {
    const whitePercentage =
        getWhitePercentage(score);

    return (
        <div className="evaluation-section">
            <div className="evaluation-labels">
                <span>{t("training.newDialog.black")}</span>
                <span>{t("training.newDialog.white")}</span>
            </div>

            <div
                className="evaluation-bar"
                role="meter"
                aria-label={t("engine.evaluation")}
                aria-valuetext={
                    score
                        ? formatEngineScore(score)
                        : t("engine.evaluation.none")
                }
            >
                <div
                    className="evaluation-white-side"
                    style={{
                        width: `${whitePercentage}%`,
                    }}
                />

                <div className="evaluation-center-line" />

                <span className="evaluation-score">
                    {score
                        ? formatEngineScore(score)
                        : "—"}
                </span>
            </div>
        </div>
    );
}