import type { MoveNode, MoveRow, NodesMap } from "../types";
import { formatMoveLabel } from "../utils/chessTree";
import NoteButton from "./NoteButton";
import VariationLine from "./VariationLine";

type MovesPanelProps = {
  moveRows: MoveRow[];
  currentNodeId: string;
  nodes: NodesMap;
  currentNode: MoveNode | undefined;
  turn: "w" | "b";
  pgnCopied: boolean;
  onMoveClick: (nodeId: string) => void;
  onNoteClick: (nodeId: string) => void;
  onCopyPgn: () => void;
};

export default function MovesPanel({
  moveRows,
  currentNodeId,
  nodes,
  currentNode,
  turn,
  pgnCopied,
  onMoveClick,
  onNoteClick,
  onCopyPgn,
}: MovesPanelProps) {
  return (
    <aside className="moves-panel">
      <h2>Movimientos</h2>

      <div className="moves-table-header">
        <span>N.º</span>
        <span>Blancas</span>
        <span>Negras</span>
        <span aria-label="Notas" />
      </div>

      {moveRows.length === 0 ? (
        <p className="empty-message">Todavía no hay movimientos.</p>
      ) : (
        <div className="moves-table">
          {moveRows.map((row) => {
            const noteNode = row.blackMove ?? row.whiteMove;

            return (
              <div className="move-group" key={row.moveNumber}>
                <div className="move-row">
                  <span className="move-number">{row.moveNumber}.</span>

                  {row.whiteMove ? (
                    <button
                      type="button"
                      className={`move-button ${currentNodeId === row.whiteMove.id ? "active" : ""}`}
                      onClick={() => onMoveClick(row.whiteMove!.id)}
                    >
                      {row.whiteMove.san}
                    </button>
                  ) : (
                    <span />
                  )}

                  {row.blackMove ? (
                    <button
                      type="button"
                      className={`move-button ${currentNodeId === row.blackMove.id ? "active" : ""}`}
                      onClick={() => onMoveClick(row.blackMove!.id)}
                    >
                      {row.blackMove.san}
                    </button>
                  ) : (
                    <span className="empty-black-move" />
                  )}

                  {noteNode && <NoteButton node={noteNode} onClick={onNoteClick} />}
                </div>

                {row.whiteMove?.children.slice(1).map((variationId) => (
                  <VariationLine
                    key={variationId}
                    firstNodeId={variationId}
                    nodes={nodes}
                    currentNodeId={currentNodeId}
                    onMoveClick={onMoveClick}
                    onNoteClick={onNoteClick}
                  />
                ))}

                {row.blackMove?.children.slice(1).map((variationId) => (
                  <VariationLine
                    key={variationId}
                    firstNodeId={variationId}
                    nodes={nodes}
                    currentNodeId={currentNodeId}
                    onMoveClick={onMoveClick}
                    onNoteClick={onNoteClick}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div className="position-information">
        <h3>Posición actual</h3>

        <p>
          Turno: <strong>{turn === "w" ? "Blancas" : "Negras"}</strong>
        </p>

        <p>
          Jugada seleccionada: <strong>{formatMoveLabel(currentNode)}</strong>
        </p>

        <div className="export-row">
          <span className="export-description">Exportar el árbol completo</span>

          <button type="button" className="pgn-button" onClick={onCopyPgn} disabled={nodes.root.children.length === 0}>
            {pgnCopied ? "PGN copiado" : "Copiar PGN"}
          </button>
        </div>
      </div>
    </aside>
  );
}
