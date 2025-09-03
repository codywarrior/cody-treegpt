'use client';

import { useMemo } from 'react';
import { NodeT, TreeLink, GraphNode } from '@/lib/types';
import { convertNodesToChatNodes, getChatActivePath } from '@/lib/chat-utils';

interface UseGraphLayoutProps {
  nodes: NodeT[];
  activeNodeId: string | null;
}

export function useGraphLayout({ nodes, activeNodeId }: UseGraphLayoutProps) {
  // Memoized chat nodes conversion - O(n) complexity
  const chatNodes = useMemo(() => convertNodesToChatNodes(nodes), [nodes]);

  // Build tree structure from chat nodes - O(n) complexity
  const treeData = useMemo(() => {
    if (chatNodes.length === 0) return { nodes: [], links: [] };

    const activePathIds = getChatActivePath(chatNodes, activeNodeId);
    const activePathSet = new Set(activePathIds);

    // Create graph nodes from chat nodes
    const graphNodes: GraphNode[] = chatNodes.map(chatNode => ({
      id: chatNode.id,
      x: 0,
      y: 0,
      level: 0,
      children: [],
      chatNode: chatNode,
      isActive: activePathSet.has(chatNode.id),
      userText: chatNode.query || '',
      assistantText: chatNode.response || '',
    }));

    // Build parent-child relationships
    const nodeMap = new Map(graphNodes.map(node => [node.id, node]));
    const links: TreeLink[] = [];

    graphNodes.forEach(node => {
      if (node.chatNode.parentId) {
        const parent = nodeMap.get(node.chatNode.parentId);
        if (parent) {
          parent.children.push(node);
          links.push({
            source: parent.id,
            target: node.id,
          });
        }
      }
    });

    // Layout nodes in tree structure with improved sibling positioning
    const rootNodes = graphNodes.filter(node => !node.chatNode.parentId);
    if (rootNodes.length > 0) {
      // Calculate subtree width to prevent overlaps
      const calculateSubtreeWidth = (node: GraphNode): number => {
        if (node.children.length === 0) {
          return 220; // Base width for leaf nodes (slightly larger than node width)
        }

        const childWidths = node.children.map(child =>
          calculateSubtreeWidth(child)
        );
        const totalChildWidth = childWidths.reduce(
          (sum, width) => sum + width,
          0
        );
        const minSpacing = 50; // Minimum spacing between sibling subtrees
        const spacingWidth = Math.max(0, node.children.length - 1) * minSpacing;

        return Math.max(220, totalChildWidth + spacingWidth);
      };

      const layoutNode = (
        node: GraphNode,
        x: number,
        y: number,
        level: number
      ) => {
        node.x = x;
        node.y = y;
        node.level = level;

        if (node.children.length > 0) {
          // Calculate positions for children to prevent overlaps
          const childWidths = node.children.map(child =>
            calculateSubtreeWidth(child)
          );
          const minSpacing = 50; // Minimum gap between sibling subtrees

          // Calculate total width needed for all children
          const totalChildWidth = childWidths.reduce(
            (sum, width) => sum + width,
            0
          );
          const totalSpacingWidth =
            Math.max(0, node.children.length - 1) * minSpacing;
          const totalWidth = totalChildWidth + totalSpacingWidth;

          // Start position for first child
          let currentX = x - totalWidth / 2;

          // Vertical spacing increases with level and number of children
          const baseVerticalSpacing = 180;
          const levelSpacing = level * 15;
          const childCountSpacing = Math.min(node.children.length * 5, 30);
          const verticalSpacing =
            baseVerticalSpacing + levelSpacing + childCountSpacing;

          node.children.forEach((child, index) => {
            const childWidth = childWidths[index];
            const childCenterX = currentX + childWidth / 2;
            layoutNode(child, childCenterX, y + verticalSpacing, level + 1);
            currentX += childWidth + minSpacing;
          });
        }
      };

      // Layout from root nodes
      rootNodes.forEach((rootNode, index) => {
        const rootX = index * 300;
        layoutNode(rootNode, rootX, 50, 0);
      });
    }

    return { nodes: graphNodes, links };
  }, [chatNodes, activeNodeId]);

  return { treeData, chatNodes };
}
