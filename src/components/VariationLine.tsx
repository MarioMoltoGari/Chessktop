import type { MoveNode, NodesMap } from "../types";
import { getLineFromNode } from "../utils/chessTree";
import NoteButton from "./NoteButton";

type VariationLineProps = {
  firstNodeId: string;
  nodes: NodesMap;
  currentNodeId: string;
  onMoveClick: (nodeId: string) => void;
  onNoteClick: (nodeId: string) => void;
  depth?: number;
};

export default function VariationLine({
  firstNodeId,
  nodes,
  currentNodeId,
  onMoveClick,
  onNoteClick,
  depth = 0,
}: VariationLineProps) {
  const line = getLineFromNode(nodes, firstNodeId);

  const rows: { moveNumber: number; whiteMove?: MoveNode; blackMove?: MoveNode }[] = [];

  for (const node of line) {
    const moveNumber = Math.ceil(node.ply / 2);
    const isWhiteMove = node.ply % 2 === 1;

    let row = rows.find((currentRow) => currentRow.moveNumber === moveNumber);

    if (!row) {
      row = { moveNumber };
      rows.push(row);
    }

    if (isWhiteMove) {
      row.whiteMove = node;
    } else {
      row.blackMove = node;
    }
  }

  return (
    <div
      className="variation-block"
      style={{
        marginLeft: `${Math.min(depth, 4) * 14}px`,
      }}
    >
      <div className="variation-rows">
        {rows.map((row, index) => {
          const noteNode = row.blackMove ?? row.whiteMove;
          const startsWithBlack = index === 0 && !row.whiteMove && Boolean(row.blackMove);

          return (
            <div className="variation-row" key={`${firstNodeId}-${row.moveNumber}`}>
              <span className="variation-number">
                {startsWithBlack ? `${row.moveNumber}...` : `${row.moveNumber}.`}
              </span>

              <div className="variation-move-slot">
                {row.whiteMove && (
                  <button
                    type="button"
                    className={`variation-move ${currentNodeId === row.whiteMove.id ? "active" : ""}`}
                    onClick={() => onMoveClick(row.whiteMove!.id)}
                  >
                    {row.whiteMove.san}
                  </button>
                )}
              </div>

              <div className="variation-move-slot">
                {row.blackMove && (
                  <button
                    type="button"
                    className={`variation-move ${currentNodeId === row.blackMove.id ? "active" : ""}`}
                    onClick={() => onMoveClick(row.blackMove!.id)}
                  >
                    {row.blackMove.san}
                  </button>
                )}
              </div>

              {noteNode && <NoteButton node={noteNode} onClick={onNoteClick} />}
            </div>
          );
        })}
      </div>

      {line.map((node) =>
        node.children
          .slice(1)
          .map((variationId) => (
            <VariationLine
              key={variationId}
              firstNodeId={variationId}
              nodes={nodes}
              currentNodeId={currentNodeId}
              onMoveClick={onMoveClick}
              onNoteClick={onNoteClick}
              depth={depth + 1}
            />
          )),
      )}
    </div>
  );
}
