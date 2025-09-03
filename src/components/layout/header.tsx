'use client';

import React from 'react';
import { ThemeToggle } from './theme-toggle';

interface HeaderProps {
  user: { displayName?: string | null; email: string } | null;
  onLogout: () => void;
}

export function Header({ user, onLogout }: HeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              GPTree
            </h1>
            <span className="hidden sm:inline ml-3 text-sm text-gray-500 dark:text-gray-400">
              Branching Conversations
            </span>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <ThemeToggle />
            <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-300 truncate max-w-32 sm:max-w-none">
              Welcome, {user?.displayName || user?.email}
            </span>
            <button
              onClick={onLogout}
              className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 sm:px-0 sm:py-0"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
