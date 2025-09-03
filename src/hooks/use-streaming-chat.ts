'use client';

import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { conversationKeys } from './use-conversations';

interface StreamingNode {
  id: string;
  role: 'assistant';
  text: string;
  parentId: string;
  conversationId: string;
  createdAt: string;
}

interface StreamingState {
  nodeId: string | null;
  content: string;
  isStreaming: boolean;
}

export function useStreamingChat(conversationId: string) {
  const [streamingState, setStreamingState] = useState<StreamingState>({
    nodeId: null,
    content: '',
    isStreaming: false,
  });

  const queryClient = useQueryClient();
  const streamingNodeRef = useRef<StreamingNode | null>(null);

  const updateStreamingContent = useCallback(
    (nodeId: string, content: string) => {
      setStreamingState(prev => ({
        ...prev,
        nodeId,
        content: prev.content + content,
        isStreaming: true,
      }));

      // Update the streaming node in cache with accumulated content
      if (streamingNodeRef.current) {
        queryClient.setQueryData(
          conversationKeys.detail(conversationId),
          (
            oldData:
              | { nodes?: Array<{ id: string; [key: string]: unknown }> }
              | undefined
          ) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              nodes: oldData.nodes?.map(n =>
                n.id === nodeId
                  ? {
                      ...n,
                      text: streamingState.content + content,
                      response: streamingState.content + content,
                    }
                  : n
              ),
            };
          }
        );
      }
    },
    [queryClient, conversationId, streamingState.content]
  );

  const startStreaming = useCallback((node: StreamingNode) => {
    streamingNodeRef.current = node;
    setStreamingState({
      nodeId: node.id,
      content: '',
      isStreaming: true,
    });
  }, []);

  const completeStreaming = useCallback(
    (node: StreamingNode) => {
      setStreamingState({
        nodeId: null,
        content: '',
        isStreaming: false,
      });
      streamingNodeRef.current = null;

      // Final update with complete content
      const conversationData = queryClient.getQueryData(
        conversationKeys.detail(conversationId)
      ) as
        | { nodes?: Array<{ id: string; [key: string]: unknown }> }
        | undefined;

      if (conversationData?.nodes) {
        const nodeToUpdate = conversationData.nodes.find(n => n.id === node.id);
        if (nodeToUpdate) {
          queryClient.setQueryData(
            conversationKeys.detail(conversationId),
            (
              oldData:
                | { nodes?: Array<{ id: string; [key: string]: unknown }> }
                | undefined
            ) => {
              if (!oldData) return oldData;
              return {
                ...oldData,
                nodes: oldData.nodes?.map(n =>
                  n.id === node.id
                    ? {
                        ...n,
                        text: node.text,
                        response: node.text,
                      }
                    : n
                ),
              };
            }
          );
        }
      }
    },
    [queryClient, conversationId]
  );

  const stopStreaming = useCallback(() => {
    setStreamingState({
      nodeId: null,
      content: '',
      isStreaming: false,
    });
    streamingNodeRef.current = null;
  }, []);

  return {
    streamingState,
    updateStreamingContent,
    startStreaming,
    completeStreaming,
    stopStreaming,
  };
}
