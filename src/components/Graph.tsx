'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { NodeT } from '@/lib/types';
import {
  buildNodesMap,
  buildChildrenMap,
  pathToRoot,
} from '@/lib/tree-algorithms';

interface GraphProps {
  nodes: NodeT[];
  activeNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
  className?: string;
}

export function Graph({
  nodes,
  activeNodeId,
  onNodeClick,
  className,
}: GraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);
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
      const rootNodes = nodes.filter(n => !n.parentId);
      if (rootNodes.length === 0) return { nodes: [], links: [] };

      const layoutNodes: { x: number; y: number; id: string }[] = [];
      const links: {
        source: { x: number; y: number; id: string };
        target: { x: number; y: number; id: string };
      }[] = [];

      // Simple tree layout algorithm
      const visited = new Set<string>();
      const levelWidth = 200;
      const levelHeight = 100;

      const layoutNodeRecursive = (
        nodeId: string,
        x: number,
        y: number,
        level: number
      ) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);

        const currentLayoutNode = { x, y, id: nodeId };
        layoutNodes.push(currentLayoutNode);

        const children = childrenById[nodeId] || [];
        const childSpacing = levelWidth / Math.max(children.length, 1);
        const startX = x - ((children.length - 1) * childSpacing) / 2;

        children.forEach((childId, index) => {
          const childX = startX + index * childSpacing;
          const childY = y + levelHeight;
          const childLayoutNode = { x: childX, y: childY, id: childId };

          links.push({
            source: currentLayoutNode,
            target: childLayoutNode,
          });

          layoutNodeRecursive(childId, childX, childY, level + 1);
        });
      };

      layoutNodeRecursive(rootNodes[0].id, 0, 0, 0);
      return { nodes: layoutNodes, links };
    };

    const { nodes: layoutNodes, links } = layoutTree(nodes);

    // Merge layout data with node data
    const simulationNodes: (d3.SimulationNodeDatum & NodeT)[] = layoutNodes.map(
      layoutNode => {
        const nodeData = nodesById[layoutNode.id];
        return {
          ...nodeData,
          x: layoutNode.x,
          y: layoutNode.y,
          index: undefined,
          vx: undefined,
          vy: undefined,
          fx: undefined,
          fy: undefined,
        };
      }
    );

    // Create simulation links with proper node references
    const simulationLinks = links.map(link => ({
      source: link.source.id,
      target: link.target.id,
    }));

    // Get active path for highlighting
    const activePath = activeNodeId ? pathToRoot(activeNodeId, nodesById) : [];
    const activePathSet = new Set(activePath);

    const simulation = d3
      .forceSimulation(simulationNodes)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .force(
        'link',
        d3
          .forceLink(simulationLinks)
          .id((d: any) => d.id)
          .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force(
        'center',
        d3.forceCenter(dimensions.width / 2, dimensions.height / 2)
      )
      .force('collision', d3.forceCollide().radius(30));

    simulation.on('tick', () => {
      container
        .selectAll('line')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr('x1', (d: any) => (d.source as any).x || 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr('y1', (d: any) => (d.source as any).y || 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr('x2', (d: any) => (d.target as any).x || 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr('y2', (d: any) => (d.target as any).y || 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr('stroke', (d: any) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          activePathSet.has((d.source as any).id) &&
          activePathSet.has((d.target as any).id)
            ? '#3b82f6'
            : '#e5e7eb'
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr('stroke-width', (d: any) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          activePathSet.has((d.source as any).id) &&
          activePathSet.has((d.target as any).id)
            ? 3
            : 1
        );
    });

    // Create links
    container
      .selectAll('.link')
      .data(simulationLinks)
      .enter()
      .append('line')
      .data(simulationLinks)
      .join('line')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .attr('x1', (d: any) => (d.source as any).x || 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .attr('y1', (d: any) => (d.source as any).y || 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .attr('x2', (d: any) => (d.target as any).x || 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .attr('y2', (d: any) => (d.target as any).y || 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .attr('stroke', (d: any) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        activePathSet.has((d.source as any).id) &&
        activePathSet.has((d.target as any).id)
          ? '#3b82f6'
          : '#e5e7eb'
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .attr('stroke-width', (d: any) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        activePathSet.has((d.source as any).id) &&
        activePathSet.has((d.target as any).id)
          ? 3
          : 1
      );

    // Create node groups
    const nodeGroups = container
      .selectAll('.node')
      .data(simulationNodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr(
        'transform',
        (d: d3.SimulationNodeDatum & NodeT) =>
          `translate(${d.x || 0}, ${d.y || 0})`
      )
      .on('click', (_event: MouseEvent, d: d3.SimulationNodeDatum & NodeT) => {
        onNodeClick(d.id);
      })
      .on('mouseout', () => {
        setTooltip(null);
      });

    // Add circles to nodes
    nodeGroups
      .append('circle')
      .attr('r', (d: d3.SimulationNodeDatum & NodeT) =>
        d.id === activeNodeId ? 25 : 18
      )
      .attr('fill', (d: d3.SimulationNodeDatum & NodeT) => {
        if (d.id === activeNodeId) return '#3b82f6';
        if (activePathSet.has(d.id)) return '#1d4ed8';
        if (d.role === 'user') return '#10b981';
        return '#8b5cf6';
      })
      .attr('stroke', (d: d3.SimulationNodeDatum & NodeT) =>
        d.id === activeNodeId ? '#1d4ed8' : '#6b7280'
      )
      .attr('stroke-width', (d: d3.SimulationNodeDatum & NodeT) =>
        d.id === activeNodeId ? 3 : 2
      )
      .attr('opacity', (d: d3.SimulationNodeDatum & NodeT) =>
        d.deleted ? 0.7 : 1
      );

    // Add hover events
    nodeGroups
      .on(
        'mousemove',
        (_event: MouseEvent, d: d3.SimulationNodeDatum & NodeT) => {
          onNodeClick(d.id);
        }
      )
      .on('mouseleave', () => {
        setTooltip(null);
      });

    // Add text labels
    nodeGroups
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', 'white')
      .attr('pointer-events', 'none')
      .text((d: d3.SimulationNodeDatum & NodeT) =>
        d.role === 'user' ? 'U' : 'A'
      );

    // Add preview text
    nodeGroups
      .append('text')
      .attr('dy', 8)
      .attr('text-anchor', 'middle')
      .attr('font-size', '8px')
      .attr('fill', 'white')
      .attr('font-weight', 'normal')
      .text((d: d3.SimulationNodeDatum & NodeT) => {
        const node = nodesById[d.id];
        return node.text.slice(0, 8);
      });

    // Set up zoom behavior
    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        container.attr('transform', event.transform.toString());
      });

    svg.call(zoomBehavior);

    // Center the graph initially
    if (layoutNodes.length > 0) {
      const bounds = layoutNodes.reduce(
        (
          acc: { minX: number; maxX: number; minY: number; maxY: number },
          node: d3.SimulationNodeDatum
        ) => ({
          minX: Math.min(acc.minX, node.x || 0),
          maxX: Math.max(acc.maxX, node.x || 0),
          minY: Math.min(acc.minY, node.y || 0),
          maxY: Math.max(acc.maxY, node.y || 0),
        }),
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
      );

      if (activeNodeId && nodesById[activeNodeId]) {
        const activeNode = simulationNodes.find(n => n.id === activeNodeId);
        if (activeNode) {
          const scale = Math.min(
            dimensions.width / (bounds.maxX - bounds.minX + 200),
            dimensions.height / (bounds.maxY - bounds.minY + 200),
            1
          );

          const transform = d3.zoomIdentity
            .translate(
              dimensions.width / 2 - (activeNode.x || 0) * scale,
              dimensions.height / 2 - (activeNode.y || 0) * scale
            )
            .scale(scale);

          svg.call(zoomBehavior.transform, transform);
        }
      }
    }
  }, [nodes, activeNodeId, onNodeClick, dimensions.width, dimensions.height]);

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
