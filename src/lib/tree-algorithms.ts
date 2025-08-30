import { NodeT, SwitchSteps } from './types';

/**
 * Get the path from root to a specific node
 */
export function pathToRoot(
  id: string,
  nodesById: Record<string, NodeT>
): string[] {
  const path: string[] = [];
  let current: string | null = id;

  while (current) {
    path.push(current);
    current = nodesById[current]?.parentId ?? null;
  }

  return path.reverse(); // root -> target
}

/**
 * Find the index of the lowest common ancestor in two paths
 */
export function findLcaIndex(pathA: string[], pathB: string[]): number {
  const minLength = Math.min(pathA.length, pathB.length);
  let i = 0;

  while (i < minLength && pathA[i] === pathB[i]) {
    i++;
  }

  return i - 1; // Last common index
}

/**
 * Compute the steps needed to switch from current node to target node
 */
export function computeSwitchSteps(
  currentId: string,
  targetId: string,
  nodesById: Record<string, NodeT>
): SwitchSteps {
  const currentPath = pathToRoot(currentId, nodesById);
  const targetPath = pathToRoot(targetId, nodesById);
  const lcaIndex = findLcaIndex(currentPath, targetPath);

  return {
    lca: currentPath[lcaIndex],
    up: currentPath.slice(lcaIndex + 1).reverse(), // current -> ... -> LCA
    down: targetPath.slice(lcaIndex + 1), // LCA -> ... -> target
  };
}

/**
 * Build children mapping from nodes array
 */
export function buildChildrenMap(nodes: NodeT[]): Record<string, string[]> {
  const childrenById: Record<string, string[]> = {};

  nodes.forEach(node => {
    if (node.parentId) {
      if (!childrenById[node.parentId]) {
        childrenById[node.parentId] = [];
      }
      childrenById[node.parentId].push(node.id);
    }
  });

  return childrenById;
}

/**
 * Build nodes mapping by ID
 */
export function buildNodesMap(nodes: NodeT[]): Record<string, NodeT> {
  const nodesById: Record<string, NodeT> = {};

  nodes.forEach(node => {
    nodesById[node.id] = node;
  });

  return nodesById;
}

/**
 * Find the root node of a conversation
 */
export function findRootNode(nodes: NodeT[]): NodeT | null {
  return nodes.find(node => node.parentId === null) || null;
}

/**
 * Get all nodes in the active path from root to current node
 */
export function getActivePath(
  currentNodeId: string,
  nodesById: Record<string, NodeT>
): NodeT[] {
  const path = pathToRoot(currentNodeId, nodesById);
  return path.map(id => nodesById[id]).filter(Boolean);
}
