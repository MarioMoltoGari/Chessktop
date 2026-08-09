import {
    parse,
    type Notation,
    type NotationList,
    type ParseError,
} from "@echecs/pgn";

import type {
    ParsedPgnGame,
    ParsedPgnMove,
} from "./types";

/*
 * @echecs/pgn representa cada movimiento
 * mediante la estructura SAN de @echecs/san.
 *
 * Nosotros reconstruimos el SAN textual para
 * poder pasárselo posteriormente a chess.js,
 * que será quien valide la jugada y genere:
 *
 * - from
 * - to
 * - promotion
 * - SAN normalizado
 * - FEN
 */
function notationToSan(
    notation: Notation,
): string {
    /*
     * Enroque.
     */
    if (notation.castling) {
        let san =
            notation.long
                ? "O-O-O"
                : "O-O";

        if (notation.checkmate) {
            san += "#";
        } else if (notation.check) {
            san += "+";
        }

        return san;
    }

    if (!notation.to) {
        throw new Error(
            "El PGN contiene un movimiento sin casilla de destino.",
        );
    }

    /*
     * Símbolo SAN de la pieza.
     */
    let pieceSymbol = "";

    switch (notation.piece) {
        case "knight":
            pieceSymbol = "N";
            break;

        case "bishop":
            pieceSymbol = "B";
            break;

        case "rook":
            pieceSymbol = "R";
            break;

        case "queen":
            pieceSymbol = "Q";
            break;

        case "king":
            pieceSymbol = "K";
            break;

        case "pawn":
            pieceSymbol = "";
            break;
    }

    const from =
        notation.from
            ? String(
                notation.from,
            )
            : "";

    let san = "";

    /*
     * Peones:
     *
     * e4
     * exd5
     *
     * En una captura, notation.from contiene
     * normalmente la columna de origen.
     */
    if (
        notation.piece === "pawn"
    ) {
        if (notation.capture) {
            san += from;
        }
    } else {
        /*
         * Piezas:
         *
         * Nf3
         * Nbd2
         * R1e2
         * Qh5
         */
        san += pieceSymbol;
        san += from;
    }

    if (notation.capture) {
        san += "x";
    }

    san += notation.to;

    /*
     * Promoción:
     *
     * e8=Q
     * exd8=N+
     */
    if (notation.promotion) {
        let promotionSymbol = "";

        switch (
        notation.promotion
        ) {
            case "knight":
                promotionSymbol = "N";
                break;

            case "bishop":
                promotionSymbol = "B";
                break;

            case "rook":
                promotionSymbol = "R";
                break;

            case "queen":
                promotionSymbol = "Q";
                break;
        }

        san +=
            `=${promotionSymbol}`;
    }

    if (notation.checkmate) {
        san += "#";
    } else if (notation.check) {
        san += "+";
    }

    return san;
}

/*
 * Convierte una lista de notación PGN
 * en una secuencia lineal de movimientos.
 *
 * @echecs/pgn utiliza:
 *
 * [
 *   [1, whiteMove, blackMove],
 *   [2, whiteMove, blackMove],
 *   ...
 * ]
 *
 * Las variantes permanecen asociadas
 * recursivamente a cada movimiento.
 */
function convertNotationList(
    list: NotationList,
): ParsedPgnMove[] {
    const moves:
        ParsedPgnMove[] = [];

    for (
        const [
            ,
            whiteMove,
            blackMove,
        ]
        of list
    ) {
        if (whiteMove) {
            moves.push(
                convertNotation(
                    whiteMove,
                ),
            );
        }

        if (blackMove) {
            moves.push(
                convertNotation(
                    blackMove,
                ),
            );
        }
    }

    return moves;
}

/*
 * Convierte un movimiento de @echecs/pgn
 * a nuestro formato intermedio.
 */
function convertNotation(
    notation: Notation,
): ParsedPgnMove {
    const comments:
        string[] = [];

    if (
        notation.comment
    ) {
        const trimmedComment =
            notation.comment.trim();

        if (trimmedComment) {
            comments.push(
                trimmedComment,
            );
        }
    }

    return {
        san:
            notationToSan(
                notation,
            ),

        comments,

        /*
         * Conservamos las anotaciones aunque
         * todavía no las usemos en Chessktop.
         *
         * Más adelante podremos convertir
         * NAGs/anotaciones a !, ?, !!, etc.
         */
        annotations: [
            ...(
                notation.annotations ??
                []
            ),
        ],

        /*
         * Variation = NotationList[]
         *
         * Por tanto cada elemento representa
         * una variante completa.
         */
        variations: (
            notation.variants ??
            []
        ).map(
            (
                variation,
            ) =>
                convertNotationList(
                    variation,
                ),
        ),
    };
}

export function parsePgnText(
    pgnText: string,
): ParsedPgnGame {
    const trimmedPgn =
        pgnText.trim();

    if (!trimmedPgn) {
        throw new Error(
            "El PGN está vacío.",
        );
    }

    const parseErrors:
        ParseError[] = [];

    const games =
        parse(
            trimmedPgn,
            {
                onError: (
                    error,
                ) => {
                    parseErrors.push(
                        error,
                    );
                },
            },
        );

    const firstParseError =
        parseErrors[0];

    if (firstParseError) {
        throw new Error(
            `PGN inválido en línea ${firstParseError.line}, columna ${firstParseError.column}: ${firstParseError.message}`,
        );
    }

    if (
        games.length === 0
    ) {
        throw new Error(
            "No se ha encontrado ninguna partida válida en el PGN.",
        );
    }

    /*
     * MVP:
     *
     * una importación PGN =
     * un nuevo estudio.
     *
     * Si encontramos varias partidas,
     * preferimos informar al usuario antes
     * que elegir una silenciosamente.
     */
    if (
        games.length > 1
    ) {
        throw new Error(
            "Este archivo contiene varias partidas. Por ahora Chessktop solo puede importar una partida por estudio.",
        );
    }

    const game =
        games[0];

    const headers:
        Record<string, string> =
        {};

    /*
     * Meta permite valores undefined,
     * por eso filtramos antes de copiar.
     */
    for (
        const [
            key,
            value,
        ]
        of Object.entries(
            game.meta,
        )
    ) {
        if (
            typeof value ===
            "string"
        ) {
            headers[key] =
                value;
        }
    }

    const moves =
        convertNotationList(
            game.moves,
        );

    if (
        moves.length === 0
    ) {
        throw new Error(
            "El PGN no contiene movimientos.",
        );
    }

    return {
        headers,
        moves,
    };
}