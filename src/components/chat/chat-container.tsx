'use client';

import React, { useState, useCallback } from 'react';
import { MessageList } from './message-list';
import { useChatActions } from '@/hooks/use-chat-actions';
import { ChatNodeT } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface ChatContainerProps {
  conversationId: string;
  chatNodes: ChatNodeT[];
  activeNodeId: string | null;
  onNodeSelect: (nodeId: string) => void;
  onBranchFromNode?: (nodeId: string, message: string) => Promise<void>;
  isGeneratingAI?: boolean;
  className?: string;
}

export function ChatContainer({
  conversationId,
  chatNodes,
  activeNodeId,
  onNodeSelect,
  onBranchFromNode,
  isGeneratingAI: externalIsGeneratingAI = false,
  className = '',
}: ChatContainerProps) {
  const [inputValue, setInputValue] = useState('');
  const [optimisticMessage, setOptimisticMessage] = useState<string | null>(
    null
  );
  const [localIsGeneratingAI, setLocalIsGeneratingAI] = useState(false);
  const isGeneratingAI = externalIsGeneratingAI || localIsGeneratingAI;
  const [branchingFromNode, setBranchingFromNode] = useState<string | null>(
    null
  );
  const { toast } = useToast();

  const {
    sendMessage,
    editMessage,
    deleteMessage,
    copyToClipboard,
    isLoading,
  } = useChatActions({
    conversationId,
    onNodeSelect,
    onBranchFromNode,
  });

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue('');

    await sendMessage(message, activeNodeId, branchingFromNode, {
      onOptimisticStart: (msg: string) => {
        setOptimisticMessage(msg);
      },
      onOptimisticEnd: () => {
        setOptimisticMessage(null);
      },
      onLoadingStart: () => setLocalIsGeneratingAI(true),
      onLoadingEnd: () => {
        setLocalIsGeneratingAI(false);
      },
      setBranchingFromNode: (nodeId: string | null) => {
        setBranchingFromNode(nodeId);
        if (nodeId === null) {
          toast({
            title: 'Success',
            description: 'Branch created successfully',
          });
        }
      },
    });
  }, [
    inputValue,
    isLoading,
    sendMessage,
    activeNodeId,
    branchingFromNode,
    toast,
  ]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <MessageList
        messages={chatNodes}
        activeNodeId={activeNodeId}
        onNodeSelect={onNodeSelect}
        onEditMessage={editMessage}
        onDeleteMessage={deleteMessage}
        onBranchFromMessage={setBranchingFromNode}
        optimisticMessage={optimisticMessage}
        isGeneratingAI={isGeneratingAI}
      />
      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        {branchingFromNode && !isGeneratingAI && (
          <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg
                className="w-4 h-4 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7l4-4m0 0l4 4m-4-4v18"
                />
              </svg>
              <span className="text-sm text-green-700 dark:text-green-300">
                Branching from message. Your next message will create a new
                branch.
              </span>
            </div>
            <button
              onClick={() => {
                setBranchingFromNode(null);
                toast({
                  title: 'Success',
                  description: 'Branch mode cancelled',
                });
              }}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div
            className={`relative flex items-end space-x-2 p-2 rounded-2xl border-2 transition-colors ${
              branchingFromNode
                ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/10'
                : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
            } ${!inputValue.trim() ? '' : 'border-gray-300 dark:border-gray-500'}`}
          >
            <textarea
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                isGeneratingAI
                  ? 'Please wait for AI response...'
                  : branchingFromNode
                    ? 'Type your message to create a new branch...'
                    : 'Message GPTree'
              }
              className="flex-1 bg-transparent border-none outline-none resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm sm:text-base max-h-32 min-h-[24px] py-1"
              rows={1}
              disabled={isLoading || isGeneratingAI}
              style={{ height: 'auto' }}
              onInput={e => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading || isGeneratingAI}
              className={`p-1.5 rounded-full transition-all duration-200 flex items-center justify-center ${
                !inputValue.trim() || isLoading || isGeneratingAI
                  ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : branchingFromNode
                    ? 'bg-green-500 hover:bg-green-600 text-white shadow-sm hover:shadow-md'
                    : 'bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 shadow-sm hover:shadow-md'
              }`}
            >
              {branchingFromNode ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7l4-4m0 0l4 4m-4-4v18"
                  />
                </svg>
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
    </div>
  );
}
