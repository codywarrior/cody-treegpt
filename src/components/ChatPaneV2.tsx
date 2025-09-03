'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Trash2, RotateCcw, Copy, GitBranch } from 'lucide-react';
import { ChatNodeT } from '../lib/types';
import { useToast } from '@/hooks/use-toast';
import { useCreateNode, useGenerateAIReply, useEditNode, useDeleteNode } from '@/hooks/use-nodes';
import { useQueryClient } from '@tanstack/react-query';
import { conversationKeys } from '@/hooks/use-conversations';

interface ChatPaneV2Props {
  chatNodes: ChatNodeT[];
  activeNodeId: string;
  conversationId: string;
  onBranchFromNode?: (nodeId: string, message: string) => Promise<void>;
  onNodeSelect: (nodeId: string) => void;
  className?: string;
}

export default function ChatPaneV2({
  chatNodes,
  activeNodeId,
  conversationId,
  onBranchFromNode,
  onNodeSelect,
  className,
}: ChatPaneV2Props) {
  // TanStack Query hooks
  const createNodeMutation = useCreateNode();
  const generateAIReplyMutation = useGenerateAIReply();
  const editNodeMutation = useEditNode();
  const deleteNodeMutation = useDeleteNode();
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [optimisticMessage, setOptimisticMessage] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [branchingFromNode, setBranchingFromNode] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    nodeId: string;
    content: string;
  } | null>(null);
  const [editingText, setEditingText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const toastSuccess = (message: string) => {
    toast({ title: 'Success', description: message });
  };

  const toastError = (message: string) => {
    toast({ title: 'Error', description: message, variant: 'destructive' });
  };


  // Auto-scroll to bottom when messages change or activeNodeId changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatNodes, optimisticMessage, isGeneratingAI, activeNodeId]);

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

  // Also scroll when the active chat path changes
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [activeChatPath.length]);

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
    const message = inputValue.trim();
    if (!message || isLoading) return;

    setInputValue('');
    setIsLoading(true);
    
    // Show optimistic message immediately
    setOptimisticMessage(message);

    try {
      if (branchingFromNode && onBranchFromNode) {
        await onBranchFromNode(branchingFromNode, message);
        setBranchingFromNode(null);
        setOptimisticMessage(null);
        toastSuccess('Branch created successfully');
      } else {
        createNodeMutation.mutate({
          conversationId,
          parentId: activeNodeId,
          role: 'user',
          text: message,
        }, {
          onSuccess: (response) => {
            // Clear optimistic message after a delay to ensure cache updates
            setTimeout(() => {
              setOptimisticMessage(null);
            }, 500);
            setIsGeneratingAI(true);
            toastSuccess('Message sent successfully');
            // Update activeNodeId to the new user node
            onNodeSelect(response.node.id);
            // Automatically trigger AI reply after user message
            const userNodeId = response.node.id;
            generateAIReplyMutation.mutate(userNodeId, {
              onSuccess: () => {
                setIsGeneratingAI(false);
                toastSuccess('AI response generated');
              },
              onError: (error) => {
                setIsGeneratingAI(false);
                toastError('Failed to generate AI response');
                console.error('AI reply error:', error);
              },
            });
          },
          onError: (error) => {
            setOptimisticMessage(null);
            toastError('Failed to send message');
            console.error('Send message error:', error);
          },
        });
      }
    } catch (error) {
      setOptimisticMessage(null);
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
    conversationId,
    createNodeMutation,
    generateAIReplyMutation,
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
      editNodeMutation.mutate(
        { nodeId, data: { text: newText } },
        {
          onSuccess: () => {
            setEditingNodeId(null);
            setEditingText('');
            toastSuccess('Message updated successfully');
          },
          onError: (error) => {
            toastError('Failed to update message');
            console.error('Edit message error:', error);
          },
        }
      );
    },
    [editNodeMutation, toastSuccess, toastError]
  );

  // Handle message deletion
  const handleDeleteMessage = useCallback(
    async (nodeId: string) => {
      deleteNodeMutation.mutate(nodeId, {
        onSuccess: () => {
          setDeleteConfirm(null);
          toastSuccess('Message deleted successfully');
        },
        onError: (error) => {
          toastError('Failed to delete message');
          console.error('Delete message error:', error);
        },
      });
    },
    [deleteNodeMutation, toastSuccess, toastError]
  );

  // Handle AI reply regeneration
  const handleRegenerateReply = useCallback(
    async (nodeId: string) => {
      setIsLoading(true);
      generateAIReplyMutation.mutate(nodeId, {
        onSuccess: () => {
          toastSuccess('AI response regenerated');
        },
        onError: (error) => {
          toastError('Failed to regenerate response');
          console.error('Regenerate reply error:', error);
        },
        onSettled: () => {
          setIsLoading(false);
        },
      });
    },
    [generateAIReplyMutation, toastSuccess, toastError]
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
    <motion.div 
      className="flex justify-end mb-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div 
        className="max-w-[90%] sm:max-w-[80%] bg-blue-500 text-white rounded-lg px-3 sm:px-4 py-2 relative group cursor-pointer hover:bg-blue-600 transition-colors"
        onClick={() => onNodeSelect(chatNode.id)}
      >
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
    </motion.div>
  );

  // Render assistant message
  const renderAssistantMessage = (chatNode: ChatNodeT) => (
    <motion.div 
      className="flex justify-start mb-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
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
    </motion.div>
  );

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

        {/* Show optimistic user message */}
        {optimisticMessage && (
          <motion.div 
            className="flex justify-end mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="max-w-[90%] sm:max-w-[80%] bg-blue-500 text-white rounded-lg px-3 sm:px-4 py-2 opacity-70">
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
        )}

        {/* Show AI thinking animation */}
        {isGeneratingAI && (
          <motion.div 
            className="flex justify-start mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="max-w-[80%] bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
              <LoadingDots />
            </div>
          </motion.div>
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

        <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className={`relative flex items-end space-x-2 p-2 rounded-2xl border-2 transition-colors ${
            branchingFromNode
              ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/10'
              : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
          } ${!inputValue.trim() ? '' : 'border-gray-300 dark:border-gray-500'}`}>
            <textarea
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                branchingFromNode
                  ? 'Type your message to create a new branch...'
                  : 'Message GPTree'
              }
              className="flex-1 bg-transparent border-none outline-none resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm sm:text-base max-h-32 min-h-[24px] py-1"
              rows={1}
              disabled={isLoading}
              style={{ height: 'auto' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className={`p-1.5 rounded-full transition-all duration-200 flex items-center justify-center ${
                !inputValue.trim() || isLoading
                  ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : branchingFromNode
                  ? 'bg-green-500 hover:bg-green-600 text-white shadow-sm hover:shadow-md'
                  : 'bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 shadow-sm hover:shadow-md'
              }`}
            >
              {branchingFromNode ? (
                <GitBranch size={16} />
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-current"
                >
                  <path
                    d="M7 11L12 6L17 11M12 18V7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {isLoading && <div className="animate-pulse" />}
            </button>
          </div>
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
                  onClick={() => deleteConfirm && handleDeleteMessage(deleteConfirm.nodeId)}
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
