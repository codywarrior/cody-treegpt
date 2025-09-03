'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';

import ChatPaneV2 from '@/components/ChatPaneV2';
import Graph from '@/components/Graph';
import ShareModal from '@/components/ShareModal';
import { useToast } from '@/components/Toast';
import {
  convertNodesToChatNodes,
  getChatActivePath,
  createNewChatNode,
} from '@/lib/chat-utils';
import { NodeT, ChatNodeT, ConversationT } from '@/lib/types';
import { useConversationDetail, useExportConversation, useShareConversation, useImportConversation } from '@/hooks/use-conversations';
import { useCreateNode, useEditNode, useDeleteNode, useGenerateAIReply } from '@/hooks/use-nodes';

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const cid = params.cid as string;

  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  
  // TanStack Query hooks
  const { data: conversationData, isLoading } = useConversationDetail(cid);
  const createNodeMutation = useCreateNode();
  const editNodeMutation = useEditNode();
  const deleteNodeMutation = useDeleteNode();
  const generateAIReplyMutation = useGenerateAIReply();
  const exportConversationMutation = useExportConversation();
  const shareConversationMutation = useShareConversation();
  const importConversationMutation = useImportConversation();
  
  const conversation = conversationData?.conversation || null;
  const nodes = conversationData?.nodes || [];
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
  const [isGraphCollapsed, setIsGraphCollapsed] = useState(false);
  const toast = useToast();

  // Memoize expensive computations
  const chatNodes = useMemo(() => convertNodesToChatNodes(nodes), [nodes]);
  const activePath = useMemo(
    () => getChatActivePath(chatNodes, activeNodeId),
    [chatNodes, activeNodeId]
  );

  // Set active node when conversation data loads
  useEffect(() => {
    if (conversationData && !activeNodeId) {
      const convertedChatNodes = convertNodesToChatNodes(conversationData.nodes);
      const lastNode =
        convertedChatNodes.length > 0
          ? convertedChatNodes[convertedChatNodes.length - 1]
          : null;
      setActiveNodeId(lastNode?.id || conversationData.rootNodeId);
    }
  }, [conversationData, activeNodeId]);

  const handleSendMessage = async (text: string, parentId: string | null) => {
    createNodeMutation.mutate(
      {
        conversationId: cid,
        parentId,
        role: 'user',
        text,
      },
      {
        onSuccess: (data) => {
          const userNode = data.node;
          setActiveNodeId(userNode.id);
          // Automatically trigger AI reply
          generateAIReplyMutation.mutate(userNode.id, {
            onSuccess: (aiResponse) => {
              // Update activeNodeId to the AI response node to show the full conversation
              if (aiResponse.node) {
                setActiveNodeId(aiResponse.node.id);
              }
            },
          });
        },
        onError: (error) => {
          toast.error('Failed to send message', error.message);
        },
      }
    );
  };

  const handleBranchFromNode = async (nodeId: string, text: string) => {
    createNodeMutation.mutate(
      {
        conversationId: cid,
        parentId: nodeId,
        role: 'user',
        text,
      },
      {
        onSuccess: (data) => {
          const newNode = data.node;
          setActiveNodeId(newNode.id);
          // Automatically trigger AI reply
          generateAIReplyMutation.mutate(newNode.id, {
            onSuccess: (aiResponse) => {
              // Update activeNodeId to the AI response node to show the full conversation
              if (aiResponse.node) {
                setActiveNodeId(aiResponse.node.id);
              }
            },
          });
        },
        onError: (error) => {
          toast.error('Failed to create branch', error.message);
        },
      }
    );
  };


  const handleDeleteNode = async (nodeId: string) => {
    // Find the deleted node before deletion for active node logic
    const deletedNode = nodes.find(n => n.id === nodeId);

    deleteNodeMutation.mutate(nodeId, {
      onSuccess: () => {
        // Reset active node if the deleted node was active
        if (deletedNode && activeNodeId === nodeId) {
          // Find a suitable replacement node (parent or first available)
          const parentNode = deletedNode.parentId
            ? nodes.find(n => n.id === deletedNode.parentId)
            : nodes.find(n => n.role === 'user');

          if (parentNode) {
            setActiveNodeId(parentNode.id);
          } else if (nodes.length > 1) {
            setActiveNodeId(nodes[0].id);
          } else {
            setActiveNodeId(null);
          }
        }
      },
      onError: (error) => {
        toast.error('Failed to delete node', (error as Error).message);
      },
    });
  };

  const handleEditNode = async (nodeId: string, newText: string) => {
    editNodeMutation.mutate(
      { nodeId, data: { text: newText } },
      {
        onError: (error) => {
          toast.error('Failed to edit node', (error as Error).message);
        },
      }
    );
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
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/')}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <h1 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white truncate">
              {conversation.title}
            </h1>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="hidden sm:block">{chatNodes.length} nodes</div>

            {/* Mobile Graph Toggle */}
            <button
              onClick={() => setIsGraphCollapsed(!isGraphCollapsed)}
              className="md:hidden p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title={isGraphCollapsed ? 'Show Graph' : 'Hide Graph'}
            >
              {isGraphCollapsed ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </button>

            {/* Desktop Show Graph Button - when collapsed */}
            {isGraphCollapsed && (
              <button
                onClick={() => setIsGraphCollapsed(false)}
                className="hidden md:block p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Show Graph"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}

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
                className="px-2 md:px-3 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600 cursor-pointer"
              >
                Import
              </label>
              <button
                onClick={() => {
                  exportConversationMutation.mutate({ conversationId: conversation.id });
                }}
                disabled={exportConversationMutation.isPending}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {exportConversationMutation.isPending ? 'Exporting...' : 'Export'}
              </button>
              <button
                onClick={() => {
                  shareConversationMutation.mutate(
                    { conversationId: conversation.id },
                    {
                      onSuccess: (data) => {
                        setShareModal({ isOpen: true, url: data.url });
                      },
                      onError: (error) => {
                        toast.error('Share failed', (error as Error).message);
                      },
                    }
                  );
                }}
                disabled={shareConversationMutation.isPending}
                className="px-2 md:px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:opacity-50"
              >
                {shareConversationMutation.isPending ? 'Sharing...' : 'Share'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Pane */}
        <div
          className={`transition-all duration-300 ${
            isGraphCollapsed
              ? 'w-full'
              : 'w-full md:w-1/2 border-r border-gray-200 dark:border-gray-700'
          }`}
        >
          <ChatPaneV2
            chatNodes={chatNodes}
            activeNodeId={activeNodeId || ''}
            conversationId={cid}
            onBranchFromNode={handleBranchFromNode}
            onNodeSelect={(nodeId: string) => {
              // Keep the ChatPane display as-is, just update active node for graph highlighting
              setActiveNodeId(nodeId);
            }}
            className="h-full"
          />
        </div>

        {/* Graph Toggle Button */}
        {!isGraphCollapsed && (
          <div className="hidden md:flex flex-col justify-center">
            <button
              onClick={() => setIsGraphCollapsed(!isGraphCollapsed)}
              className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-l-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors z-10"
              title="Hide Graph"
            >
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        )}

        {/* Graph Pane */}
        {!isGraphCollapsed && (
          <div className="hidden md:block w-1/2 transition-all duration-300">
            <Graph
              nodes={nodes}
              activeNodeId={activeNodeId}
              onNodeClick={nodeId => {
                setActiveNodeId(nodeId);
              }}
              className="h-full w-full"
            />
          </div>
        )}
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
                onClick={() => {
                  if (!importModal.file) return;

                  importConversationMutation.mutate(
                    { file: importModal.file, conversationId: conversation.id },
                    {
                      onSuccess: () => {
                        setImportModal({ isOpen: false, file: null });
                        toast.success('Import successful', 'Conversation imported successfully');
                      },
                      onError: (error) => {
                        toast.error('Import failed', (error as Error).message);
                      },
                    }
                  );
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
                onClick={() => {
                  if (!importModal.file) return;

                  importConversationMutation.mutate(
                    { file: importModal.file },
                    {
                      onSuccess: (result) => {
                        setImportModal({ isOpen: false, file: null });
                        router.push(`/c/${result.conversationId}`);
                        toast.success('Import successful', 'New conversation created');
                      },
                      onError: (error) => {
                        toast.error('Import failed', (error as Error).message);
                      },
                    }
                  );
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
      <toast.ToastContainer />
    </div>
  );
}
