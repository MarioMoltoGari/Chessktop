import type { MoveNode } from "../types";
import { t } from "../i18n";
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
            <span className="note-dialog-label">{t("board.note.dialog.title")}</span>
            <h2 id="note-title">{formatMoveLabel(node)}</h2>
          </div>

          <button type="button" className="note-close-button" onClick={onClose} aria-label={t("board.note.dialog.close")}>
            ×
          </button>
        </header>

        <textarea
          className="note-textarea"
          value={noteDraft}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t("board.note.dialog.placeholder")}
          autoFocus
        />

        <footer className="note-dialog-actions">
          {hasExistingNote && (
            <button type="button" className="note-delete-button" onClick={onDelete}>
              {t("board.note.dialog.delete")}
            </button>
          )}

          <div className="note-main-actions">
            <button type="button" className="note-cancel-button" onClick={onClose}>
              {t("app.dialog.cancel")}
            </button>

            <button type="button" className="note-save-button" onClick={onSave}>
              {t("app.dialog.save")}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
