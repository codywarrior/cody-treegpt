'use client';

import React from 'react';
import { TreeLink, GraphNode } from '@/lib/types';

interface GraphLinksProps {
  links: TreeLink[];
  nodeMap: Map<string, GraphNode>;
}

export function GraphLinks({ links, nodeMap }: GraphLinksProps) {
  return (
    <g className="links">
      {links.map((link, index) => {
        const sourceNode = nodeMap.get(
          typeof link.source === 'string' ? link.source : link.source.id
        );
        const targetNode = nodeMap.get(
          typeof link.target === 'string' ? link.target : link.target.id
        );

        if (!sourceNode || !targetNode) return null;

        // Create curved path between nodes
        const sourceX = sourceNode.x;
        const sourceY = sourceNode.y + 40; // Bottom of source node
        const targetX = targetNode.x;
        const targetY = targetNode.y - 40; // Top of target node

        const midY = sourceY + (targetY - sourceY) / 2;

        const path = `M ${sourceX} ${sourceY} Q ${sourceX} ${midY} ${targetX} ${targetY}`;

        const isActiveLink = sourceNode.isActive && targetNode.isActive;

        return (
          <path
            key={`${sourceNode.id}-${targetNode.id}-${index}`}
            d={path}
            className={`
              stroke-2 fill-none transition-colors duration-200
              ${
                isActiveLink
                  ? 'stroke-blue-500 dark:stroke-blue-400'
                  : 'stroke-gray-300 dark:stroke-gray-600'
              }
            `}
            markerEnd="url(#arrowhead)"
          />
        );
      })}
    </g>
  );
}
