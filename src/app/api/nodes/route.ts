import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { conversationId, parentId, role, text } = await request.json();

    if (!conversationId || !role || !text) {
      return NextResponse.json(
        { error: 'conversationId, role, and text are required' },
        { status: 400 }
      );
    }

    // Verify user owns the conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        ownerId: user.id,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Verify parent node exists if provided
    if (parentId) {
      const parentNode = await prisma.node.findFirst({
        where: {
          id: parentId,
          conversationId,
        },
      });

      if (!parentNode) {
        return NextResponse.json(
          { error: 'Parent node not found' },
          { status: 404 }
        );
      }
    }

    const node = await prisma.node.create({
      data: {
        conversationId,
        parentId: parentId || null,
        role,
        text,
      },
    });

    return NextResponse.json({
      node: {
        id: node.id,
        conversationId: node.conversationId,
        parentId: node.parentId,
        role: node.role,
        text: node.text,
        deleted: node.deleted,
        createdAt: node.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Create node error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
