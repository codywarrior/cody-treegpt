'use client';

import React, { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Share2, Copy, Trash2, Plus, ExternalLink, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useShareConversation, useShareTokens, useRevokeShareToken } from '@/hooks/use-conversations';

interface ShareToken {
  token: string;
  createdAt: string;
  expiresAt: string;
  nodeId?: string;
  nodeText?: string;
  url: string;
}

interface ShareDialogProps {
  conversationId: string;
  conversationTitle: string;
  currentNodeId?: string;
}

export function ShareDialog({
  conversationId,
  conversationTitle,
  currentNodeId,
}: ShareDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expiryDays, setExpiryDays] = useState(30);
  const { toast } = useToast();

  const { data: tokens = [], isLoading: loading } = useShareTokens(conversationId, isOpen);
  const shareConversationMutation = useShareConversation();
  const revokeTokenMutation = useRevokeShareToken();

  const createShareLink = (includeCurrentNode: boolean = false) => {
    shareConversationMutation.mutate(
      {
        conversationId,
        nodeId: includeCurrentNode ? currentNodeId : undefined,
        expiresInDays: expiryDays,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Share link created',
            description: 'Link copied to clipboard',
          });
        },
      }
    );
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Copied',
        description: 'Link copied to clipboard',
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive',
      });
    }
  };

  const revokeToken = (token: string) => {
    revokeTokenMutation.mutate(token, {
      onSuccess: () => {
        toast({
          title: 'Token revoked',
          description: 'Share link has been disabled',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to revoke token',
          variant: 'destructive',
        });
      },
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpiringSoon = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const daysUntilExpiry =
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry < 7;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Share Conversation</DialogTitle>
          <DialogDescription>
            Create public links to share &quot;{conversationTitle}&quot; with
            others
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Share Link */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Create New Link</Label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="expiry">Expires in (days)</Label>
                <Input
                  id="expiry"
                  type="number"
                  min="1"
                  max="365"
                  value={expiryDays}
                  onChange={e => setExpiryDays(parseInt(e.target.value) || 30)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Button
                onClick={() => createShareLink(false)}
                disabled={shareConversationMutation.isPending}
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Link
              </Button>
              <Button
                onClick={() => createShareLink(true)}
                disabled={!currentNodeId || shareConversationMutation.isPending}
                variant="outline"
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                Share Path to Current Message
              </Button>
            </div>
          </div>

          <Separator />

          {/* Existing Share Links */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Active Links</Label>
              {tokens.length > 0 && (
                <Badge variant="secondary">{tokens.length} active</Badge>
              )}
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2].map(i => (
                  <div
                    key={i}
                    className="h-16 bg-muted rounded animate-pulse"
                  />
                ))}
              </div>
            ) : tokens.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Share2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No active sharing links</p>
                <p className="text-sm">Create one above to get started</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {tokens.map((token: any) => (
                  <div
                    key={token.token}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={token.nodeId ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {token.nodeId ? 'Specific Path' : 'Full Conversation'}
                        </Badge>
                        <Badge
                          variant={
                            isExpiringSoon(token.expiresAt)
                              ? 'destructive'
                              : 'outline'
                          }
                          className="text-xs"
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDate(token.expiresAt)}
                        </Badge>
                      </div>

                      {token.nodeText && (
                        <p className="text-xs text-muted-foreground mb-2">
                          &quot;{token.nodeText}...&quot;
                        </p>
                      )}

                      <div className="flex items-center gap-1">
                        <Input
                          value={token.url}
                          readOnly
                          className="text-xs h-8"
                        />
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(token.url)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(token.url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => revokeToken(token.token)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
