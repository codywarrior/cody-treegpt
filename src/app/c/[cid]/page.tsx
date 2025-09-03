'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Upload,
  Share2,
  Download,
} from 'lucide-react';

import ChatPaneV2 from '@/components/chat/chat-pane';
import Graph from '@/components/visualization/graph';
import ShareModal from '@/components/share/share-modal';
import { useToast } from '@/components/ui/toast-provider';
import { convertNodesToChatNodes } from '@/lib/chat-utils';
import {
  useConversationDetail,
  useExportConversation,
  useShareConversation,
  useImportConversation,
} from '@/hooks/use-conversations';
import { useCreateNode, useGenerateAIReply } from '@/hooks/use-nodes';

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const cid = params.cid as string;

  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // TanStack Query hooks
  const { data: conversationData, isLoading } = useConversationDetail(cid);
  const createNodeMutation = useCreateNode();
  const generateAIReplyMutation = useGenerateAIReply();
  const exportConversationMutation = useExportConversation();
  const shareConversationMutation = useShareConversation();
  const importConversationMutation = useImportConversation();

  const conversation = conversationData?.conversation || null;
  const nodes = useMemo(
    () => conversationData?.nodes ?? [],
    [conversationData?.nodes]
  );
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

  // Set active node when conversation data loads
  useEffect(() => {
    if (conversationData && !activeNodeId) {
      const convertedChatNodes = convertNodesToChatNodes(
        conversationData.nodes
      );
      const lastNode =
        convertedChatNodes.length > 0
          ? convertedChatNodes[convertedChatNodes.length - 1]
          : null;
      setActiveNodeId(lastNode?.id || conversationData.rootNodeId);
    }
  }, [conversationData, activeNodeId]);

  const handleBranchFromNode = async (nodeId: string, text: string) => {
    createNodeMutation.mutate(
      {
        conversationId: cid,
        parentId: nodeId,
        role: 'user',
        text,
      },
      {
        onSuccess: data => {
          const newNode = data.node;
          setActiveNodeId(newNode.id);
          // Automatically trigger AI reply
          setIsGeneratingAI(true);
          generateAIReplyMutation.mutate(newNode.id, {
            onSuccess: () => {
              setIsGeneratingAI(false);
            },
            onError: () => {
              setIsGeneratingAI(false);
            },
          });
        },
        onError: error => {
          toast.error('Failed to create branch', error.message);
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
              <div className="relative group">
                <label
                  htmlFor="import-file"
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-all duration-200 hover:shadow-md"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </label>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  Import conversation from JSON file
                </div>
              </div>
              <div className="relative group">
                <button
                  onClick={() => {
                    exportConversationMutation.mutate({
                      conversationId: conversation.id,
                    });
                  }}
                  disabled={exportConversationMutation.isPending}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-200 hover:shadow-md"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {exportConversationMutation.isPending
                    ? 'Exporting...'
                    : 'Export'}
                </button>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  Export conversation to JSON file
                </div>
              </div>
              <div className="relative group">
                <button
                  onClick={() =>
                    shareConversationMutation.mutate(
                      {
                        conversationId: conversation?.id || '',
                        nodeId: activeNodeId || undefined,
                      },
                      {
                        onSuccess: data => {
                          setShareModal({
                            isOpen: true,
                            url: data.url,
                          });
                        },
                        onError: error => {
                          toast.error(
                            'Share Failed',
                            'Failed to share conversation.'
                          );
                        },
                      }
                    )
                  }
                  disabled={shareConversationMutation.isPending}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-200 hover:shadow-md"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  {shareConversationMutation.isPending ? 'Sharing...' : 'Share'}
                </button>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  Share active conversation path
                </div>
              </div>
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
            isGeneratingAI={isGeneratingAI}
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
                        toast.success(
                          'Import successful',
                          'Conversation imported successfully'
                        );
                      },
                      onError: error => {
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
                      onSuccess: result => {
                        setImportModal({ isOpen: false, file: null });
                        router.push(`/c/${result.conversationId}`);
                        toast.success(
                          'Import successful',
                          'New conversation created'
                        );
                      },
                      onError: error => {
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
