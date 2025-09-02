'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  MessageSquare,
  Edit2,
  Trash2,
  Search,
  ChevronDown,
} from 'lucide-react';
import { Tooltip } from '@/components/Tooltip';
import { ThemeToggle } from '@/components/ThemeToggle';
import Link from 'next/link';

import { ConversationT, UserT } from '@/lib/types';
import { useToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function Home() {
  const [user, setUser] = useState<UserT | null>(null);
  const [conversations, setConversations] = useState<ConversationT[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<
    ConversationT[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const toast = useToast();
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        router.push('/auth/signin');
      }
    } catch {
      router.push('/auth/signin');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations);
        setFilteredConversations(data.conversations);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, []);

  // Filter conversations based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conv =>
        conv.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
    setCurrentPage(1); // Reset to first page when searching
  }, [conversations, searchQuery]);

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      await loadConversations();
    };
    init();
  }, [checkAuth, loadConversations]);

  const createConversation = async () => {
    if (!newTitle.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      });

      if (response.ok) {
        const { conversation } = await response.json();
        setNewTitle('');
        toast.success('Conversation created');
        router.push(`/c/${conversation.id}`);
      } else {
        toast.error('Failed to create conversation');
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to create conversation');
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/signin');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleEditConversation = (conversation: ConversationT) => {
    setEditingId(conversation.id);
    setEditTitle(conversation.title);
  };

  const updateConversationTitle = async (id: string, title: string) => {
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });

      if (response.ok) {
        toast.success('Conversation updated');
        // Update local state immediately for better UX
        const updatedConversations = conversations.map(c =>
          c.id === editingId ? { ...c, title: editTitle } : c
        );
        setConversations(updatedConversations);
        setFilteredConversations(updatedConversations);
        setEditingId(null);
        setEditTitle('');
      } else {
        toast.error('Failed to update conversation');
      }
    } catch (error) {
      console.error('Failed to update conversation:', error);
      toast.error('Failed to update conversation');
    }
  };

  const saveEditConversation = async () => {
    if (!editingId || !editTitle.trim()) return;

    await updateConversationTitle(editingId, editTitle);
  };

  const deleteConversation = (id: string, title: string) => {
    setDeleteConfirm({ id, title });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      const response = await fetch(`/api/conversations/${deleteConfirm.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Conversation deleted');
        const updatedConversations = conversations.filter(
          c => c.id !== deleteConfirm.id
        );
        setConversations(updatedConversations);
        setFilteredConversations(updatedConversations);
      } else {
        toast.error('Failed to delete conversation');
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      toast.error('Failed to delete conversation');
    } finally {
      setDeleteConfirm(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
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
                onClick={handleLogout}
                className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 sm:px-0 sm:py-0"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create New Conversation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6 mb-6 sm:mb-8 border border-gray-200 dark:border-gray-700">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
            Start a New Conversation
          </h2>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && createConversation()}
              placeholder="Enter conversation title..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm sm:text-base"
            />
            <button
              onClick={createConversation}
              disabled={!newTitle.trim() || isCreating}
              className="px-3 sm:px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center space-x-2 text-sm sm:text-base"
            >
              <Plus className="w-4 h-4" />
              <span>{isCreating ? 'Creating...' : 'Create'}</span>
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Your Conversations ({filteredConversations.length})
              </h2>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="pl-10 pr-4 py-2 w-full sm:w-64 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm"
                />
              </div>
            </div>
          </div>
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p>
                {searchQuery
                  ? 'No conversations match your search.'
                  : 'No conversations yet. Create your first conversation to get started!'}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredConversations
                  .slice(
                    (currentPage - 1) * itemsPerPage,
                    currentPage * itemsPerPage
                  )
                  .map(conversation => (
                    <div
                      key={conversation.id}
                      className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
                        <div className="flex-1 min-w-0">
                          {editingId === conversation.id ? (
                            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mb-2">
                              <input
                                type="text"
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                onKeyPress={e =>
                                  e.key === 'Enter' && saveEditConversation()
                                }
                                className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm"
                                autoFocus
                              />
                              <div className="flex space-x-2">
                                <button
                                  onClick={saveEditConversation}
                                  className="px-3 py-1 bg-blue-500 dark:bg-blue-600 text-white rounded text-sm hover:bg-blue-600 dark:hover:bg-blue-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-sm hover:bg-gray-400 dark:hover:bg-gray-500"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <Link
                              href={`/c/${conversation.id}`}
                              className="block"
                            >
                              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-1 hover:text-blue-600 dark:hover:text-blue-400 truncate">
                                {conversation.title}
                              </h3>
                            </Link>
                          )}
                          <div className="flex flex-col sm:flex-row sm:items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 space-y-1 sm:space-y-0 sm:space-x-4">
                            <div className="flex items-center">
                              <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                              {new Date(
                                conversation.createdAt
                              ).toLocaleDateString()}
                            </div>
                            <div className="flex items-center">
                              <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                              {(
                                conversation as ConversationT & {
                                  _count?: { nodes: number };
                                }
                              )._count?.nodes || 0}{' '}
                              messages
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-end space-x-1 sm:space-x-2 flex-shrink-0">
                          <Tooltip content="Edit conversation">
                            <button
                              onClick={() =>
                                handleEditConversation(conversation)
                              }
                              className="p-1.5 sm:p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                              <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          </Tooltip>
                          <Tooltip content="Delete conversation">
                            <button
                              onClick={() =>
                                deleteConversation(
                                  conversation.id,
                                  conversation.title
                                )
                              }
                              className="p-1.5 sm:p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          </Tooltip>
                          <Link
                            href={`/c/${conversation.id}`}
                            className="p-1.5 sm:p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <svg
                              className="w-4 h-4 sm:w-5 sm:h-5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Pagination */}
              {filteredConversations.length > itemsPerPage && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Showing{' '}
                      {Math.min(
                        (currentPage - 1) * itemsPerPage + 1,
                        filteredConversations.length
                      )}{' '}
                      to{' '}
                      {Math.min(
                        currentPage * itemsPerPage,
                        filteredConversations.length
                      )}{' '}
                      of {filteredConversations.length} conversations
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() =>
                          setCurrentPage(prev => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Page {currentPage} of{' '}
                        {Math.ceil(filteredConversations.length / itemsPerPage)}
                      </span>
                      <button
                        onClick={() =>
                          setCurrentPage(prev =>
                            Math.min(
                              prev + 1,
                              Math.ceil(
                                filteredConversations.length / itemsPerPage
                              )
                            )
                          )
                        }
                        disabled={
                          currentPage >=
                          Math.ceil(filteredConversations.length / itemsPerPage)
                        }
                        className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <toast.ToastContainer />

      {deleteConfirm && (
        <ConfirmDialog
          title="Delete Conversation"
          message={`Are you sure you want to delete "${deleteConfirm.title}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm(null)}
          variant="danger"
        />
      )}
    </div>
  );
}
