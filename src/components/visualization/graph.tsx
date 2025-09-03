'use client';

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { NodeT } from '@/lib/types';
import { convertNodesToChatNodes, getChatActivePath } from '@/lib/chat-utils';
import { GraphSvg } from './graph-svg';
import { GraphTooltip } from './graph-tooltip';
import { GraphNode, TreeLink } from '@/lib/types';

interface GraphProps {
  nodes: NodeT[];
  activeNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
  className?: string;
}

export default function Graph({
  nodes,
  activeNodeId,
  onNodeClick,
  className,
}: GraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldCenter = useRef(true);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  // Memoized chat nodes conversion - O(n) complexity
  const chatNodes = useMemo(() => convertNodesToChatNodes(nodes), [nodes]);

  const handleResize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

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

            // Move to next child position
            currentX += childWidth + minSpacing;
          });
        }
      };

      layoutNode(rootNodes[0], dimensions.width / 2, 100, 0);
    }

    return { nodes: graphNodes, links };
  }, [chatNodes, activeNodeId, dimensions.width]);

  const handleTooltipShow = useCallback(
    (x: number, y: number, text: string) => {
      setTooltip({ x, y, text });
    },
    []
  );

  const handleTooltipHide = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleCenterComplete = useCallback(() => {
    shouldCenter.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${className || ''}`}
    >
      <GraphSvg
        nodes={treeData.nodes}
        links={treeData.links}
        dimensions={dimensions}
        activeNodeId={activeNodeId}
        onNodeClick={onNodeClick}
        onTooltipShow={handleTooltipShow}
        onTooltipHide={handleTooltipHide}
        shouldCenter={shouldCenter.current}
        onCenterComplete={handleCenterComplete}
      />

      {tooltip && (
        <GraphTooltip x={tooltip.x} y={tooltip.y} text={tooltip.text} />
      )}
    </div>
  );
}
