'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { MessageItem } from './message-item';
import { LoadingAnimation } from './loading-animation';
import { ChatNodeT } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface MessageListProps {
  messages: ChatNodeT[];
  activeNodeId: string | null;
  onNodeSelect: (nodeId: string) => void;
  onEditMessage: (nodeId: string, newText: string) => void;
  onDeleteMessage: (nodeId: string) => void;
  onBranchFromMessage: (nodeId: string) => void;
  optimisticMessage?: string | null;
  isGeneratingAI?: boolean;
}

export function MessageList({
  messages,
  activeNodeId,
  onNodeSelect,
  onEditMessage,
  onDeleteMessage,
  onBranchFromMessage,
  optimisticMessage,
  isGeneratingAI,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    nodeId: string;
    content: string;
  } | null>(null);
  const { toast } = useToast();

  // Get conversation ID from messages
  const conversationId = messages[0]?.conversationId || '';

  // Auto-scroll to bottom when messages change with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [messages.length, optimisticMessage, isGeneratingAI]);

  // Filter to show only the active chat path
  const getActiveChatPath = useCallback(() => {
    if (!activeNodeId || messages.length === 0) return [];

    const nodeMap = new Map(messages.map(node => [node.id, node]));
    const path: ChatNodeT[] = [];

    // Start from active node and traverse up to root
    let currentId: string | null = activeNodeId;
    while (currentId) {
      const node = nodeMap.get(currentId);
      if (!node) break;
      path.unshift(node); // Add to beginning to maintain order
      currentId = node.parentId;
    }

    return path;
  }, [messages, activeNodeId]);

  const activePath = getActiveChatPath();

  // Handle message editing
  const handleEditMessage = async (nodeId: string, newText: string) => {
    try {
      await onEditMessage(nodeId, newText);
      setEditingNodeId(null);
      setEditingText('');
      toast({ title: 'Success', description: 'Message updated successfully' });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update message',
        variant: 'destructive',
      });
    }
  };

  // Handle message deletion
  const handleDeleteMessage = async (nodeId: string) => {
    try {
      await onDeleteMessage(nodeId);
      setDeleteConfirm(null);
      toast({ title: 'Success', description: 'Message deleted successfully' });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive',
      });
    }
  };

  // Handle copy message
  const handleCopyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Success', description: 'Message copied to clipboard' });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to copy message',
        variant: 'destructive',
      });
    }
  };

  // Handle branch from message
  const handleBranchFromMessage = (nodeId: string) => {
    onBranchFromMessage(nodeId);
    toast({
      title: 'Success',
      description:
        'Branch mode activated. Type your message to create a new branch.',
    });
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        {activePath.map(chatNode => {
          return (
            <MessageItem
              key={chatNode.id}
              chatNode={chatNode}
              isEditing={editingNodeId === chatNode.id}
              editingText={editingText}
              onEdit={handleEditMessage}
              onDelete={() =>
                setDeleteConfirm({
                  nodeId: chatNode.id,
                  content: chatNode.query,
                })
              }
              onBranch={() => handleBranchFromMessage(chatNode.id)}
              onCopy={handleCopyMessage}
              onNodeSelect={onNodeSelect}
              onCancelEdit={() => {
                setEditingNodeId(null);
                setEditingText('');
              }}
              setEditingText={setEditingText}
              isGeneratingAI={isGeneratingAI}
            />
          );
        })}

        {/* Show optimistic user message only if it doesn't match the last real message */}
        <AnimatePresence>
          {optimisticMessage &&
            (() => {
              const lastMessage = activePath[activePath.length - 1];
              const shouldShowOptimistic =
                !lastMessage ||
                lastMessage.query.trim() !== optimisticMessage.trim() ||
                lastMessage.response; // Hide if AI response exists

              return shouldShowOptimistic ? (
                <motion.div
                  className="flex justify-end mb-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="max-w-[90%] sm:max-w-[80%] bg-blue-500 text-white rounded-lg px-3 sm:px-4 py-2 opacity-80">
                    <div className="prose prose-sm max-w-none text-white">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                      >
                        {optimisticMessage}
                      </ReactMarkdown>
                    </div>
                  </div>
                </motion.div>
              ) : null;
            })()}
        </AnimatePresence>

        {/* Show AI generating animation when AI is responding */}
        <AnimatePresence>
          {isGeneratingAI && <LoadingAnimation />}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Delete Message
              </h3>
              <p className="text-gray-700 dark:text-gray-200 mb-4">
                Are you sure you want to delete this message?
              </p>
              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded mb-4 max-h-32 overflow-y-auto">
                <p className="text-sm text-gray-800 dark:text-gray-100">
                  {deleteConfirm?.content.substring(0, 200)}
                  {deleteConfirm?.content.length > 200 && '...'}
                </p>
              </div>
              <div className="flex space-x-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    deleteConfirm && handleDeleteMessage(deleteConfirm.nodeId)
                  }
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
