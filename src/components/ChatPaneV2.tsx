'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Copy,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { ChatNodeT } from '../lib/types';
import { getChatActivePath } from '../lib/chat-utils';
import { useToast } from './Toast';

interface ChatPaneV2Props {
  chatNodes: ChatNodeT[];
  activeNodeId: string | null;
  onSendMessage: (text: string, parentId: string | null) => Promise<void>;
  onBranchFromNode: (nodeId: string, text: string) => Promise<void>;
  onRequestAIReply: (nodeId: string) => Promise<void>;
  onDeleteNode?: (nodeId: string) => Promise<void>;
  onEditNode?: (nodeId: string, newText: string) => Promise<void>;
  onNodeSelect?: (nodeId: string) => void;
  className?: string;
}

export function ChatPaneV2({
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
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [buttonLoading, setButtonLoading] = useState<string | null>(null);
  const [branchingFromNode, setBranchingFromNode] = useState<string | null>(
    null
  );
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    nodeId: string;
    nodeText: string;
  } | null>(null);
  // State for keyboard navigation
  const [selectedChildIndex, setSelectedChildIndex] = useState<
    Record<string, number>
  >({});
  const toast = useToast();

  const chatNodeMap = new Map(chatNodes.map(node => [node.id, node]));
  const activePathIds = getChatActivePath(chatNodes, activeNodeId);
  const activePath = activePathIds
    .map(id => chatNodeMap.get(id))
    .filter((node): node is ChatNodeT => node !== undefined);

  // Keyboard navigation for treegpt-style interaction
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keys when not editing and not in input field
      if (
        editingNodeId ||
        (e.target as HTMLElement)?.tagName === 'INPUT' ||
        (e.target as HTMLElement)?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      const lastNode = activePath[activePath.length - 1];
      if (!lastNode) return;

      const children = getNodeChildren(lastNode.id);
      if (children.length <= 1) return;

      const currentIndex = selectedChildIndex[lastNode.id] || 0;

      if (e.key === 'h' && currentIndex > 0) {
        // Navigate left (previous branch)
        e.preventDefault();
        setSelectedChildIndex(prev => ({
          ...prev,
          [lastNode.id]: currentIndex - 1,
        }));
      } else if (e.key === 'l' && currentIndex < children.length - 1) {
        // Navigate right (next branch)
        e.preventDefault();
        setSelectedChildIndex(prev => ({
          ...prev,
          [lastNode.id]: currentIndex + 1,
        }));
      } else if (e.key === 'j') {
        // Navigate down (select current branch)
        e.preventDefault();
        const selectedChildId = children[currentIndex];
        if (selectedChildId && onNodeSelect) {
          onNodeSelect(selectedChildId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePath, selectedChildIndex, editingNodeId, onNodeSelect]);

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    try {
      if (branchingFromNode) {
        await onBranchFromNode(branchingFromNode, message);
        setBranchingFromNode(null);
      } else {
        await onSendMessage(message, activeNodeId);
      }
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (text: string, buttonId: string) => {
    setButtonLoading(buttonId);
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
      setTimeout(() => setButtonLoading(null), 1000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast.error('Failed to copy text');
      setButtonLoading(null);
    }
  };

  const handleEdit = (nodeId: string, text: string) => {
    setEditingNodeId(nodeId);
    setEditingText(text);
  };

  const handleSaveEdit = async () => {
    if (!editingNodeId || !onEditNode) return;

    try {
      await onEditNode(editingNodeId, editingText);
      setEditingNodeId(null);
      setEditingText('');
      setEditingNodeId(editingNodeId);
    } catch (err) {
      console.error('Failed to edit node:', err);
      toast.error('Failed to update message');
    }
  };

  const cancelEdit = () => {
    setEditingText('');
    setEditingNodeId(null);
  };

  const handleDelete = (nodeId: string, nodeText: string) => {
    setDeleteConfirm({ nodeId, nodeText });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm || !onDeleteNode) return;

    try {
      await onDeleteNode(deleteConfirm.nodeId);
      toast.success('Message deleted');
    } catch (err) {
      console.error('Failed to delete node:', err);
      toast.error('Failed to delete message');
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Get children for a node from the graph structure
  const getNodeChildren = (nodeId: string): string[] => {
    const node = chatNodeMap.get(nodeId);
    if (!node) return [];

    // Find all nodes that have this node as parent
    return chatNodes.filter(n => n.parentId === nodeId).map(n => n.id);
  };

  // Handle Try Again functionality - generate alternative response
  const handleTryAgain = async (nodeId: string) => {
    const node = chatNodeMap.get(nodeId);
    if (!node || !node.parentId) return;

    const parentNode = chatNodeMap.get(node.parentId);
    if (!parentNode) return;

    setButtonLoading(`try_again_${nodeId}`);
    try {
      // Generate alternative response by requesting AI reply for the parent node
      await onRequestAIReply(node.parentId);
    } catch (error) {
      console.error('Failed to generate alternative response:', error);
    } finally {
      setButtonLoading(null);
    }
  };

  const renderChatMessage = (
    content: string,
    isUser: boolean,
    nodeId: string,
    isEditing: boolean = false
  ) => {
    const targetNodeId = nodeId.replace('_assistant', '');
    const isActive = targetNodeId === activeNodeId;

    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[80%] p-3 rounded-lg relative group cursor-pointer transition-all duration-300 transform ${
            isUser
              ? isActive
                ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-lg scale-105'
                : 'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-md hover:scale-102'
              : isActive
                ? 'bg-blue-50 text-gray-900 ring-2 ring-blue-400 shadow-lg scale-105 border-l-4 border-blue-500'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200 hover:shadow-md hover:scale-102'
          }`}
          onClick={() => {
            onNodeSelect?.(targetNodeId);
          }}
        >
          <div className="whitespace-pre-wrap">
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editingText}
                  onChange={e => setEditingText(e.target.value)}
                  className="w-full p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  autoFocus
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleSaveEdit}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              content
            )}
          </div>

          {/* Action buttons */}
          <div className="absolute -bottom-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
            <div className="flex space-x-1 bg-white rounded-lg shadow-lg border p-1">
              <button
                onClick={() => handleCopy(content, `copy-${nodeId}`)}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
                disabled={buttonLoading === `copy-${nodeId}`}
                title="Copy"
              >
                <Copy className="w-3.5 h-3.5 text-gray-600" />
              </button>

              {!isUser && (
                <>
                  <button
                    className="p-1.5 rounded hover:bg-gray-100"
                    title="Good response"
                  >
                    <ThumbsUp className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                  <button
                    className="p-1.5 rounded hover:bg-gray-100"
                    title="Bad response"
                  >
                    <ThumbsDown className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleTryAgain(nodeId)}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
                    disabled={buttonLoading === `try_again_${nodeId}`}
                    title="Try again"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                </>
              )}

              {isUser && (
                <>
                  <button
                    onClick={() => handleEdit(nodeId, content)}
                    className="p-1.5 rounded hover:bg-gray-100"
                    title="Edit message"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                  {onDeleteNode && (
                    <button
                      onClick={() => handleDelete(nodeId, content)}
                      className="p-1.5 rounded hover:bg-red-100"
                      title="Delete message and all responses"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBranchingUI = (chatNode: ChatNodeT, isLastNode: boolean) => {
    const children = getNodeChildren(chatNode.id);
    if (!isLastNode || children.length <= 1) return null;

    const currentChildIndex = selectedChildIndex[chatNode.id] || 0;
    const selectedChildId = children[currentChildIndex];
    const selectedChild = chatNodeMap.get(selectedChildId);

    return (
      <div className="mt-4 space-y-2">
        <div className="text-sm font-semibold text-center">
          {currentChildIndex + 1}/{children.length} responses
        </div>

        <div className="flex items-center justify-between gap-2 border-2 border-dotted border-gray-300 rounded-lg p-4 hover:bg-accent/50 cursor-pointer">
          {currentChildIndex > 0 && (
            <button
              onClick={() =>
                setSelectedChildIndex(prev => ({
                  ...prev,
                  [chatNode.id]: currentChildIndex - 1,
                }))
              }
              className="p-2 hover:bg-accent rounded-full transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <div className="flex-1 text-center">
            {selectedChild && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  <strong>U:</strong> {selectedChild.query.slice(0, 50)}...
                </div>
                <div className="text-sm text-gray-600">
                  <strong>A:</strong> {selectedChild.response.slice(0, 50)}...
                </div>
              </div>
            )}
          </div>

          {currentChildIndex < children.length - 1 && (
            <button
              onClick={() =>
                setSelectedChildIndex(prev => ({
                  ...prev,
                  [chatNode.id]: currentChildIndex + 1,
                }))
              }
              className="p-2 hover:bg-accent rounded-full transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Try Again button for generating alternative responses */}
        <div className="flex justify-center mt-2">
          <button
            onClick={() => handleTryAgain(chatNode.id)}
            disabled={buttonLoading === `try_again_${chatNode.id}`}
            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors disabled:opacity-50 flex items-center space-x-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence mode="wait">
          {activePath.map((chatNode, index) => {
            const isLastNode = index === activePath.length - 1;
            return (
              <motion.div
                key={chatNode.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="space-y-4"
              >
                {/* User message */}
                {renderChatMessage(
                  chatNode.query,
                  true,
                  chatNode.id,
                  editingNodeId === chatNode.id
                )}

                {/* Assistant response with streaming effect */}
                {isLastNode && !chatNode.response && isLoading ? (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] p-3 rounded-lg bg-gray-100 text-gray-800">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: '0.1s' }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: '0.2s' }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">
                          Thinking...
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  renderChatMessage(
                    chatNode.response,
                    false,
                    `${chatNode.id}_assistant`,
                    false
                  )
                )}

                {/* Branching UI for multiple responses */}
                {renderBranchingUI(chatNode, isLastNode)}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="max-w-[80%] p-3 rounded-lg bg-gray-100 text-gray-900 relative">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600">AI is thinking...</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Toast Container */}
      <toast.ToastContainer />

      {/* Input area */}
      <div className="border-t p-4">
        {branchingFromNode && (
          <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">Branching from:</span>
                <span className="ml-1">
                  {chatNodeMap
                    .get(branchingFromNode || '')
                    ?.query.slice(0, 50) || ''}
                  ...
                </span>
              </div>
              <button
                onClick={() => setBranchingFromNode(null)}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyPress={e => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type your message..."
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>{branchingFromNode ? 'Branch' : 'Send'}</span>
          </button>
        </div>
      </div>

      {/* Toast Container */}
      <toast.ToastContainer />

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Message</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this message and all its
              responses?
            </p>
            <div className="text-sm text-gray-500 mb-4 p-2 bg-gray-50 rounded">
              &quot;{deleteConfirm.nodeText.slice(0, 100)}...&quot;
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
