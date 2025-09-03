import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  nodesService,
  type CreateNodeRequest,
  type UpdateNodeRequest,
} from '@/services/nodes.service';
import { conversationKeys } from '@/hooks/use-conversations';
import { useToast } from '@/hooks/use-toast';

// Create node with optimistic updates
export function useCreateNode() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateNodeRequest) => nodesService.createNode(data),
    onMutate: async variables => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: conversationKeys.detail(variables.conversationId),
      });

      // Snapshot previous value
      const conversationData = queryClient.getQueryData(
        conversationKeys.detail(variables.conversationId)
      ) as { nodes?: Array<{ id: string; parentId?: string }> } | undefined;

      // Optimistically update cache
      const tempId = `temp-${Date.now()}`;
      queryClient.setQueryData(
        conversationKeys.detail(variables.conversationId),
        (
          old:
            | { nodes?: Array<{ id: string; [key: string]: unknown }> }
            | undefined
        ) => {
          if (!old) return old;
          return {
            ...old,
            nodes: [
              ...(old.nodes || []),
              {
                id: tempId,
                role: variables.role,
                text: variables.text,
                parentId: variables.parentId,
                conversationId: variables.conversationId,
                createdAt: new Date().toISOString(),
                query: variables.role === 'user' ? variables.text : '',
                response: variables.role === 'assistant' ? variables.text : '',
              },
            ],
          };
        }
      );

      return { previousData: conversationData, tempId };
    },
    onSuccess: (response, variables, context) => {
      // Replace optimistic update with real data
      queryClient.setQueryData(
        conversationKeys.detail(variables.conversationId),
        (
          old:
            | { nodes?: Array<{ id: string; [key: string]: unknown }> }
            | undefined
        ) => {
          if (!old) return old;
          return {
            ...old,
            nodes: old.nodes?.map(n =>
              n.id === context?.tempId
                ? {
                    ...response.node,
                    query:
                      response.node.role === 'user' ? response.node.text : '',
                    response:
                      response.node.role === 'assistant'
                        ? response.node.text
                        : '',
                  }
                : n
            ),
          };
        }
      );
    },
    onError: (error, variables, context) => {
      // Revert optimistic update
      if (context?.previousData) {
        queryClient.setQueryData(
          conversationKeys.detail(variables.conversationId),
          context.previousData
        );
      }
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to create message',
        variant: 'destructive',
      });
    },
  });
}

// Generate AI reply with proper streaming support
export function useGenerateAIReply() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (nodeId: string) => {
      const response = await fetch(`/api/nodes/${nodeId}/ai-reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let isComplete = false;

      try {
        while (!isComplete) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'complete') {
                  isComplete = true;
                  // Invalidate queries to force refresh and show the complete AI response
                  queryClient.invalidateQueries({
                    queryKey: conversationKeys.details(),
                  });
                  break;
                } else if (data.type === 'error') {
                  throw new Error(data.error || 'Streaming error occurred');
                }
              } catch (parseError) {
                // Skip invalid JSON lines
                continue;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return { success: true };
    },
    onError: error => {
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to generate AI reply',
        variant: 'destructive',
      });
    },
  });
}

// Edit node
export function useEditNode() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      nodeId,
      data,
    }: {
      nodeId: string;
      data: UpdateNodeRequest;
    }) => nodesService.editNode(nodeId, data),
    onSuccess: () => {
      // Invalidate all conversation details to reflect the edit
      queryClient.invalidateQueries({
        queryKey: conversationKeys.details(),
      });
      // Also invalidate conversation lists
      queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(),
      });
    },
    onError: error => {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to update message',
        variant: 'destructive',
      });
    },
  });
}

// Delete node with optimistic updates
export function useDeleteNode() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (nodeId: string) => nodesService.deleteNode(nodeId),
    onMutate: async nodeId => {
      // Get all conversation queries to update
      const conversationQueries = queryClient.getQueriesData({
        queryKey: conversationKeys.details(),
      });

      const previousData: Array<{
        queryKey: unknown;
        data: { nodes?: Array<{ id: string }> };
      }> = [];

      // Optimistically remove the node from all conversations
      conversationQueries.forEach(([queryKey, data]) => {
        if (data && typeof data === 'object' && 'nodes' in data) {
          const conversationData = data as { nodes?: Array<{ id: string }> };
          previousData.push({ queryKey, data: conversationData });

          // Remove the deleted node and its descendants
          const updatedNodes =
            conversationData.nodes?.filter(
              (n: { id: string }) => n.id !== nodeId
            ) || [];

          queryClient.setQueryData(queryKey, {
            ...conversationData,
            nodes: updatedNodes,
          });
        }
      });

      return { previousData };
    },
    onSuccess: (_, nodeId, context) => {
      // Invalidate to ensure server state is synced
      queryClient.invalidateQueries({
        queryKey: conversationKeys.details(),
      });
      queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(),
      });

      // Force immediate refetch of all conversation details to sync graph
      queryClient.refetchQueries({
        queryKey: conversationKeys.details(),
      });
    },
    onError: (error, nodeId, context) => {
      // Revert optimistic updates
      if (context?.previousData) {
        context.previousData.forEach(({ queryKey, data }) => {
          queryClient.setQueryData(queryKey as readonly unknown[], data);
        });
      }

      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to delete message',
        variant: 'destructive',
      });
    },
  });
}
