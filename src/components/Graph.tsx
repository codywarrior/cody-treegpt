'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
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
  const svgRef = React.useRef<SVGSVGElement>(null);
  const shouldCenter = useRef(true);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  // Convert nodes to chat node pairs
  const chatNodes = useMemo(() => convertNodesToChatNodes(nodes), [nodes]);

  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Build tree structure from chat nodes
  const treeData = useMemo(() => {
    if (chatNodes.length === 0) return { nodes: [], links: [] };

    const activePathIds = getChatActivePath(chatNodes, activeNodeId);
    const activePathSet = new Set(activePathIds);

    // Create graph nodes from chat nodes
    const nodes: GraphNode[] = chatNodes.map(chatNode => ({
      id: chatNode.id,
      x: 0,
      y: 0,
      chatNode,
      userText: chatNode.query,
      assistantText: chatNode.assistantText || chatNode.response || '',
      isInActivePath: activePathSet.has(chatNode.id),
    }));

    // Create links between nodes - use node IDs for D3 force simulation
    const links: TreeLink[] = [];
    chatNodes.forEach(chatNode => {
      if (chatNode.parentId) {
        links.push({
          source: chatNode.parentId,
          target: chatNode.id,
        });
      }
    });

    return { nodes, links };
  }, [chatNodes, activeNodeId]);

  useEffect(() => {
    if (!svgRef.current || treeData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const container = svg.select('.graph-container');

    // Clear previous content
    container.selectAll('*').remove();

    // Get nodes and links from treeData
    const { nodes: treeNodes, links } = treeData;

    // Create proper hierarchical tree layout
    const layoutNodes: GraphNode[] = [];
    const rootChatNodes = chatNodes.filter(cn => !cn.parentId);

    if (rootChatNodes.length > 0) {
      const nodeWidth = 240;
      const levelHeight = 200;

      // Build tree structure with proper positioning
      const layoutNodeRecursive = (
        nodeId: string,
        x: number,
        y: number,
        level: number
      ) => {
        const existingNode = layoutNodes.find(n => n.id === nodeId);
        if (existingNode) return { width: 0, subtreeNodes: 0 };

        const treeNode = treeNodes.find(gn => gn.id === nodeId);
        if (!treeNode) return { width: 0, subtreeNodes: 0 };

        const chatNode = chatNodes.find(cn => cn.id === nodeId);
        const children = chatNode ? chatNode.children : [];

        let subtreeWidth = 0;
        let totalSubtreeNodes = 1;
        const childResults: Array<{ width: number; subtreeNodes: number }> = [];

        // First pass: calculate subtree widths
        children.forEach((childId, index) => {
          const childResult = layoutNodeRecursive(
            childId,
            0, // temporary x, will be adjusted
            y + levelHeight,
            level + 1
          );
          childResults.push(childResult);
          subtreeWidth += childResult.width;
          totalSubtreeNodes += childResult.subtreeNodes;
        });

        // Calculate this node's width requirement
        const thisNodeWidth = Math.max(nodeWidth, subtreeWidth);
        subtreeWidth = thisNodeWidth;

        // Position this node
        const layoutNode = { ...treeNode, x, y };
        layoutNodes.push(layoutNode);

        // Second pass: position children with proper spacing
        if (children.length > 0) {
          let currentX = x - subtreeWidth / 2;
          children.forEach((childId, index) => {
            const childWidth = childResults[index].width || nodeWidth;
            const childX = currentX + childWidth / 2;

            // Update the child's position
            const childNode = layoutNodes.find(n => n.id === childId);
            if (childNode) {
              childNode.x = childX;
            }

            currentX += childWidth + (index < children.length - 1 ? 50 : 0);
          });
        }

        return { width: subtreeWidth, subtreeNodes: totalSubtreeNodes };
      };

      // Start layout from root
      layoutNodeRecursive(rootChatNodes[0].id, dimensions.width / 2, 100, 0);
    }

    const finalNodes =
      layoutNodes.length > 0
        ? layoutNodes
        : treeNodes.map((node, i) => ({
            ...node,
            x: (i % 3) * 300 + 150,
            y: Math.floor(i / 3) * 200 + 100,
          }));

    // Create links with proper source/target positioning
    const linkData = links
      .map(link => {
        const sourceNode = finalNodes.find(n => n.id === link.source);
        const targetNode = finalNodes.find(n => n.id === link.target);
        return {
          source: sourceNode,
          target: targetNode,
          sourceId: link.source,
          targetId: link.target,
        };
      })
      .filter(link => link.source && link.target);

    // Render links
    container
      .selectAll('.link')
      .data(linkData)
      .join('line')
      .attr('class', 'link')
      .attr(
        'x1',
        (d: { source?: GraphNode; target?: GraphNode }) => d.source?.x || 0
      )
      .attr(
        'y1',
        (d: { source?: GraphNode; target?: GraphNode }) =>
          (d.source?.y || 0) + 75
      )
      .attr(
        'x2',
        (d: { source?: GraphNode; target?: GraphNode }) => d.target?.x || 0
      )
      .attr(
        'y2',
        (d: { source?: GraphNode; target?: GraphNode }) =>
          (d.target?.y || 0) - 70
      )
      .attr('stroke', '#d1d5db')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)');

    // Add arrowhead marker
    svg.select('defs').remove();
    const defs = svg.append('defs');
    defs
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#d1d5db');

    // Render nodes
    const nodeSelection = container
      .selectAll('.node-group')
      .data(finalNodes)
      .join('g')
      .attr('class', 'node-group')
      .attr('transform', (d: GraphNode) => `translate(${d.x}, ${d.y})`);

    // Add rectangles for chat pairs
    nodeSelection
      .selectAll('rect')
      .data((d: GraphNode) => [d])
      .join('rect')
      .attr('width', 220)
      .attr('height', 140)
      .attr('x', -110)
      .attr('y', -70)
      .attr('rx', 8)
      .attr(
        'class',
        (d: GraphNode) => `node ${d.isInActivePath ? 'active-path' : ''}`
      )
      .attr('fill', (d: GraphNode) => {
        return d.id === activeNodeId
          ? '#dbeafe'
          : d.isInActivePath
            ? '#fef3c7'
            : '#ffffff';
      })
      .attr('stroke', (d: GraphNode) => {
        return d.id === activeNodeId
          ? '#3b82f6'
          : d.isInActivePath
            ? '#f59e0b'
            : '#d1d5db';
      })
      .attr('stroke-width', (d: GraphNode) => {
        return d.id === activeNodeId ? 3 : d.isInActivePath ? 2 : 1;
      })
      .style('cursor', 'pointer');

    // Add user section
    nodeSelection
      .selectAll('.user-section')
      .data((d: GraphNode) => [d])
      .join('rect')
      .attr('class', 'user-section')
      .attr('width', 200)
      .attr('height', 60)
      .attr('x', -100)
      .attr('y', -60)
      .attr('rx', 4)
      .attr('fill', '#f9fafb')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 1);

    // Add user label
    nodeSelection
      .selectAll('.user-label')
      .data((d: GraphNode) => [d])
      .join('text')
      .attr('class', 'user-label')
      .attr('x', -95)
      .attr('y', -45)
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151')
      .text('USER:');

    // Add user content
    nodeSelection
      .selectAll('.user-content')
      .data((d: GraphNode) => [d])
      .join('foreignObject')
      .attr('class', 'user-content')
      .attr('x', -95)
      .attr('y', -35)
      .attr('width', 190)
      .attr('height', 30)
      .html(
        (d: GraphNode) =>
          `<div style="font-size: 10px; color: #374151; line-height: 1.2; overflow: hidden; text-overflow: ellipsis;">
            ${d.userText.length > 60 ? d.userText.substring(0, 60) + '...' : d.userText}
          </div>`
      );

    // Add assistant section
    nodeSelection
      .selectAll('.assistant-section')
      .data((d: GraphNode) => [d])
      .join('rect')
      .attr('class', 'assistant-section')
      .attr('width', 200)
      .attr('height', 60)
      .attr('x', -100)
      .attr('y', -5)
      .attr('rx', 4)
      .attr('fill', '#ffffff')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 1);

    // Add assistant label
    nodeSelection
      .selectAll('.assistant-label')
      .data((d: GraphNode) => [d])
      .join('text')
      .attr('class', 'assistant-label')
      .attr('x', -95)
      .attr('y', 10)
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151')
      .text('ASSISTANT:');

    // Add assistant content
    nodeSelection
      .selectAll('.assistant-text')
      .data((d: GraphNode) => [d])
      .join('foreignObject')
      .attr('class', 'assistant-content')
      .attr('x', -95)
      .attr('y', 20)
      .attr('width', 190)
      .attr('height', 30)
      .html(
        (d: GraphNode) =>
          `<div style="font-size: 10px; color: #374151; line-height: 1.2; overflow: hidden; text-overflow: ellipsis;">
            ${d.assistantText.length > 60 ? d.assistantText.substring(0, 60) + '...' : d.assistantText}
          </div>`
      );

    // Add hover effects and click handlers
    nodeSelection
      .on('mouseover', function (event: MouseEvent, d: GraphNode) {
        setTooltip({
          x: event.pageX,
          y: event.pageY,
          text: `User: ${d.userText}\n\nAssistant: ${d.assistantText}`,
        });
      })
      .on('mouseout', () => {
        setTooltip(null);
      })
      .on('click', function (event: MouseEvent, d: GraphNode) {
        event.stopPropagation();
        onNodeClick(d.id);
      });

    // Add zoom and pan behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', event => {
        svg.select('g').attr('transform', event.transform.toString());
      });

    svg.call(zoom);

    // Only center on active node on initial load, not on every click
    if (activeNodeId && shouldCenter.current) {
      const activeNode = finalNodes.find(
        (n: GraphNode) => n.id === activeNodeId
      );
      if (activeNode) {
        svg.call(
          zoom.transform,
          d3.zoomIdentity
            .translate(
              dimensions.width / 2 - activeNode.x,
              dimensions.height / 2 - activeNode.y
            )
            .scale(1)
        );
        shouldCenter.current = false;
      }
    }
  }, [
    chatNodes,
    activeNodeId,
    onNodeClick,
    dimensions.width,
    dimensions.height,
    treeData,
  ]);

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={svgRef}
        className="w-full h-full border border-gray-200 rounded-lg bg-white"
      >
        <g className="graph-container"></g>
      </svg>
      {tooltip && (
        <div
          className="absolute bg-black text-white text-sm px-2 py-1 rounded shadow-lg pointer-events-none z-10 max-w-xs"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            transform: tooltip.x > 400 ? 'translateX(-100%)' : 'none',
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
