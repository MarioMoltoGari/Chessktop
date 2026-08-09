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

export type TrainingSessionPhase =
    | "main"
    | "review-intro"
    | "review"
    | "completed";

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
     * Cómo recorrer las líneas.
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
 * En el Paso 7 utilizaremos esta información
 * como base para persistir el rendimiento.
 */
export type TrainingSession = {
    trainingId: string;

    currentNodeId: string;

    startedAt: string;

    /*
     * Se establece cuando termina
     * completamente la sesión.
     */
    completedAt: string | null;

    phase: TrainingSessionPhase;

    currentLineIndex: number;
    totalLines: number;

    correctMoves: number;
    incorrectMoves: number;

    completed: boolean;

    /*
     * Líneas ya cubiertas durante
     * la fase principal.
     */
    completedLineIds: string[];

    /*
     * Número de fallos cometidos desde
     * cada posición concreta.
     */
    positionMistakes:
    Record<string, number>;

    /*
     * Posiciones que han resultado
     * especialmente difíciles.
     */
    problematicNodeIds: string[];

    /*
     * Cola de posiciones que se repasarán
     * al acabar el entrenamiento normal.
     */
    reviewNodeIds: string[];

    /*
     * Posición actual dentro del repaso.
     */
    currentReviewIndex: number;
};

export type TrainingLine = {
    id: string;

    /*
     * Camino completo desde root
     * hasta el final de la rama.
     */
    nodeIds: string[];
};

export type TrainingPositionPerformance = {
    nodeId: string;

    sessionsSeen: number;

    correctMoves: number;
    incorrectMoves: number;

    timesProblematic: number;

    lastSeenAt: string;
};

export type TrainingPerformance = {
    trainingId: string;

    totalSessions: number;
    completedSessions: number;

    totalCorrectMoves: number;
    totalIncorrectMoves: number;

    totalTrainingTimeMs: number;

    lastTrainedAt: string | null;

    positions:
    Record<
        string,
        TrainingPositionPerformance
    >;
};

export type TrainingPerformancesMap =
    Record<
        string,
        TrainingPerformance
    >;