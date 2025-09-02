import { NodeT, ChatNodeT } from './types';

/**
 * Convert traditional NodeT array to ChatNodeT array (chat-pair approach)
 * Groups user/assistant pairs into single chat nodes
 */
export function convertNodesToChatNodes(nodes: NodeT[]): ChatNodeT[] {
  const chatNodes: ChatNodeT[] = [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Find user nodes and their corresponding assistant responses
  const userNodes = nodes.filter(n => n.role === 'user');

  for (const userNode of userNodes) {
    // Find corresponding assistant response
    const assistantNode = nodes.find(
      n => n.role === 'assistant' && n.parentId === userNode.id
    );

    if (assistantNode) {
      // Create chat node from user-assistant pair
      const chatNode: ChatNodeT = {
        id: userNode.id, // Use user node ID as the chat node ID for consistency
        query: userNode.text,
        response: assistantNode.text,
        assistantText: assistantNode.text,
        parentId: findChatParentId(userNode, nodeMap),
        children: [], // Will be populated later
        createdAt: assistantNode.createdAt,
        conversationId: assistantNode.conversationId,
      };

      chatNodes.push(chatNode);
    } else {
      // Create chat node for user message without response (pending AI reply)
      const chatNode: ChatNodeT = {
        id: userNode.id,
        query: userNode.text,
        response: '',
        assistantText: '',
        parentId: findChatParentId(userNode, nodeMap),
        children: [],
        createdAt: userNode.createdAt,
        conversationId: userNode.conversationId,
      };

      chatNodes.push(chatNode);
    }
  }

  // Update children relationships
  for (const chatNode of chatNodes) {
    const children = chatNodes
      .filter(cn => cn.parentId === chatNode.id)
      .map(cn => cn.id);
    chatNode.children = children;
  }

  return chatNodes;
}

function findChatParentId(
  userNode: NodeT,
  nodeMap: Map<string, NodeT>
): string | null {
  if (!userNode.parentId) return null;

  const parentNode = nodeMap.get(userNode.parentId);
  if (!parentNode) return null;

  // If parent is assistant, find the user node that created it
  if (parentNode.role === 'assistant') {
    return parentNode.parentId;
  }

  // If parent is user, it should be the chat node ID
  if (parentNode.role === 'user') {
    return parentNode.id;
  }

  return null;
}

/**
 * Get the active conversation path from root to the given node (treegpt approach)
 */
export function getChatActivePath(
  chatNodes: ChatNodeT[],
  activeNodeId: string | null
): string[] {
  if (!activeNodeId) return [];

  const path: string[] = [];
  const nodeMap = new Map(chatNodes.map(n => [n.id, n]));

  let currentId: string | null = activeNodeId;
  while (currentId) {
    path.unshift(currentId);
    const node = nodeMap.get(currentId);
    currentId = node?.parentId || null;
  }

  return path;
}

/**
 * Calculate subtree width for layout (from treegpt)
 */
export function calculateSubtreeWidths(
  chatNodes: ChatNodeT[]
): Map<string, number> {
  const subtreeWidths = new Map<string, number>();
  const nodeMap = new Map(chatNodes.map(n => [n.id, n]));

  const calculateWidth = (nodeId: string): number => {
    const node = nodeMap.get(nodeId);
    if (!node) return 0;

    if (node.children.length === 0) {
      subtreeWidths.set(nodeId, 1);
      return 1;
    }

    let totalWidth = 0;
    node.children.forEach(childId => {
      totalWidth += calculateWidth(childId);
    });

    const width = Math.max(1, totalWidth);
    subtreeWidths.set(nodeId, width);
    return width;
  };

  // Calculate for all root nodes
  const rootNodes = chatNodes.filter(n => !n.parentId);
  rootNodes.forEach(node => calculateWidth(node.id));

  return subtreeWidths;
}

/**
 * Converts ChatNodeT back to individual NodeT messages for database operations
 */
export function convertChatNodesToNodes(chatNodes: ChatNodeT[]): NodeT[] {
  const nodes: NodeT[] = [];

  for (const chatNode of chatNodes) {
    // Create user node
    const userNode: NodeT = {
      id: chatNode.id,
      conversationId: chatNode.conversationId,
      parentId: chatNode.parentId,
      role: 'user',
      text: chatNode.query,
      deleted: false,
      createdAt: chatNode.createdAt,
    };
    nodes.push(userNode);

    // Create assistant node if response exists
    if (chatNode.response) {
      const assistantNode: NodeT = {
        id: `${chatNode.id}_assistant`,
        conversationId: chatNode.conversationId,
        parentId: chatNode.id,
        role: 'assistant',
        text: chatNode.response,
        deleted: false,
        createdAt: chatNode.createdAt,
      };
      nodes.push(assistantNode);
    }
  }

  return nodes;
}

/**
 * Creates a new chat node with user query and empty response
 */
export function createNewChatNode(
  query: string,
  parentId: string | null,
  conversationId: string
): ChatNodeT {
  const id = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    parentId,
    children: [],
    query,
    response: '',
    assistantText: '',
    conversationId,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Updates a chat node's response
 */
export function updateChatNodeResponse(
  chatNode: ChatNodeT,
  response: string,
  model?: string
): ChatNodeT {
  return {
    ...chatNode,
    response,
    model,
  };
}
