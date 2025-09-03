import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shareService, type CreateShareLinkRequest, type DeleteShareLinkRequest } from '@/services/share.service';
import { useToast } from '@/hooks/use-toast';

// Query keys
export const shareKeys = {
  all: ['share'] as const,
  tokens: (conversationId: string) => [...shareKeys.all, 'tokens', conversationId] as const,
  public: (token: string) => [...shareKeys.all, 'public', token] as const,
};

// Get share tokens for conversation
export function useShareTokens(conversationId: string) {
  return useQuery({
    queryKey: shareKeys.tokens(conversationId),
    queryFn: () => shareService.getShareTokens(conversationId),
    enabled: !!conversationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Get public shared content
export function usePublicContent(token: string) {
  return useQuery({
    queryKey: shareKeys.public(token),
    queryFn: () => shareService.getPublicContent(token),
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Create share link
export function useCreateShareLink() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateShareLinkRequest) => shareService.createShareLink(data),
    onSuccess: async (response, variables) => {
      // Copy to clipboard
      await navigator.clipboard.writeText(response.url);
      
      // Invalidate tokens for this conversation
      queryClient.invalidateQueries({ 
        queryKey: shareKeys.tokens(variables.conversationId) 
      });
      
      toast({
        title: 'Share link created',
        description: 'Link copied to clipboard',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create share link',
        variant: 'destructive',
      });
    },
  });
}

// Revoke share link
export function useRevokeShareLink() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: DeleteShareLinkRequest & { conversationId: string }) => 
      shareService.revokeShareLink(data),
    onSuccess: (_, variables) => {
      // Invalidate tokens for this conversation
      queryClient.invalidateQueries({ 
        queryKey: shareKeys.tokens(variables.conversationId) 
      });
      
      toast({
        title: 'Link revoked',
        description: 'Share link has been disabled',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to revoke share link',
        variant: 'destructive',
      });
    },
  });
}
