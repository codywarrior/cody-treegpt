'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  const [tokens, setTokens] = useState<ShareToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expiryDays, setExpiryDays] = useState(30);
  const { toast } = useToast();

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/share?conversationId=${conversationId}`
      );
      if (response.ok) {
        const data = await response.json();
        setTokens(data.tokens);
      }
    } catch (error) {
      console.error('Error fetching tokens:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (isOpen) {
      fetchTokens();
    }
  }, [isOpen, fetchTokens]);

  const createShareLink = async (includeCurrentNode: boolean = false) => {
    setCreating(true);
    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          nodeId: includeCurrentNode ? currentNodeId : undefined,
          expiresInDays: expiryDays,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Share link created',
          description: 'Link copied to clipboard',
        });

        // Copy to clipboard
        await navigator.clipboard.writeText(data.url);

        // Refresh tokens list
        await fetchTokens();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create share link');
      }
    } catch (error) {
      console.error('Error creating share link:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to create share link',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
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

  const revokeToken = async (token: string) => {
    try {
      const response = await fetch('/api/share', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        toast({
          title: 'Link revoked',
          description: 'Share link has been disabled',
        });
        await fetchTokens();
      } else {
        throw new Error('Failed to revoke link');
      }
    } catch (error) {
      console.error('Error revoking token:', error);
      toast({
        title: 'Error',
        description: 'Failed to revoke link',
        variant: 'destructive',
      });
    }
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
                disabled={creating}
                className="justify-start"
              >
                <Plus className="w-4 h-4 mr-2" />
                Share Full Conversation
              </Button>

              {currentNodeId && (
                <Button
                  onClick={() => createShareLink(true)}
                  disabled={creating}
                  variant="outline"
                  className="justify-start"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Share Path to Current Message
                </Button>
              )}
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
                {tokens.map(token => (
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
