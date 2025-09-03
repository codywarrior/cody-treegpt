'use client';

import React from 'react';
import Link from 'next/link';
import { MessageSquare, Edit2, Trash2 } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { ConversationT } from '@/lib/types';

interface ConversationItemProps {
  conversation: ConversationT & { _count?: { nodes: number } };
  onEdit: (conversation: ConversationT) => void;
  onDelete: (id: string, title: string) => void;
  editingId: string | null;
  editTitle: string;
  onEditTitleChange: (title: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

export function ConversationItem({
  conversation,
  onEdit,
  onDelete,
  editingId,
  editTitle,
  onEditTitleChange,
  onSaveEdit,
  onCancelEdit,
}: ConversationItemProps) {
  const isEditing = editingId === conversation.id;

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSaveEdit();
    }
  };

  if (isEditing) {
    return (
      <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mb-2">
          <input
            type="text"
            value={editTitle}
            onChange={e => onEditTitleChange(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm"
            autoFocus
          />
          <div className="flex space-x-2">
            <button
              onClick={onSaveEdit}
              className="px-3 py-1 bg-blue-500 dark:bg-blue-600 text-white rounded text-sm hover:bg-blue-600 dark:hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-sm hover:bg-gray-400 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      <Link
        href={`/c/${conversation.id}`}
        className="block p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-1 hover:text-blue-600 dark:hover:text-blue-400 truncate">
              {conversation.title}
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 space-y-1 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center">
                <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                {new Date(conversation.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center">
                <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                {conversation._count?.nodes || 0} messages
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Action buttons positioned absolutely */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center space-x-1 sm:space-x-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 rounded-md shadow-sm">
        <Tooltip content="Edit conversation">
          <button
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              onEdit(conversation);
            }}
            className="p-1.5 sm:p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        </Tooltip>
        <Tooltip content="Delete conversation">
          <button
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(conversation.id, conversation.title);
            }}
            className="p-1.5 sm:p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
          >
            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
