import type {
    Training,
    TrainingMoveResult,
    TrainingPosition,
    TrainingSide,
} from "./types";

type TrainingNode = {
    id: string;

    from: string | null;
    to: string | null;

    promotion?: string;

    fen: string;
    ply: number;

    children: string[];
};

type TrainingNodesMap =
    Record<string, TrainingNode>;

export function isTrainingSideTurn(
    ply: number,
    side: TrainingSide,
): boolean {
    /*
     * ply 0 = posición inicial = juegan blancas
     * ply 1 = después de blancas = juegan negras
     */

    const whiteToMove =
        ply % 2 === 0;

    return side === "white"
        ? whiteToMove
        : !whiteToMove;
}

/*
 * Determina qué hijos están permitidos
 * según el modo del entrenamiento.
 */
function getAllowedChildren(
    nodes: TrainingNodesMap,
    nodeId: string,
    training: Training,
): string[] {
    const node =
        nodes[nodeId];

    if (!node) {
        return [];
    }

    /*
     * Todas las variantes.
     */
    if (
        training.mode ===
        "all-lines"
    ) {
        return node.children.filter(
            (childId) =>
                Boolean(nodes[childId]),
        );
    }

    /*
     * Solo seguimos siempre el primer hijo.
     */
    if (
        training.mode ===
        "main-line"
    ) {
        const firstChild =
            node.children[0];

        return firstChild &&
            nodes[firstChild]
            ? [firstChild]
            : [];
    }

    /*
     * selected-lines lo ampliaremos cuando
     * construyamos el selector visual de ramas.
     *
     * Por ahora permitimos el árbol completo
     * para que la arquitectura ya soporte el modo.
     */
    return node.children.filter(
        (childId) =>
            Boolean(nodes[childId]),
    );
}

export function createTrainingPosition(
    nodes: TrainingNodesMap,
    nodeId: string,
    training: Training,
): TrainingPosition | null {
    const node =
        nodes[nodeId];

    if (!node) {
        return null;
    }

    if (
        !isTrainingSideTurn(
            node.ply,
            training.side,
        )
    ) {
        return null;
    }

    const validMoveNodeIds =
        getAllowedChildren(
            nodes,
            nodeId,
            training,
        );

    if (
        validMoveNodeIds.length === 0
    ) {
        return null;
    }

    return {
        nodeId,
        fen: node.fen,
        validMoveNodeIds,
    };
}

export function validateTrainingMove(
    nodes: TrainingNodesMap,
    position: TrainingPosition,
    from: string,
    to: string,
    promotion?: string,
): TrainingMoveResult {
    for (
        const childId
        of position.validMoveNodeIds
    ) {
        const child =
            nodes[childId];

        if (!child) {
            continue;
        }

        const sameMove =
            child.from === from &&
            child.to === to &&
            (
                child.promotion ??
                undefined
            ) === (
                promotion ??
                undefined
            );

        if (sameMove) {
            return {
                correct: true,
                matchedNodeId:
                    child.id,
            };
        }
    }

    return {
        correct: false,
    };
}

/*
 * Obtiene las respuestas que puede jugar
 * automáticamente el rival.
 */
export function getOpponentResponses(
    nodes: TrainingNodesMap,
    nodeId: string,
    training: Training,
): string[] {
    const node =
        nodes[nodeId];

    if (!node) {
        return [];
    }

    return getAllowedChildren(
        nodes,
        nodeId,
        training,
    );
}

/*
 * Elige qué variante jugará Chessktop.
 */
export function chooseOpponentResponse(
    nodeIds: string[],
    order:
        | "random"
        | "sequential",
): string | null {
    if (
        nodeIds.length === 0
    ) {
        return null;
    }

    if (order === "sequential") {
        return nodeIds[0];
    }

    const index =
        Math.floor(
            Math.random() *
            nodeIds.length,
        );

    return nodeIds[index];
}