'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCreateNode,
  useEditNode,
  useDeleteNode,
  useGenerateAIReply,
} from './use-nodes';
import { useToast } from './use-toast';
import { conversationKeys } from './use-conversations';

interface UseChatActionsProps {
  conversationId: string;
  onNodeSelect: (nodeId: string) => void;
  onBranchFromNode?: (nodeId: string, message: string) => Promise<void>;
}

export function useChatActions({
  conversationId,
  onNodeSelect,
  onBranchFromNode,
}: UseChatActionsProps) {
  const queryClient = useQueryClient();
  const createNodeMutation = useCreateNode();
  const editNodeMutation = useEditNode();
  const deleteNodeMutation = useDeleteNode();
  const generateAIReplyMutation = useGenerateAIReply();
  const { toast } = useToast();

  const toastSuccess = useCallback(
    (message: string) => {
      toast({ title: 'Success', description: message });
    },
    [toast]
  );

  const toastError = useCallback(
    (message: string) => {
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    },
    [toast]
  );

  const sendMessage = useCallback(
    async (
      message: string,
      activeNodeId: string | null,
      branchingFromNode: string | null,
      callbacks: {
        onOptimisticStart: (message: string) => void;
        onOptimisticEnd: () => void;
        onLoadingStart: () => void;
        onLoadingEnd: () => void;
        setBranchingFromNode: (nodeId: string | null) => void;
      }
    ) => {
      const trimmedMessage = message.trim();
      if (!trimmedMessage) return;

      callbacks.onOptimisticStart(trimmedMessage);
      callbacks.onLoadingStart();

      try {
        if (branchingFromNode && onBranchFromNode) {
          await onBranchFromNode(branchingFromNode, trimmedMessage);
          callbacks.setBranchingFromNode(null);
          callbacks.onOptimisticEnd();
          toastSuccess('Branch created successfully');
        } else {
          createNodeMutation.mutate(
            {
              parentId: activeNodeId,
              role: 'user',
              text: trimmedMessage,
              conversationId,
            },
            {
              onSuccess: data => {
                const newNode = data.node;
                onNodeSelect(newNode.id);
                callbacks.onOptimisticEnd();

                // Generate AI reply - simple approach
                generateAIReplyMutation.mutate(newNode.id, {
                  onSuccess: () => {
                    callbacks.onLoadingEnd();
                  },
                  onError: () => {
                    callbacks.onLoadingEnd();
                  },
                });
              },
              onError: error => {
                callbacks.onOptimisticEnd();
                callbacks.onLoadingEnd();
                toastError(
                  error instanceof Error
                    ? error.message
                    : 'Failed to send message'
                );
              },
            }
          );
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred';
        callbacks.onOptimisticEnd();
        callbacks.onLoadingEnd();
        toastError(errorMessage);
      }
    },
    [
      conversationId,
      onNodeSelect,
      onBranchFromNode,
      createNodeMutation,
      generateAIReplyMutation,
      toastSuccess,
      toastError,
    ]
  );

  const editMessage = useCallback(
    (nodeId: string, newText: string) => {
      editNodeMutation.mutate(
        { nodeId, data: { text: newText } },
        {
          onSuccess: () => {
            toastSuccess('Message updated successfully');
          },
          onError: (error: Error) => {
            toastError(error.message || 'Failed to update message');
          },
        }
      );
    },
    [editNodeMutation, toastSuccess, toastError]
  );

  const deleteMessage = useCallback(
    (nodeId: string) => {
      // Find the parent node before deletion
      const conversationData = queryClient.getQueryData(
        conversationKeys.detail(conversationId)
      ) as { nodes?: Array<{ id: string; parentId?: string }> } | undefined;

      let parentNodeId: string | null = null;
      if (conversationData?.nodes) {
        const deletedNode = conversationData.nodes.find(n => n.id === nodeId);
        if (deletedNode?.parentId) {
          parentNodeId = deletedNode.parentId;
        }
      }

      // Set active node to parent BEFORE deleting
      if (parentNodeId) {
        onNodeSelect(parentNodeId);
      }

      deleteNodeMutation.mutate(nodeId, {
        onSuccess: () => {
          // If we didn't have a parent, fallback to first available node after deletion
          if (!parentNodeId) {
            const updatedData = queryClient.getQueryData(
              conversationKeys.detail(conversationId)
            ) as { nodes?: Array<{ id: string }> } | undefined;
            if (updatedData?.nodes && updatedData.nodes.length > 0) {
              onNodeSelect(updatedData.nodes[0].id);
            }
          }

          // toastSuccess('Message deleted');
        },
        onError: (error: Error) => {
          toastError(error.message || 'Failed to delete message');
        },
      });
    },
    [
      deleteNodeMutation,
      toastSuccess,
      toastError,
      queryClient,
      conversationId,
      onNodeSelect,
    ]
  );

  const copyToClipboard = useCallback(
    async (_text: string) => {
      try {
        await navigator.clipboard.writeText(_text);
        toastSuccess('Copied to clipboard');
      } catch {
        toastError('Failed to copy to clipboard');
      }
    },
    [toastSuccess, toastError]
  );

  return {
    sendMessage,
    editMessage,
    deleteMessage,
    copyToClipboard,
    isLoading:
      createNodeMutation.isPending ||
      editNodeMutation.isPending ||
      deleteNodeMutation.isPending ||
      generateAIReplyMutation.isPending,
  };
}
