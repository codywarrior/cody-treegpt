'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { ChatPaneV2 } from '@/components/ChatPaneV2';
import Graph from '@/components/Graph';
// Tree algorithms imported for future LCA animation implementation
import { ConversationT, NodeT, ChatNodeT } from '@/lib/types';
import {
  convertNodesToChatNodes,
  getChatActivePath,
  createNewChatNode,
  updateChatNodeResponse,
} from '@/lib/chat-utils';

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const cid = params.cid as string;

  const [conversation, setConversation] = useState<ConversationT | null>(null);
  const [nodes, setNodes] = useState<NodeT[]>([]);
  const [chatNodes, setChatNodes] = useState<ChatNodeT[]>([]);
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
        const convertedChatNodes = convertNodesToChatNodes(data.nodes);
        setChatNodes(convertedChatNodes);

        // Set active node to the last node in the conversation for initial display
        const lastNode =
          convertedChatNodes.length > 0
            ? convertedChatNodes[convertedChatNodes.length - 1]
            : null;
        setActiveNodeId(lastNode?.id || data.rootNodeId);
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
      // Create new chat node with user query
      const newChatNode = createNewChatNode(text, parentId, cid);

      // Create user node in database first
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
        const userNode = data.node;

        // Add to chat nodes and nodes state
        setChatNodes(prev => [...prev, newChatNode]);
        setNodes(prev => [...prev, userNode]);
        setActiveNodeId(newChatNode.id);

        // Pass the chat node directly to avoid timing issues
        handleRequestAIReply(userNode.id, newChatNode);
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
    userNodeId: string,
    chatNode?: ChatNodeT
  ) => {
    try {
      // If no chat node provided, try to find it (for existing calls from ChatPaneV2)
      let targetChatNode = chatNode;
      if (!targetChatNode) {
        const userNode = nodes.find(n => n.id === userNodeId);
        targetChatNode = chatNodes.find(cn => cn.query === userNode?.text);
        if (!targetChatNode) {
          console.error('Could not find corresponding chat node');
          return;
        }
      }

      const response = await fetch(`/api/nodes/${userNodeId}/ai-reply`, {
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
                  aiNode = data.node;
                  setNodes(prev => [...prev, aiNode!]);
                } else if (data.type === 'content' && aiNode) {
                  streamingText += data.content;
                  // Update chat node response
                  setChatNodes(prev =>
                    prev.map(cn =>
                      cn.id === targetChatNode!.id
                        ? updateChatNodeResponse(cn, streamingText)
                        : cn
                    )
                  );
                  // Update nodes array
                  if (aiNode) {
                    const aiNodeId = aiNode.id;
                    setNodes(prev =>
                      prev.map(node =>
                        node.id === aiNodeId
                          ? { ...node, text: streamingText }
                          : node
                      )
                    );
                  }
                } else if (data.type === 'complete' && aiNode) {
                  // Final update
                  setChatNodes(prev =>
                    prev.map(cn =>
                      cn.id === targetChatNode!.id
                        ? updateChatNodeResponse(cn, data.node.text)
                        : cn
                    )
                  );
                  if (aiNode) {
                    const aiNodeId = aiNode.id;
                    setNodes(prev =>
                      prev.map(node =>
                        node.id === aiNodeId ? data.node : node
                      )
                    );
                  }
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
            <div>{chatNodes.length} conversations</div>
            {activeNodeId && (
              <div className="flex items-center space-x-1">
                <span>•</span>
                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                  {(() => {
                    const activePath = getChatActivePath(
                      chatNodes,
                      activeNodeId
                    );
                    const pathLabels = activePath.map(() => 'U→A');
                    return pathLabels.length > 3
                      ? `...${pathLabels.slice(-3).join('→')}`
                      : pathLabels.join('→');
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
          <ChatPaneV2
            chatNodes={chatNodes}
            activeNodeId={activeNodeId}
            onSendMessage={handleSendMessage}
            onBranchFromNode={handleBranchFromNode}
            onRequestAIReply={handleRequestAIReply}
            onDeleteNode={handleDeleteNode}
            onEditNode={handleEditNode}
            onNodeSelect={setActiveNodeId}
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
