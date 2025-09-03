'use client';

import React from 'react';
import { Search } from 'lucide-react';

interface ConversationSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  conversationCount: number;
}

export function ConversationSearch({
  searchQuery,
  onSearchChange,
  conversationCount,
}: ConversationSearchProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Your Conversations ({conversationCount})
      </h2>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search conversations..."
          className="pl-10 pr-4 py-2 w-full sm:w-64 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm"
        />
      </div>
    </div>
  );
}
