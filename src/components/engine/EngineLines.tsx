import type {
    EngineLine,
} from "../../engine/types";

import {
    formatEngineScore,
} from "../../engine/parser";

type EngineLinesProps = {
    lines: EngineLine[];
    expectedLines: 1 | 3;
};

export default function EngineLines({
    lines,
    expectedLines,
}: EngineLinesProps) {
    const displayedLines = Array.from(
        { length: expectedLines },
        (_, index) =>
            lines.find(
                (line) =>
                    line.multipv === index + 1,
            ) ?? null,
    );

    return (
        <div className="engine-lines">
            {displayedLines.map(
                (line, index) => (
                    <div
                        className="engine-line"
                        key={index + 1}
                    >
                        <span className="engine-line-score">
                            {line
                                ? formatEngineScore(
                                    line.score,
                                )
                                : "—"}
                        </span>

                        <span className="engine-line-moves">
                            {line
                                ? line.sanMoves.join(" ")
                                : "Calculando..."}
                        </span>

                        <span className="engine-line-depth">
                            {line
                                ? `d${line.depth}`
                                : ""}
                        </span>
                    </div>
                ),
            )}
        </div>
    );
}