import { randomBytes } from 'crypto';
import { prisma } from './prisma';

/**
 * Generate a secure random token for public sharing
 */
export function generatePublicToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create a public sharing token for a conversation
 */
export async function createPublicToken(
  conversationId: string,
  nodeId?: string,
  expiresInDays: number = 30
): Promise<string> {
  const token = generatePublicToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  await prisma.publicToken.create({
    data: {
      token,
      conversationId,
      nodeId: nodeId || null,
      expiresAt,
    },
  });

  return token;
}

/**
 * Validate and retrieve public token data
 */
export async function validatePublicToken(token: string) {
  const publicToken = await prisma.publicToken.findUnique({
    where: { token },
    include: {
      conversation: {
        select: {
          id: true,
          title: true,
          isPublic: true,
          ownerId: true,
        },
      },
      node: {
        select: {
          id: true,
          text: true,
          role: true,
        },
      },
    },
  });

  if (!publicToken) {
    return null;
  }

  // Check if token has expired
  if (publicToken.expiresAt < new Date()) {
    // Clean up expired token
    await prisma.publicToken.delete({
      where: { token },
    });
    return null;
  }

  return publicToken;
}

/**
 * Revoke a public token
 */
export async function revokePublicToken(token: string): Promise<boolean> {
  try {
    await prisma.publicToken.delete({
      where: { token },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all public tokens for a conversation
 */
export async function getConversationTokens(conversationId: string) {
  return await prisma.publicToken.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    include: {
      node: {
        select: {
          id: true,
          text: true,
          role: true,
        },
      },
    },
  });
}

/**
 * Clean up expired tokens (should be run periodically)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.publicToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return result.count;
}
