import { NodeT } from './types';

/**
 * Token estimation for text content (rough approximation)
 */
function estimateTokens(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Summarize early path segments when context is too long
 */
function summarizePathSegments(
  nodes: NodeT[],
  maxTokens: number = 1000
): string {
  const segments: string[] = [];

  for (let i = 0; i < nodes.length; i += 2) {
    const userNode = nodes[i];
    const assistantNode = nodes[i + 1];

    if (userNode?.role === 'user' && assistantNode?.role === 'assistant') {
      segments.push(`User: ${userNode.text.slice(0, 100)}...`);
      segments.push(`Assistant: ${assistantNode.text.slice(0, 150)}...`);
    }
  }

  const summary = segments.join('\n');

  // If still too long, create a higher-level summary
  if (estimateTokens(summary) > maxTokens) {
    const topics = nodes
      .filter(n => n.role === 'user')
      .map(n => n.text.slice(0, 50))
      .join(', ');

    return `Previous conversation covered topics: ${topics}. The user has been exploring various aspects of the main subject through branching conversations.`;
  }

  return summary;
}

/**
 * Build context window for AI with path-aware memory management
 */
export function buildAIContext(
  pathNodes: NodeT[],
  maxTokens: number = 7000,
  keepRecentTurns: number = 6
): {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  totalEstimatedTokens: number;
} {
  const messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }> = [
    {
      role: 'system',
      content:
        'You are GPTree Assistant. Answer based on the provided conversation path. If information is missing, ask a precise clarifying question. Keep answers concise unless asked for depth.',
    },
  ];

  // Calculate total tokens for the full path
  const pathText = pathNodes.map(n => n.text).join(' ');
  const totalTokens = estimateTokens(pathText);

  if (totalTokens <= maxTokens) {
    // Include all path nodes if within budget
    pathNodes.forEach(node => {
      if (node.role === 'user' || node.role === 'assistant') {
        messages.push({
          role: node.role,
          content: node.text,
        });
      }
    });
  } else {
    // Need to summarize early segments and keep recent turns
    const recentStartIndex = Math.max(
      0,
      pathNodes.length - keepRecentTurns * 2
    );
    const earlyNodes = pathNodes.slice(0, recentStartIndex);
    const recentNodes = pathNodes.slice(recentStartIndex);

    if (earlyNodes.length > 0) {
      const summary = summarizePathSegments(earlyNodes);
      messages.push({
        role: 'system',
        content: `Context summary: ${summary}`,
      });
    }

    // Add recent turns verbatim
    recentNodes.forEach(node => {
      if (node.role === 'user' || node.role === 'assistant') {
        messages.push({
          role: node.role,
          content: node.text,
        });
      }
    });
  }

  const finalTokens = messages.reduce(
    (sum, msg) => sum + estimateTokens(msg.content),
    0
  );

  return {
    messages,
    totalEstimatedTokens: finalTokens,
  };
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private maxRequests: number = 10,
    private windowMs: number = 60000 // 1 minute
  ) {}

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];

    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    return true;
  }

  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

// Global rate limiter instance
export const aiRateLimiter = new RateLimiter(10, 60000); // 10 requests per minute
