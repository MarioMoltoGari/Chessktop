import type {
    EngineLine,
} from "../../engine/types";

import { t } from "../../i18n";

import {
    formatEngineScore,
} from "../../engine/parser";

type EngineLinesProps = {
    lines: EngineLine[];
    expectedLines: 1 | 3;

    /*
     * Necesitamos el FEN para saber:
     *
     * - a quién le toca mover;
     * - en qué número de jugada estamos.
     */
    fen: string;
};

type FenMoveContext = {
    sideToMove:
    "white" | "black";

    fullMoveNumber:
    number;
};

function getFenMoveContext(
    fen: string,
): FenMoveContext {
    const fields =
        fen.trim().split(
            /\s+/,
        );

    const sideField =
        fields[1];

    const fullMoveField =
        fields[5];

    const parsedFullMove =
        Number.parseInt(
            fullMoveField ?? "",
            10,
        );

    return {
        sideToMove:
            sideField === "b"
                ? "black"
                : "white",

        fullMoveNumber:
            Number.isFinite(
                parsedFullMove,
            ) &&
                parsedFullMove > 0
                ? parsedFullMove
                : 1,
    };
}

/*
 * Añade numeración PGN a la variante
 * principal devuelta por Stockfish.
 *
 * Ejemplos:
 *
 * Blancas:
 * 12. Nf3 d5 13. d4 c5
 *
 * Negras:
 * 12... Nf6 13. Nc3 e6
 */
function formatEngineMoves(
    sanMoves: string[],
    fen: string,
): string {
    if (
        sanMoves.length === 0
    ) {
        return "";
    }

    const {
        sideToMove,
        fullMoveNumber,
    } =
        getFenMoveContext(
            fen,
        );

    let moveNumber =
        fullMoveNumber;

    let whiteToMove =
        sideToMove ===
        "white";

    const formattedMoves:
        string[] = [];

    sanMoves.forEach(
        (
            san,
            index,
        ) => {
            if (
                whiteToMove
            ) {
                formattedMoves.push(
                    `${moveNumber}.`,
                    san,
                );

                whiteToMove =
                    false;

                return;
            }

            /*
             * Si la PV comienza con negras,
             * necesitamos escribir N...
             *
             * Después de una jugada blanca
             * de la propia PV no hace falta,
             * porque ya tenemos:
             *
             * 12. e4 e5
             */
            if (
                index === 0
            ) {
                formattedMoves.push(
                    `${moveNumber}...`,
                    san,
                );
            } else {
                formattedMoves.push(
                    san,
                );
            }

            moveNumber +=
                1;

            whiteToMove =
                true;
        },
    );

    return formattedMoves.join(
        " ",
    );
}

export default function EngineLines({
    lines,
    expectedLines,
    fen,
}: EngineLinesProps) {
    const displayedLines =
        Array.from(
            {
                length:
                    expectedLines,
            },
            (
                _,
                index,
            ) =>
                lines.find(
                    (line) =>
                        line.multipv ===
                        index + 1,
                ) ?? null,
        );

    return (
        <div className="engine-lines">
            {displayedLines.map(
                (
                    line,
                    index,
                ) => (
                    <div
                        className="engine-line"
                        key={
                            index + 1
                        }
                    >
                        <span className="engine-line-score">
                            {line
                                ? formatEngineScore(
                                    line.score,
                                )
                                : "—"}
                        </span>

                        <span
                            className="engine-line-moves"
                            title={
                                line
                                    ? formatEngineMoves(
                                        line.sanMoves,
                                        fen,
                                    )
                                    : undefined
                            }
                        >
                            {line
                                ? formatEngineMoves(
                                    line.sanMoves,
                                    fen,
                                )
                                : t("engine.loading") + "..."}
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