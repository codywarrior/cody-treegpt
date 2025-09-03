import { apiClient } from '@/lib/api-client';

export interface ExportRequest {
  conversationId: string;
  format: 'json' | 'md';
  nodeId?: string;
}

export interface ImportRequest {
  file: File;
  title?: string;
  conversationId?: string;
}

export interface ImportResponse {
  conversationId: string;
  nodesImported: number;
}

export const exportImportService = {
  // Export conversation
  exportConversation: async (data: ExportRequest): Promise<Blob> => {
    const params: Record<string, string> = {
      format: data.format,
    };

    if (data.nodeId) {
      params.node = data.nodeId;
    }

    return apiClient.get<Blob>(`/export/${data.conversationId}`, params);
  },

  // Import conversation
  importConversation: async (data: ImportRequest): Promise<ImportResponse> => {
    const formData = new FormData();
    formData.append('file', data.file);

    if (data.title) {
      formData.append('title', data.title);
    }

    if (data.conversationId) {
      formData.append('conversationId', data.conversationId);
    }

    return apiClient.post<ImportResponse>('/import', formData);
  },
};
