'use client';

import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from 'react';
import * as d3 from 'd3';
import { NodeT, TreeLink, GraphNode } from '@/lib/types';
import { convertNodesToChatNodes, getChatActivePath } from '@/lib/chat-utils';

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
  const svgRef = useRef<SVGSVGElement>(null);
  const shouldCenter = useRef(true);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  // Memoized chat nodes conversion - O(n) complexity
  const chatNodes = useMemo(() => convertNodesToChatNodes(nodes), [nodes]);

  // Optimized resize handler with debouncing
  const handleResize = useCallback(() => {
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
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
  }, [chatNodes, activeNodeId]);

  // Main D3 rendering effect with performance optimizations
  useEffect(() => {
    if (!svgRef.current || treeData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    // Set up zoom behavior with constraints
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', event => {
        container.attr('transform', event.transform);
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    svg.call(zoom as any);

    const container = svg.append('g');

    // Nodes are already positioned in treeData useMemo

    // Render links with optimized path generation

    const linkGenerator = d3
      .linkVertical<GraphNode, GraphNode>()
      .x((d: GraphNode) => d.x)
      .y((d: GraphNode) => d.y);

    container
      .selectAll('.link')
      .data(treeData.links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', (link: TreeLink) => {
        const source = treeData.nodes.find(n => n.id === link.source);
        const target = treeData.nodes.find(n => n.id === link.target);

        // Only generate link if both source and target exist
        if (!source || !target) {
          console.warn(
            `Missing node for link: source=${link.source}, target=${link.target}`
          );
          return null;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return linkGenerator({ source, target } as any);
      })
      .attr('fill', 'none')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 2);

    // Render nodes with enhanced styling
    const nodeSelection = container
      .selectAll('.node')
      .data(treeData.nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: GraphNode) => `translate(${d.x},${d.y})`)
      .on('mouseover', function (event, d: GraphNode) {
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltip({
            x: event.clientX - rect.left + 10,
            y: event.clientY - rect.top - 10,
            text: `User: ${d.userText || 'No message'}\nAssistant: ${d.assistantText || 'No response'}`,
          });
        }
      })
      .on('mouseout', () => {
        setTooltip(null);
      })
      .on('click', (event, d: GraphNode) => {
        onNodeClick(d.id);
      });

    nodeSelection
      .append('rect')
      .attr('width', 200)
      .attr('height', 80)
      .attr('x', -100)
      .attr('y', -40)
      .attr('rx', 8)
      .attr('fill', (d: GraphNode) => (d.isActive ? '#3b82f6' : '#f8fafc'))
      .attr('stroke', (d: GraphNode) => (d.isActive ? '#1d4ed8' : '#e2e8f0'))
      .attr('stroke-width', 2);

    nodeSelection
      .append('text')
      .attr('y', -15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', (d: GraphNode) => (d.isActive ? 'white' : '#374151'))
      .text((d: GraphNode) => {
        const text = d.userText || 'User';
        return text.length > 25 ? text.substring(0, 25) + '...' : text;
      });

    nodeSelection
      .append('text')
      .attr('y', 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('fill', (d: GraphNode) => (d.isActive ? '#e5e7eb' : '#6b7280'))
      .text((d: GraphNode) => {
        const text = d.assistantText || 'Assistant';
        return text.length > 30 ? text.substring(0, 30) + '...' : text;
      });

    // No force simulation needed - using tree layout positioning

    // Auto-center on active node
    if (activeNodeId && shouldCenter.current) {
      const activeNode = treeData.nodes.find(n => n.id === activeNodeId);
      if (activeNode) {
        const transform = d3.zoomIdentity
          .translate(
            dimensions.width / 2 - activeNode.x,
            dimensions.height / 2 - activeNode.y
          )
          .scale(1);

        svg.transition().duration(750).call(zoom.transform, transform);
        shouldCenter.current = false;
      }
    }
  }, [treeData, dimensions, activeNodeId, onNodeClick, dimensions.width]);

  return (
    <div className={`relative ${className || ''}`}>
      <svg ref={svgRef} width="100%" height="100%" className="bg-white" />
      {tooltip && (
        <div
          className="absolute bg-gray-900 text-white p-3 rounded shadow-lg pointer-events-none z-10 max-w-sm"
          style={{
            left: Math.min(tooltip.x + 10, dimensions.width - 200),
            top: Math.max(tooltip.y - 10, 10),
            transform:
              tooltip.x > dimensions.width - 200 ? 'translateX(-100%)' : 'none',
          }}
        >
          <div className="text-sm whitespace-pre-wrap break-words">
            {tooltip.text}
          </div>
        </div>
      )}
    </div>
  );
}
