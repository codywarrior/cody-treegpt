import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { exportToJSON, exportToMarkdown } from '@/lib/export-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cid: string }> }
) {
  try {
    const { cid } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const nodeId = searchParams.get('node');

    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get conversation and verify ownership or public access
    const conversation = await prisma.conversation.findUnique({
      where: { id: cid },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    if (conversation.ownerId !== session.user.id && !conversation.isPublic) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get nodes - either all or from specific subtree
    let nodes;
    if (nodeId) {
      // Export subtree starting from specific node
      const startNode = await prisma.node.findFirst({
        where: {
          id: nodeId,
          conversationId: cid,
        },
      });

      if (!startNode) {
        return NextResponse.json({ error: 'Node not found' }, { status: 404 });
      }

      // Get all descendant nodes recursively
      const getAllDescendants = async (parentId: string): Promise<string[]> => {
        const children = await prisma.node.findMany({
          where: {
            parentId: parentId,
            conversationId: cid,
          },
        });

        const allDescendants: string[] = [];
        for (const child of children) {
          allDescendants.push(child.id);
          const childDescendants = await getAllDescendants(child.id);
          allDescendants.push(...childDescendants);
        }

        return allDescendants;
      };

      const descendantIds = await getAllDescendants(nodeId);
      const allNodeIds = [nodeId, ...descendantIds];

      nodes = await prisma.node.findMany({
        where: {
          id: { in: allNodeIds },
          conversationId: cid,
        },
        orderBy: { createdAt: 'asc' },
      });
    } else {
      // Export entire conversation
      nodes = await prisma.node.findMany({
        where: { conversationId: cid },
        orderBy: { createdAt: 'asc' },
      });
    }

    // Convert Prisma objects to plain objects
    const plainNodes = nodes.map(node => ({
      id: node.id,
      conversationId: node.conversationId,
      parentId: node.parentId,
      role: node.role as 'user' | 'assistant' | 'system',
      text: node.text,
      deleted: node.deleted,
      createdAt: node.createdAt.toISOString(),
    }));

    const plainConversation = {
      id: conversation.id,
      ownerId: conversation.ownerId,
      title: conversation.title,
      isPublic: conversation.isPublic,
      createdAt: conversation.createdAt.toISOString(),
    };

    if (format === 'json') {
      const exportData = exportToJSON(plainConversation, plainNodes);

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${conversation.title.replace(/[^a-zA-Z0-9]/g, '_')}.json"`,
        },
      });
    } else if (format === 'md' || format === 'markdown') {
      const markdownContent = exportToMarkdown(plainConversation, plainNodes);

      return new NextResponse(markdownContent, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="${conversation.title.replace(/[^a-zA-Z0-9]/g, '_')}.md"`,
        },
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid format. Use json or md.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export conversation' },
      { status: 500 }
    );
  }
}
