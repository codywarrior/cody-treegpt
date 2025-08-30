import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getActivePath } from '@/lib/tree-algorithms';

// OpenAI client will be instantiated in the handler to avoid build-time errors

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user;
    const { nodeId } = await params;

    // Get the node and verify it belongs to user's conversation
    const node = await prisma.node.findUnique({
      where: { id: nodeId },
      include: {
        conversation: true,
      },
    });

    if (!node || node.conversation.ownerId !== user.id) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // Get all nodes in the conversation to build the path
    const allNodes = await prisma.node.findMany({
      where: { conversationId: node.conversationId },
      orderBy: { createdAt: 'asc' },
    });

    // Build nodes map and get active path
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodesById: Record<string, any> = {};
    allNodes.forEach((n) => {
      nodesById[n.id] = n;
    });

    const activePath = getActivePath(nodeId, nodesById);

    // Build conversation context from the active path
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant in a branching conversation tree. Provide thoughtful, contextual responses based on the conversation path.',
      },
    ];

    // Add messages from the active path
    for (const pathNode of activePath) {
      if (pathNode.role === 'user') {
        messages.push({
          role: 'user',
          content: pathNode.text,
        });
      } else if (pathNode.role === 'assistant') {
        messages.push({
          role: 'assistant',
          content: pathNode.text,
        });
      }
    }

    // Create OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Generate AI response
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 500,
      temperature: 0.7,
      stream: true,
    });

    // Create AI reply node with placeholder text
    const aiNode = await prisma.node.create({
      data: {
        conversationId: node.conversationId,
        parentId: nodeId,
        role: 'assistant',
        text: 'Generating...',
      },
    });

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send initial node data
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'node', node: aiNode })}\n\n`));
        
        let fullResponse = '';
        
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullResponse += content;
              // Send streaming content
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', content })}\n\n`));
            }
          }

          // Update the node with the complete response
          const updatedNode = await prisma.node.update({
            where: { id: aiNode.id },
            data: { text: fullResponse || 'Sorry, I could not generate a response.' },
          });

          // Send completion signal
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', node: updatedNode })}\n\n`));
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Failed to generate response' })}\n\n`));
        }
        
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('AI reply error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI reply' },
      { status: 500 }
    );
  }
}
