'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface CreateConversationFormProps {
  onCreateConversation: (title: string) => void;
  isCreating: boolean;
}

export function CreateConversationForm({
  onCreateConversation,
  isCreating,
}: CreateConversationFormProps) {
  const [newTitle, setNewTitle] = useState('');

  const handleSubmit = () => {
    if (!newTitle.trim()) return;
    onCreateConversation(newTitle.trim());
    setNewTitle('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6 mb-6 sm:mb-8 border border-gray-200 dark:border-gray-700">
      <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
        Start a New Conversation
      </h2>
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
        <input
          type="text"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter conversation title..."
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm sm:text-base"
        />
        <button
          onClick={handleSubmit}
          disabled={!newTitle.trim() || isCreating}
          className="px-3 sm:px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center space-x-2 text-sm sm:text-base"
        >
          <Plus className="w-4 h-4" />
          <span>{isCreating ? 'Creating...' : 'Create'}</span>
        </button>
      </div>
    </div>
  );
}
