'use client';

import React from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  placeholder?: string;
  branchingFromNode?: string | null;
  branchingFromText?: string;
  onCancelBranch?: () => void;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  placeholder = 'Type your message...',
  branchingFromNode,
  branchingFromText,
  onCancelBranch,
}: ChatInputProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSubmit();
      }
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
      {/* Branch indicator */}
      {branchingFromNode && (
        <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Branching from message. Your next message will create a new
                branch.
              </p>
            </div>
            {onCancelBranch && (
              <button
                onClick={onCancelBranch}
                className="ml-3 text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 text-sm font-medium"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
      <div className="relative flex items-end space-x-3">
        <div className="relative flex-1">
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="w-full resize-none border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 min-h-[52px] max-h-32 scrollbar-hide"
            rows={1}
            style={{
              height: 'auto',
              minHeight: '52px',
            }}
            onInput={e => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 128) + 'px';
            }}
          />
          <button
            onClick={onSubmit}
            disabled={!value.trim() || isLoading}
            className="absolute right-3 bottom-3 w-8 h-8 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-200 dark:disabled:hover:bg-gray-700 flex items-center justify-center transition-colors duration-200 enabled:hover:text-gray-700 dark:enabled:hover:text-gray-300"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
