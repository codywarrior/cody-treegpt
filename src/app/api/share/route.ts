import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import {
  createPublicToken,
  revokePublicToken,
  getConversationTokens,
} from '@/lib/public-tokens';

// Create a public sharing token
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      conversationId,
      nodeId,
      activePathOnly = true,
      expiresInDays = 30,
    } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID required' },
        { status: 400 }
      );
    }

    // Verify conversation ownership
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // If nodeId is provided, verify it exists in the conversation
    if (nodeId) {
      const node = await prisma.node.findFirst({
        where: {
          id: nodeId,
          conversationId: conversationId,
        },
      });

      if (!node) {
        return NextResponse.json({ error: 'Node not found' }, { status: 404 });
      }
    }

    // Create the public token
    const token = await createPublicToken(
      conversationId,
      nodeId,
      expiresInDays
    );

    return NextResponse.json({
      token,
      url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/public/${token}`,
      expiresInDays,
      activePathOnly,
    });
  } catch (error) {
    console.error('Share creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create sharing link' },
      { status: 500 }
    );
  }
}

// Get all sharing tokens for a conversation
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID required' },
        { status: 400 }
      );
    }

    // Verify conversation ownership
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const tokens = await getConversationTokens(conversationId);

    return NextResponse.json({
      tokens: tokens.map(token => ({
        token: token.token,
        createdAt: token.createdAt,
        expiresAt: token.expiresAt,
        nodeId: token.nodeId,
        nodeText: token.node?.text.slice(0, 100),
        url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/public/${token.token}`,
      })),
    });
  } catch (error) {
    console.error('Share fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sharing links' },
      { status: 500 }
    );
  }
}

// Revoke a sharing token
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    // Verify token ownership through conversation
    const publicToken = await prisma.publicToken.findUnique({
      where: { token },
      include: {
        conversation: true,
      },
    });

    if (!publicToken || publicToken.conversation.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    const success = await revokePublicToken(token);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to revoke token' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Share revocation error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke sharing link' },
      { status: 500 }
    );
  }
}
