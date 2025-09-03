'use client';

import React from 'react';
import { Trash2, RotateCcw, Copy, GitBranch } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';

interface MessageActionsProps {
  nodeId: string;
  content: string;
  role: 'user' | 'assistant';
  canDelete: boolean;
  canTryAgain: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onTryAgain: () => void;
  onBranch: () => void;
  onCopy: () => void;
}

export function MessageActions({
  // nodeId,
  // content,
  role,
  canDelete,
  canTryAgain,
  onEdit,
  onDelete,
  onTryAgain,
  onBranch,
  onCopy,
}: MessageActionsProps) {
  return (
    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <Tooltip content="Copy message">
        <button
          onClick={onCopy}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <Copy className="w-3 h-3" />
        </button>
      </Tooltip>

      <Tooltip content="Edit message">
        <button
          onClick={onEdit}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </Tooltip>

      <Tooltip content="Branch from here">
        <button
          onClick={onBranch}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <GitBranch className="w-3 h-3" />
        </button>
      </Tooltip>

      {role === 'assistant' && canTryAgain && (
        <Tooltip content="Try again">
          <button
            onClick={onTryAgain}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </Tooltip>
      )}

      {canDelete && (
        <Tooltip content="Delete message">
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </Tooltip>
      )}
    </div>
  );
}
