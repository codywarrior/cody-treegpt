import { useMutation, useQueryClient } from '@tanstack/react-query';
import { exportImportService, type ExportRequest, type ImportRequest } from '@/services/export-import.service';
import { conversationKeys } from './use-conversations';
import { useToast } from '@/hooks/use-toast';

// Export conversation
export function useExportConversation() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: ExportRequest) => exportImportService.exportConversation(data),
    onSuccess: (blob, variables) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation.${variables.format === 'md' ? 'md' : 'json'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export successful',
        description: `Conversation exported as ${variables.format.toUpperCase()}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Failed to export conversation',
        variant: 'destructive',
      });
    },
  });
}

// Import conversation
export function useImportConversation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: ImportRequest) => exportImportService.importConversation(data),
    onSuccess: (response) => {
      // Invalidate conversations list to show imported data
      queryClient.invalidateQueries({ 
        queryKey: conversationKeys.lists() 
      });
      // Also invalidate conversation details if importing into existing conversation
      queryClient.invalidateQueries({ 
        queryKey: conversationKeys.details() 
      });
      
      toast({
        title: 'Import successful',
        description: `Imported ${response.nodesImported} nodes`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Failed to import conversation',
        variant: 'destructive',
      });
    },
  });
}
