import {
  Plus,
  StickyNote,
} from "lucide-react";
import { t } from "../i18n";

import type {
  MoveNode,
} from "../types";

type NoteButtonProps = {
  node: MoveNode;

  onClick: (
    nodeId: string,
  ) => void;
};

export default function NoteButton({
  node,
  onClick,
}: NoteButtonProps) {
  const hasNote =
    node.note
      .trim()
      .length > 0;

  return (
    <button
      type="button"
      className={`note-button ${hasNote
        ? "has-note"
        : ""
        }`}
      onClick={(event) => {
        event.stopPropagation();

        onClick(
          node.id,
        );
      }}
      aria-label={
        hasNote
          ? t("note.button.aria.open", { move: node.san ?? "" })
          : t("note.button.aria.add", { move: node.san ?? "" })
      }
      title={
        hasNote
          ? t("board.note.open")
          : t("board.note.add")
      }
    >
      {hasNote ? (
        <StickyNote
          size={15}
          aria-hidden="true"
        />
      ) : (
        <Plus
          size={17}
          aria-hidden="true"
        />
      )}
    </button>
  );
}