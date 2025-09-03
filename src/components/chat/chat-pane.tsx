'use client';

import React from 'react';
import { ChatContainer } from './chat-container';
import { ChatNodeT } from '@/lib/types';

interface ChatPaneV2Props {
  conversationId: string;
  chatNodes: ChatNodeT[];
  activeNodeId: string | null;
  onNodeSelect: (nodeId: string) => void;
  onBranchFromNode?: (nodeId: string, message: string) => Promise<void>;
  isGeneratingAI?: boolean;
  className?: string;
}

export function ChatPaneV2({
  conversationId,
  chatNodes,
  activeNodeId,
  onNodeSelect,
  onBranchFromNode,
  isGeneratingAI = false,
  className = '',
}: ChatPaneV2Props) {
  return (
    <ChatContainer
      conversationId={conversationId}
      chatNodes={chatNodes}
      activeNodeId={activeNodeId}
      onNodeSelect={onNodeSelect}
      onBranchFromNode={onBranchFromNode}
      isGeneratingAI={isGeneratingAI}
      className={className}
    />
  );
}

export default ChatPaneV2;
