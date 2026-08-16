import { t } from "../i18n";

type BoardControlsProps = {
  currentNodeId: string;
  hasChildren: boolean;
  onGoToStart: () => void;
  onGoToPrevious: () => void;
  onGoToNext: () => void;
  onDeleteBranch: () => void;
  onReset: () => void;
};

export default function BoardControls({
  currentNodeId,
  hasChildren,
  onGoToStart,
  onGoToPrevious,
  onGoToNext,
  onDeleteBranch,
  onReset,
}: BoardControlsProps) {
  const isAtRoot = currentNodeId === "root";

  return (
    <div className="board-controls">
      <button type="button" onClick={onGoToStart} disabled={isAtRoot}>
        {t("board.controls.start")}
      </button>

      <button type="button" onClick={onGoToPrevious} disabled={isAtRoot}>
        {t("board.controls.previous")}
      </button>

      <button type="button" onClick={onGoToNext} disabled={!hasChildren}>
        {t("board.controls.next")}
      </button>

      <button type="button" onClick={onDeleteBranch} disabled={isAtRoot}>
        {t("board.controls.deleteBranch")}
      </button>

      <button type="button" onClick={onReset}>
        {t("board.controls.reset")}
      </button>
    </div>
  );
}
