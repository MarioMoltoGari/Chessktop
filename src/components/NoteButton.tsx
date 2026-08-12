import {
  Plus,
  StickyNote,
} from "lucide-react";

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
          ? `Abrir nota de ${node.san}`
          : `Añadir nota a ${node.san}`
      }
      title={
        hasNote
          ? "Abrir nota"
          : "Añadir nota"
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