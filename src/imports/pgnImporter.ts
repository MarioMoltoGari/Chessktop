import {
    Chess,
    type Square,
} from "chess.js";

import type {
    MoveNode,
    StudyContent,
} from "../types";

import {
    parsePgnText,
} from "./pgnParser";

import type {
    ImportPgnResult,
    ParsedPgnMove,
} from "./types";

type NodesMap =
    Record<string, MoveNode>;

function createRootNode():
    MoveNode {
    return {
        id: "root",

        parentId: null,

        san: null,

        from: null,
        to: null,

        fen:
            new Chess().fen(),

        ply: 0,

        children: [],

        note: "",
    };
}

function buildNote(
    move: ParsedPgnMove,
): string {
    /*
     * Para el MVP:
     *
     * - comentarios PGN → notas Chessktop
     * - NAGs se conservan en el parser,
     *   pero no se muestran todavía.
     */
    return move.comments
        .map(
            (comment) =>
                comment.trim(),
        )
        .filter(Boolean)
        .join("\n\n");
}

function appendLine(
    nodes: NodesMap,

    moves: ParsedPgnMove[],

    parentNodeId: string,

    parentFen: string,
) {
    let currentParentId =
        parentNodeId;

    let currentFen =
        parentFen;

    for (
        const parsedMove
        of moves
    ) {
        const game =
            new Chess(
                currentFen,
            );

        let move;

        try {
            move =
                game.move(
                    parsedMove.san,
                );
        } catch {
            throw new Error(
                `No se ha podido importar la jugada "${parsedMove.san}".`,
            );
        }

        if (!move) {
            throw new Error(
                `La jugada "${parsedMove.san}" no es válida desde la posición importada.`,
            );
        }

        const parentNode =
            nodes[
            currentParentId
            ];

        if (!parentNode) {
            throw new Error(
                "El PGN contiene una estructura de variantes inválida.",
            );
        }

        const nodeId =
            crypto.randomUUID();

        const newNode:
            MoveNode = {
            id:
                nodeId,

            parentId:
                currentParentId,

            san:
                move.san,

            from:
                move.from as Square,

            to:
                move.to as Square,

            promotion:
                move.promotion,

            fen:
                game.fen(),

            ply:
                parentNode.ply + 1,

            children: [],

            note:
                buildNote(
                    parsedMove,
                ),
        };

        nodes[
            nodeId
        ] =
            newNode;

        nodes[
            currentParentId
        ] = {
            ...parentNode,

            children: [
                ...parentNode.children,

                nodeId,
            ],
        };

        /*
         * MUY IMPORTANTE:
         *
         * Las variantes almacenadas sobre
         * este movimiento son alternativas
         * a ESTE movimiento.
         *
         * Por tanto parten de la posición
         * anterior al movimiento actual,
         * no de su FEN posterior.
         */
        for (
            const variation
            of parsedMove.variations
        ) {
            appendLine(
                nodes,

                variation,

                currentParentId,

                currentFen,
            );
        }

        /*
         * Continuamos la línea principal
         * desde el movimiento que acabamos
         * de añadir.
         */
        currentParentId =
            nodeId;

        currentFen =
            game.fen();
    }
}

export function importPgnAsStudy(
    pgnText: string,
    studyId: string,
): ImportPgnResult {
    const parsedGame =
        parsePgnText(
            pgnText,
        );

    const root =
        createRootNode();

    const nodes:
        NodesMap = {
        root,
    };

    appendLine(
        nodes,

        parsedGame.moves,

        "root",

        root.fen,
    );

    if (
        nodes.root.children.length ===
        0
    ) {
        throw new Error(
            "El PGN no contiene movimientos que puedan importarse.",
        );
    }

    const now =
        new Date()
            .toISOString();

    const content:
        StudyContent = {
        studyId,

        nodes,

        currentNodeId:
            "root",

        updatedAt:
            now,
    };

    return {
        content,

        headers:
            parsedGame.headers,
    };
}