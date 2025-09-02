'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';

import { ChatPaneV2 } from '@/components/ChatPaneV2';
import Graph from '@/components/Graph';
import ShareModal from '@/components/ShareModal';
import {
  convertNodesToChatNodes,
  getChatActivePath,
  createNewChatNode,
} from '@/lib/chat-utils';
import { NodeT, ChatNodeT, ConversationT } from '@/lib/types';

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const cid = params.cid as string;

  const [conversation, setConversation] = useState<ConversationT | null>(null);
  const [nodes, setNodes] = useState<NodeT[]>([]);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shareModal, setShareModal] = useState<{
    isOpen: boolean;
    url: string;
  }>({
    isOpen: false,
    url: '',
  });
  const [importModal, setImportModal] = useState<{
    isOpen: boolean;
    file: File | null;
  }>({ isOpen: false, file: null });

  // Memoize expensive computations
  const chatNodes = useMemo(() => convertNodesToChatNodes(nodes), [nodes]);
  const activePath = useMemo(
    () => getChatActivePath(chatNodes, activeNodeId),
    []
  );

  const loadConversation = useCallback(async () => {
    try {
      const response = await fetch(`/api/conversations/${cid}`);
      if (response.ok) {
        const data = await response.json();
        setConversation(data.conversation);
        setNodes(data.nodes);

        // Set active node to the last node in the conversation for initial display
        const convertedChatNodes = convertNodesToChatNodes(data.nodes);
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
  }, [cid, router]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

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

        // Add to nodes state (chatNodes will update via useMemo)
        setNodes(prev => [...prev, userNode]);
        setActiveNodeId(userNode.id);

        // Pass the chat node directly to avoid timing issues
        handleRequestAIReply(userNode.id, newChatNode);
      } else {
        throw new Error(`Failed to create node: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleBranchFromNode = async (nodeId: string, text: string) => {
    try {
      // Create new chat node for branching
      const newChatNode = createNewChatNode(text, nodeId, cid);

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

        // Update nodes state (chatNodes will update via useMemo)
        setNodes(prev => [...prev, newNode]);
        setActiveNodeId(newNode.id);

        // Request AI reply for the branch
        handleRequestAIReply(newNode.id, newChatNode);
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
        if (!userNode) {
          console.error('Could not find user node with ID:', userNodeId);
          return;
        }
        // Find chat node by matching the user node ID directly
        targetChatNode = chatNodes.find(cn => cn.id === userNodeId);
        if (!targetChatNode) {
          console.error(
            'Could not find corresponding chat node for user node:',
            userNodeId
          );
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
                  setNodes(prev => {
                    const updated = [...prev, aiNode!];
                    return updated;
                  });
                } else if (data.type === 'content' && aiNode) {
                  streamingText += data.content;
                  const aiNodeId = aiNode.id;
                  setNodes(prev =>
                    prev.map(node =>
                      node.id === aiNodeId
                        ? { ...node, text: streamingText }
                        : node
                    )
                  );
                } else if (data.type === 'complete' && aiNode) {
                  const aiNodeId = aiNode.id;
                  setNodes(prev =>
                    prev.map(node =>
                      node.id === aiNodeId
                        ? { ...node, text: data.node.text }
                        : node
                    )
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
        const result = await response.json();

        // Update local state by filtering out all deleted nodes
        const deletedIds = new Set(result.deletedIds || [nodeId]);
        const updatedNodes = nodes.filter(n => !deletedIds.has(n.id));
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
          } else {
            setActiveNodeId(null);
          }
        }
      } else {
        console.error('Delete failed:', response.status, response.statusText);
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
    }
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
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
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
            <div>{chatNodes.length} nodes</div>

            <div className="flex items-center space-x-2">
              <input
                type="file"
                accept=".json"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImportModal({ isOpen: true, file });
                  }
                }}
                className="hidden"
                id="import-file"
              />
              <label
                htmlFor="import-file"
                className="px-3 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600 cursor-pointer"
              >
                Import
              </label>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(
                      `/api/export/${conversation.id}`
                    );
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${conversation.title}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch (error) {
                    console.error('Export failed:', error);
                  }
                }}
                className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
              >
                Export
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/share', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        conversationId: conversation.id,
                        nodeId: activeNodeId,
                        activePathOnly: true,
                      }),
                    });
                    const { url } = await response.json();
                    setShareModal({ isOpen: true, url });
                  } catch (error) {
                    console.error('Share failed:', error);
                  }
                }}
                className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
              >
                Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Pane */}
        <div className="w-1/2 border-r border-gray-200">
          <ChatPaneV2
            chatNodes={chatNodes}
            activeNodeId={activeNodeId}
            onSendMessage={handleSendMessage}
            onBranchFromNode={handleBranchFromNode}
            onNodeSelect={nodeId => {
              // Keep the ChatPane display as-is, just update active node for graph highlighting
              setActiveNodeId(nodeId);
            }}
            onEditNode={handleEditNode}
            onDeleteNode={handleDeleteNode}
            onRequestAIReply={handleRequestAIReply}
            className="h-full"
          />
        </div>

        {/* Graph Pane */}
        <div className="w-1/2">
          <Graph
            nodes={nodes}
            activeNodeId={activeNodeId}
            onNodeClick={nodeId => {
              setActiveNodeId(nodeId);
            }}
            className="h-full w-full"
          />
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModal.isOpen}
        onClose={() => setShareModal({ isOpen: false, url: '' })}
        shareUrl={shareModal.url}
        conversationTitle={conversation?.title || 'Untitled Conversation'}
      />

      {/* Import Confirmation Modal */}
      {importModal.isOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Import Conversation</h3>
            <p className="text-gray-600 mb-6">
              How would you like to import this conversation?
            </p>
            <div className="space-y-3 mb-6">
              <button
                onClick={async () => {
                  if (!importModal.file) return;

                  try {
                    const formData = new FormData();
                    formData.append('file', importModal.file);
                    formData.append('conversationId', conversation.id);

                    const response = await fetch('/api/import', {
                      method: 'POST',
                      body: formData,
                    });

                    if (response.ok) {
                      setImportModal({ isOpen: false, file: null });
                      window.location.reload();
                    } else {
                      alert('Import failed');
                    }
                  } catch (error) {
                    console.error('Import failed:', error);
                    alert('Import failed');
                  }
                }}
                className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
              >
                <div className="font-medium text-blue-900">
                  Add to Current Conversation
                </div>
                <div className="text-sm text-blue-700">
                  Import nodes into this conversation
                </div>
              </button>
              <button
                onClick={async () => {
                  if (!importModal.file) return;

                  try {
                    const formData = new FormData();
                    formData.append('file', importModal.file);

                    const response = await fetch('/api/import', {
                      method: 'POST',
                      body: formData,
                    });

                    if (response.ok) {
                      const result = await response.json();
                      setImportModal({ isOpen: false, file: null });
                      router.push(`/c/${result.conversationId}`);
                    } else {
                      alert('Import failed');
                    }
                  } catch (error) {
                    console.error('Import failed:', error);
                    alert('Import failed');
                  }
                }}
                className="w-full p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
              >
                <div className="font-medium text-green-900">
                  Create New Conversation
                </div>
                <div className="text-sm text-green-700">
                  Import as a separate conversation
                </div>
              </button>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setImportModal({ isOpen: false, file: null })}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
