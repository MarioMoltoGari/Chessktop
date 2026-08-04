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
        Inicio
      </button>

      <button type="button" onClick={onGoToPrevious} disabled={isAtRoot}>
        Anterior
      </button>

      <button type="button" onClick={onGoToNext} disabled={!hasChildren}>
        Siguiente
      </button>

      <button type="button" onClick={onDeleteBranch} disabled={isAtRoot}>
        Borrar rama
      </button>

      <button type="button" onClick={onReset}>
        Reiniciar
      </button>
    </div>
  );
}
