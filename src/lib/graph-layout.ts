import { hierarchy, tree } from 'd3-hierarchy';

import { TreeLink, TreeNode } from './types';

export interface GraphNode {
  id: string;
  children?: GraphNode[];
}

/**
 * Build a hierarchical tree structure from root and children mapping
 */
export function buildTree(
  rootId: string,
  childrenById: Record<string, string[]>
): GraphNode {
  const buildNode = (id: string): GraphNode => ({
    id,
    children: (childrenById[id] || []).map(buildNode),
  });

  return buildNode(rootId);
}

/**
 * Layout tree nodes using D3 hierarchy
 */
export function layoutTree(
  rootId: string,
  childrenById: Record<string, string[]>
): { nodes: TreeNode[]; links: TreeLink[] } {
  const treeData = buildTree(rootId, childrenById);
  const root = hierarchy(treeData);

  // Configure tree layout
  const treeLayout = tree<GraphNode>()
    .nodeSize([140, 80]) // [width, height] spacing between nodes
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.2));

  treeLayout(root);

  // Extract nodes with coordinates
  const nodes: TreeNode[] = root.descendants().map((d) => ({
    id: d.data.id,
    x: d.x || 0,
    y: d.y || 0,
  }));

  // Extract links between nodes
  const links: TreeLink[] = root.links().map((l) => ({
    source: {
      id: l.source.data.id,
      x: l.source.x || 0,
      y: l.source.y || 0,
    },
    target: {
      id: l.target.data.id,
      x: l.target.x || 0,
      y: l.target.y || 0,
    },
  }));

  return { nodes, links };
}
