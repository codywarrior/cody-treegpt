'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { ChatPane } from '@/components/ChatPane';
import { Graph } from '@/components/Graph';
// Tree algorithms imported for future LCA animation implementation
import { ConversationT, NodeT } from '@/lib/types';

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const cid = params.cid as string;

  const [conversation, setConversation] = useState<ConversationT | null>(null);
  const [nodes, setNodes] = useState<NodeT[]>([]);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (cid) {
      loadConversation();
    }
  }, [cid, router]);

  const loadConversation = async () => {
    try {
      const response = await fetch(`/api/conversations/${cid}`);
      if (response.ok) {
        const data = await response.json();
        setConversation(data.conversation);
        setNodes(data.nodes);
        setActiveNodeId(data.rootNodeId);
      } else if (response.status === 404) {
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (text: string, parentId: string | null) => {
    try {
      const response = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: cid,
          parentId,
          role: 'user',
          text,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newNode = data.node;
        setNodes(prev => [...prev, newNode]);
        setActiveNodeId(newNode.id);

        // Create placeholder assistant node immediately
        const placeholderNode = {
          id: `temp-${Date.now()}`,
          conversationId: cid,
          parentId: newNode.id,
          role: 'assistant',
          text: 'Generating...',
          deleted: false,
          createdAt: new Date().toISOString(),
          isGenerating: true,
        };

        setNodes(prev => [...prev, placeholderNode]);
        setActiveNodeId(placeholderNode.id);

        // Request AI reply
        handleRequestAIReply(newNode.id, placeholderNode.id);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleBranchFromNode = async (nodeId: string, text: string) => {
    try {
      const response = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: cid,
          parentId: nodeId,
          role: 'user',
          text,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newNode = data.node;
        setNodes(prev => [...prev, newNode]);
        setActiveNodeId(newNode.id);
      }
    } catch (error) {
      console.error('Failed to create branch:', error);
    }
  };

  const handleRequestAIReply = async (
    nodeId: string,
    placeholderNodeId?: string
  ) => {
    try {
      // Don't set global loading - AI thinking will show in the node itself
      const response = await fetch(`/api/nodes/${nodeId}/ai-reply`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to request AI reply');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiNode: NodeT | null = null;
      let streamingText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'node') {
                  // Replace placeholder with actual node
                  aiNode = data.node;
                  if (placeholderNodeId) {
                    setNodes(prev =>
                      prev.map(n => (n.id === placeholderNodeId ? aiNode : n))
                    );
                  } else {
                    setNodes(prev => [...prev, aiNode]);
                  }
                  setActiveNodeId(aiNode.id);
                } else if (data.type === 'content' && aiNode) {
                  // Streaming content
                  streamingText += data.content;
                  setNodes(prev =>
                    prev.map(node =>
                      node.id === aiNode.id
                        ? { ...node, text: streamingText }
                        : node
                    )
                  );
                } else if (data.type === 'complete' && aiNode) {
                  // Final update
                  setNodes(prev =>
                    prev.map(node => (node.id === aiNode.id ? data.node : node))
                  );
                } else if (data.type === 'error') {
                  console.error('Streaming error:', data.error);
                }
              } catch {
                // Ignore malformed JSON
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to request AI reply:', error);
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    try {
      // Find the deleted node before deletion for active node logic
      const deletedNode = nodes.find(n => n.id === nodeId);

      const response = await fetch(`/api/nodes/${nodeId}/delete`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Update local state immediately by filtering out the deleted node
        const updatedNodes = nodes.filter(n => n.id !== nodeId);
        setNodes(updatedNodes);

        // Reset active node if the deleted node was active
        if (deletedNode && activeNodeId === nodeId) {
          // Find a suitable replacement node (parent or first available)
          const parentNode = deletedNode.parentId
            ? updatedNodes.find(n => n.id === deletedNode.parentId)
            : updatedNodes.find(n => n.role === 'user');

          if (parentNode) {
            setActiveNodeId(parentNode.id);
          } else if (updatedNodes.length > 0) {
            setActiveNodeId(updatedNodes[0].id);
          }
        }

        // Reload conversation in background to ensure consistency
        loadConversation();
      }
    } catch (error) {
      console.error('Failed to delete node:', error);
    }
  };

  const handleEditNode = async (nodeId: string, newText: string) => {
    try {
      const response = await fetch(`/api/nodes/${nodeId}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText }),
      });

      if (response.ok) {
        // Update the local state immediately for better UX
        setNodes(prevNodes =>
          prevNodes.map(node =>
            node.id === nodeId ? ({ ...node, text: newText } as NodeT) : node
          )
        );
      } else {
        throw new Error('Failed to update node');
      }
    } catch (error) {
      console.error('Failed to edit node:', error);
      throw error; // Re-throw to let ChatPane handle the error
    }
  };

  const handleGraphNodeClick = (nodeId: string) => {
    if (activeNodeId === nodeId) return;

    // For now, just switch immediately
    // TODO: Implement LCA-based animation
    setActiveNodeId(nodeId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Conversation not found
          </h2>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-500"
          >
            Return to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/')}
              className="text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
            <h1 className="text-xl font-semibold text-gray-900">
              {conversation.title}
            </h1>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div>{nodes.length} messages</div>
            {activeNodeId && (
              <div className="flex items-center space-x-1">
                <span>•</span>
                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                  {(() => {
                    const activePath = [];
                    let currentId = activeNodeId;
                    const nodesById = nodes.reduce(
                      (acc: Record<string, NodeT>, node) => ({
                        ...acc,
                        [node.id]: node,
                      }),
                      {}
                    );

                    while (currentId) {
                      const node = nodesById[currentId];
                      if (!node) break;
                      activePath.unshift(node.role === 'user' ? 'U' : 'A');
                      currentId = node.parentId;
                    }

                    return activePath.length > 5
                      ? `...${activePath.slice(-5).join('→')}`
                      : activePath.join('→');
                  })()}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Pane */}
        <div className="w-1/2 border-r border-gray-200">
          <ChatPane
            nodes={nodes}
            activeNodeId={activeNodeId}
            onSendMessage={handleSendMessage}
            onBranchFromNode={handleBranchFromNode}
            onRequestAIReply={handleRequestAIReply}
            onDeleteNode={handleDeleteNode}
            onEditNode={handleEditNode}
            className="h-full"
          />
        </div>

        {/* Graph Pane */}
        <div className="w-1/2">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                Conversation Tree
              </h2>
              <p className="text-sm text-gray-600">
                Visual representation of your branching conversation
              </p>
            </div>
            <Graph
              nodes={nodes}
              activeNodeId={activeNodeId}
              onNodeClick={handleGraphNodeClick}
              className="flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
