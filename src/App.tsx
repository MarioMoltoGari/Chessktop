import { useEffect, useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import "./App.css";
import LibrarySidebar from "./components/LibrarySidebar";
import { initialLibraryState } from "./data/initialLibrary";
import type {
  StudyContent,
  StudyContentsMap,
} from "./types";
import type {
  ChessktopStorage,
  LibraryState,
} from "./types/library";
import {
  createEmptyStudyContent,
} from "./utils/chessTree";
import {
  loadChessktopState,
  saveChessktopState,
} from "./utils/storage";
import { exportLibrary, readLibraryBackup } from "./utils/export";

type MoveNode = {
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

type NodesMap = Record<string, MoveNode>;

type VariationLineProps = {
  firstNodeId: string;
  nodes: NodesMap;
  currentNodeId: string;
  onMoveClick: (nodeId: string) => void;
  onNoteClick: (nodeId: string) => void;
  depth?: number;
};

type NoteButtonProps = {
  node: MoveNode;
  onClick: (nodeId: string) => void;
};

/**
 * Devuelve la línea principal que comienza en el nodo indicado.
 * El primer hijo de cada nodo se considera continuación principal.
 */
function getLineFromNode(
  nodes: NodesMap,
  firstNodeId: string,
): MoveNode[] {
  const line: MoveNode[] = [];

  let currentNodeId: string | undefined = firstNodeId;

  while (currentNodeId !== undefined) {
    const currentMoveNode: MoveNode | undefined =
      nodes[currentNodeId];

    if (currentMoveNode === undefined) {
      break;
    }

    line.push(currentMoveNode);

    currentNodeId =
      currentMoveNode.children.length > 0
        ? currentMoveNode.children[0]
        : undefined;
  }

  return line;
}

/**
 * Devuelve la línea principal completa del estudio.
 */
function getMainLine(nodes: NodesMap): MoveNode[] {
  const firstMoveId = nodes.root.children[0];

  if (!firstMoveId) {
    return [];
  }

  return getLineFromNode(nodes, firstMoveId);
}

/**
 * Genera el prefijo del número de jugada.
 */
function getMovePrefix(
  node: MoveNode,
  forceBlackPrefix = false,
): string {
  const moveNumber = Math.ceil(node.ply / 2);
  const isWhiteMove = node.ply % 2 === 1;

  if (isWhiteMove) {
    return `${moveNumber}.`;
  }

  if (forceBlackPrefix) {
    return `${moveNumber}...`;
  }

  return "";
}

/**
 * Convierte el árbol de movimientos a PGN incluyendo variantes.
 */
function createPgn(nodes: NodesMap): string {
  function serializePosition(
    positionNodeId: string,
    isVariationStart: boolean,
  ): string {
    const positionNode = nodes[positionNodeId];

    if (!positionNode || positionNode.children.length === 0) {
      return "";
    }

    const [mainMoveId, ...variationIds] =
      positionNode.children;

    const mainMove = nodes[mainMoveId];

    if (!mainMove || !mainMove.san) {
      return "";
    }

    const prefix = getMovePrefix(
      mainMove,
      isVariationStart,
    );

    let result = prefix
      ? `${prefix} ${mainMove.san}`
      : mainMove.san;

    for (const variationId of variationIds) {
      const variation = serializeAlternative(variationId);

      if (variation) {
        result += ` (${variation})`;
      }
    }

    const continuation = serializePosition(
      mainMove.id,
      false,
    );

    if (continuation) {
      result += ` ${continuation}`;
    }

    return result;
  }

  function serializeAlternative(
    firstNodeId: string,
  ): string {
    const firstNode = nodes[firstNodeId];

    if (!firstNode || !firstNode.san) {
      return "";
    }

    const prefix = getMovePrefix(firstNode, true);

    let result = prefix
      ? `${prefix} ${firstNode.san}`
      : firstNode.san;

    const continuation = serializePosition(
      firstNode.id,
      false,
    );

    if (continuation) {
      result += ` ${continuation}`;
    }

    return result;
  }

  const moves = serializePosition("root", false);

  return moves ? `${moves} *` : "";
}

/**
 * Obtiene todos los nodos pertenecientes a una rama.
 */
function getSubtreeNodeIds(
  nodes: NodesMap,
  nodeId: string,
): string[] {
  const node = nodes[nodeId];

  if (!node) {
    return [];
  }

  return [
    nodeId,
    ...node.children.flatMap((childId) =>
      getSubtreeNodeIds(nodes, childId),
    ),
  ];
}

function NoteButton({
  node,
  onClick,
}: NoteButtonProps) {
  const hasNote = node.note.trim().length > 0;

  return (
    <button
      type="button"
      className={`note-button ${hasNote ? "has-note" : ""
        }`}
      onClick={(event) => {
        event.stopPropagation();
        onClick(node.id);
      }}
      aria-label={
        hasNote
          ? `Abrir nota de ${node.san}`
          : `Añadir nota a ${node.san}`
      }
      title={hasNote ? "Abrir nota" : "Añadir nota"}
    >
      {hasNote ? "📝" : "+"}
    </button>
  );
}

/**
 * Representa una variante y sus posibles subvariantes.
 */
function VariationLine({
  firstNodeId,
  nodes,
  currentNodeId,
  onMoveClick,
  onNoteClick,
  depth = 0,
}: VariationLineProps) {
  const line = getLineFromNode(nodes, firstNodeId);

  const rows: {
    moveNumber: number;
    whiteMove?: MoveNode;
    blackMove?: MoveNode;
  }[] = [];

  for (const node of line) {
    const moveNumber = Math.ceil(node.ply / 2);
    const isWhiteMove = node.ply % 2 === 1;

    let row = rows.find(
      (currentRow) =>
        currentRow.moveNumber === moveNumber,
    );

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
          const noteNode =
            row.blackMove ?? row.whiteMove;

          const startsWithBlack =
            index === 0 &&
            !row.whiteMove &&
            Boolean(row.blackMove);

          return (
            <div
              className="variation-row"
              key={`${firstNodeId}-${row.moveNumber}`}
            >
              <span className="variation-number">
                {startsWithBlack
                  ? `${row.moveNumber}...`
                  : `${row.moveNumber}.`}
              </span>

              <div className="variation-move-slot">
                {row.whiteMove && (
                  <button
                    type="button"
                    className={`variation-move ${currentNodeId ===
                      row.whiteMove.id
                      ? "active"
                      : ""
                      }`}
                    onClick={() =>
                      onMoveClick(
                        row.whiteMove!.id,
                      )
                    }
                  >
                    {row.whiteMove.san}
                  </button>
                )}
              </div>

              <div className="variation-move-slot">
                {row.blackMove && (
                  <button
                    type="button"
                    className={`variation-move ${currentNodeId ===
                      row.blackMove.id
                      ? "active"
                      : ""
                      }`}
                    onClick={() =>
                      onMoveClick(
                        row.blackMove!.id,
                      )
                    }
                  >
                    {row.blackMove.san}
                  </button>
                )}
              </div>

              {noteNode && (
                <NoteButton
                  node={noteNode}
                  onClick={onNoteClick}
                />
              )}
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

function createInitialNodes(): NodesMap {
  return {
    root: {
      id: "root",
      parentId: null,
      san: null,
      from: null,
      to: null,
      fen: new Chess().fen(),
      ply: 0,
      children: [],
      note: "",
    },
  };
}

type InitialAppState = {
  library: LibraryState;
  studyContents: StudyContentsMap;
  selectedStudyId: string | null;
};

function createInitialAppState(): InitialAppState {
  const storedState = loadChessktopState();

  const library =
    storedState?.library ?? initialLibraryState;

  const storedContents =
    storedState?.studyContents ?? {};

  let selectedStudyId =
    storedState?.selectedStudyId ?? null;

  const selectedStudyExists =
    selectedStudyId !== null &&
    library.studies.some(
      (study) => study.id === selectedStudyId,
    );

  if (!selectedStudyExists) {
    selectedStudyId =
      library.studies[0]?.id ?? null;
  }

  const studyContents = {
    ...storedContents,
  };

  if (
    selectedStudyId &&
    !studyContents[selectedStudyId]
  ) {
    studyContents[selectedStudyId] =
      createEmptyStudyContent(selectedStudyId);
  }

  return {
    library,
    studyContents,
    selectedStudyId,
  };
}

const EMPTY_NODES = createInitialNodes();

function App() {
  const [initialState] = useState(
    createInitialAppState,
  );

  const [library, setLibrary] =
    useState<LibraryState>(
      initialState.library,
    );

  const [
    selectedStudyId,
    setSelectedStudyId,
  ] = useState<string | null>(
    initialState.selectedStudyId,
  );

  const [
    studyContents,
    setStudyContents,
  ] = useState<StudyContentsMap>(
    initialState.studyContents,
  );

  const [pgnCopied, setPgnCopied] =
    useState(false);

  const [noteNodeId, setNoteNodeId] =
    useState<string | null>(null);

  const [noteDraft, setNoteDraft] =
    useState("");

  const selectedStudy =
    library.studies.find(
      (study) =>
        study.id === selectedStudyId,
    ) ?? null;

  const activeStudyContent =
    selectedStudyId
      ? studyContents[selectedStudyId] ?? null
      : null;

  const nodes =
    activeStudyContent?.nodes ??
    EMPTY_NODES;

  const currentNodeId =
    activeStudyContent?.currentNodeId ??
    "root";

  const currentNode =
    nodes[currentNodeId] ??
    nodes.root;

  const position = currentNode.fen;

  const game = useMemo(
    () => new Chess(position),
    [position],
  );

  const mainLine = useMemo(
    () => getMainLine(nodes),
    [nodes],
  );

  const pgn = useMemo(
    () => createPgn(nodes),
    [nodes],
  );

  const moveRows = useMemo(
    () =>
      Array.from(
        {
          length: Math.ceil(mainLine.length / 2),
        },
        (_, rowIndex) => {
          const whiteMove =
            mainLine[rowIndex * 2];

          const blackMove =
            mainLine[rowIndex * 2 + 1];

          return {
            moveNumber: rowIndex + 1,
            whiteMove,
            blackMove,
          };
        },
      ),
    [mainLine],
  );

  useEffect(() => {
    const stateToSave: ChessktopStorage = {
      version: 1,
      library,
      studyContents,
      selectedStudyId,
    };

    saveChessktopState(stateToSave);
  }, [
    library,
    studyContents,
    selectedStudyId,
  ]);

  useEffect(() => {
    const validStudyIds = new Set(
      library.studies.map(
        (study) => study.id,
      ),
    );

    setStudyContents(
      (previousContents) => {
        const cleanedContents:
          StudyContentsMap = {};

        let contentsChanged = false;

        for (const [
          studyId,
          content,
        ] of Object.entries(
          previousContents,
        )) {
          if (validStudyIds.has(studyId)) {
            cleanedContents[studyId] =
              content;
          } else {
            contentsChanged = true;
          }
        }

        return contentsChanged
          ? cleanedContents
          : previousContents;
      },
    );
  }, [library.studies]);

  useEffect(() => {
    if (!selectedStudyId) {
      return;
    }

    const selectedStudyStillExists =
      library.studies.some(
        (study) =>
          study.id === selectedStudyId,
      );

    if (!selectedStudyStillExists) {
      setSelectedStudyId(
        library.studies[0]?.id ?? null,
      );
    }
  }, [
    library.studies,
    selectedStudyId,
  ]);

  async function handleImportLibrary(
    file: File,
  ) {
    const confirmed = window.confirm(
      "La biblioteca actual será reemplazada completamente por la copia seleccionada.\n\n" +
      "Las carpetas, estudios, movimientos y notas actuales que no estén en la copia se perderán.\n\n" +
      "¿Deseas continuar?",
    );

    if (!confirmed) {
      return;
    }

    try {
      const importedState =
        await readLibraryBackup(file);

      setLibrary(
        importedState.library,
      );

      setStudyContents(
        importedState.studyContents,
      );

      setSelectedStudyId(
        importedState.selectedStudyId,
      );

      closeNote();
      setPgnCopied(false);

      alert(
        "La biblioteca se ha importado correctamente.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo importar la biblioteca.";

      console.error(
        "Error al importar la biblioteca:",
        error,
      );

      alert(message);
    }
  }

  function handleExportLibrary() {
    exportLibrary({
      version: 1,
      library,
      studyContents,
      selectedStudyId,
    });
  }

  function selectStudy(
    nextStudyId: string | null,
  ) {
    if (!nextStudyId) {
      setSelectedStudyId(null);
      closeNote();
      return;
    }

    const studyExists =
      library.studies.some(
        (study) =>
          study.id === nextStudyId,
      );

    if (!studyExists) {
      return;
    }

    if (!studyContents[nextStudyId]) {
      setStudyContents(
        (previousContents) => ({
          ...previousContents,

          [nextStudyId]:
            createEmptyStudyContent(
              nextStudyId,
            ),
        }),
      );
    }

    setSelectedStudyId(nextStudyId);
    closeNote();
  }

  useEffect(() => {
    if (!pgnCopied) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPgnCopied(false);
    }, 1500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [pgnCopied]);

  function updateActiveStudy(
    updater: (
      content: StudyContent,
    ) => StudyContent,
  ) {
    if (!selectedStudyId) {
      return;
    }

    setStudyContents(
      (previousContents) => {
        const currentContent =
          previousContents[selectedStudyId] ??
          createEmptyStudyContent(
            selectedStudyId,
          );

        return {
          ...previousContents,

          [selectedStudyId]: {
            ...updater(currentContent),

            studyId: selectedStudyId,

            updatedAt:
              new Date().toISOString(),
          },
        };
      },
    );
  }

  function setActiveNodeId(
    nodeId: string,
  ) {
    updateActiveStudy((content) => ({
      ...content,
      currentNodeId: nodeId,
    }));
  }

  function openNote(nodeId: string) {
    const node = nodes[nodeId];

    if (!node) {
      return;
    }

    setNoteNodeId(nodeId);
    setNoteDraft(node.note);
  }

  function closeNote() {
    setNoteNodeId(null);
    setNoteDraft("");
  }

  function saveNote() {
    if (
      !noteNodeId ||
      !nodes[noteNodeId]
    ) {
      return;
    }

    updateActiveStudy((content) => ({
      ...content,

      nodes: {
        ...content.nodes,

        [noteNodeId]: {
          ...content.nodes[noteNodeId],
          note: noteDraft.trim(),
        },
      },
    }));

    closeNote();
  }

  function deleteNote() {
    if (
      !noteNodeId ||
      !nodes[noteNodeId]
    ) {
      return;
    }

    updateActiveStudy((content) => ({
      ...content,

      nodes: {
        ...content.nodes,

        [noteNodeId]: {
          ...content.nodes[noteNodeId],
          note: "",
        },
      },
    }));

    closeNote();
  }

  function makeMove(
    sourceSquare: string,
    targetSquare: string,
  ): boolean {
    if (!selectedStudyId) {
      return false;
    }

    const nodeAtCurrentPosition =
      nodes[currentNodeId];

    if (!nodeAtCurrentPosition) {
      return false;
    }

    const gameCopy = new Chess(
      nodeAtCurrentPosition.fen,
    );

    try {
      const move = gameCopy.move({
        from: sourceSquare as Square,
        to: targetSquare as Square,
        promotion: "q",
      });

      const existingChildId =
        nodeAtCurrentPosition.children.find(
          (childId) => {
            const child = nodes[childId];

            if (!child) {
              return false;
            }

            return (
              child.from === move.from &&
              child.to === move.to &&
              child.promotion ===
              move.promotion
            );
          },
        );

      if (existingChildId) {
        setActiveNodeId(existingChildId);
        return true;
      }

      const newNodeId =
        crypto.randomUUID();

      const newNode: MoveNode = {
        id: newNodeId,
        parentId: currentNodeId,

        san: move.san,
        from: move.from,
        to: move.to,
        promotion: move.promotion,

        fen: gameCopy.fen(),
        ply:
          nodeAtCurrentPosition.ply + 1,

        children: [],
        note: "",
      };

      updateActiveStudy((content) => ({
        ...content,

        nodes: {
          ...content.nodes,

          [currentNodeId]: {
            ...content.nodes[
            currentNodeId
            ],

            children: [
              ...content.nodes[
                currentNodeId
              ].children,

              newNodeId,
            ],
          },

          [newNodeId]: newNode,
        },

        currentNodeId: newNodeId,
      }));

      return true;
    } catch {
      return false;
    }
  }

  function goToMove(nodeId: string) {
    if (nodes[nodeId]) {
      setActiveNodeId(nodeId);
    }
  }

  function goToStart() {
    setActiveNodeId("root");
  }

  function goToPreviousMove() {
    const parentId =
      nodes[currentNodeId]?.parentId;

    if (parentId !== null && parentId !== undefined) {
      setActiveNodeId(parentId);
    }
  }

  function goToNextMove() {
    const firstChildId =
      nodes[currentNodeId]?.children[0];

    if (firstChildId) {
      setActiveNodeId(firstChildId);
    }
  }

  function deleteCurrentBranch() {
    if (currentNodeId === "root") {
      return;
    }

    const nodeToDelete =
      nodes[currentNodeId];

    const parentId =
      nodeToDelete?.parentId;

    if (!parentId) {
      return;
    }

    const subtreeIds =
      getSubtreeNodeIds(
        nodes,
        currentNodeId,
      );

    updateActiveStudy((content) => {
      const updatedNodes = {
        ...content.nodes,
      };

      for (const nodeId of subtreeIds) {
        delete updatedNodes[nodeId];
      }

      updatedNodes[parentId] = {
        ...updatedNodes[parentId],

        children:
          updatedNodes[
            parentId
          ].children.filter(
            (childId) =>
              childId !== currentNodeId,
          ),
      };

      return {
        ...content,
        nodes: updatedNodes,
        currentNodeId: parentId,
      };
    });
  }

  function resetGame() {
    if (!selectedStudyId) {
      return;
    }

    updateActiveStudy((content) => ({
      ...content,
      nodes: createInitialNodes(),
      currentNodeId: "root",
    }));

    setPgnCopied(false);
    closeNote();
  }

  async function copyPgn() {
    if (!pgn) {
      return;
    }

    try {
      await navigator.clipboard.writeText(pgn);
      setPgnCopied(true);
    } catch (error) {
      console.error(
        "No se pudo copiar el PGN:",
        error,
      );
    }
  }

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <h1>Chessktop</h1>
          <p>
            {selectedStudy
              ? selectedStudy.name
              : "Selecciona un estudio"}
          </p>
        </div>
      </header>

      <section className="workspace">
        <LibrarySidebar
          library={library}
          selectedStudyId={selectedStudyId}
          onLibraryChange={setLibrary}
          onStudySelect={selectStudy}
          onExportLibrary={handleExportLibrary}
          onImportLibrary={handleImportLibrary}
        />
        <div className="board-section">
          <div className="board-container">
            <Chessboard
              options={{
                position,

                onPieceDrop: ({
                  sourceSquare,
                  targetSquare,
                }) => {
                  if (!targetSquare) {
                    return false;
                  }

                  return makeMove(
                    sourceSquare,
                    targetSquare,
                  );
                },

                boardStyle: {
                  borderRadius: "8px",
                  boxShadow:
                    "0 8px 24px rgba(0, 0, 0, 0.16)",
                },

                lightSquareStyle: {
                  backgroundColor: "#e8e1d1",
                },

                darkSquareStyle: {
                  backgroundColor: "#77906f",
                },
              }}
            />
          </div>

          <div className="board-controls">
            <button
              type="button"
              onClick={goToStart}
              disabled={currentNodeId === "root"}
            >
              Inicio
            </button>

            <button
              type="button"
              onClick={goToPreviousMove}
              disabled={currentNodeId === "root"}
            >
              Anterior
            </button>

            <button
              type="button"
              onClick={goToNextMove}
              disabled={
                nodes[currentNodeId]?.children
                  .length === 0
              }
            >
              Siguiente
            </button>

            <button
              type="button"
              onClick={deleteCurrentBranch}
              disabled={currentNodeId === "root"}
            >
              Borrar rama
            </button>

            <button
              type="button"
              onClick={resetGame}
              disabled={
                nodes.root.children.length === 0
              }
            >
              Reiniciar
            </button>
          </div>
        </div>

        <aside className="moves-panel">
          <h2>Movimientos</h2>

          <div className="moves-table-header">
            <span>N.º</span>
            <span>Blancas</span>
            <span>Negras</span>
            <span aria-label="Notas" />
          </div>

          {moveRows.length === 0 ? (
            <p className="empty-message">
              Todavía no hay movimientos.
            </p>
          ) : (
            <div className="moves-table">
              {moveRows.map((row) => (
                <div
                  className="move-group"
                  key={row.moveNumber}
                >
                  <div className="move-row">
                    <span className="move-number">
                      {row.moveNumber}.
                    </span>

                    {row.whiteMove ? (
                      <button
                        type="button"
                        className={`move-button ${currentNodeId === row.whiteMove.id
                          ? "active"
                          : ""
                          }`}
                        onClick={() =>
                          goToMove(row.whiteMove.id)
                        }
                      >
                        {row.whiteMove.san}
                      </button>
                    ) : (
                      <span />
                    )}

                    {row.blackMove ? (
                      <button
                        type="button"
                        className={`move-button ${currentNodeId === row.blackMove.id
                          ? "active"
                          : ""
                          }`}
                        onClick={() =>
                          goToMove(row.blackMove.id)
                        }
                      >
                        {row.blackMove.san}
                      </button>
                    ) : (
                      <span className="empty-black-move" />
                    )}

                    <NoteButton
                      node={row.blackMove ?? row.whiteMove}
                      onClick={openNote}
                    />
                  </div>
                  {row.whiteMove?.children
                    .slice(1)
                    .map((variationId) => (
                      <VariationLine
                        key={variationId}
                        firstNodeId={variationId}
                        nodes={nodes}
                        currentNodeId={currentNodeId}
                        onMoveClick={goToMove}
                        onNoteClick={openNote}
                      />
                    ))}

                  {row.blackMove?.children
                    .slice(1)
                    .map((variationId) => (
                      <VariationLine
                        key={variationId}
                        firstNodeId={variationId}
                        nodes={nodes}
                        currentNodeId={currentNodeId}
                        onMoveClick={goToMove}
                        onNoteClick={openNote}
                      />
                    ))}
                </div>
              ))}
            </div>
          )}

          <div className="position-information">
            <h3>Posición actual</h3>

            <p>
              Turno:{" "}
              <strong>
                {game.turn() === "w"
                  ? "Blancas"
                  : "Negras"}
              </strong>
            </p>

            <p>
              Jugada seleccionada:{" "}
              <strong>
                {currentNodeId === "root"
                  ? "Posición inicial"
                  : `${Math.ceil(
                    currentNode.ply / 2,
                  )}${currentNode.ply % 2 === 1
                    ? "."
                    : "..."
                  } ${currentNode.san}`}
              </strong>
            </p>

            <div className="export-row">
              <span className="export-description">
                Exportar el árbol completo
              </span>

              <button
                type="button"
                className="pgn-button"
                onClick={copyPgn}
                disabled={
                  nodes.root.children.length === 0
                }
              >
                {pgnCopied
                  ? "PGN copiado"
                  : "Copiar PGN"}
              </button>
            </div>
          </div>
        </aside>
      </section>

      {noteNodeId && nodes[noteNodeId] && (
        <div
          className="note-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeNote();
            }
          }}
        >
          <section
            className="note-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="note-title"
          >
            <header className="note-dialog-header">
              <div>
                <span className="note-dialog-label">
                  Apunte del movimiento
                </span>

                <h2 id="note-title">
                  {Math.ceil(
                    nodes[noteNodeId].ply / 2,
                  )}
                  {nodes[noteNodeId].ply % 2 === 1
                    ? "."
                    : "..."}{" "}
                  {nodes[noteNodeId].san}
                </h2>
              </div>

              <button
                type="button"
                className="note-close-button"
                onClick={closeNote}
                aria-label="Cerrar nota"
              >
                ×
              </button>
            </header>

            <textarea
              className="note-textarea"
              value={noteDraft}
              onChange={(event) =>
                setNoteDraft(event.target.value)
              }
              placeholder="Escribe aquí tus ideas, planes, errores frecuentes o recordatorios..."
              autoFocus
            />

            <footer className="note-dialog-actions">
              {nodes[noteNodeId].note && (
                <button
                  type="button"
                  className="note-delete-button"
                  onClick={deleteNote}
                >
                  Borrar nota
                </button>
              )}

              <div className="note-main-actions">
                <button
                  type="button"
                  className="note-cancel-button"
                  onClick={closeNote}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="note-save-button"
                  onClick={saveNote}
                >
                  Guardar
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;