'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { CreateConversationForm } from '@/components/conversation/create-conversation-form';
import { ConversationSearch } from '@/components/conversation/conversation-search';
import { ConversationList } from '@/components/conversation/conversation-list';

import { ConversationT } from '@/lib/types';
import { useToast } from '@/components/ui/toast-provider';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  useConversations,
  useCreateConversation,
  useUpdateConversation,
  useDeleteConversation,
  useLogout,
} from '@/hooks/use-conversations';
import { useCurrentUser } from '@/hooks/use-auth';

export default function Home() {
  const [filteredConversations, setFilteredConversations] = useState<
    ConversationT[]
  >([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const toast = useToast();
  const router = useRouter();

  // TanStack Query hooks
  const { data: userData, isLoading: userLoading } = useCurrentUser();
  const { data: conversationsData, isLoading: conversationsLoading } =
    useConversations();
  const createConversationMutation = useCreateConversation();
  const updateConversationMutation = useUpdateConversation();
  const deleteConversationMutation = useDeleteConversation();
  const logoutMutation = useLogout();

  const user = userData?.user || null;
  const conversations = useMemo(
    () => (conversationsData?.conversations || []) as ConversationT[],
    [conversationsData?.conversations]
  );
  const isLoading = userLoading || conversationsLoading;

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/auth/signin');
    }
  }, [user, userLoading, router]);

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

  const createConversation = async (title: string) => {
    createConversationMutation.mutate(
      { title },
      {
        onSuccess: response => {
          router.push(`/c/${response.conversation.id}`);
        },
      }
    );
  };

  const handleLogout = async () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        router.push('/auth/signin');
      },
    });
  };

  const handleEditConversation = (conversation: ConversationT) => {
    setEditingId(conversation.id);
    setEditTitle(conversation.title);
  };

  const saveEditConversation = async () => {
    if (!editingId || !editTitle.trim()) return;

    updateConversationMutation.mutate(
      { id: editingId, data: { title: editTitle.trim() } },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditTitle('');
        },
      }
    );
  };

  const deleteConversation = (id: string, title: string) => {
    setDeleteConfirm({ id, title });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    deleteConversationMutation.mutate(deleteConfirm.id, {
      onSettled: () => {
        setDeleteConfirm(null);
      },
    });
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
      <Header user={user} onLogout={handleLogout} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CreateConversationForm
          onCreateConversation={createConversation}
          isCreating={createConversationMutation.isPending}
        />

        {/* Conversations List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <ConversationSearch
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              conversationCount={filteredConversations.length}
            />
          </div>
          <ConversationList
            conversations={filteredConversations}
            searchQuery={searchQuery}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            editingId={editingId}
            editTitle={editTitle}
            onEdit={handleEditConversation}
            onDelete={deleteConversation}
            onEditTitleChange={setEditTitle}
            onSaveEdit={saveEditConversation}
            onCancelEdit={() => setEditingId(null)}
            onPageChange={setCurrentPage}
          />
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
