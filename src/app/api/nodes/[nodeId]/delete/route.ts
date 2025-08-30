import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  const { nodeId } = await params;
  
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First, find the node and verify ownership
    const node = await prisma.node.findFirst({
      where: {
        id: nodeId,
      },
      include: {
        conversation: true,
      },
    });

    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    if (node.conversation.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all descendant nodes recursively
    const getAllDescendants = async (parentId: string): Promise<string[]> => {
      const children = await prisma.node.findMany({
        where: { parentId },
        select: { id: true },
      });
      
      const childIds = children.map((child: any) => child.id);
      const allDescendants = [...childIds];
      
      for (const childId of childIds) {
        const descendants = await getAllDescendants(childId);
        allDescendants.push(...descendants);
      }
      
      return allDescendants;
    };

    const descendantIds = await getAllDescendants(nodeId);
    const allNodeIds = [nodeId, ...descendantIds];

    // Delete all nodes in the subgraph
    await prisma.node.deleteMany({
      where: {
        id: {
          in: allNodeIds,
        },
      },
    });

    return NextResponse.json({ 
      success: true, 
      deletedCount: allNodeIds.length,
      deletedIds: allNodeIds 
    });
  } catch (error) {
    console.error('Error deleting node:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
