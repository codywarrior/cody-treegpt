'use client';

import React from 'react';
import { GraphNode } from '@/lib/types';

interface GraphNodeProps {
  node: GraphNode;
  onNodeClick: (nodeId: string) => void;
  onMouseEnter: (event: React.MouseEvent, text: string) => void;
  onMouseLeave: () => void;
}

export function GraphNodeComponent({
  node,
  onNodeClick,
  onMouseEnter,
  onMouseLeave,
}: GraphNodeProps) {
  const handleClick = () => {
    onNodeClick(node.id);
  };

  const handleMouseEnter = (event: React.MouseEvent) => {
    const tooltipText = `User: ${node.userText}\nAssistant: ${node.assistantText}`;
    onMouseEnter(event, tooltipText);
  };

  return (
    <g
      className="cursor-pointer"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Node background */}
      <rect
        x={node.x - 100}
        y={node.y - 40}
        width={200}
        height={80}
        rx={8}
        className={`
          stroke-2 transition-colors duration-200
          ${
            node.isActive
              ? 'fill-blue-100 dark:fill-blue-900 stroke-blue-500 dark:stroke-blue-400'
              : 'fill-white dark:fill-gray-800 stroke-gray-300 dark:stroke-gray-600 hover:fill-gray-50 dark:hover:fill-gray-700'
          }
        `}
      />

      {/* User message section */}
      <rect
        x={node.x - 95}
        y={node.y - 35}
        width={190}
        height={30}
        rx={4}
        className="fill-gray-50 dark:fill-gray-800/50 stroke-gray-200 dark:stroke-gray-700"
      />

      {/* User text */}
      <text
        x={node.x}
        y={node.y - 20}
        textAnchor="middle"
        className="text-xs fill-gray-800 dark:fill-gray-200 font-medium"
        style={{ pointerEvents: 'none' }}
      >
        <tspan>
          {node.userText.length > 25
            ? `${node.userText.substring(0, 25)}...`
            : node.userText}
        </tspan>
      </text>

      {/* Assistant message section */}
      <rect
        x={node.x - 95}
        y={node.y - 5}
        width={190}
        height={30}
        rx={4}
        className="fill-blue-50 dark:fill-blue-900/20 stroke-blue-200 dark:stroke-blue-800"
      />

      {/* Assistant text */}
      <text
        x={node.x}
        y={node.y + 10}
        textAnchor="middle"
        className="text-xs fill-blue-800 dark:fill-blue-200 font-medium"
        style={{ pointerEvents: 'none' }}
      >
        <tspan>
          {node.assistantText.length > 25
            ? `${node.assistantText.substring(0, 25)}...`
            : node.assistantText}
        </tspan>
      </text>

      {/* Active indicator */}
      {node.isActive && (
        <circle
          cx={node.x + 85}
          cy={node.y - 25}
          r={6}
          className="fill-blue-500 dark:fill-blue-400"
        />
      )}
    </g>
  );
}
