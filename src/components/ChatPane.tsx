'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, ThumbsUp, ThumbsDown, Share2, RotateCcw, Edit3, Trash2, Send } from 'lucide-react';
import { getActivePath } from '@/lib/tree-algorithms';
import { NodeT } from '@/lib/types';
import { Tooltip } from './Tooltip';
import { useToast, ToastContainer } from './Toast';
import { ConfirmDialog } from './ConfirmDialog';

interface ChatPaneProps {
  nodes: NodeT[];
  activeNodeId: string | null;
  onSendMessage: (text: string, parentId: string | null) => Promise<void>;
  onBranchFromNode: (nodeId: string, text: string) => Promise<void>;
  onRequestAIReply: (nodeId: string) => Promise<void>;
  onDeleteNode?: (nodeId: string) => Promise<void>;
  onEditNode?: (nodeId: string, newText: string) => Promise<void>;
  className?: string;
}

export function ChatPane({
  nodes,
  activeNodeId,
  onSendMessage,
  onBranchFromNode,
  onRequestAIReply,
  onDeleteNode,
  onEditNode,
  className
}: ChatPaneProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [buttonLoading, setButtonLoading] = useState<string | null>(null);
  const [branchingFromNode, setBranchingFromNode] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ nodeId: string; nodeText: string } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const toast = useToast();

  const nodesById = nodes.reduce((acc, node) => {
    acc[node.id] = node;
    return acc;
  }, {} as Record<string, NodeT>);

  const activePath = activeNodeId ? getActivePath(activeNodeId, nodesById) : [];

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

  const handleBranch = (nodeId: string) => {
    setBranchingFromNode(nodeId);
    setMessage('');
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

  const handleTryAgain = async (nodeId: string, buttonId: string) => {
    setButtonLoading(buttonId);
    try {
      await onRequestAIReply(nodeId);
      setButtonLoading(null);
    } catch (error) {
      console.error('Failed to regenerate response:', error);
      setButtonLoading(null);
    }
  };

  const handleEdit = (nodeId: string, text: string, buttonId: string) => {
    setEditingNodeId(nodeId);
    setEditText(text);
  };

  const handleSaveEdit = async () => {
    if (!editingNodeId || !onEditNode) return;
    
    try {
      await onEditNode(editingNodeId, editText);
      setEditingNodeId(null);
      setEditText('');
      toast.success('Message updated');
    } catch (err) {
      console.error('Failed to edit node:', err);
      toast.error('Failed to update message');
    }
  };

  const handleCancelEdit = () => {
    setEditingNodeId(null);
    setEditText('');
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

  const handleAIReply = async (nodeId: string) => {
    setIsLoading(true);
    try {
      await onRequestAIReply(nodeId);
    } catch (error) {
      console.error('Error requesting AI reply:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence mode="wait">
          {activePath.map((node, index) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className={`flex ${node.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg relative group cursor-pointer ${
                  node.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="whitespace-pre-wrap">
                  {editingNodeId === node.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
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
                          onClick={handleCancelEdit}
                          className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (node as any).isGenerating || node.text === 'Generating...' ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-pulse">Generating</div>
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  ) : (
                    node.text
                  )}
                </div>
                
                {/* Action buttons for messages */}
                <div className="absolute -bottom-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
                  <div className="flex space-x-1 bg-white rounded-lg shadow-lg border p-1">
                    {node.role === 'assistant' ? (
                      <>
                        <Tooltip content="Copy">
                          <button
                            onClick={() => handleCopy(node.text, `copy-${node.id}`)}
                            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
                            disabled={buttonLoading === `copy-${node.id}`}
                          >
                            <Copy className="w-3.5 h-3.5 text-gray-600" />
                          </button>
                        </Tooltip>
                        <Tooltip content="Good response">
                          <button
                            onClick={() => {/* TODO: thumbs up */}}
                            className="p-1.5 rounded hover:bg-gray-100"
                          >
                            <ThumbsUp className="w-3.5 h-3.5 text-gray-600" />
                          </button>
                        </Tooltip>
                        <Tooltip content="Bad response">
                          <button
                            onClick={() => {/* TODO: thumbs down */}}
                            className="p-1.5 rounded hover:bg-gray-100"
                          >
                            <ThumbsDown className="w-3.5 h-3.5 text-gray-600" />
                          </button>
                        </Tooltip>
                        <Tooltip content="Share">
                          <button
                            onClick={() => {/* TODO: share */}}
                            className="p-1.5 rounded hover:bg-gray-100"
                          >
                            <Share2 className="w-3.5 h-3.5 text-gray-600" />
                          </button>
                        </Tooltip>
                        <Tooltip content="Try again">
                          <button
                            onClick={() => handleTryAgain(node.parentId!, `tryagain-${node.id}`)}
                            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
                            disabled={buttonLoading === `tryagain-${node.id}`}
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-gray-600" />
                          </button>
                        </Tooltip>
                      </>
                    ) : (
                      <>
                        <Tooltip content="Copy">
                          <button
                            onClick={() => handleCopy(node.text, `copy-${node.id}`)}
                            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
                            disabled={buttonLoading === `copy-${node.id}`}
                          >
                            <Copy className="w-3.5 h-3.5 text-gray-600" />
                          </button>
                        </Tooltip>
                        <Tooltip content="Edit message">
                          <button
                            onClick={() => handleEdit(node.id, node.text, `edit-${node.id}`)}
                            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
                            disabled={buttonLoading === `edit-${node.id}`}
                          >
                            <Edit3 className="w-3.5 h-3.5 text-gray-600" />
                          </button>
                        </Tooltip>
                        {onDeleteNode && (
                          <Tooltip content="Delete message and all responses">
                            <button
                              onClick={() => handleDelete(node.id, node.text)}
                              className="p-1.5 rounded hover:bg-red-100"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            </button>
                          </Tooltip>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
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
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm text-gray-600">AI is thinking...</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
      
      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
      
      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <ConfirmDialog
          title="Delete Message"
          message={`Are you sure you want to delete this message and all its responses? This action cannot be undone.\n\n"${deleteConfirm.nodeText?.slice(0, 100)}${deleteConfirm.nodeText && deleteConfirm.nodeText.length > 100 ? '...' : ''}"`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm(null)}
          variant="danger"
        />
      )}
      
      {/* Input area */}
      <div className="border-t p-4">
        {branchingFromNode && (
          <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">Branching from:</span> 
                <span className="ml-1">{nodesById[branchingFromNode]?.text.slice(0, 50)}...</span>
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
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={
              branchingFromNode 
                ? "Enter your branch message..." 
                : "Type your message..."
            }
            className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
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
    </div>
  );
}
