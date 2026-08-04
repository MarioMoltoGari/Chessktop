import type {
    EngineScore,
} from "../../engine/types";

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
                <span>Negras</span>
                <span>Blancas</span>
            </div>

            <div
                className="evaluation-bar"
                role="meter"
                aria-label="Evaluación de Stockfish"
                aria-valuetext={
                    score
                        ? formatEngineScore(score)
                        : "Sin evaluación"
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