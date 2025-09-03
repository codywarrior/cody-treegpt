'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Upload, FileText, Code } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  useExportConversation,
  useImportConversation,
} from '@/hooks/use-conversations';

interface ExportImportDialogProps {
  conversationId: string;
  conversationTitle: string;
  currentNodeId?: string;
}

export function ExportImportDialog({
  conversationId,
  conversationTitle,
  currentNodeId,
}: ExportImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importTitle, setImportTitle] = useState('');
  const { toast } = useToast();
  const router = useRouter();

  const exportMutation = useExportConversation();
  const importMutation = useImportConversation();

  const handleExport = (format: 'json' | 'md') => {
    exportMutation.mutate({
      conversationId,
      format,
      nodeId: currentNodeId,
      filename: conversationTitle.replace(/[^a-zA-Z0-9]/g, '_'),
    });
  };

  const handleImport = () => {
    if (!importFile) {
      toast({
        title: 'No file selected',
        description: 'Please select a JSON file to import',
        variant: 'destructive',
      });
      return;
    }

    importMutation.mutate(
      { file: importFile, conversationId },
      {
        onSuccess: result => {
          toast({
            title: 'Import successful',
            description: `Imported ${result.nodesImported} nodes`,
          });
          // Close modal immediately
          setIsOpen(false);
          // Reset form state
          setImportFile(null);
          setImportTitle('');
          // Navigate to the imported conversation if it's a new one
          if (result.conversationId !== conversationId) {
            router.push(`/c/${result.conversationId}`);
          }
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export/Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export/Import Conversation</DialogTitle>
          <DialogDescription>
            Export your conversation or import from a JSON file
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="export" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4">
            <div className="space-y-2">
              <Label>Export Format</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleExport('json')}
                  disabled={exportMutation.isPending}
                  className="h-20 flex-col"
                >
                  <Code className="w-6 h-6 mb-2" />
                  JSON
                  <span className="text-xs text-muted-foreground">
                    Structured data
                  </span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExport('md')}
                  disabled={exportMutation.isPending}
                  className="h-20 flex-col"
                >
                  <FileText className="w-6 h-6 mb-2" />
                  Markdown
                  <span className="text-xs text-muted-foreground">
                    With Mermaid graph
                  </span>
                </Button>
              </div>
            </div>

            {currentNodeId && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Export will include the current node
                  and all its descendants.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-file">JSON File</Label>
              <Input
                id="import-file"
                type="file"
                accept=".json"
                onChange={e => setImportFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-title">Title (optional)</Label>
              <Input
                id="import-title"
                placeholder="Leave empty to use original title"
                value={importTitle}
                onChange={e => setImportTitle(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button
                onClick={handleImport}
                disabled={!importFile || importMutation.isPending}
              >
                <Upload className="w-4 h-4 mr-2" />
                {importMutation.isPending ? 'Importing...' : 'Import'}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
