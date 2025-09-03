'use client';

import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, User, Bot, Eye } from 'lucide-react';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { NodeT } from '@/lib/types';
import { usePublicShareData } from '@/hooks/use-conversations';

interface PublicTokenData {
  conversation: {
    id: string;
    title: string;
  };
  node?: {
    id: string;
    text: string;
    role: string;
  };
  expiresAt: string;
  nodes: NodeT[];
}

export default function PublicSharePage() {
  const params = useParams();
  const token = params.token as string;

  const { data, isLoading, error } = usePublicShareData(token);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const buildConversationPath = (
    nodes: NodeT[],
    startNodeId?: string
  ): NodeT[] => {
    if (!startNodeId) {
      // Show full conversation tree (simplified linear view)
      return nodes
        .filter(n => !n.deleted)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    }

    // The API already returns the correct nodes including assistant responses
    // Just filter out deleted nodes and sort by creation time
    return nodes
      .filter(n => !n.deleted)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <div className="space-y-6">
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="text-6xl">🔗</div>
              <h2 className="text-2xl font-semibold">Link Not Found</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                {error?.message || 'This sharing link has expired or does not exist.'}
              </p>
              <Button asChild>
                <Link href="/">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Go to GPTree
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const conversationPath = buildConversationPath(data.nodes, data.node?.id);
  const expiresAt = new Date(data.expiresAt);
  const isExpiringSoon =
    expiresAt.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000; // 7 days

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                {data.conversation.title}
              </CardTitle>
              <CardDescription>Shared conversation from GPTree</CardDescription>
            </div>
            <Badge variant={isExpiringSoon ? 'destructive' : 'secondary'}>
              <Clock className="w-3 h-3 mr-1" />
              Expires {formatDate(data.expiresAt)}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Shared Node Context */}
      {data.node && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Shared Context</CardTitle>
            <CardDescription>
              This link shares the conversation path leading to this specific
              message:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {data.node.role === 'user' ? (
                    <User className="w-5 h-5 text-blue-500" />
                  ) : (
                    <Bot className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium capitalize mb-1">
                    {data.node.role}
                  </div>
                  <div className="text-sm">
                    {data.node.text.length > 200
                      ? `${data.node.text.slice(0, 200)}...`
                      : data.node.text}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversation */}
      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
          <CardDescription>
            {data.node
              ? `Showing the path leading to the shared message (${conversationPath.length} messages)`
              : `Full conversation (${conversationPath.length} messages)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {conversationPath.map((node, index) => (
              <div key={node.id}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {node.role === 'user' ? (
                      <User className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Bot className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium capitalize text-sm">
                        {node.role}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(node.createdAt)}
                      </span>
                      {data.node?.id === node.id && (
                        <Badge variant="outline" className="text-xs">
                          Shared
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {node.text}
                    </div>
                  </div>
                </div>
                {index < conversationPath.length - 1 && (
                  <Separator className="my-4" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              This conversation was shared using GPTree
            </p>
            <Button asChild variant="outline">
              <a href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Try GPTree
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
