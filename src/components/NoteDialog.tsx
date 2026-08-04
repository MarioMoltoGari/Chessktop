import type { MoveNode } from "../types";
import { formatMoveLabel } from "../utils/chessTree";

type NoteDialogProps = {
  node: MoveNode | null;
  noteDraft: string;
  onClose: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
  hasExistingNote: boolean;
};

export default function NoteDialog({
  node,
  noteDraft,
  onClose,
  onChange,
  onSave,
  onDelete,
  hasExistingNote,
}: NoteDialogProps) {
  if (!node) {
    return null;
  }

  return (
    <div
      className="note-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="note-dialog" role="dialog" aria-modal="true" aria-labelledby="note-title">
        <header className="note-dialog-header">
          <div>
            <span className="note-dialog-label">Apunte del movimiento</span>
            <h2 id="note-title">{formatMoveLabel(node)}</h2>
          </div>

          <button type="button" className="note-close-button" onClick={onClose} aria-label="Cerrar nota">
            ×
          </button>
        </header>

        <textarea
          className="note-textarea"
          value={noteDraft}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Escribe aquí tus ideas, planes, errores frecuentes o recordatorios..."
          autoFocus
        />

        <footer className="note-dialog-actions">
          {hasExistingNote && (
            <button type="button" className="note-delete-button" onClick={onDelete}>
              Borrar nota
            </button>
          )}

          <div className="note-main-actions">
            <button type="button" className="note-cancel-button" onClick={onClose}>
              Cancelar
            </button>

            <button type="button" className="note-save-button" onClick={onSave}>
              Guardar
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
