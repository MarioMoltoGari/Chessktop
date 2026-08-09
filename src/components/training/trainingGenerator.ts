import type {
    Training,
    TrainingLine,
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

/*
 * Genera un identificador estable para una línea.
 *
 * Una misma secuencia de nodos tendrá siempre
 * exactamente el mismo ID.
 *
 * Esto es importante porque TrainingSession
 * utiliza los IDs para recordar qué líneas
 * han sido completadas.
 */
function createTrainingLineId(
    nodeIds: string[],
): string {
    return nodeIds.join(">");
}

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
                Boolean(
                    nodes[childId],
                ),
        );
    }

    /*
     * Línea principal:
     * seguimos siempre el primer hijo.
     */
    if (
        training.mode ===
        "main-line"
    ) {
        const firstChild =
            node.children[0];

        return (
            firstChild &&
                nodes[firstChild]
                ? [firstChild]
                : []
        );
    }

    /*
     * selected-lines lo ampliaremos cuando
     * construyamos el selector visual de ramas.
     *
     * Por ahora se comporta como all-lines
     * para que la arquitectura ya soporte
     * este modo.
     */
    return node.children.filter(
        (childId) =>
            Boolean(
                nodes[childId],
            ),
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

    /*
     * Solo creamos una posición entrenable
     * cuando corresponde mover al lado
     * elegido por el usuario.
     */
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

    /*
     * Si no existen continuaciones,
     * la línea ha terminado.
     */
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
 * Devuelve todas las líneas completas
 * que parten desde un nodo.
 *
 * Cada línea termina cuando encontramos
 * un nodo sin continuaciones.
 */
function collectLinesFromNode(
    nodes: TrainingNodesMap,
    nodeId: string,
    path: string[],
    lines: TrainingLine[],
) {
    const node =
        nodes[nodeId];

    if (!node) {
        return;
    }

    const currentPath = [
        ...path,
        nodeId,
    ];

    const validChildren =
        node.children.filter(
            (childId) =>
                Boolean(
                    nodes[childId],
                ),
        );

    /*
     * Hemos llegado a una hoja.
     */
    if (
        validChildren.length === 0
    ) {
        lines.push({
            id:
                createTrainingLineId(
                    currentPath,
                ),

            nodeIds:
                currentPath,
        });

        return;
    }

    for (
        const childId
        of validChildren
    ) {
        collectLinesFromNode(
            nodes,
            childId,
            currentPath,
            lines,
        );
    }
}

/*
 * Genera las líneas que forman parte
 * de un entrenamiento.
 */
export function generateTrainingLines(
    nodes: TrainingNodesMap,
    training: Training,
): TrainingLine[] {
    const root =
        nodes.root;

    if (!root) {
        return [];
    }

    /*
     * Línea principal:
     * seguimos siempre children[0].
     */
    if (
        training.mode ===
        "main-line"
    ) {
        const nodeIds: string[] = [
            "root",
        ];

        let currentNode =
            root;

        while (
            currentNode.children.length >
            0
        ) {
            const nextNodeId =
                currentNode.children[0];

            const nextNode =
                nodes[nextNodeId];

            if (!nextNode) {
                break;
            }

            nodeIds.push(
                nextNodeId,
            );

            currentNode =
                nextNode;
        }

        return [
            {
                id:
                    createTrainingLineId(
                        nodeIds,
                    ),

                nodeIds,
            },
        ];
    }

    /*
     * selected-lines lo implementaremos
     * cuando tengamos el selector visual
     * de ramas.
     *
     * De momento se comporta como
     * all-lines.
     */
    const lines:
        TrainingLine[] = [];

    collectLinesFromNode(
        nodes,
        "root",
        [],
        lines,
    );

    /*
     * El orden aleatorio afecta únicamente
     * al orden en que practicamos las líneas,
     * nunca a su contenido ni a su ID.
     */
    if (
        training.order ===
        "random"
    ) {
        return shuffleTrainingLines(
            lines,
        );
    }

    return lines;
}

function shuffleTrainingLines(
    lines: TrainingLine[],
): TrainingLine[] {
    const shuffled = [
        ...lines,
    ];

    /*
     * Fisher-Yates.
     */
    for (
        let index =
            shuffled.length - 1;
        index > 0;
        index -= 1
    ) {
        const randomIndex =
            Math.floor(
                Math.random() *
                (index + 1),
            );

        [
            shuffled[index],
            shuffled[randomIndex],
        ] = [
                shuffled[randomIndex],
                shuffled[index],
            ];
    }

    return shuffled;
}