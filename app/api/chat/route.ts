import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { hybridLLMRouter } from '@/lib/services/hybrid-llm-router';
import { conversationService } from '@/lib/services/conversation-service';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Validation schema for chat request
const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  conversationId: z.string().optional(),
  context: z.record(z.any()).optional(),
});

export const POST = withAuth(undefined, undefined)(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json();
    const { message, conversationId, context } = chatRequestSchema.parse(body);

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Create user message object
    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content: message,
      timestamp: new Date(),
      userId: request.user!.id
    };

    // Get or create conversation
    let conversation = conversationId 
      ? await conversationService.getConversation(conversationId)
      : null;

    if (!conversation) {
      conversation = await conversationService.createConversation(
        request.user!.id,
        request.user!.companyId
      );
    }

    // Save user message to conversation
    await conversationService.addMessage(conversation.id, userMessage);

    // Get AI response using hybrid LLM router
    const aiResponse = await hybridLLMRouter.processMessage({
      message: userMessage.content,
      userId: request.user!.id,
      conversationId: conversation.id,
      context
    });

    // Save AI response
    const aiMessage = {
      id: crypto.randomUUID(),
      role: 'assistant' as const,
      content: aiResponse.content,
      timestamp: new Date(),
      metadata: aiResponse.metadata
    };

    await conversationService.addMessage(conversation.id, aiMessage);

    return NextResponse.json({
      message: aiMessage,
      conversationId: conversation.id,
      usage: aiResponse.usage
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Chat error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: request.user?.id 
    });
    return NextResponse.json({ error: 'Chat processing failed' }, { status: 500 });
  }
});