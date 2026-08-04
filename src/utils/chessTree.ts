import { Chess } from "chess.js";
import type {
  MoveNode,
  MoveRow,
  NodesMap,
  StudyContent,
} from "../types";

export function createInitialNodes(): NodesMap {
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

export function createEmptyStudyContent(
  studyId: string,
): StudyContent {
  return {
    studyId,
    nodes: createInitialNodes(),
    currentNodeId: "root",
    updatedAt: new Date().toISOString(),
  };
}

export function getLineFromNode(
  nodes: NodesMap,
  firstNodeId: string,
): MoveNode[] {
  const line: MoveNode[] = [];

  let currentNodeId: string | undefined = firstNodeId;

  while (currentNodeId !== undefined) {
    const currentMoveNode: MoveNode | undefined = nodes[currentNodeId];

    if (currentMoveNode === undefined) {
      break;
    }

    line.push(currentMoveNode);

    currentNodeId = currentMoveNode.children.length > 0
      ? currentMoveNode.children[0]
      : undefined;
  }

  return line;
}

export function getMainLine(nodes: NodesMap): MoveNode[] {
  const firstMoveId = nodes.root.children[0];

  if (!firstMoveId) {
    return [];
  }

  return getLineFromNode(nodes, firstMoveId);
}

export function buildMoveRows(mainLine: MoveNode[]): MoveRow[] {
  return Array.from({ length: Math.ceil(mainLine.length / 2) }, (_, rowIndex) => {
    const whiteMove = mainLine[rowIndex * 2];
    const blackMove = mainLine[rowIndex * 2 + 1];

    return {
      moveNumber: rowIndex + 1,
      whiteMove,
      blackMove,
    };
  });
}

export function getMovePrefix(
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

export function formatMoveLabel(node: MoveNode | null | undefined): string {
  if (!node) {
    return "";
  }

  const prefix = `${Math.ceil(node.ply / 2)}${node.ply % 2 === 1 ? "." : "..."}`;

  return `${prefix} ${node.san ?? ""}`.trim();
}

export function createPgn(nodes: NodesMap): string {
  function serializePosition(
    positionNodeId: string,
    isVariationStart: boolean,
  ): string {
    const positionNode = nodes[positionNodeId];

    if (!positionNode || positionNode.children.length === 0) {
      return "";
    }

    const [mainMoveId, ...variationIds] = positionNode.children;
    const mainMove = nodes[mainMoveId];

    if (!mainMove || !mainMove.san) {
      return "";
    }

    const prefix = getMovePrefix(mainMove, isVariationStart);

    let result = prefix ? `${prefix} ${mainMove.san}` : mainMove.san;

    for (const variationId of variationIds) {
      const variation = serializeAlternative(variationId);

      if (variation) {
        result += ` (${variation})`;
      }
    }

    const continuation = serializePosition(mainMove.id, false);

    if (continuation) {
      result += ` ${continuation}`;
    }

    return result;
  }

  function serializeAlternative(firstNodeId: string): string {
    const firstNode = nodes[firstNodeId];

    if (!firstNode || !firstNode.san) {
      return "";
    }

    const prefix = getMovePrefix(firstNode, true);

    let result = prefix ? `${prefix} ${firstNode.san}` : firstNode.san;

    const continuation = serializePosition(firstNode.id, false);

    if (continuation) {
      result += ` ${continuation}`;
    }

    return result;
  }

  const moves = serializePosition("root", false);

  return moves ? `${moves} *` : "";
}

export function getSubtreeNodeIds(nodes: NodesMap, nodeId: string): string[] {
  const node = nodes[nodeId];

  if (!node) {
    return [];
  }

  return [
    nodeId,
    ...node.children.flatMap((childId) => getSubtreeNodeIds(nodes, childId)),
  ];
}
