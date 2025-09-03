import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validatePublicToken } from '@/lib/public-tokens';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Validate the public token
    const tokenData = await validatePublicToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: 'Token not found or expired' },
        { status: 404 }
      );
    }

    // Get conversation nodes
    let nodes;
    if (tokenData.nodeId) {
      // Get path from root to the shared node and its descendants
      const getAllAncestors = async (nodeId: string): Promise<string[]> => {
        const ancestors: string[] = [];
        let currentNode = await prisma.node.findUnique({
          where: { id: nodeId },
        });

        while (currentNode?.parentId) {
          ancestors.unshift(currentNode.parentId);
          currentNode = await prisma.node.findUnique({
            where: { id: currentNode.parentId },
          });
        }

        return ancestors;
      };

      const ancestorIds = await getAllAncestors(tokenData.nodeId);
      const pathNodeIds = [...ancestorIds, tokenData.nodeId];

      // Get all nodes in the path
      const pathNodes = await prisma.node.findMany({
        where: {
          id: { in: pathNodeIds },
          conversationId: tokenData.conversationId,
        },
        orderBy: { createdAt: 'asc' },
      });

      // For each user node in the path, also include its assistant response
      const additionalNodeIds: string[] = [];
      for (const node of pathNodes) {
        if (node.role === 'user') {
          // Find the LATEST assistant response for this user node (most recent regeneration)
          const assistantResponse = await prisma.node.findFirst({
            where: {
              parentId: node.id,
              role: 'assistant',
              conversationId: tokenData.conversationId,
            },
            orderBy: { createdAt: 'desc' }, // Get the most recent response
          });
          if (assistantResponse) {
            additionalNodeIds.push(assistantResponse.id);
          }
        }
      }

      // Get the additional assistant nodes
      const assistantNodes = await prisma.node.findMany({
        where: {
          id: { in: additionalNodeIds },
          conversationId: tokenData.conversationId,
        },
      });

      // Combine path nodes and assistant responses
      nodes = [...pathNodes, ...assistantNodes].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } else {
      // Get all nodes in the conversation
      nodes = await prisma.node.findMany({
        where: { conversationId: tokenData.conversationId },
        orderBy: { createdAt: 'asc' },
      });
    }

    // Convert to plain objects
    const plainNodes = nodes.map(node => ({
      id: node.id,
      conversationId: node.conversationId,
      parentId: node.parentId,
      role: node.role as 'user' | 'assistant' | 'system',
      text: node.text,
      deleted: node.deleted,
      createdAt: node.createdAt.toISOString(),
    }));

    return NextResponse.json({
      conversation: {
        id: tokenData.conversation.id,
        title: tokenData.conversation.title,
      },
      node: tokenData.node
        ? {
            id: tokenData.node.id,
            text: tokenData.node.text,
            role: tokenData.node.role,
          }
        : undefined,
      expiresAt: tokenData.expiresAt.toISOString(),
      nodes: plainNodes,
    });
  } catch (error) {
    console.error('Public token fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shared content' },
      { status: 500 }
    );
  }
}
