import type { MoveNode, MoveRow, NodesMap } from "../types";
import { t } from "../i18n";
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
      <h2>{t("board.moves.title")}</h2>

      <div className="moves-table-header">
        <span>{t("board.moves.header.number")}</span>
        <span>{t("board.moves.header.white")}</span>
        <span>{t("board.moves.header.black")}</span>
        <span aria-label={t("common.notes")} />
      </div>

      {moveRows.length === 0 ? (
        <p className="empty-message">{t("board.moves.empty")}</p>
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
        <h3>{t("app.positionCurrent")}</h3>

        <p>
          {t("app.turnLabel")}: <strong>{turn === "w" ? t("app.turn.white") : t("app.turn.black")}</strong>
        </p>

        <p>
          {t("app.currentMove")}: <strong>{formatMoveLabel(currentNode)}</strong>
        </p>

        <div className="export-row">
          <span className="export-description">{t("board.moves.exportTree")}</span>

          <button type="button" className="pgn-button" onClick={onCopyPgn} disabled={nodes.root.children.length === 0}>
            {pgnCopied ? t("board.moves.pgnCopied") : t("board.moves.copyPgn")}
          </button>
        </div>
      </div>
    </aside>
  );
}
