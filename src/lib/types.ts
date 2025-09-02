export type NodeT = {
  id: string;
  conversationId: string;
  parentId: string | null;
  role: 'user' | 'assistant' | 'system';
  text: string;
  deleted: boolean;
  createdAt: string;
};

export type ConversationT = {
  id: string;
  ownerId: string;
  title: string;
  isPublic: boolean;
  createdAt: string;
};

export type UserT = {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
};

export type SessionT = {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
};

export type TreeNode = {
  id: string;
  x: number;
  y: number;
};

export type TreeLink = {
  source: TreeNode | string;
  target: TreeNode | string;
};

export type SwitchSteps = {
  lca: string;
  up: string[];
  down: string[];
};

// Paired chat node type for user/assistant message pairs
export type ChatNodeT = {
  id: string;
  parentId: string | null;
  children: string[];
  query: string; // user message
  response: string; // assistant message
  assistantText: string; // alias for response
  model?: string;
  conversationId: string;
  createdAt: string;
};

// Helper type for graph visualization
export type GraphNode = TreeNode & {
  level: number;
  children: GraphNode[];
  chatNode: ChatNodeT;
  userText: string;
  assistantText: string;
  isActive: boolean;
};
