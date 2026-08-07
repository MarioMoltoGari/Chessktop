export type TrainingSide =
    | "white"
    | "black";

export type TrainingMode =
    | "all-lines"
    | "main-line"
    | "selected-lines";

export type TrainingOrder =
    | "random"
    | "sequential";

export type Training = {
    id: string;

    /*
     * El estudio es siempre la fuente de verdad.
     * El entrenamiento nunca copia su árbol.
     */
    studyId: string;

    name: string;

    /*
     * Color que jugará el usuario.
     */
    side: TrainingSide;

    /*
     * Qué parte del estudio se entrena.
     */
    mode: TrainingMode;

    /*
     * Solo se usa con selected-lines.
     *
     * Cada ID representa la raíz de una rama
     * incluida en el entrenamiento.
     */
    selectedNodeIds: string[];

    /*
     * Cómo recorrer las respuestas del rival.
     */
    order: TrainingOrder;

    createdAt: string;
    updatedAt: string;
};

export type TrainingsMap =
    Record<string, Training>;

/*
 * Una posición que Chessktop puede pedir
 * durante el entrenamiento.
 */
export type TrainingPosition = {
    nodeId: string;

    fen: string;

    /*
     * Puede haber varias respuestas correctas.
     */
    validMoveNodeIds: string[];
};

/*
 * Resultado de intentar un movimiento.
 */
export type TrainingMoveResult =
    | {
        correct: true;
        matchedNodeId: string;
    }
    | {
        correct: false;
    };

/*
 * Estado temporal de una sesión.
 *
 * Esto NO necesita guardarse todavía.
 */
export type TrainingSession = {
    trainingId: string;

    currentNodeId: string;

    startedAt: string;

    correctMoves: number;
    incorrectMoves: number;

    completed: boolean;
};