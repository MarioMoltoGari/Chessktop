export type EngineStatus =
    | "loading"
    | "ready"
    | "analyzing"
    | "paused"
    | "error";

export type EngineScore =
    | {
        type: "centipawn";
        value: number;
    }
    | {
        type: "mate";
        value: number;
    };

export type EngineLine = {
    multipv: number;
    depth: number;
    selectiveDepth?: number;

    /*
     * Positivo: ventaja blanca.
     * Negativo: ventaja negra.
     */
    score: EngineScore;

    uciMoves: string[];
    sanMoves: string[];
};

export type ParsedEngineInfo = {
    depth: number;
    selectiveDepth?: number;
    multipv: number;
    score: EngineScore;
    uciMoves: string[];
};

export type StockfishAnalysisOptions = {
    fen: string;
    depth: number;
    multiPv: 1 | 3;
};

export type StockfishHookOptions = {
    fen: string;
    enabled: boolean;
    depth: number;
    multiPv: 1 | 3;
};

export type StockfishHookResult = {
    status: EngineStatus;
    lines: EngineLine[];
    currentDepth: number;
    error: string | null;
};