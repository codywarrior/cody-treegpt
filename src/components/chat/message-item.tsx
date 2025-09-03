'use client';

import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Trash2, Copy, GitBranch } from 'lucide-react';
import { ChatNodeT } from '@/lib/types';

interface MessageItemProps {
  chatNode: ChatNodeT;
  isEditing: boolean;
  editingText: string;
  onEdit: (id: string, text: string) => void;
  onDelete: () => void;
  onBranch: () => void;
  onCopy: (text: string) => void;
  onNodeSelect: (nodeId: string) => void;
  onCancelEdit: () => void;
  setEditingText: (text: string) => void;
  isGeneratingAI?: boolean;
}

export function MessageItem({
  chatNode,
  isEditing,
  editingText,
  onEdit,
  onDelete,
  onBranch,
  onCopy,
  onNodeSelect,
  onCancelEdit,
  setEditingText,
  isGeneratingAI = false,
}: MessageItemProps) {
  // Render user message
  const renderUserMessage = () => (
    <motion.div
      className="flex justify-end mb-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      layout
    >
      <div
        className="max-w-[90%] sm:max-w-[80%] bg-blue-500 text-white rounded-lg px-3 sm:px-4 py-2 relative group cursor-pointer hover:bg-blue-600 transition-colors"
        onClick={() => onNodeSelect(chatNode.id)}
      >
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editingText}
              onChange={e => setEditingText(e.target.value)}
              className="w-full p-2 rounded bg-white text-black resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex space-x-2">
              <button
                onClick={() => onEdit(chatNode.id, editingText)}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Save
              </button>
              <button
                onClick={onCancelEdit}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="prose prose-sm max-w-none text-white">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {chatNode.query}
              </ReactMarkdown>
            </div>
            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
              <button
                onClick={onBranch}
                disabled={isGeneratingAI}
                className={`p-1 rounded-full relative group/tooltip transition-all ${
                  isGeneratingAI
                    ? 'bg-gray-400 cursor-not-allowed opacity-50'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
                title=""
              >
                <GitBranch size={12} />
                <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  {isGeneratingAI
                    ? 'Wait for AI response'
                    : 'Branch from this message'}
                </div>
              </button>
              <button
                onClick={() => onCopy(chatNode.query)}
                className="p-1 bg-blue-600 rounded-full hover:bg-blue-700 relative group/tooltip"
                title=""
              >
                <Copy size={12} />
                <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  Copy message
                </div>
              </button>
              <button
                onClick={onDelete}
                disabled={isGeneratingAI}
                className={`p-1 rounded-full relative group/tooltip transition-all ${
                  isGeneratingAI
                    ? 'bg-gray-400 cursor-not-allowed opacity-50'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
                title=""
              >
                <Trash2 size={12} />
                <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  {isGeneratingAI ? 'Wait for AI response' : 'Delete message'}
                </div>
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );

  // Render assistant message
  const renderAssistantMessage = () => (
    <motion.div
      className="flex justify-start mb-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      layout
    >
      <div
        className="max-w-[90%] sm:max-w-[80%] bg-gray-100 dark:bg-gray-800 rounded-lg px-3 sm:px-4 py-2 relative group cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        onClick={() => onNodeSelect(chatNode.id)}
      >
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {chatNode.response || chatNode.assistantText}
          </ReactMarkdown>
        </div>
        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
          <button
            onClick={() => onCopy(chatNode.response || chatNode.assistantText)}
            className="p-1 bg-gray-600 rounded-full hover:bg-gray-700 relative group/tooltip"
            title=""
          >
            <Copy size={12} />
            <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              Copy response
            </div>
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-4">
      {renderUserMessage()}
      {(chatNode.response || chatNode.assistantText) &&
        renderAssistantMessage()}
    </div>
  );
}
