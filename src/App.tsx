import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Chess,
  type Square,
} from "chess.js";

import {
  Chessboard,
} from "react-chessboard";

import "./App.css";

import LibrarySidebar from "./components/LibrarySidebar";

import {
  defaultLibrary,
} from "./data/defaultLibrary";

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

import {
  exportLibrary,
  readLibraryBackup,
} from "./utils/export";

import StockfishPanel from "./components/engine/StockfishPanel";

import Toast from "./components/Toast";

import type {
  TrainingMode,
  TrainingOrder,
  TrainingPerformancesMap,
  TrainingSession,
  TrainingSide,
  TrainingsMap,
} from "./components/training/types";

import {
  updateTrainingPerformance,
} from "./components/training/trainingPerformance";

import {
  addTraining,
  createTraining,
  deleteTraining,
  renameTraining,
} from "./components/training/trainingService";

import TrainingWorkspace from "./components/training/TrainingWorkspace";

import type {
  ActiveWorkspace,
} from "./types/workspace";

import {
  importPgnAsStudy,
} from "./imports/pgnImporter";

type MoveNode = {
  id: string;

  parentId:
  string | null;

  san:
  string | null;

  from:
  Square | null;

  to:
  Square | null;

  promotion?: string;

  fen: string;

  ply: number;

  children: string[];

  note: string;
};

type NodesMap =
  Record<
    string,
    MoveNode
  >;

type VariationLineProps = {
  firstNodeId: string;

  nodes: NodesMap;

  currentNodeId: string;

  onMoveClick: (
    nodeId: string,
  ) => void;

  onNoteClick: (
    nodeId: string,
  ) => void;

  depth?: number;
};

type NoteButtonProps = {
  node: MoveNode;

  onClick: (
    nodeId: string,
  ) => void;
};

/*
 * Devuelve la línea principal que comienza
 * en el nodo indicado.
 */
function getLineFromNode(
  nodes: NodesMap,
  firstNodeId: string,
): MoveNode[] {
  const line:
    MoveNode[] = [];

  let currentNodeId:
    string | undefined =
    firstNodeId;

  while (
    currentNodeId !==
    undefined
  ) {
    const currentMoveNode:
      MoveNode | undefined =
      nodes[
      currentNodeId
      ];

    if (
      currentMoveNode ===
      undefined
    ) {
      break;
    }

    line.push(
      currentMoveNode,
    );

    currentNodeId =
      currentMoveNode
        .children
        .length > 0
        ? currentMoveNode
          .children[0]
        : undefined;
  }

  return line;
}

/*
 * Devuelve la línea principal
 * completa del estudio.
 */
function getMainLine(
  nodes: NodesMap,
): MoveNode[] {
  const firstMoveId =
    nodes.root
      .children[0];

  if (!firstMoveId) {
    return [];
  }

  return getLineFromNode(
    nodes,
    firstMoveId,
  );
}

/*
 * Genera el prefijo del
 * número de jugada.
 */
function getMovePrefix(
  node: MoveNode,
  forceBlackPrefix =
    false,
): string {
  const moveNumber =
    Math.ceil(
      node.ply / 2,
    );

  const isWhiteMove =
    node.ply % 2 === 1;

  if (isWhiteMove) {
    return `${moveNumber}.`;
  }

  if (
    forceBlackPrefix
  ) {
    return `${moveNumber}...`;
  }

  return "";
}

function getStudyNameFromPgnFile(
  fileName: string,
): string {
  const withoutExtension =
    fileName.replace(
      /\.pgn$/i,
      "",
    );

  const normalizedName =
    withoutExtension
      .replace(
        /[_-]+/g,
        " ",
      )
      .replace(
        /\s+/g,
        " ",
      )
      .trim();

  return (
    normalizedName ||
    "Estudio importado"
  );
}

/*
 * Convierte el árbol de movimientos
 * a PGN incluyendo variantes.
 */
function createPgn(
  nodes: NodesMap,
): string {
  function serializePosition(
    positionNodeId: string,
    isVariationStart:
      boolean,
  ): string {
    const positionNode =
      nodes[
      positionNodeId
      ];

    if (
      !positionNode ||
      positionNode
        .children
        .length === 0
    ) {
      return "";
    }

    const [
      mainMoveId,
      ...variationIds
    ] =
      positionNode.children;

    const mainMove =
      nodes[
      mainMoveId
      ];

    if (
      !mainMove ||
      !mainMove.san
    ) {
      return "";
    }

    const prefix =
      getMovePrefix(
        mainMove,
        isVariationStart,
      );

    let result =
      prefix
        ? `${prefix} ${mainMove.san}`
        : mainMove.san;

    for (
      const variationId
      of variationIds
    ) {
      const variation =
        serializeAlternative(
          variationId,
        );

      if (variation) {
        result +=
          ` (${variation})`;
      }
    }

    const continuation =
      serializePosition(
        mainMove.id,
        false,
      );

    if (continuation) {
      result +=
        ` ${continuation}`;
    }

    return result;
  }

  function serializeAlternative(
    firstNodeId: string,
  ): string {
    const firstNode =
      nodes[
      firstNodeId
      ];

    if (
      !firstNode ||
      !firstNode.san
    ) {
      return "";
    }

    const prefix =
      getMovePrefix(
        firstNode,
        true,
      );

    let result =
      prefix
        ? `${prefix} ${firstNode.san}`
        : firstNode.san;

    const continuation =
      serializePosition(
        firstNode.id,
        false,
      );

    if (continuation) {
      result +=
        ` ${continuation}`;
    }

    return result;
  }

  const moves =
    serializePosition(
      "root",
      false,
    );

  return moves
    ? `${moves} *`
    : "";
}

/*
 * Obtiene todos los nodos
 * pertenecientes a una rama.
 */
function getSubtreeNodeIds(
  nodes: NodesMap,
  nodeId: string,
): string[] {
  const node =
    nodes[
    nodeId
    ];

  if (!node) {
    return [];
  }

  return [
    nodeId,

    ...node
      .children
      .flatMap(
        (
          childId,
        ) =>
          getSubtreeNodeIds(
            nodes,
            childId,
          ),
      ),
  ];
}

function NoteButton({
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
      onClick={(
        event,
      ) => {
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
      {hasNote
        ? "📝"
        : "+"}
    </button>
  );
}

/*
 * Representa una variante y
 * sus posibles subvariantes.
 */
function VariationLine({
  firstNodeId,
  nodes,
  currentNodeId,
  onMoveClick,
  onNoteClick,
  depth = 0,
}: VariationLineProps) {
  const line =
    getLineFromNode(
      nodes,
      firstNodeId,
    );

  const rows: {
    moveNumber:
    number;

    whiteMove?:
    MoveNode;

    blackMove?:
    MoveNode;
  }[] = [];

  for (
    const node
    of line
  ) {
    const moveNumber =
      Math.ceil(
        node.ply / 2,
      );

    const isWhiteMove =
      node.ply % 2 === 1;

    let row =
      rows.find(
        (
          currentRow,
        ) =>
          currentRow
            .moveNumber ===
          moveNumber,
      );

    if (!row) {
      row = {
        moveNumber,
      };

      rows.push(
        row,
      );
    }

    if (
      isWhiteMove
    ) {
      row.whiteMove =
        node;
    } else {
      row.blackMove =
        node;
    }
  }

  return (
    <div
      className="variation-block"
      style={{
        marginLeft:
          `${Math.min(
            depth,
            4,
          ) * 14}px`,
      }}
    >
      <div className="variation-rows">
        {rows.map(
          (
            row,
            index,
          ) => {
            const noteNode =
              row.blackMove ??
              row.whiteMove;

            const startsWithBlack =
              index === 0 &&
              !row.whiteMove &&
              Boolean(
                row.blackMove,
              );

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
                          row.whiteMove!
                            .id,
                        )
                      }
                    >
                      {
                        row.whiteMove
                          .san
                      }
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
                          row.blackMove!
                            .id,
                        )
                      }
                    >
                      {
                        row.blackMove
                          .san
                      }
                    </button>
                  )}
                </div>

                {noteNode && (
                  <NoteButton
                    node={
                      noteNode
                    }
                    onClick={
                      onNoteClick
                    }
                  />
                )}
              </div>
            );
          },
        )}
      </div>

      {line.map(
        (
          node,
        ) =>
          node.children
            .slice(1)
            .map(
              (
                variationId,
              ) => (
                <VariationLine
                  key={
                    variationId
                  }
                  firstNodeId={
                    variationId
                  }
                  nodes={
                    nodes
                  }
                  currentNodeId={
                    currentNodeId
                  }
                  onMoveClick={
                    onMoveClick
                  }
                  onNoteClick={
                    onNoteClick
                  }
                  depth={
                    depth + 1
                  }
                />
              ),
            ),
      )}
    </div>
  );
}

function createInitialNodes():
  NodesMap {
  return {
    root: {
      id: "root",

      parentId:
        null,

      san:
        null,

      from:
        null,

      to:
        null,

      fen:
        new Chess()
          .fen(),

      ply: 0,

      children: [],

      note: "",
    },
  };
}

type InitialAppState = {
  library:
  LibraryState;

  studyContents:
  StudyContentsMap;

  workspace:
  ActiveWorkspace;

  trainings:
  TrainingsMap;

  trainingPerformances:
  TrainingPerformancesMap;

  /*
   * Si existían datos locales pero estaban
   * dañados, impedimos sobrescribirlos.
   */
  persistenceBlocked:
  boolean;
};

function loadAppState():
  InitialAppState {
  const loadResult =
    loadChessktopState();

  const storedState =
    loadResult.status ===
      "loaded"
      ? loadResult.state
      : null;

  /*
   * empty:
   * primera ejecución normal.
   *
   * invalid / error:
   * existe almacenamiento que no
   * queremos sobrescribir.
   */
  const persistenceBlocked =
    loadResult.status ===
    "invalid" ||
    loadResult.status ===
    "error";

  const trainings =
    storedState
      ?.trainings ??
    {};

  const trainingPerformances =
    storedState
      ?.trainingPerformances ??
    {};

  const library =
    storedState
      ?.library ??
    defaultLibrary;

  const storedContents =
    storedState
      ?.studyContents ??
    {};

  let initialStudyId =
    storedState
      ?.selectedStudyId ??
    null;

  const selectedStudyExists =
    initialStudyId !==
    null &&
    library.studies.some(
      (
        study,
      ) =>
        study.id ===
        initialStudyId,
    );

  if (
    !selectedStudyExists
  ) {
    initialStudyId =
      library
        .studies[0]
        ?.id ??
      null;
  }

  const studyContents = {
    ...storedContents,
  };

  if (
    initialStudyId &&
    !studyContents[
    initialStudyId
    ]
  ) {
    studyContents[
      initialStudyId
    ] =
      createEmptyStudyContent(
        initialStudyId,
      );
  }

  const workspace:
    ActiveWorkspace =
    initialStudyId
      ? {
        type:
          "study",

        studyId:
          initialStudyId,
      }
      : null;

  return {
    library,

    studyContents,

    workspace,

    trainings,

    trainingPerformances,

    persistenceBlocked,
  };
}

const EMPTY_NODES =
  createInitialNodes();

/*
 * Evita mostrar dos veces el aviso de
 * almacenamiento corrupto durante el
 * doble montaje de React StrictMode
 * en desarrollo.
 */
let persistenceWarningShown =
  false;

function App() {
  const [
    initialState,
  ] =
    useState(
      loadAppState,
    );

  const [
    library,
    setLibrary,
  ] =
    useState<LibraryState>(
      initialState.library,
    );

  const [
    workspace,
    setWorkspace,
  ] =
    useState<ActiveWorkspace>(
      initialState.workspace,
    );

  const [
    studyContents,
    setStudyContents,
  ] =
    useState<StudyContentsMap>(
      initialState.studyContents,
    );

  const [
    trainings,
    setTrainings,
  ] =
    useState<TrainingsMap>(
      initialState.trainings,
    );

  const [
    trainingPerformances,
    setTrainingPerformances,
  ] =
    useState<TrainingPerformancesMap>(
      initialState
        .trainingPerformances,
    );

  const [
    persistenceBlocked,
    setPersistenceBlocked,
  ] =
    useState(
      initialState
        .persistenceBlocked,
    );

  const saveErrorShownRef =
    useRef(false);

  const selectedTraining =
    workspace?.type ===
      "training"
      ? trainings[
      workspace
        .trainingId
      ] ?? null
      : null;

  const selectedStudyId =
    workspace?.type ===
      "study"
      ? workspace.studyId
      : selectedTraining
        ?.studyId ??
      null;

  const trainingStudy =
    selectedTraining
      ? library
        .studies
        .find(
          (
            study,
          ) =>
            study.id ===
            selectedTraining
              .studyId,
        ) ??
      null
      : null;

  const [
    noteNodeId,
    setNoteNodeId,
  ] =
    useState<
      string | null
    >(null);

  const [
    noteDraft,
    setNoteDraft,
  ] =
    useState("");

  const [
    toastMessage,
    setToastMessage,
  ] =
    useState("");

  const [
    toastVisible,
    setToastVisible,
  ] =
    useState(false);

  const toastTimeoutRef =
    useRef<
      number | null
    >(null);

  const selectedStudy =
    library
      .studies
      .find(
        (
          study,
        ) =>
          study.id ===
          selectedStudyId,
      ) ??
    null;

  const activeStudyContent =
    selectedStudyId
      ? studyContents[
      selectedStudyId
      ] ??
      null
      : null;

  const nodes =
    activeStudyContent
      ?.nodes ??
    EMPTY_NODES;

  const currentNodeId =
    activeStudyContent
      ?.currentNodeId ??
    "root";

  const currentNode =
    nodes[
    currentNodeId
    ] ??
    nodes.root;

  const position =
    currentNode.fen;

  const game =
    useMemo(
      () =>
        new Chess(
          position,
        ),
      [
        position,
      ],
    );

  const mainLine =
    useMemo(
      () =>
        getMainLine(
          nodes,
        ),
      [
        nodes,
      ],
    );

  const pgn =
    useMemo(
      () =>
        createPgn(
          nodes,
        ),
      [
        nodes,
      ],
    );

  const moveRows =
    useMemo(
      () =>
        Array.from(
          {
            length:
              Math.ceil(
                mainLine.length /
                2,
              ),
          },
          (
            _,
            rowIndex,
          ) => {
            const whiteMove =
              mainLine[
              rowIndex *
              2
              ];

            const blackMove =
              mainLine[
              rowIndex *
              2 +
              1
              ];

            return {
              moveNumber:
                rowIndex +
                1,

              whiteMove,

              blackMove,
            };
          },
        ),
      [
        mainLine,
      ],
    );

  /*
   * Persistencia automática.
   */
  useEffect(() => {
    /*
     * Si al arrancar encontramos datos
     * corruptos, no sobrescribimos
     * absolutamente nada.
     */
    if (
      persistenceBlocked
    ) {
      return;
    }

    const stateToSave:
      ChessktopStorage = {
      version: 1,

      library,

      studyContents,

      selectedStudyId,

      trainings,

      trainingPerformances,
    };

    const result =
      saveChessktopState(
        stateToSave,
      );

    if (result.ok) {
      saveErrorShownRef.current =
        false;

      return;
    }

    /*
     * Evita repetir el mismo alert en cada
     * modificación mientras continúe
     * existiendo el problema.
     */
    if (
      saveErrorShownRef.current
    ) {
      return;
    }

    saveErrorShownRef.current =
      true;

    /*
     * "reason" únicamente existe en la rama
     * fallida del resultado.
     *
     * Esta comprobación explícita evita
     * problemas de narrowing de TypeScript.
     */
    if (
      "reason" in result &&
      result.reason ===
      "quota"
    ) {
      window.alert(
        "Chessktop no ha podido guardar los últimos cambios porque el almacenamiento del navegador está lleno.\n\n" +
        "La última versión guardada correctamente sigue intacta. Te recomendamos exportar una copia de seguridad.",
      );

      return;
    }

    window.alert(
      "Chessktop no ha podido guardar los últimos cambios.\n\n" +
      "La última versión guardada correctamente no se ha sobrescrito.",
    );
  }, [
    library,
    studyContents,
    selectedStudyId,
    trainings,
    trainingPerformances,
    persistenceBlocked,
  ]);

  /*
   * Aviso de recuperación si el estado
   * local estaba dañado al arrancar.
   */
  useEffect(() => {
    if (
      !initialState
        .persistenceBlocked ||
      persistenceWarningShown
    ) {
      return;
    }

    persistenceWarningShown =
      true;

    window.alert(
      "Chessktop no ha podido cargar los datos guardados porque parecen estar dañados.\n\n" +
      "Para protegerlos, Chessktop NO va a sobrescribir el almacenamiento actual.\n\n" +
      "Puedes restaurar una copia de seguridad válida desde la biblioteca.",
    );
  }, [
    initialState
      .persistenceBlocked,
  ]);

  useEffect(() => {
    return () => {
      if (
        toastTimeoutRef
          .current
      ) {
        window.clearTimeout(
          toastTimeoutRef
            .current,
        );
      }
    };
  }, []);

  function openTraining(
    trainingId: string,
  ) {
    const training =
      trainings[
      trainingId
      ];

    if (!training) {
      return;
    }

    const studyExists =
      library
        .studies
        .some(
          (
            study,
          ) =>
            study.id ===
            training
              .studyId,
        );

    if (
      !studyExists
    ) {
      return;
    }

    if (
      !studyContents[
      training.studyId
      ]
    ) {
      setStudyContents(
        (
          previousContents,
        ) => ({
          ...previousContents,

          [training.studyId]:
            createEmptyStudyContent(
              training.studyId,
            ),
        }),
      );
    }

    setWorkspace({
      type:
        "training",

      trainingId,
    });

    closeNote();
  }

  function handleTrainingSessionCompleted(
    session:
      TrainingSession,
  ) {
    setTrainingPerformances(
      (
        previousPerformances,
      ) => ({
        ...previousPerformances,

        [session.trainingId]:
          updateTrainingPerformance(
            previousPerformances[
            session.trainingId
            ],
            session,
          ),
      }),
    );
  }

  function handleRenameTraining(
    trainingId: string,
    name: string,
  ) {
    setTrainings(
      (
        previousTrainings,
      ) =>
        renameTraining(
          previousTrainings,
          trainingId,
          name,
        ),
    );

    showToast(
      "Entrenamiento renombrado.",
    );
  }

  function handleDeleteTraining(
    trainingId: string,
  ) {
    const training =
      trainings[
      trainingId
      ];

    setTrainingPerformances(
      (
        previousPerformances,
      ) => {
        if (
          !previousPerformances[
          trainingId
          ]
        ) {
          return (
            previousPerformances
          );
        }

        const nextPerformances = {
          ...previousPerformances,
        };

        delete nextPerformances[
          trainingId
        ];

        return nextPerformances;
      },
    );

    if (
      workspace?.type ===
      "training" &&
      workspace.trainingId ===
      trainingId
    ) {
      setWorkspace(
        training
          ? {
            type:
              "study",

            studyId:
              training
                .studyId,
          }
          : null,
      );
    }

    setTrainings(
      (
        previousTrainings,
      ) =>
        deleteTraining(
          previousTrainings,
          trainingId,
        ),
    );

    showToast(
      "Entrenamiento eliminado.",
    );
  }

  function handleCreateTraining(
    studyId: string,
    name: string,
    side:
      TrainingSide,
    mode:
      TrainingMode,
    order:
      TrainingOrder,
  ) {
    const training =
      createTraining({
        studyId,
        name,
        side,
        mode,
        order,
      });

    setTrainings(
      (
        previousTrainings,
      ) =>
        addTraining(
          previousTrainings,
          training,
        ),
    );

    showToast(
      "Entrenamiento creado correctamente.",
    );

    return training;
  }

  function handleLibraryChange(
    nextLibrary:
      LibraryState,
  ) {
    const validStudyIds =
      new Set(
        nextLibrary
          .studies
          .map(
            (
              study,
            ) =>
              study.id,
          ),
      );

    setLibrary(
      nextLibrary,
    );

    /*
     * Eliminamos contenidos pertenecientes
     * a estudios eliminados.
     */
    setStudyContents(
      (
        previousContents,
      ) => {
        const cleanedContents:
          StudyContentsMap =
          {};

        let contentsChanged =
          false;

        for (
          const [
            studyId,
            content,
          ]
          of Object.entries(
            previousContents,
          )
        ) {
          if (
            validStudyIds.has(
              studyId,
            )
          ) {
            cleanedContents[
              studyId
            ] =
              content;
          } else {
            contentsChanged =
              true;
          }
        }

        return contentsChanged
          ? cleanedContents
          : previousContents;
      },
    );

    /*
     * Si desaparece un estudio,
     * desaparecen sus entrenamientos.
     */
    setTrainings(
      (
        previousTrainings,
      ) => {
        const nextTrainings:
          TrainingsMap =
          {};

        let trainingsChanged =
          false;

        for (
          const [
            trainingId,
            training,
          ]
          of Object.entries(
            previousTrainings,
          )
        ) {
          if (
            validStudyIds.has(
              training.studyId,
            )
          ) {
            nextTrainings[
              trainingId
            ] =
              training;
          } else {
            trainingsChanged =
              true;
          }
        }

        return trainingsChanged
          ? nextTrainings
          : previousTrainings;
      },
    );

    const validTrainingIds =
      new Set(
        Object.values(
          trainings,
        )
          .filter(
            (
              training,
            ) =>
              validStudyIds.has(
                training
                  .studyId,
              ),
          )
          .map(
            (
              training,
            ) =>
              training.id,
          ),
      );

    setTrainingPerformances(
      (
        previousPerformances,
      ) => {
        const nextPerformances:
          TrainingPerformancesMap =
          {};

        let changed =
          false;

        for (
          const [
            trainingId,
            performance,
          ]
          of Object.entries(
            previousPerformances,
          )
        ) {
          if (
            validTrainingIds.has(
              trainingId,
            )
          ) {
            nextPerformances[
              trainingId
            ] =
              performance;
          } else {
            changed =
              true;
          }
        }

        return changed
          ? nextPerformances
          : previousPerformances;
      },
    );

    /*
     * Workspace de estudio eliminado.
     */
    if (
      workspace?.type ===
      "study" &&
      !validStudyIds.has(
        workspace.studyId,
      )
    ) {
      const fallbackStudyId =
        nextLibrary
          .studies[0]
          ?.id ??
        null;

      setWorkspace(
        fallbackStudyId
          ? {
            type:
              "study",

            studyId:
              fallbackStudyId,
          }
          : null,
      );

      closeNote();
    }

    /*
     * Workspace de entrenamiento cuyo
     * estudio ha desaparecido.
     */
    if (
      workspace?.type ===
      "training"
    ) {
      const currentTraining =
        trainings[
        workspace
          .trainingId
        ];

      if (
        !currentTraining ||
        !validStudyIds.has(
          currentTraining
            .studyId,
        )
      ) {
        const fallbackStudyId =
          nextLibrary
            .studies[0]
            ?.id ??
          null;

        setWorkspace(
          fallbackStudyId
            ? {
              type:
                "study",

              studyId:
                fallbackStudyId,
            }
            : null,
        );

        closeNote();
      }
    }
  }

  function showToast(
    message: string,
    duration = 2500,
  ) {
    setToastMessage(
      message,
    );

    setToastVisible(
      true,
    );

    if (
      toastTimeoutRef
        .current
    ) {
      window.clearTimeout(
        toastTimeoutRef
          .current,
      );
    }

    toastTimeoutRef.current =
      window.setTimeout(
        () => {
          setToastVisible(
            false,
          );

          toastTimeoutRef.current =
            null;
        },
        duration,
      );
  }

  async function handleImportLibrary(
    file: File,
  ) {
    /*
     * Primero leemos y validamos todo.
     *
     * Hasta que esto termina correctamente
     * no tocamos ningún estado.
     */
    let importedState:
      ChessktopStorage;

    try {
      importedState =
        await readLibraryBackup(
          file,
        );
    } catch (
    error
    ) {
      const message =
        error instanceof
          Error
          ? error.message
          : "No se pudo importar la biblioteca.";

      console.error(
        "Error al validar la biblioteca:",
        error,
      );

      window.alert(
        message,
      );

      return;
    }

    const confirmed =
      window.confirm(
        "La copia seleccionada es válida.\n\n" +
        "La biblioteca actual será reemplazada completamente.\n\n" +
        "Las carpetas, estudios, movimientos, notas, entrenamientos y estadísticas que no estén en la copia se perderán.\n\n" +
        "¿Deseas continuar?",
      );

    if (!confirmed) {
      return;
    }

    /*
     * El backup completo ya ha superado
     * la validación.
     */
    setLibrary(
      importedState.library,
    );

    setStudyContents(
      importedState.studyContents,
    );

    setTrainings(
      importedState.trainings,
    );

    setTrainingPerformances(
      importedState
        .trainingPerformances,
    );

    const importedStudyId =
      importedState
        .selectedStudyId;

    const importedStudyExists =
      importedStudyId !==
      null &&
      importedState
        .library
        .studies
        .some(
          (
            study,
          ) =>
            study.id ===
            importedStudyId,
        );

    setWorkspace(
      importedStudyExists &&
        importedStudyId
        ? {
          type:
            "study",

          studyId:
            importedStudyId,
        }
        : importedState
          .library
          .studies[0]
          ? {
            type:
              "study",

            studyId:
              importedState
                .library
                .studies[0]
                .id,
          }
          : null,
    );

    closeNote();

    /*
     * Una copia válida recupera Chessktop
     * del modo de protección.
     */
    setPersistenceBlocked(
      false,
    );

    saveErrorShownRef.current =
      false;

    showToast(
      "Biblioteca restaurada correctamente.",
      3500,
    );
  }

  async function handleImportPgn(
    file: File,
  ) {
    const suggestedName =
      getStudyNameFromPgnFile(
        file.name,
      );

    const requestedName =
      window.prompt(
        "Nombre del nuevo estudio:",
        suggestedName,
      );

    const studyName =
      requestedName
        ?.trim();

    if (!studyName) {
      return;
    }

    try {
      const pgnText =
        await file.text();

      const studyId =
        crypto.randomUUID();

      const {
        content,
      } =
        importPgnAsStudy(
          pgnText,
          studyId,
        );

      const newStudy = {
        id:
          studyId,

        name:
          studyName,

        folderId:
          null,
      };

      setLibrary(
        (
          previousLibrary,
        ) => ({
          ...previousLibrary,

          studies: [
            ...previousLibrary
              .studies,

            newStudy,
          ],
        }),
      );

      setStudyContents(
        (
          previousContents,
        ) => ({
          ...previousContents,

          [studyId]:
            content,
        }),
      );

      setWorkspace({
        type:
          "study",

        studyId,
      });

      closeNote();

      showToast(
        `PGN importado como "${studyName}".`,
        3500,
      );
    } catch (
    error
    ) {
      const message =
        error instanceof
          Error
          ? error.message
          : "No se pudo importar el PGN.";

      console.error(
        "Error al importar PGN:",
        error,
      );

      window.alert(
        `No se pudo importar el PGN.\n\n${message}`,
      );
    }
  }

  function handleExportLibrary() {
    if (
      persistenceBlocked
    ) {
      window.alert(
        "Chessktop está en modo de protección porque los datos locales no se pudieron cargar.\n\n" +
        "Restaura primero una copia de seguridad válida antes de exportar.",
      );

      return;
    }

    try {
      exportLibrary({
        version: 1,

        library,

        studyContents,

        selectedStudyId,

        trainings,

        trainingPerformances,
      });

      showToast(
        "Copia de seguridad exportada.",
      );
    } catch (
    error
    ) {
      console.error(
        "No se pudo exportar la biblioteca:",
        error,
      );

      window.alert(
        error instanceof
          Error
          ? error.message
          : "No se pudo exportar la biblioteca.",
      );
    }
  }

  function selectStudy(
    nextStudyId:
      string | null,
  ) {
    if (
      !nextStudyId
    ) {
      setWorkspace(
        null,
      );

      closeNote();

      return;
    }

    const studyExists =
      library
        .studies
        .some(
          (
            study,
          ) =>
            study.id ===
            nextStudyId,
        );

    if (
      !studyExists
    ) {
      return;
    }

    if (
      !studyContents[
      nextStudyId
      ]
    ) {
      setStudyContents(
        (
          previousContents,
        ) => ({
          ...previousContents,

          [nextStudyId]:
            createEmptyStudyContent(
              nextStudyId,
            ),
        }),
      );
    }

    setWorkspace({
      type:
        "study",

      studyId:
        nextStudyId,
    });

    closeNote();
  }

  function updateActiveStudy(
    updater: (
      content:
        StudyContent,
    ) => StudyContent,
  ) {
    if (
      !selectedStudyId
    ) {
      return;
    }

    setStudyContents(
      (
        previousContents,
      ) => {
        const currentContent =
          previousContents[
          selectedStudyId
          ] ??
          createEmptyStudyContent(
            selectedStudyId,
          );

        return {
          ...previousContents,

          [selectedStudyId]: {
            ...updater(
              currentContent,
            ),

            studyId:
              selectedStudyId,

            updatedAt:
              new Date()
                .toISOString(),
          },
        };
      },
    );
  }

  function setActiveNodeId(
    nodeId: string,
  ) {
    updateActiveStudy(
      (
        content,
      ) => ({
        ...content,

        currentNodeId:
          nodeId,
      }),
    );
  }

  function openNote(
    nodeId: string,
  ) {
    const node =
      nodes[
      nodeId
      ];

    if (!node) {
      return;
    }

    setNoteNodeId(
      nodeId,
    );

    setNoteDraft(
      node.note,
    );
  }

  function closeNote() {
    setNoteNodeId(
      null,
    );

    setNoteDraft(
      "",
    );
  }

  function saveNote() {
    if (
      !noteNodeId ||
      !nodes[
      noteNodeId
      ]
    ) {
      return;
    }

    updateActiveStudy(
      (
        content,
      ) => ({
        ...content,

        nodes: {
          ...content.nodes,

          [noteNodeId]: {
            ...content
              .nodes[
            noteNodeId
            ],

            note:
              noteDraft
                .trim(),
          },
        },
      }),
    );

    closeNote();
  }

  function deleteNote() {
    if (
      !noteNodeId ||
      !nodes[
      noteNodeId
      ]
    ) {
      return;
    }

    updateActiveStudy(
      (
        content,
      ) => ({
        ...content,

        nodes: {
          ...content.nodes,

          [noteNodeId]: {
            ...content
              .nodes[
            noteNodeId
            ],

            note: "",
          },
        },
      }),
    );

    closeNote();
  }

  function makeMove(
    sourceSquare:
      string,
    targetSquare:
      string,
  ): boolean {
    if (
      !selectedStudyId
    ) {
      return false;
    }

    const nodeAtCurrentPosition =
      nodes[
      currentNodeId
      ];

    if (
      !nodeAtCurrentPosition
    ) {
      return false;
    }

    const gameCopy =
      new Chess(
        nodeAtCurrentPosition
          .fen,
      );

    try {
      const move =
        gameCopy.move({
          from:
            sourceSquare as
            Square,

          to:
            targetSquare as
            Square,

          promotion:
            "q",
        });

      const existingChildId =
        nodeAtCurrentPosition
          .children
          .find(
            (
              childId,
            ) => {
              const child =
                nodes[
                childId
                ];

              if (
                !child
              ) {
                return false;
              }

              return (
                child.from ===
                move.from &&
                child.to ===
                move.to &&
                child.promotion ===
                move.promotion
              );
            },
          );

      if (
        existingChildId
      ) {
        setActiveNodeId(
          existingChildId,
        );

        return true;
      }

      const newNodeId =
        crypto.randomUUID();

      const newNode:
        MoveNode = {
        id:
          newNodeId,

        parentId:
          currentNodeId,

        san:
          move.san,

        from:
          move.from,

        to:
          move.to,

        promotion:
          move.promotion,

        fen:
          gameCopy.fen(),

        ply:
          nodeAtCurrentPosition
            .ply +
          1,

        children: [],

        note: "",
      };

      updateActiveStudy(
        (
          content,
        ) => ({
          ...content,

          nodes: {
            ...content.nodes,

            [currentNodeId]: {
              ...content
                .nodes[
              currentNodeId
              ],

              children: [
                ...content
                  .nodes[
                  currentNodeId
                ]
                  .children,

                newNodeId,
              ],
            },

            [newNodeId]:
              newNode,
          },

          currentNodeId:
            newNodeId,
        }),
      );

      return true;
    } catch {
      return false;
    }
  }

  function goToMove(
    nodeId: string,
  ) {
    if (
      nodes[
      nodeId
      ]
    ) {
      setActiveNodeId(
        nodeId,
      );
    }
  }

  function goToStart() {
    setActiveNodeId(
      "root",
    );
  }

  function goToPreviousMove() {
    const parentId =
      nodes[
        currentNodeId
      ]?.parentId;

    if (
      parentId !==
      null &&
      parentId !==
      undefined
    ) {
      setActiveNodeId(
        parentId,
      );
    }
  }

  function goToNextMove() {
    const firstChildId =
      nodes[
        currentNodeId
      ]?.children[0];

    if (
      firstChildId
    ) {
      setActiveNodeId(
        firstChildId,
      );
    }
  }

  function deleteCurrentBranch() {
    if (
      currentNodeId ===
      "root"
    ) {
      return;
    }

    const nodeToDelete =
      nodes[
      currentNodeId
      ];

    const parentId =
      nodeToDelete
        ?.parentId;

    if (!parentId) {
      return;
    }

    const subtreeIds =
      getSubtreeNodeIds(
        nodes,
        currentNodeId,
      );

    updateActiveStudy(
      (
        content,
      ) => {
        const updatedNodes = {
          ...content.nodes,
        };

        for (
          const nodeId
          of subtreeIds
        ) {
          delete updatedNodes[
            nodeId
          ];
        }

        const parent =
          updatedNodes[
          parentId
          ];

        if (!parent) {
          return content;
        }

        updatedNodes[
          parentId
        ] = {
          ...parent,

          children:
            parent
              .children
              .filter(
                (
                  childId,
                ) =>
                  childId !==
                  currentNodeId,
              ),
        };

        return {
          ...content,

          nodes:
            updatedNodes,

          currentNodeId:
            parentId,
        };
      },
    );

    closeNote();
  }

  function resetGame() {
    if (
      !selectedStudyId
    ) {
      return;
    }

    updateActiveStudy(
      (
        content,
      ) => ({
        ...content,

        nodes:
          createInitialNodes(),

        currentNodeId:
          "root",
      }),
    );

    closeNote();
  }

  function handleExportPgn() {
    if (
      !selectedStudy ||
      !pgn
    ) {
      return;
    }

    const blob =
      new Blob(
        [
          pgn,
        ],
        {
          type:
            "application/x-chess-pgn;charset=utf-8",
        },
      );

    const url =
      URL.createObjectURL(
        blob,
      );

    const link =
      document.createElement(
        "a",
      );

    const safeStudyName =
      selectedStudy
        .name
        .trim()
        .replace(
          /[<>:"/\\|?*]+/g,
          "-",
        )
        .replace(
          /\s+/g,
          " ",
        );

    link.href =
      url;

    link.download =
      `${safeStudyName || "chessktop-study"}.pgn`;

    document.body.appendChild(
      link,
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(
      url,
    );

    showToast(
      "PGN exportado correctamente.",
    );
  }

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <h1>
            Chessktop
          </h1>

          <p>
            {selectedStudy
              ? selectedStudy
                .name
              : "Selecciona un estudio"}
          </p>
        </div>
      </header>

      <section className="workspace">
        <LibrarySidebar
          library={
            library
          }
          trainings={
            trainings
          }
          trainingPerformances={
            trainingPerformances
          }
          selectedStudyId={
            selectedStudyId
          }
          onLibraryChange={
            handleLibraryChange
          }
          onStudySelect={
            selectStudy
          }
          onExportLibrary={
            handleExportLibrary
          }
          onImportLibrary={
            handleImportLibrary
          }
          onCreateTraining={
            handleCreateTraining
          }
          onOpenTraining={
            openTraining
          }
          onRenameTraining={
            handleRenameTraining
          }
          onDeleteTraining={
            handleDeleteTraining
          }
          onImportPgn={
            handleImportPgn
          }
          onExportPgn={
            handleExportPgn
          }
        />

        {workspace?.type ===
          "training" &&
          selectedTraining &&
          trainingStudy &&
          studyContents[
          selectedTraining
            .studyId
          ] ? (
          <TrainingWorkspace
            key={
              selectedTraining
                .id
            }
            training={
              selectedTraining
            }
            studyName={
              trainingStudy
                .name
            }
            onClose={() =>
              setWorkspace({
                type:
                  "study",

                studyId:
                  selectedTraining
                    .studyId,
              })
            }
            studyContent={
              studyContents[
              selectedTraining
                .studyId
              ]
            }
            onAddNote={
              openNote
            }
            onSessionCompleted={
              handleTrainingSessionCompleted
            }
          />
        ) : (
          <>
            <div className="board-section">
              <div className="board-section">
                <StockfishPanel
                  fen={
                    position
                  }
                  hasActiveStudy={
                    selectedStudyId !==
                    null
                  }
                />

                {/* controles */}
              </div>

              <div className="board-container">
                <Chessboard
                  options={{
                    position,

                    onPieceDrop: ({
                      sourceSquare,
                      targetSquare,
                    }) => {
                      if (
                        !selectedStudyId ||
                        !targetSquare
                      ) {
                        showToast(
                          "Selecciona o crea un estudio para utilizar el tablero.",
                          3000,
                        );

                        return false;
                      }

                      return makeMove(
                        sourceSquare,
                        targetSquare,
                      );
                    },

                    boardStyle: {
                      borderRadius:
                        "8px",

                      boxShadow:
                        "0 8px 24px rgba(0, 0, 0, 0.16)",
                    },

                    lightSquareStyle: {
                      backgroundColor:
                        "#e8e1d1",
                    },

                    darkSquareStyle: {
                      backgroundColor:
                        "#77906f",
                    },
                  }}
                />
              </div>

              <div className="board-controls">
                <button
                  type="button"
                  onClick={
                    goToStart
                  }
                  disabled={
                    currentNodeId ===
                    "root"
                  }
                >
                  Inicio
                </button>

                <button
                  type="button"
                  onClick={
                    goToPreviousMove
                  }
                  disabled={
                    currentNodeId ===
                    "root"
                  }
                >
                  Anterior
                </button>

                <button
                  type="button"
                  onClick={
                    goToNextMove
                  }
                  disabled={
                    nodes[
                      currentNodeId
                    ]?.children
                      .length ===
                    0
                  }
                >
                  Siguiente
                </button>

                <button
                  type="button"
                  onClick={
                    deleteCurrentBranch
                  }
                  disabled={
                    currentNodeId ===
                    "root"
                  }
                >
                  Borrar rama
                </button>

                <button
                  type="button"
                  onClick={
                    resetGame
                  }
                  disabled={
                    nodes.root
                      .children
                      .length ===
                    0
                  }
                >
                  Reiniciar
                </button>
              </div>
            </div>

            <aside className="moves-panel">
              <h2>
                Movimientos
              </h2>

              <div className="moves-table-header">
                <span>
                  N.º
                </span>

                <span>
                  Blancas
                </span>

                <span>
                  Negras
                </span>

                <span aria-label="Notas" />
              </div>

              {moveRows.length ===
                0 ? (
                <p className="empty-message">
                  Todavía no hay movimientos.
                </p>
              ) : (
                <div className="moves-table">
                  {moveRows.map(
                    (
                      row,
                    ) => (
                      <div
                        className="move-group"
                        key={
                          row.moveNumber
                        }
                      >
                        <div className="move-row">
                          <span className="move-number">
                            {
                              row.moveNumber
                            }
                            .
                          </span>

                          {row.whiteMove ? (
                            <button
                              type="button"
                              className={`move-button ${currentNodeId ===
                                row
                                  .whiteMove
                                  .id
                                ? "active"
                                : ""
                                }`}
                              onClick={() =>
                                goToMove(
                                  row
                                    .whiteMove!
                                    .id,
                                )
                              }
                            >
                              {
                                row
                                  .whiteMove
                                  .san
                              }
                            </button>
                          ) : (
                            <span />
                          )}

                          {row.blackMove ? (
                            <button
                              type="button"
                              className={`move-button ${currentNodeId ===
                                row
                                  .blackMove
                                  .id
                                ? "active"
                                : ""
                                }`}
                              onClick={() =>
                                goToMove(
                                  row
                                    .blackMove!
                                    .id,
                                )
                              }
                            >
                              {
                                row
                                  .blackMove
                                  .san
                              }
                            </button>
                          ) : (
                            <span className="empty-black-move" />
                          )}

                          <NoteButton
                            node={
                              row.blackMove ??
                              row.whiteMove
                            }
                            onClick={
                              openNote
                            }
                          />
                        </div>

                        {row
                          .whiteMove
                          ?.children
                          .slice(1)
                          .map(
                            (
                              variationId,
                            ) => (
                              <VariationLine
                                key={
                                  variationId
                                }
                                firstNodeId={
                                  variationId
                                }
                                nodes={
                                  nodes
                                }
                                currentNodeId={
                                  currentNodeId
                                }
                                onMoveClick={
                                  goToMove
                                }
                                onNoteClick={
                                  openNote
                                }
                              />
                            ),
                          )}

                        {row
                          .blackMove
                          ?.children
                          .slice(1)
                          .map(
                            (
                              variationId,
                            ) => (
                              <VariationLine
                                key={
                                  variationId
                                }
                                firstNodeId={
                                  variationId
                                }
                                nodes={
                                  nodes
                                }
                                currentNodeId={
                                  currentNodeId
                                }
                                onMoveClick={
                                  goToMove
                                }
                                onNoteClick={
                                  openNote
                                }
                              />
                            ),
                          )}
                      </div>
                    ),
                  )}
                </div>
              )}

              <div className="position-information">
                <h3>
                  Posición actual
                </h3>

                <p>
                  Turno:{" "}
                  <strong>
                    {game.turn() ===
                      "w"
                      ? "Blancas"
                      : "Negras"}
                  </strong>
                </p>

                <p>
                  Jugada seleccionada:{" "}
                  <strong>
                    {currentNodeId ===
                      "root"
                      ? "Posición inicial"
                      : `${Math.ceil(
                        currentNode
                          .ply /
                        2,
                      )}${currentNode
                        .ply %
                        2 ===
                        1
                        ? "."
                        : "..."
                      } ${currentNode.san}`}
                  </strong>
                </p>
              </div>
            </aside>
          </>
        )}
      </section>

      {noteNodeId &&
        nodes[
        noteNodeId
        ] && (
          <div
            className="note-overlay"
            onMouseDown={(
              event,
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
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
                      nodes[
                        noteNodeId
                      ].ply /
                      2,
                    )}

                    {nodes[
                      noteNodeId
                    ].ply %
                      2 ===
                      1
                      ? "."
                      : "..."}{" "}

                    {
                      nodes[
                        noteNodeId
                      ].san
                    }
                  </h2>
                </div>

                <button
                  type="button"
                  className="note-close-button"
                  onClick={
                    closeNote
                  }
                  aria-label="Cerrar nota"
                >
                  ×
                </button>
              </header>

              <textarea
                className="note-textarea"
                value={
                  noteDraft
                }
                onChange={(
                  event,
                ) =>
                  setNoteDraft(
                    event.target
                      .value,
                  )
                }
                placeholder="Escribe aquí tus ideas, planes, errores frecuentes o recordatorios..."
                autoFocus
              />

              <footer className="note-dialog-actions">
                {nodes[
                  noteNodeId
                ].note && (
                    <button
                      type="button"
                      className="note-delete-button"
                      onClick={
                        deleteNote
                      }
                    >
                      Borrar nota
                    </button>
                  )}

                <div className="note-main-actions">
                  <button
                    type="button"
                    className="note-cancel-button"
                    onClick={
                      closeNote
                    }
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className="note-save-button"
                    onClick={
                      saveNote
                    }
                  >
                    Guardar
                  </button>
                </div>
              </footer>
            </section>
          </div>
        )}

      <Toast
        message={
          toastMessage
        }
        visible={
          toastVisible
        }
      />
    </main>
  );
}

export default App;