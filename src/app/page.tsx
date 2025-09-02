'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MessageSquare, Edit2, Trash2 } from 'lucide-react';
import { Tooltip } from '@/components/Tooltip';
import { useToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import Link from 'next/link';

import { ConversationT, UserT } from '@/lib/types';

export default function Home() {
  const [user, setUser] = useState<UserT | null>(null);
  const [conversations, setConversations] = useState<ConversationT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
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
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, []);

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
        setConversations(prev =>
          prev.map(c => (c.id === editingId ? { ...c, title: editTitle } : c))
        );
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
        loadConversations();
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">GPTree</h1>
              <span className="ml-3 text-sm text-gray-500">
                Branching Conversations
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.displayName || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700"
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
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Start a New Conversation
          </h2>
          <div className="flex space-x-3">
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && createConversation()}
              placeholder="Enter conversation title..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={createConversation}
              disabled={!newTitle.trim() || isCreating}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>{isCreating ? 'Creating...' : 'Create'}</span>
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Your Conversations
            </h2>
          </div>

          {conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>
                No conversations yet. Create your first conversation to get
                started!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {conversations.map(conversation => (
                <div
                  key={conversation.id}
                  className="p-6 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {editingId === conversation.id ? (
                        <div className="flex items-center space-x-2 mb-2">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            onKeyPress={e =>
                              e.key === 'Enter' && saveEditConversation()
                            }
                            className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                          <button
                            onClick={saveEditConversation}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <Link href={`/c/${conversation.id}`} className="block">
                          <h3 className="text-lg font-medium text-gray-900 mb-1 hover:text-blue-600">
                            {conversation.title}
                          </h3>
                        </Link>
                      )}
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <div className="flex items-center">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          {new Date(
                            conversation.createdAt
                          ).toLocaleDateString()}
                        </div>
                        <div className="flex items-center">
                          <MessageSquare className="w-4 h-4 mr-1" />
                          {(
                            conversation as ConversationT & {
                              _count?: { nodes: number };
                            }
                          )._count?.nodes || 0}{' '}
                          messages
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Tooltip content="Edit conversation">
                        <button
                          onClick={() => handleEditConversation(conversation)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
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
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </Tooltip>
                      <Link
                        href={`/c/${conversation.id}`}
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        <svg
                          className="w-5 h-5"
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
