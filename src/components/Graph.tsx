'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { NodeT } from '@/lib/types';
import { buildNodesMap, buildChildrenMap, pathToRoot } from '@/lib/tree-algorithms';
import { Tooltip } from './Tooltip';

interface GraphProps {
  nodes: NodeT[];
  activeNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
  className?: string;
}

export function Graph({ nodes, activeNodeId, onNodeClick, className }: GraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

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

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const container = svg.select('.graph-container');

    // Clear previous content
    container.selectAll('*').remove();

    // Build data structures
    const nodesById = buildNodesMap(nodes);
    const childrenById = buildChildrenMap(nodes);
    const layoutTree = (nodes: NodeT[]) => {
      const rootNodes = nodes.filter((n) => !n.parentId);
      if (rootNodes.length === 0) return { nodes: [], links: [] };

      const layoutNodes: { x: number; y: number; id: string }[] = [];
      const links: { source: { x: number; y: number; id: string }, target: { x: number; y: number; id: string } }[] = [];
      
      // Simple tree layout algorithm
      const visited = new Set<string>();
      const levelWidth = 200;
      const levelHeight = 100;
      
      const layoutNodeRecursive = (nodeId: string, x: number, y: number, level: number) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        
        const currentLayoutNode = { x, y, id: nodeId };
        layoutNodes.push(currentLayoutNode);
        
        const children = childrenById[nodeId] || [];
        const childSpacing = levelWidth / Math.max(children.length, 1);
        const startX = x - (children.length - 1) * childSpacing / 2;
        
        children.forEach((childId, index) => {
          const childX = startX + index * childSpacing;
          const childY = y + levelHeight;
          const childLayoutNode = { x: childX, y: childY, id: childId };
          
          links.push({
            source: currentLayoutNode,
            target: childLayoutNode
          });
          
          layoutNodeRecursive(childId, childX, childY, level + 1);
        });
      };
      
      layoutNodeRecursive(rootNodes[0].id, 0, 0, 0);
      return { nodes: layoutNodes, links };
    };

    const { nodes: layoutNodes, links } = layoutTree(nodes);

    // Get active path for highlighting
    const activePath = activeNodeId ? pathToRoot(activeNodeId, nodesById) : [];
    const activePathSet = new Set(activePath);

    // Create links
    container
      .selectAll('.link')
      .data(links)
      .enter()
      .append('line')
      .data(links)
      .join('line')
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y)
      .attr('stroke', (d: any) => 
        activePathSet.has(d.source.id) && activePathSet.has(d.target.id)
          ? '#3b82f6' 
          : '#e5e7eb'
      )
      .attr('stroke-width', (d: any) =>
        activePathSet.has(d.source.id) && activePathSet.has(d.target.id) ? 3 : 1
      );

    // Create node groups
    const nodeGroups = container
      .selectAll('.node')
      .data(layoutNodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.x}, ${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event: any, d: any) => {
        event.stopPropagation();
        onNodeClick(d.id);
      });

    // Add node circles with better sizing and visual hierarchy
    nodeGroups
      .append('circle')
      .attr('r', (d: any) => d.id === activeNodeId ? 25 : 18)
      .attr('fill', (d: any) => {
        const node = nodesById[d.id];
        if (d.id === activeNodeId) return '#1d4ed8';
        if (activePathSet.has(d.id)) return '#3b82f6';
        return node.role === 'user' ? '#10b981' : '#8b5cf6';
      })
      .attr('stroke', (d: any) => d.id === activeNodeId ? '#1e40af' : '#ffffff')
      .attr('stroke-width', (d: any) => d.id === activeNodeId ? 3 : 2)
      .attr('opacity', (d: any) => activePathSet.has(d.id) || d.id === activeNodeId ? 1 : 0.7);

    // Add hover events for custom tooltips
    nodeGroups
      .on('mouseover', (event: any, d: any) => {
        const node = nodesById[d.id];
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltip({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            text: node.text
          });
        }
      })
      .on('mousemove', (event: any, d: any) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltip(prev => prev ? {
            ...prev,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
          } : null);
        }
      })
      .on('mouseout', () => {
        setTooltip(null);
      });

    // Add role indicators with preview text
    nodeGroups
      .append('text')
      .attr('dy', -2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', 'white')
      .attr('font-weight', 'bold')
      .text((d: any) => {
        const node = nodesById[d.id];
        return node.role === 'user' ? 'U' : 'A';
      });

    // Add preview text below role indicator
    nodeGroups
      .append('text')
      .attr('dy', 8)
      .attr('text-anchor', 'middle')
      .attr('font-size', '8px')
      .attr('fill', 'white')
      .attr('font-weight', 'normal')
      .text((d: any) => {
        const node = nodesById[d.id];
        return node.text.slice(0, 8);
      });

    // Set up zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event: any) => {
        svg.select('g').attr('transform', event.transform);
      });

    svg.call(zoomBehavior);

    // Center the graph initially
    if (layoutNodes.length > 0) {
      const bounds = layoutNodes.reduce((acc: any, node: any) => ({
          minX: Math.min(acc.minX, node.x),
          maxX: Math.max(acc.maxX, node.x),
          minY: Math.min(acc.minY, node.y),
          maxY: Math.max(acc.maxY, node.y),
        }),
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
      );

      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      const scale = Math.min(
        dimensions.width / (bounds.maxX - bounds.minX + 200),
        dimensions.height / (bounds.maxY - bounds.minY + 200),
        1
      );

      const transform = d3.zoomIdentity
        .translate(dimensions.width / 2 - centerX * scale, dimensions.height / 2 - centerY * scale)
        .scale(scale);

      svg.call(zoomBehavior.transform, transform);
    }
  }, [nodes, activeNodeId, onNodeClick]);

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
            transform: tooltip.x > 400 ? 'translateX(-100%)' : 'none'
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
