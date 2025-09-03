import { apiClient } from '@/lib/api-client';
import { NodeT } from '@/lib/types';

export interface Conversation {
  id: string;
  ownerId: string;
  title: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConversationRequest {
  title: string;
}

export interface UpdateConversationRequest {
  title: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
}

export interface ConversationResponse {
  conversation: Conversation & {
    nodes: NodeT[];
  };
}

export const conversationService = {
  // Get all conversations
  getConversations: async (): Promise<{ conversations: Conversation[] }> => {
    return apiClient.get<{ conversations: Conversation[] }>('/conversations');
  },

  // Get single conversation with nodes
  getConversation: async (
    id: string
  ): Promise<{
    conversation: Conversation;
    nodes: NodeT[];
    rootNodeId: string;
  }> => {
    return apiClient.get<{
      conversation: Conversation;
      nodes: NodeT[];
      rootNodeId: string;
    }>(`/conversations/${id}`);
  },

  // Create new conversation
  createConversation: async (data: {
    title: string;
  }): Promise<{ conversation: Conversation }> => {
    return apiClient.post<{ conversation: Conversation }>(
      '/conversations',
      data
    );
  },

  // Update conversation title
  updateConversation: async (
    id: string,
    data: { title: string }
  ): Promise<{ conversation: Conversation }> => {
    return apiClient.patch<{ conversation: Conversation }>(
      `/conversations/${id}`,
      data
    );
  },

  // Delete conversation
  deleteConversation: async (id: string): Promise<void> => {
    return apiClient.delete(`/conversations/${id}`);
  },
};
