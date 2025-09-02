'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { MessageSquare, MoreHorizontal, Trash2, Send } from 'lucide-react';
import { ChatNodeT } from '../lib/types';
import { getChatActivePath } from '../lib/chat-utils';
import { useToast } from './Toast';
import '../styles/markdown.css';

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
    content: string;
  } | null>(null);
  const [selectedChildIndices, setSelectedChildIndices] = useState<
    Record<string, number>
  >({});
  const { success: toastSuccess, error: toastError } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatNodeMap = new Map(chatNodes.map(node => [node.id, node]));
  const activePathIds = getChatActivePath(chatNodes, activeNodeId);
  const activePath = activePathIds
    .map(id => chatNodeMap.get(id))
    .filter((node): node is ChatNodeT => node !== undefined);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeNodeId) return;

      const activeNode = chatNodes.find(node => node.id === activeNodeId);
      if (!activeNode) return;

      const children = chatNodes.filter(node => node.parentId === activeNodeId);
      if (children.length <= 1) return;

      const currentIndex = selectedChildIndices[activeNodeId] || 0;

      if (e.key === 'h' && currentIndex > 0) {
        e.preventDefault();
        setSelectedChildIndices(prev => ({
          ...prev,
          [activeNodeId]: currentIndex - 1,
        }));
      } else if (e.key === 'l' && currentIndex < children.length - 1) {
        e.preventDefault();
        setSelectedChildIndices(prev => ({
          ...prev,
          [activeNodeId]: currentIndex + 1,
        }));
      } else if (e.key === 'j') {
        e.preventDefault();
        const selectedChild = children[currentIndex];
        if (selectedChild) {
          onNodeSelect?.(selectedChild.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeNodeId, chatNodes, selectedChildIndices, onNodeSelect]);

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
      toastSuccess('Message copied to clipboard');
    } catch (err) {
      console.error('Failed to copy text:', err);
      toastError('Failed to copy message');
    } finally {
      setButtonLoading(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingNodeId || !onEditNode) return;

    try {
      await onEditNode(editingNodeId, editingText);
      setEditingNodeId(null);
      setEditingText('');
    } catch (err) {
      console.error('Failed to edit node:', err);
      toastError('Failed to update message');
    }
  };

  const cancelEdit = () => {
    setEditingText('');
    setEditingNodeId(null);
  };

  const handleDelete = (nodeId: string, nodeText: string) => {
    if (buttonLoading) return; // Prevent double triggers
    setDeleteConfirm({ nodeId, content: nodeText });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm || !onDeleteNode || buttonLoading) return;

    setButtonLoading(`delete_${deleteConfirm.nodeId}`);
    try {
      await onDeleteNode(deleteConfirm.nodeId);
      setDeleteConfirm(null);
      toastSuccess('Message deleted');
    } catch (err) {
      console.error('Failed to delete node:', err);
      toastError('Failed to delete message');
    } finally {
      setButtonLoading(null);
    }
  };

  const getNodeChildren = useCallback(
    (nodeId: string): string[] => {
      return chatNodes.filter(n => n.parentId === nodeId).map(n => n.id);
    },
    [chatNodes]
  );

  const handleTryAgain = async (nodeId: string) => {
    if (buttonLoading) return; // Prevent double triggers

    const node = chatNodeMap.get(nodeId);
    if (!node || !node.parentId) return;

    const parentNode = chatNodeMap.get(node.parentId);
    if (!parentNode) return;

    setButtonLoading(`try_again_${nodeId}`);
    try {
      await onRequestAIReply(node.parentId);
    } catch (error) {
      console.error('Failed to try again:', error);
      toastError('Failed to generate new response');
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
            ) : isUser ? (
              content
            ) : (
              <div className="markdown-content prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-800 prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {content}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="relative group">
            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 z-10 bg-white rounded shadow-md p-1 border border-gray-200">
              <button
                onClick={() => handleCopy(content, `copy_assistant_${nodeId}`)}
                disabled={buttonLoading === `copy_assistant_${nodeId}`}
                className="p-1 hover:bg-gray-50 transition-colors"
                title="Copy response"
              >
                {buttonLoading === `copy_assistant_${nodeId}` ? (
                  <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <MessageSquare className="w-3 h-3 text-gray-600" />
                )}
              </button>
              <button
                onClick={() => handleTryAgain(targetNodeId)}
                disabled={buttonLoading !== null}
                className="p-1 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Try Again"
              >
                {buttonLoading === `try_again_${targetNodeId}` ? (
                  <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <MoreHorizontal className="w-3 h-3 text-blue-600" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderChatMessageUser = (
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
            ) : isUser ? (
              content
            ) : (
              <div className="markdown-content prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-800 prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {content}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="relative group">
            <div className="absolute -top-2 -left-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 z-20 bg-white rounded shadow-md p-1 border border-gray-200">
              <button
                onClick={() => handleCopy(content, `copy_user_${nodeId}`)}
                disabled={buttonLoading === `copy_user_${nodeId}`}
                className="p-1 hover:bg-gray-50 transition-colors"
                title="Copy message"
              >
                {buttonLoading === `copy_user_${nodeId}` ? (
                  <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <MessageSquare className="w-3 h-3 text-gray-600" />
                )}
              </button>
              <button
                onClick={() => setBranchingFromNode(nodeId)}
                disabled={buttonLoading !== null}
                className="p-1 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Branch from here"
              >
                <MoreHorizontal className="w-3 h-3 text-blue-600" />
              </button>
              <button
                onClick={() => handleDelete(nodeId, content)}
                disabled={buttonLoading !== null}
                className="p-1 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete message"
              >
                <Trash2 className="w-3 h-3 text-red-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBranchingUI = (chatNode: ChatNodeT, isLastNode: boolean) => {
    // Try Again button moved to hover toolbar on assistant nodes
    return null;
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 relative">
        <AnimatePresence mode="wait">
          {chatNodes.map((chatNode, index) => {
            const isLastNode = index === chatNodes.length - 1;
            return (
              <motion.div
                key={chatNode.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="space-y-6"
              >
                {/* User message */}
                {renderChatMessageUser(
                  chatNode.query,
                  true,
                  chatNode.id,
                  editingNodeId === chatNode.id
                )}

                {/* Assistant response with streaming effect */}
                {chatNode.response ? (
                  renderChatMessage(
                    chatNode.response,
                    false,
                    `${chatNode.id}_assistant`,
                    false
                  )
                ) : isLastNode && isLoading ? (
                  <div className="flex justify-start mb-4">
                    <div className="max-w-[80%] p-4 rounded-lg bg-gray-100 text-gray-800 border-l-4 border-blue-500">
                      <div className="flex items-center space-x-3">
                        <div className="flex space-x-1">
                          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"></div>
                          <div
                            className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"
                            style={{ animationDelay: '0.15s' }}
                          ></div>
                          <div
                            className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"
                            style={{ animationDelay: '0.3s' }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          AI is generating response...
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Branching UI */}
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

      <div ref={messagesEndRef} />

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

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-900/80 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Message</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this message and all its
              responses?
            </p>
            <div className="text-sm text-gray-500 mb-4 p-2 bg-gray-50 rounded">
              {deleteConfirm.content.slice(0, 50)}...&quot;
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
