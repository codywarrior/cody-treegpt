import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifySession } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  try {
    const user = await verifySession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { nodeId } = await params;
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Verify the node exists and belongs to a conversation owned by the user
    const node = await prisma.node.findFirst({
      where: {
        id: nodeId,
        conversation: {
          ownerId: user.id
        }
      }
    });

    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // Update the node text
    const updatedNode = await prisma.node.update({
      where: { id: nodeId },
      data: { text }
    });

    return NextResponse.json({ node: updatedNode });
  } catch (error) {
    console.error('Error updating node:', error);
    return NextResponse.json(
      { error: 'Failed to update node' },
      { status: 500 }
    );
  }
}
