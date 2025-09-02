import { NodeT, ConversationT } from './types';

export interface ExportData {
  version: number;
  conversation: {
    id: string;
    title: string;
  };
  nodes: Array<{
    id: string;
    parentId: string | null;
    role: 'user' | 'assistant' | 'system';
    text: string;
    createdAt: string;
  }>;
}

/**
 * Export conversation to JSON format
 */
export function exportToJSON(
  conversation: ConversationT,
  nodes: NodeT[]
): ExportData {
  return {
    version: 1,
    conversation: {
      id: conversation.id,
      title: conversation.title,
    },
    nodes: nodes
      .filter(n => !n.deleted)
      .map(node => ({
        id: node.id,
        parentId: node.parentId,
        role: node.role,
        text: node.text,
        createdAt: node.createdAt,
      })),
  };
}

/**
 * Build tree structure for markdown export
 */
function buildTreeStructure(nodes: NodeT[]): Map<string, NodeT[]> {
  const childrenMap = new Map<string, NodeT[]>();

  nodes.forEach(node => {
    const parentId = node.parentId || 'root';
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(node);
  });

  return childrenMap;
}

/**
 * Generate nested markdown bullets
 */
function generateMarkdownTree(
  nodeId: string | null,
  childrenMap: Map<string, NodeT[]>,
  nodesById: Map<string, NodeT>,
  depth: number = 0
): string[] {
  const lines: string[] = [];
  const children = childrenMap.get(nodeId || 'root') || [];

  children.forEach(node => {
    const indent = '  '.repeat(depth);
    const rolePrefix = node.role === 'user' ? '**User:** ' : '**Assistant:** ';
    const truncatedText =
      node.text.length > 100 ? node.text.slice(0, 100) + '...' : node.text;

    lines.push(`${indent}* ${rolePrefix}${truncatedText}`);

    // Recursively add children
    const childLines = generateMarkdownTree(
      node.id,
      childrenMap,
      nodesById,
      depth + 1
    );
    lines.push(...childLines);
  });

  return lines;
}

/**
 * Generate Mermaid graph syntax
 */
function generateMermaidGraph(nodes: NodeT[]): string {
  const lines = ['```mermaid', 'graph TD'];
  const nodesById = new Map(nodes.map(n => [n.id, n]));

  // Add nodes
  nodes.forEach(node => {
    const label =
      node.text.length > 28 ? node.text.slice(0, 28) + '...' : node.text;

    // Escape quotes and special characters
    const escapedLabel = label
      .replace(/"/g, '\\"')
      .replace(/\n/g, ' ')
      .replace(/\r/g, '');

    const nodeStyle = node.role === 'user' ? 'fill:#e3f2fd' : 'fill:#f3e5f5';
    lines.push(`  ${node.id}["${escapedLabel}"]`);
    lines.push(`  ${node.id} --> ${node.id}[${nodeStyle}]`);
  });

  // Add edges
  nodes.forEach(node => {
    if (node.parentId && nodesById.has(node.parentId)) {
      lines.push(`  ${node.parentId} --> ${node.id}`);
    }
  });

  lines.push('```');
  return lines.join('\n');
}

/**
 * Export conversation to Markdown format with Mermaid
 */
export function exportToMarkdown(
  conversation: ConversationT,
  nodes: NodeT[]
): string {
  const filteredNodes = nodes.filter(n => !n.deleted);
  const nodesById = new Map(filteredNodes.map(n => [n.id, n]));
  const childrenMap = buildTreeStructure(filteredNodes);

  const lines = [
    `# ${conversation.title}`,
    '',
    `*Exported on ${new Date().toISOString()}*`,
    '',
    '## Conversation Tree',
    '',
  ];

  // Add nested bullet structure
  const treeLines = generateMarkdownTree(null, childrenMap, nodesById);
  lines.push(...treeLines);

  lines.push('', '## Graph Visualization', '');

  // Add Mermaid graph
  const mermaidGraph = generateMermaidGraph(filteredNodes);
  lines.push(mermaidGraph);

  return lines.join('\n');
}

/**
 * Import conversation from JSON
 */
export function importFromJSON(data: ExportData): {
  conversation: { title: string };
  nodes: Array<{
    id: string;
    parentId: string | null;
    role: 'user' | 'assistant' | 'system';
    text: string;
    createdAt: string;
  }>;
} {
  if (data.version !== 1) {
    throw new Error(`Unsupported export version: ${data.version}`);
  }

  return {
    conversation: {
      title: data.conversation.title,
    },
    nodes: data.nodes,
  };
}

/**
 * Generate unique IDs for imported nodes to avoid collisions
 */
export function generateImportIds(
  nodes: Array<{
    id: string;
    parentId: string | null;
    role: 'user' | 'assistant' | 'system';
    text: string;
    createdAt: string;
  }>
): {
  idMapping: Map<string, string>;
  updatedNodes: Array<{
    id: string;
    parentId: string | null;
    role: 'user' | 'assistant' | 'system';
    text: string;
    createdAt: string;
  }>;
} {
  const idMapping = new Map<string, string>();

  // Generate new IDs
  nodes.forEach(node => {
    const newId = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    idMapping.set(node.id, newId);
  });

  // Update nodes with new IDs and parent references
  const updatedNodes = nodes.map(node => ({
    ...node,
    id: idMapping.get(node.id)!,
    parentId: node.parentId ? idMapping.get(node.parentId) || null : null,
  }));

  return { idMapping, updatedNodes };
}
