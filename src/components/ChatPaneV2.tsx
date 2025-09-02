'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Send, Edit3, Trash2, RotateCcw, Copy, GitBranch } from 'lucide-react';
import { ChatNodeT } from '../lib/types';
import { useToast } from '@/hooks/use-toast';

interface ChatPaneV2Props {
  chatNodes: ChatNodeT[];
  activeNodeId: string;
  onSendMessage: (message: string, nodeId: string) => Promise<void>;
  onBranchFromNode?: (nodeId: string, message: string) => Promise<void>;
  onRequestAIReply: (nodeId: string) => Promise<void>;
  onDeleteNode: (nodeId: string) => Promise<void>;
  onEditNode: (nodeId: string, newText: string) => Promise<void>;
  onNodeSelect: (nodeId: string) => void;
  className?: string;
}

export default function ChatPaneV2({
  chatNodes,
  activeNodeId,
  onSendMessage,
  onBranchFromNode,
  onRequestAIReply,
  onDeleteNode,
  onEditNode,
  onNodeSelect,
  className,
}: ChatPaneV2Props) {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    nodeId: string;
    content: string;
  } | null>(null);
  const [branchingFromNode, setBranchingFromNode] = useState<string | null>(
    null
  );

  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toastSuccess = (message: string) => {
    toast({ title: 'Success', description: message });
  };

  const toastError = (message: string) => {
    toast({ title: 'Error', description: message, variant: 'destructive' });
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatNodes]);

  // Loading animation component
  const LoadingDots = () => {
    const [dotCount, setDotCount] = useState(1);

    useEffect(() => {
      const interval = setInterval(() => {
        setDotCount(prev => (prev % 3) + 1);
      }, 500);
      return () => clearInterval(interval);
    }, []);

    return (
      <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-300">
        <span>AI is thinking</span>
        <span>{'.'.repeat(dotCount)}</span>
      </div>
    );
  };

  // Handle sending messages
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    try {
      if (branchingFromNode && onBranchFromNode) {
        await onBranchFromNode(branchingFromNode, message);
        setBranchingFromNode(null);
        toastSuccess('Branch created successfully');
      } else {
        await onSendMessage(message, activeNodeId);
        toastSuccess('Message sent successfully');
      }
    } catch (error) {
      toastError('Failed to send message');
      console.error('Send message error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [
    inputValue,
    isLoading,
    activeNodeId,
    branchingFromNode,
    onSendMessage,
    onBranchFromNode,
    toastSuccess,
    toastError,
  ]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  // Handle message editing
  const handleEditMessage = useCallback(
    async (nodeId: string, newText: string) => {
      try {
        await onEditNode(nodeId, newText);
        setEditingNodeId(null);
        setEditingText('');
        toastSuccess('Message updated successfully');
      } catch (error) {
        toastError('Failed to update message');
        console.error('Edit message error:', error);
      }
    },
    [onEditNode, toastSuccess, toastError]
  );

  // Handle message deletion
  const handleDeleteMessage = useCallback(
    async (nodeId: string) => {
      try {
        await onDeleteNode(nodeId);
        setDeleteConfirm(null);
        toastSuccess('Message deleted successfully');
      } catch (error) {
        toastError('Failed to delete message');
        console.error('Delete message error:', error);
      }
    },
    [onDeleteNode, toastSuccess, toastError]
  );

  // Handle AI reply regeneration
  const handleRegenerateReply = useCallback(
    async (nodeId: string) => {
      setIsLoading(true);
      try {
        await onRequestAIReply(nodeId);
        toastSuccess('AI response regenerated');
      } catch (error) {
        toastError('Failed to regenerate response');
        console.error('Regenerate reply error:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [onRequestAIReply, toastSuccess, toastError]
  );

  // Copy message to clipboard
  const handleCopyMessage = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toastSuccess('Message copied to clipboard');
      } catch (error) {
        toastError('Failed to copy message');
        console.error('Copy error:', error);
      }
    },
    [toastSuccess, toastError]
  );

  // Render user message
  const renderUserMessage = (chatNode: ChatNodeT) => (
    <div className="flex justify-end mb-4">
      <div className="max-w-[90%] sm:max-w-[80%] bg-blue-500 text-white rounded-lg px-3 sm:px-4 py-2 relative group">
        {editingNodeId === chatNode.id ? (
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
                onClick={() => handleEditMessage(chatNode.id, editingText)}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingNodeId(null);
                  setEditingText('');
                }}
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
                onClick={() => {
                  setBranchingFromNode(chatNode.id);
                  toastSuccess(
                    'Branch mode activated. Type your message to create a new branch.'
                  );
                }}
                className="p-1 bg-green-600 rounded-full hover:bg-green-700 relative group/tooltip"
                title=""
              >
                <GitBranch size={12} />
                <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  Branch from this message
                </div>
              </button>
              <button
                onClick={() => handleCopyMessage(chatNode.query)}
                className="p-1 bg-blue-600 rounded-full hover:bg-blue-700 relative group/tooltip"
                title=""
              >
                <Copy size={12} />
                <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  Copy message
                </div>
              </button>
              <button
                onClick={() =>
                  setDeleteConfirm({
                    nodeId: chatNode.id,
                    content: chatNode.query,
                  })
                }
                className="p-1 bg-red-600 rounded-full hover:bg-red-700 relative group/tooltip"
                title=""
              >
                <Trash2 size={12} />
                <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  Delete message
                </div>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // Render assistant message
  const renderAssistantMessage = (chatNode: ChatNodeT) => (
    <div className="flex justify-start mb-4">
      <div className="max-w-[90%] sm:max-w-[80%] bg-gray-100 dark:bg-gray-800 rounded-lg px-3 sm:px-4 py-2 relative group">
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
            onClick={() => handleRegenerateReply(chatNode.id)}
            className="p-1 bg-gray-600 rounded-full hover:bg-gray-700 relative group/tooltip"
            title=""
            disabled={isLoading}
          >
            <RotateCcw size={12} className={isLoading ? 'animate-spin' : ''} />
            <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              Regenerate response
            </div>
          </button>
          <button
            onClick={() =>
              handleCopyMessage(chatNode.response || chatNode.assistantText)
            }
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
    </div>
  );

  // Filter to show only the active chat path
  const getActiveChatPath = useCallback(() => {
    if (!activeNodeId || chatNodes.length === 0) return [];

    const nodeMap = new Map(chatNodes.map(node => [node.id, node]));
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
  }, [chatNodes, activeNodeId]);

  const activeChatPath = getActiveChatPath();

  return (
    <div
      className={`flex flex-col h-full bg-white dark:bg-gray-900 ${className || ''}`}
    >
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        {activeChatPath.map(chatNode => (
          <div key={chatNode.id} className="space-y-4">
            {renderUserMessage(chatNode)}
            {(chatNode.response || chatNode.assistantText) &&
              renderAssistantMessage(chatNode)}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="max-w-[80%] bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
              <LoadingDots />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        {branchingFromNode && (
          <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <GitBranch
                size={16}
                className="text-green-600 dark:text-green-400"
              />
              <span className="text-sm text-green-700 dark:text-green-300">
                Branching from message. Your next message will create a new
                branch.
              </span>
            </div>
            <button
              onClick={() => {
                setBranchingFromNode(null);
                toastSuccess('Branch mode cancelled');
              }}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        )}
        <div className="flex space-x-2">
          <textarea
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              branchingFromNode
                ? 'Type your message to create a new branch... (Enter to send, Shift+Enter for new line)'
                : 'Type your message... (Enter to send, Shift+Enter for new line)'
            }
            className={`flex-1 p-2 sm:p-3 border rounded-lg resize-none focus:ring-2 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm sm:text-base ${
              branchingFromNode
                ? 'border-green-300 dark:border-green-600 focus:ring-green-500'
                : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
            }`}
            rows={3}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className={`px-3 sm:px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
              branchingFromNode
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {branchingFromNode ? (
              <GitBranch size={18} className="sm:w-5 sm:h-5" />
            ) : (
              <Send size={18} className="sm:w-5 sm:h-5" />
            )}
            {isLoading && <div className="animate-pulse" />}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
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
                  {deleteConfirm.content.substring(0, 200)}
                  {deleteConfirm.content.length > 200 && '...'}
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
                  onClick={() => handleDeleteMessage(deleteConfirm.nodeId)}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
