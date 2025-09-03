import { useMutation, useQueryClient } from '@tanstack/react-query';
import { nodesService, type CreateNodeRequest, type UpdateNodeRequest } from '@/services/nodes.service';
import { conversationKeys } from './use-conversations';
import { useToast } from '@/hooks/use-toast';

// Create node
export function useCreateNode() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateNodeRequest) => nodesService.createNode(data),
    onSuccess: (response, variables) => {
      // Invalidate conversation detail to refetch with new node
      queryClient.invalidateQueries({ 
        queryKey: conversationKeys.detail(variables.conversationId) 
      });
      // Also invalidate conversation lists in case node count changed
      queryClient.invalidateQueries({ 
        queryKey: conversationKeys.lists() 
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create message',
        variant: 'destructive',
      });
    },
  });
}

// Generate AI reply
export function useGenerateAIReply() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (nodeId: string) => nodesService.generateAIReply(nodeId),
    onSuccess: (response) => {
      // Invalidate all conversation details to ensure UI updates
      queryClient.invalidateQueries({ 
        queryKey: conversationKeys.details() 
      });
      // Also invalidate conversation lists in case node count changed
      queryClient.invalidateQueries({ 
        queryKey: conversationKeys.lists() 
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate AI reply',
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
    mutationFn: ({ nodeId, data }: { nodeId: string; data: UpdateNodeRequest }) => 
      nodesService.editNode(nodeId, data),
    onSuccess: () => {
      // Invalidate all conversation details to reflect the edit
      queryClient.invalidateQueries({ 
        queryKey: conversationKeys.details() 
      });
      // Also invalidate conversation lists
      queryClient.invalidateQueries({ 
        queryKey: conversationKeys.lists() 
      });
      
      toast({
        title: 'Success',
        description: 'Message updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update message',
        variant: 'destructive',
      });
    },
  });
}

// Delete node
export function useDeleteNode() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (nodeId: string) => nodesService.deleteNode(nodeId),
    onSuccess: () => {
      // Invalidate all conversation details to reflect the deletion
      queryClient.invalidateQueries({ 
        queryKey: conversationKeys.details() 
      });
      // Also invalidate conversation lists in case node count changed
      queryClient.invalidateQueries({ 
        queryKey: conversationKeys.lists() 
      });
      
      toast({
        title: 'Success',
        description: 'Message deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete message',
        variant: 'destructive',
      });
    },
  });
}
