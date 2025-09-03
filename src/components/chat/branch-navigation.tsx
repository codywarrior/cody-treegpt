'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';

interface BranchNavigationProps {
  currentBranch: number;
  totalBranches: number;
  onPreviousBranch: () => void;
  onNextBranch: () => void;
  branchPreview?: string;
}

export function BranchNavigation({
  currentBranch,
  totalBranches,
  onPreviousBranch,
  onNextBranch,
  branchPreview,
}: BranchNavigationProps) {
  if (totalBranches <= 1) return null;

  return (
    <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mt-2">
      <div className="flex items-center space-x-1">
        <Tooltip content="Previous branch (h key)">
          <button
            onClick={onPreviousBranch}
            disabled={currentBranch === 0}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
        </Tooltip>

        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
          {currentBranch + 1} / {totalBranches}
        </span>

        <Tooltip content="Next branch (l key)">
          <button
            onClick={onNextBranch}
            disabled={currentBranch === totalBranches - 1}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </Tooltip>
      </div>

      {branchPreview && (
        <div className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-32">
          {branchPreview}
        </div>
      )}
    </div>
  );
}
