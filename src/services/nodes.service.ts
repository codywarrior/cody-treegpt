import { apiClient } from '@/lib/api-client';

export interface ChatNode {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  parentId: string | null;
  conversationId: string;
  deleted: boolean;
  createdAt: string;
}

export interface CreateNodeRequest {
  role: 'user' | 'assistant' | 'system';
  text: string;
  parentId: string | null;
  conversationId: string;
}

export interface UpdateNodeRequest {
  text: string;
}

export const nodesService = {
  // Create new node
  createNode: async (data: CreateNodeRequest): Promise<{ node: ChatNode }> => {
    return apiClient.post<{ node: ChatNode }>('/nodes', data);
  },

  // Generate AI reply for a node
  generateAIReply: async (nodeId: string): Promise<{ node: ChatNode }> => {
    return apiClient.post<{ node: ChatNode }>(`/nodes/${nodeId}/ai-reply`);
  },

  // Edit node content
  editNode: async (
    nodeId: string,
    data: UpdateNodeRequest
  ): Promise<{ node: ChatNode }> => {
    return apiClient.put<{ node: ChatNode }>(`/nodes/${nodeId}/edit`, data);
  },

  // Delete node and its descendants
  deleteNode: async (nodeId: string): Promise<void> => {
    return apiClient.delete(`/nodes/${nodeId}/delete`);
  },
};
