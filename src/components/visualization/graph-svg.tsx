'use client';

import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { GraphNode, TreeLink } from '@/lib/types';

interface GraphSvgProps {
  nodes: GraphNode[];
  links: TreeLink[];
  dimensions: { width: number; height: number };
  activeNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
  onTooltipShow: (x: number, y: number, text: string) => void;
  onTooltipHide: () => void;
  shouldCenter: boolean;
  onCenterComplete: () => void;
}

export function GraphSvg({
  nodes,
  links,
  dimensions,
  activeNodeId,
  onNodeClick,
  onTooltipShow,
  onTooltipHide,
  shouldCenter,
  onCenterComplete,
}: GraphSvgProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Main D3 rendering effect with performance optimizations
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

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

    // Render links with optimized path generation
    const linkGenerator = d3
      .linkVertical<GraphNode, GraphNode>()
      .x((d: GraphNode) => d.x)
      .y((d: GraphNode) => d.y);

    container
      .selectAll('.link')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', (link: TreeLink) => {
        const source = nodes.find(n => n.id === link.source);
        const target = nodes.find(n => n.id === link.target);

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
      .attr('stroke', () => {
        const isDark = document.documentElement.classList.contains('dark');
        return isDark ? '#6b7280' : '#9ca3af'; // gray-500 : gray-400
      })
      .attr('stroke-width', 2);

    // Render nodes with enhanced styling
    const nodeSelection = container
      .selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: GraphNode) => `translate(${d.x},${d.y})`)
      .on('mouseover', function (event, d: GraphNode) {
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          onTooltipShow(
            event.clientX - rect.left + 10,
            event.clientY - rect.top - 10,
            `User: ${d.userText || 'No message'}\nAssistant: ${d.assistantText || 'No response'}`
          );
        }
      })
      .on('mouseout', () => {
        onTooltipHide();
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
      .attr('font-size', '12px')
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
      .attr('font-size', '11px')
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

    // Auto-center on first render or when activeNodeId changes
    if (shouldCenter && nodes.length > 0) {
      const activeNode = nodes.find(n => n.id === activeNodeId);
      if (activeNode) {
        const transform = d3.zoomIdentity
          .translate(
            dimensions.width / 2 - activeNode.x,
            dimensions.height / 2 - activeNode.y
          )
          .scale(0.8);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        svg.call(zoom.transform as any, transform);
        onCenterComplete();
      }
    }
  }, [
    nodes,
    links,
    dimensions,
    activeNodeId,
    onNodeClick,
    onTooltipShow,
    onTooltipHide,
    shouldCenter,
    onCenterComplete,
  ]);

  // Update SVG background for dark mode
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const isDark = document.documentElement.classList.contains('dark');
    svg.style('background-color', isDark ? '#1f2937' : '#ffffff');
  }, []);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      className="bg-white dark:bg-gray-800"
    />
  );
}
