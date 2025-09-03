import { apiClient } from '@/lib/api-client';
import { Conversation } from './conversations.service';
import { NodeT } from '@/lib/types';

export interface ShareToken {
  token: string;
  conversationId: string;
  nodeId: string | null;
  createdAt: string;
  expiresAt: string;
  url: string;
}

export interface CreateShareLinkRequest {
  conversationId: string;
  expiryDays: number;
  nodeId?: string;
  activePathOnly?: boolean;
}

export interface ShareTokensResponse {
  tokens: ShareToken[];
}

export interface CreateShareLinkResponse {
  token: string;
  url: string;
}

export interface DeleteShareLinkRequest {
  token: string;
}

export const shareService = {
  // Get all share tokens for a conversation
  getShareTokens: async (
    conversationId: string
  ): Promise<ShareTokensResponse> => {
    return apiClient.get<ShareTokensResponse>('/share', { conversationId });
  },

  // Create new share link
  createShareLink: async (
    data: CreateShareLinkRequest
  ): Promise<CreateShareLinkResponse> => {
    return apiClient.post<CreateShareLinkResponse>('/share', data);
  },

  // Revoke share link
  revokeShareLink: async (data: DeleteShareLinkRequest): Promise<void> => {
    return apiClient.post('/share', data, {
      headers: { 'X-HTTP-Method-Override': 'DELETE' },
    });
  },

  // Get public shared content
  getPublicConversation: async (
    token: string
  ): Promise<{
    conversation: Conversation;
    nodes: NodeT[];
    rootNodeId: string;
  }> => {
    return apiClient.get(`/public/${token}`);
  },
};
