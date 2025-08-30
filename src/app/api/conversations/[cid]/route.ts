import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cid: string }> }
) {
  const { cid } = await params;
  
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: cid,
        ownerId: session.user.id,
      },
      include: {
        nodes: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Find root node
    const rootNode = conversation.nodes.find((node: any) => !node.parentId);

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        isPublic: conversation.isPublic,
        createdAt: conversation.createdAt.toISOString(),
      },
      nodes: conversation.nodes.map((node: any) => ({
        id: node.id,
        conversationId: node.conversationId,
        parentId: node.parentId,
        role: node.role,
        text: node.text,
        deleted: node.deleted,
        createdAt: new Date(node.createdAt).toISOString(),
      })),
      rootNodeId: rootNode?.id || null,
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cid: string }> }
) {
  const { cid } = await params;
  
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title } = await request.json();
    
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const conversation = await prisma.conversation.updateMany({
      where: {
        id: cid,
        ownerId: session.user.id,
      },
      data: { title },
    });

    if (conversation.count === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cid: string }> }
) {
  const { cid } = await params;
  
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete all nodes first (cascade delete)
    await prisma.node.deleteMany({
      where: {
        conversationId: cid,
      },
    });

    // Then delete the conversation
    const conversation = await prisma.conversation.deleteMany({
      where: {
        id: cid,
        ownerId: session.user.id,
      },
    });

    if (conversation.count === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
