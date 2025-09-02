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
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importTitle, setImportTitle] = useState('');
  const { toast } = useToast();
  const router = useRouter();

  const handleExport = async (format: 'json' | 'md') => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('format', format);
      if (currentNodeId) {
        params.set('node', currentNodeId);
      }

      const response = await fetch(`/api/export/${conversationId}?${params}`);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const filename = conversationTitle.replace(/[^a-zA-Z0-9]/g, '_');
      a.download = `${filename}.${format === 'md' ? 'md' : 'json'}`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export successful',
        description: `Conversation exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export conversation',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast({
        title: 'No file selected',
        description: 'Please select a JSON file to import',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      if (importTitle) {
        formData.append('title', importTitle);
      }

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      toast({
        title: 'Import successful',
        description: `Imported ${result.nodesImported} nodes`,
      });

      // Navigate to the imported conversation
      router.push(`/chat/${result.conversationId}`);
      setIsOpen(false);
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to import conversation',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
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
                  disabled={isExporting}
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
                  disabled={isExporting}
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
                disabled={!importFile || isImporting}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isImporting ? 'Importing...' : 'Import'}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
