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
      .attr('stroke', (link: TreeLink) => {
        const isDark = document.documentElement.classList.contains('dark');
        return isDark ? '#6b7280' : '#9ca3af'; // gray-500 : gray-400
      })
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
      .attr('ry', 8)
      .attr('fill', (d: GraphNode) => {
        const isActive = activeNodeId === d.id;
        const isDark = document.documentElement.classList.contains('dark');
        if (isActive) {
          return isDark ? '#3b82f6' : '#3b82f6'; // blue-500
        }
        return isDark ? '#374151' : '#f8fafc'; // gray-700 : slate-50
      })
      .attr('stroke', (d: GraphNode) => {
        const isActive = activeNodeId === d.id;
        const isDark = document.documentElement.classList.contains('dark');
        if (isActive) {
          return isDark ? '#1d4ed8' : '#1e40af'; // blue-700 : blue-800
        }
        return isDark ? '#4b5563' : '#e2e8f0'; // gray-600 : slate-200
      })
      .attr('stroke-width', 2)
      .style('cursor', 'pointer');

    // User text (top half of node)
    nodeSelection
      .append('text')
      .attr('x', 0)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', (d: GraphNode) => {
        const isActive = activeNodeId === d.id;
        const isDark = document.documentElement.classList.contains('dark');
        if (isActive) {
          return '#ffffff'; // white for active nodes
        }
        return isDark ? '#f9fafb' : '#111827'; // gray-50 : gray-900
      })
      .text((d: GraphNode) => {
        const text = d.userText || 'No message';
        return text.length > 25 ? text.substring(0, 25) + '...' : text;
      });

    // Assistant text (bottom half of node)
    nodeSelection
      .append('text')
      .attr('x', 0)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '9px')
      .attr('fill', (d: GraphNode) => {
        const isActive = activeNodeId === d.id;
        const isDark = document.documentElement.classList.contains('dark');
        if (isActive) {
          return '#e0e7ff'; // indigo-100 for active nodes
        }
        return isDark ? '#d1d5db' : '#4b5563'; // gray-300 : gray-600
      })
      .text((d: GraphNode) => {
        const text = d.assistantText || 'No response';
        return text.length > 30 ? text.substring(0, 30) + '...' : text;
      });

    // No force simulation needed - using tree layout positioning

    // Auto-center on first render or when activeNodeId changes
    if (shouldCenter.current && treeData.nodes.length > 0) {
      const activeNode = treeData.nodes.find(n => n.id === activeNodeId);
      if (activeNode) {
        const transform = d3.zoomIdentity
          .translate(
            dimensions.width / 2 - activeNode.x,
            dimensions.height / 2 - activeNode.y
          )
          .scale(0.8);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        svg.call(zoom.transform as any, transform);
        shouldCenter.current = false;
      }
    }
  }, [treeData, dimensions, activeNodeId]);

  // Update SVG background for dark mode
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const isDark = document.documentElement.classList.contains('dark');
    svg.style('background-color', isDark ? '#1f2937' : '#ffffff');
  }, []);

  return (
    <div className={`relative ${className || ''}`}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className="bg-white dark:bg-gray-800"
      />
      {tooltip && (
        <div
          className="absolute bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs p-3 rounded-lg shadow-xl pointer-events-none z-10 max-w-xs border border-gray-700 dark:border-gray-300"
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          <pre className="whitespace-pre-wrap font-mono">{tooltip.text}</pre>
        </div>
      )}
    </div>
  );
}
