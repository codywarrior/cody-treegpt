'use client';

import React from 'react';

interface GraphTooltipProps {
  x: number;
  y: number;
  text: string;
}

export function GraphTooltip({ x, y, text }: GraphTooltipProps) {
  // Calculate positioning to keep tooltip within viewport
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ left: x + 10, top: y - 40 });

  React.useEffect(() => {
    if (tooltipRef.current) {
      const tooltip = tooltipRef.current;
      const rect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = x + 10;
      let top = y - 40;

      // Adjust horizontal position if tooltip would go off-screen
      if (left + rect.width > viewportWidth) {
        left = x - rect.width - 10;
      }

      // Adjust vertical position if tooltip would go off-screen
      if (top < 0) {
        top = y + 10;
      } else if (top + rect.height > viewportHeight) {
        top = y - rect.height - 10;
      }

      setPosition({ left, top });
    }
  }, [x, y]);

  return (
    <div
      ref={tooltipRef}
      className="absolute z-50 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg pointer-events-none max-w-xs whitespace-pre-line border border-gray-700"
      style={{
        left: position.left,
        top: position.top,
      }}
    >
      {text}
    </div>
  );
}
