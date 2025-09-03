import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  conversationService,
  type Conversation,
  type CreateConversationRequest,
  type UpdateConversationRequest,
} from '@/services/conversations.service';
import { useToast } from '@/hooks/use-toast';

// Query keys
export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: (filters: string) =>
    [...conversationKeys.lists(), { filters }] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
};

// Get all conversations
export function useConversations() {
  return useQuery({
    queryKey: conversationKeys.lists(),
    queryFn: conversationService.getConversations,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get single conversation
export function useConversation(id: string) {
  return useQuery({
    queryKey: conversationKeys.detail(id),
    queryFn: () => conversationService.getConversation(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Create conversation
export function useCreateConversation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateConversationRequest) =>
      conversationService.createConversation(data),
    onSuccess: () => {
      // Invalidate and refetch conversations list
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });

      toast({
        title: 'Success',
        description: 'Conversation created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Get single conversation with nodes
export const useConversationDetail = (conversationId: string) => {
  return useQuery({
    queryKey: conversationKeys.detail(conversationId),
    queryFn: () => conversationService.getConversation(conversationId),
    enabled: !!conversationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
  });
};

// Update conversation
export function useUpdateConversation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateConversationRequest;
    }) => conversationService.updateConversation(id, data),
    onSuccess: (response, variables) => {
      // Update the conversation in cache
      queryClient.setQueryData(
        conversationKeys.detail(variables.id),
        (old: { conversation: Conversation; nodes: unknown[] } | undefined) =>
          old ? { ...old, conversation: response.conversation } : undefined
      );

      // Invalidate conversations list to reflect changes
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });

      toast({
        title: 'Success',
        description: 'Conversation updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Delete conversation
export function useDeleteConversation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => conversationService.deleteConversation(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: conversationKeys.detail(deletedId),
      });

      // Update conversations list
      queryClient.setQueryData(
        conversationKeys.lists(),
        (old: { conversations: Conversation[] } | undefined) => {
          if (!old?.conversations) return old;
          return {
            ...old,
            conversations: old.conversations.filter(
              (conv: Conversation) => conv.id !== deletedId
            ),
          };
        }
      );

      toast({
        title: 'Success',
        description: 'Conversation deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Account query keys
export const accountKeys = {
  all: ['account'] as const,
  info: () => [...accountKeys.all, 'info'] as const,
};

// Account-related hooks
export function useAccountInfo() {
  return useQuery({
    queryKey: accountKeys.info(),
    queryFn: async () => {
      const response = await fetch('/api/account');
      if (!response.ok) {
        throw new Error('Failed to fetch account info');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      displayName: string;
      email: string;
      currentPassword?: string;
      newPassword?: string;
    }) => {
      const response = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update account');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate account info to refetch
      queryClient.invalidateQueries({ queryKey: accountKeys.info() });

      toast({
        title: 'Success',
        description: 'Account updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/account', {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete account');
      }
      return response.json();
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();

      toast({
        title: 'Success',
        description: 'Account deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Authentication hooks
export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Authentication failed');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all queries to refetch with new auth state
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => {
      throw error; // Let the component handle the error
    },
  });
}

export function useSignUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      displayName?: string;
    }) => {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Sign up failed');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all queries to refetch with new auth state
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => {
      throw error; // Let the component handle the error
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      return response.json();
    },
    onSuccess: () => {
      // Cancel all ongoing queries to prevent 500 errors
      queryClient.cancelQueries();
      // Clear all cached data
      queryClient.clear();
    },
    onError: (error: Error) => {
      throw error; // Let the component handle the error
    },
  });
}

// Node-related hooks
export function useCreateNode() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      conversationId: string;
      parentId: string | null;
      role: 'user' | 'assistant';
      text: string;
    }) => {
      const response = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to create node');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate conversation detail to refetch nodes
      queryClient.invalidateQueries({
        queryKey: conversationKeys.detail(variables.conversationId),
      });
      // Also invalidate conversation lists in case node count changed
      queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(),
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateNode() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      text: string;
      conversationId: string;
    }) => {
      const response = await fetch(`/api/nodes/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: data.text }),
      });
      if (!response.ok) {
        throw new Error('Failed to update node');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate conversation detail to refetch nodes
      queryClient.invalidateQueries({
        queryKey: conversationKeys.detail(variables.conversationId),
      });
      // Also invalidate conversation lists
      queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(),
      });

      toast({
        title: 'Success',
        description: 'Message updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteNode() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { id: string; conversationId: string }) => {
      const response = await fetch(`/api/nodes/${data.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete node');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate conversation detail to refetch nodes
      queryClient.invalidateQueries({
        queryKey: conversationKeys.detail(variables.conversationId),
      });
      // Also invalidate conversation lists in case node count changed
      queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(),
      });

      toast({
        title: 'Success',
        description: 'Message deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// AI Reply hook for streaming responses
export function useRequestAIReply() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      userNodeId: string;
      conversationId: string;
    }) => {
      const response = await fetch(`/api/nodes/${data.userNodeId}/ai-reply`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to request AI reply');
      }
      return response; // Return response for streaming
    },
    onSuccess: (_, variables) => {
      // Invalidate conversation detail after AI reply completes
      queryClient.invalidateQueries({
        queryKey: conversationKeys.detail(variables.conversationId),
      });
      // Also invalidate conversation lists in case node count changed
      queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(),
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Export conversation hook
export function useExportConversation() {
  return useMutation({
    mutationFn: async (data: {
      conversationId: string;
      format?: 'json' | 'md';
      nodeId?: string;
      filename?: string;
    }) => {
      const params = new URLSearchParams();
      if (data.format) {
        params.set('format', data.format);
      }
      if (data.nodeId) {
        params.set('node', data.nodeId);
      }

      const response = await fetch(
        `/api/export/${data.conversationId}?${params}`
      );
      if (!response.ok) {
        throw new Error('Failed to export conversation');
      }

      const blob = await response.blob();

      // Auto-download the file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.filename || 'conversation'}.${data.format === 'md' ? 'md' : 'json'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      return blob;
    },
  });
}

// Share conversation hook
export function useShareConversation() {
  return useMutation({
    mutationFn: async (data: {
      conversationId: string;
      nodeId?: string;
      expiresInDays?: number;
    }) => {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to share conversation');
      }
      return response.json();
    },
    onSuccess: async data => {
      // Copy to clipboard
      await navigator.clipboard.writeText(data.url);
    },
  });
}

// Get share tokens hook
export function useShareTokens(
  conversationId: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['shareTokens', conversationId],
    queryFn: async () => {
      const response = await fetch(
        `/api/share?conversationId=${conversationId}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch share tokens');
      }
      const data = await response.json();
      return data.tokens;
    },
    enabled: enabled && !!conversationId,
  });
}

// Revoke share token hook
export function useRevokeShareToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      const response = await fetch('/api/share', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) {
        throw new Error('Failed to revoke share token');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate share tokens query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['shareTokens'] });
    },
  });
}

// Import conversation hook
export function useImportConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { file: File; conversationId?: string }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      if (data.conversationId) {
        formData.append('conversationId', data.conversationId);
      }

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Failed to import conversation');
      }
      return response.json();
    },
    onSuccess: data => {
      // Invalidate conversations list to show new imported data
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      // If importing into existing conversation, invalidate its details
      if (data.conversationId) {
        queryClient.invalidateQueries({
          queryKey: conversationKeys.detail(data.conversationId),
        });
      }
    },
  });
}

// Public share data hook
export function usePublicShareData(token: string) {
  return useQuery({
    queryKey: ['publicShare', token],
    queryFn: async () => {
      const response = await fetch(`/api/public/${token}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('This sharing link has expired or does not exist.');
        }
        throw new Error('Failed to load shared content.');
      }
      return response.json();
    },
    enabled: !!token,
    retry: false, // Don't retry on 404s
  });
}
