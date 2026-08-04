import {
    Chess,
    type Square,
} from "chess.js";

import type {
    EngineScore,
    ParsedEngineInfo,
} from "./types";

function getNumericToken(
    tokens: string[],
    name: string,
): number | undefined {
    const index = tokens.indexOf(name);

    if (index === -1) {
        return undefined;
    }

    const value = Number(tokens[index + 1]);

    return Number.isFinite(value)
        ? value
        : undefined;
}

export function parseStockfishInfo(
    message: string,
): ParsedEngineInfo | null {
    if (!message.startsWith("info ")) {
        return null;
    }

    const tokens = message
        .trim()
        .split(/\s+/);

    const depth = getNumericToken(
        tokens,
        "depth",
    );

    if (depth === undefined) {
        return null;
    }

    const selectiveDepth = getNumericToken(
        tokens,
        "seldepth",
    );

    const multipv =
        getNumericToken(tokens, "multipv") ?? 1;

    const scoreIndex =
        tokens.indexOf("score");

    if (scoreIndex === -1) {
        return null;
    }

    const scoreType =
        tokens[scoreIndex + 1];

    const scoreValue = Number(
        tokens[scoreIndex + 2],
    );

    if (!Number.isFinite(scoreValue)) {
        return null;
    }

    let score: EngineScore;

    if (scoreType === "cp") {
        score = {
            type: "centipawn",
            value: scoreValue,
        };
    } else if (scoreType === "mate") {
        score = {
            type: "mate",
            value: scoreValue,
        };
    } else {
        return null;
    }

    const pvIndex = tokens.indexOf("pv");

    const uciMoves =
        pvIndex === -1
            ? []
            : tokens.slice(pvIndex + 1);

    return {
        depth,
        selectiveDepth,
        multipv,
        score,
        uciMoves,
    };
}

/*
 * Stockfish expresa la puntuación desde el punto
 * de vista del jugador al que le toca mover.
 *
 * Chessktop la muestra siempre desde el punto
 * de vista de las blancas.
 */
export function normalizeScoreForWhite(
    score: EngineScore,
    fen: string,
): EngineScore {
    const sideToMove = fen.split(" ")[1];

    if (sideToMove !== "b") {
        return score;
    }

    return {
        ...score,
        value: -score.value,
    };
}

export function convertUciToSan(
    fen: string,
    uciMoves: string[],
): string[] {
    const game = new Chess(fen);
    const sanMoves: string[] = [];

    for (const uciMove of uciMoves) {
        if (uciMove.length < 4) {
            break;
        }

        const from = uciMove.slice(
            0,
            2,
        ) as Square;

        const to = uciMove.slice(
            2,
            4,
        ) as Square;

        const promotion =
            uciMove.length >= 5
                ? uciMove[4]
                : undefined;

        try {
            const move = game.move({
                from,
                to,
                promotion,
            });

            sanMoves.push(move.san);
        } catch {
            break;
        }
    }

    return sanMoves;
}

export function formatEngineScore(
    score: EngineScore,
): string {
    if (score.type === "mate") {
        return score.value > 0
            ? `M${score.value}`
            : `−M${Math.abs(score.value)}`;
    }

    const pawns = score.value / 100;

    if (Math.abs(pawns) < 0.005) {
        return "0.00";
    }

    return pawns > 0
        ? `+${pawns.toFixed(2)}`
        : pawns.toFixed(2);
}