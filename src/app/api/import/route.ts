import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { importFromJSON, generateImportIds } from '@/lib/export-utils';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const conversationId = formData.get('conversationId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/json') {
      return NextResponse.json(
        { error: 'Only JSON files are supported for import' },
        { status: 400 }
      );
    }

    const fileContent = await file.text();
    let importData;

    try {
      importData = JSON.parse(fileContent);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON file' }, { status: 400 });
    }

    // Validate and parse import data
    const { conversation: importConv, nodes: importNodes } =
      importFromJSON(importData);

    // Generate new IDs to avoid collisions
    const { updatedNodes } = generateImportIds(importNodes);

    let conversation;

    if (conversationId) {
      // Import into existing conversation
      conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          ownerId: session.user.id,
        },
      });

      if (!conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }
    } else {
      // Create new conversation
      conversation = await prisma.conversation.create({
        data: {
          ownerId: session.user.id,
          title: title || importConv.title || 'Imported Conversation',
          isPublic: false,
        },
      });
    }

    // Create nodes in batches to maintain relationships
    const nodeCreationData = updatedNodes.map(node => ({
      id: node.id,
      conversationId: conversation.id,
      parentId: node.parentId,
      role: node.role,
      text: node.text,
      deleted: false,
      createdAt: new Date(node.createdAt),
    }));

    // Sort nodes by creation date to maintain proper order
    nodeCreationData.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    // Create nodes in transaction to ensure consistency
    await prisma.$transaction(async tx => {
      for (const nodeData of nodeCreationData) {
        await tx.node.create({
          data: nodeData,
        });
      }
    });

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      title: conversation.title,
      nodesImported: nodeCreationData.length,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import conversation' },
      { status: 500 }
    );
  }
}
