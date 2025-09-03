'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';
import { ConversationItem } from './conversation-item';
import { ConversationT } from '@/lib/types';

interface ConversationListProps {
  conversations: (ConversationT & { _count?: { nodes: number } })[];
  searchQuery: string;
  currentPage: number;
  itemsPerPage: number;
  editingId: string | null;
  editTitle: string;
  onEdit: (conversation: ConversationT) => void;
  onDelete: (id: string, title: string) => void;
  onEditTitleChange: (title: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onPageChange: (page: number) => void;
}

export function ConversationList({
  conversations,
  searchQuery,
  currentPage,
  itemsPerPage,
  editingId,
  editTitle,
  onEdit,
  onDelete,
  onEditTitleChange,
  onSaveEdit,
  onCancelEdit,
  onPageChange,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
        <p>
          {searchQuery
            ? 'No conversations match your search.'
            : 'No conversations yet. Create your first conversation to get started!'}
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(conversations.length / itemsPerPage);
  const paginatedConversations = conversations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {paginatedConversations.map(conversation => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            onEdit={onEdit}
            onDelete={onDelete}
            editingId={editingId}
            editTitle={editTitle}
            onEditTitleChange={onEditTitleChange}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
          />
        ))}
      </div>

      {/* Pagination */}
      {conversations.length > itemsPerPage && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing{' '}
              {Math.min(
                (currentPage - 1) * itemsPerPage + 1,
                conversations.length
              )}{' '}
              to {Math.min(currentPage * itemsPerPage, conversations.length)} of{' '}
              {conversations.length} conversations
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  onPageChange(Math.min(currentPage + 1, totalPages))
                }
                disabled={currentPage >= totalPages}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
