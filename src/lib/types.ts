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
  source: TreeNode;
  target: TreeNode;
};

export type SwitchSteps = {
  lca: string;
  up: string[];
  down: string[];
};
