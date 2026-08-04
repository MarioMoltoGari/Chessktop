import type { Square } from "chess.js";

export type MoveNode = {
  id: string;
  parentId: string | null;

  san: string | null;
  from: Square | null;
  to: Square | null;
  promotion?: string;

  fen: string;
  ply: number;

  children: string[];
  note: string;
};

export type NodesMap = Record<
  string,
  MoveNode
>;

export type MoveRow = {
  moveNumber: number;
  whiteMove?: MoveNode;
  blackMove?: MoveNode;
};