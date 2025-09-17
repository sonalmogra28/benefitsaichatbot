import { NextResponse, type NextRequest } from 'next/server';
import { streamText } from 'ai';
import { getContainer, CONVERSATIONS_CONTAINER } from '@/lib/azure/cosmos-db';
import { CHAT_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { ragSystem } from '@/lib/ai/rag-system';
import { hybridLLMRouter } from '@/lib/ai/hybrid-llm-router';
import { logger } from '@/lib/logging/logger';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { validateBody } from '@/lib/middleware/validation';
import { handleAPIError, ValidationError } from '@/lib/errors/api-errors';
import { z } from 'zod';
import { queryOptimizer } from '@/lib/ai/query-optimizer';
import { responseCache } from '@/lib/cache/response-cache';
import { benefitsComparisonTools } from '@/lib/ai/tools/benefits-comparison';

// Validation schema for chat request
const chatRequestSchema = z.object({
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1, 'Message content is required'),
  })).min(1, 'At least one message is required'),
  chatId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Extract user info from middleware
    const userId = request.headers.get('x-user-id');
    const companyId = request.headers.get('x-company-id');

    if (!userId || !companyId) {
      logger.securityEvent('Unauthorized chat request', {
        userAgent: request.headers.get('user-agent'),
      });
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.chat(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Validate request body
    const { data: requestData, error: validationError } = await validateBody(chatRequestSchema)(request);
    if (validationError) {
      return validationError;
    }

    const { messages, chatId: existingChatId } = requestData as {
      messages: Array<{ id: string; role: string; content: string }>;
      chatId?: string;
    };
    
    logger.info('API Request: POST /api/chat', {
      userId,
      companyId,
      messageCount: messages.length,
    });

    // Determine the chat ID
    const chatId =
      existingChatId ||
      `${companyId}_${userId}_${new Date().getTime()}`;

    // Save user message to Cosmos DB
    const conversationsContainer = await getContainer(CONVERSATIONS_CONTAINER);
    const userMessageItem = {
      id: userMessage.id,
      chatId,
      partitionKey: companyId,
      ...userMessage,
      userId,
      timestamp: new Date().toISOString(),
    };
    await conversationsContainer.items.create(userMessageItem);

    // Stage 1: Check for a static, pre-defined answer to avoid LLM calls
    const staticAnswer = await queryOptimizer.findStaticAnswer(
      userMessage.content,
      companyId,
    );

    if (staticAnswer) {
      // If a static answer is found, stream it back directly
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(staticAnswer);
          controller.close();
        },
      });
      return new Response(stream);
    }

    // Stage 2: Check for a cached LLM response
    const cachedResponse = await responseCache.get(
      userMessage.content,
      companyId,
    );
    if (cachedResponse) {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(cachedResponse);
          controller.close();
        },
      });
      return new Response(stream);
    }

    // Retrieve relevant context from RAG system
    const searchResults = await ragSystem.search(
      userMessage.content,
      companyId,
    );
    const context = searchResults
      .map((result) => result.chunk.content)
      .join('\n\n');
    if (searchResults.length > 0) {
      logger.info('RAG search results', {
        userId,
        companyId,
        chatId,
        results: searchResults.map((r) => ({
          chunkId: r.chunk.id,
          documentId: r.chunk.documentId,
          score: r.score,
        })),
      });
    }
    const systemPrompt = context
      ? `Context:\n${context}\n\n${CHAT_SYSTEM_PROMPT}`
      : CHAT_SYSTEM_PROMPT;

    // Route query to optimal model using hybrid LLM router
    const routing = await hybridLLMRouter.routeQuery(
      userMessage.content,
      context,
      companyId,
    );

    logger.info('LLM routing decision', {
      userId,
      companyId,
      chatId,
      selectedModel: routing.model,
      reason: routing.reason,
      complexity: routing.complexity,
    });

    // Call the selected model
    const streamResult = await streamText({
      model: routing.config.model,
      system: systemPrompt,
      messages,
      tools: benefitsComparisonTools,
      async onFinish({ text, toolCalls, toolResults, usage, finishReason }: {
        text?: string;
        toolCalls?: any;
        toolResults?: any;
        usage?: any;
        finishReason?: string;
      }) {
        // Save assistant message to Cosmos DB
        const assistantMessageItem = {
          id: `ai-message-${Date.now()}`,
          chatId,
          partitionKey: companyId,
          role: 'assistant',
          content: text || null,
          toolCalls: toolCalls || null,
          toolResults: toolResults || null,
          usage,
          finishReason,
          userId,
          timestamp: new Date().toISOString(),
        };
        await conversationsContainer.items.create(assistantMessageItem);

        // Update the conversation metadata (conceptually, in Cosmos DB this might be a separate item or handled differently)
        const conversationMetaItem = {
          id: chatId,
          partitionKey: companyId,
          userId,
          updatedAt: new Date().toISOString(),
          lastMessage: text ? text.substring(0, 100) : '[AI Response]',
        };
        await conversationsContainer.item(chatId, companyId).upsert(conversationMetaItem);
      },
    });

    const result = streamResult.toDataStreamResponse();
    
    // Log successful response
    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/chat', 200, duration, {
      userId,
      companyId,
      chatId,
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const apiError = handleAPIError(error);
    
    logger.error('Chat API error', {
      error: apiError.message,
      code: apiError.code,
      duration,
      userId: request.headers.get('x-user-id'),
      companyId: request.headers.get('x-company-id'),
    });
    
    return new NextResponse(
      JSON.stringify({
        error: apiError.message,
        code: apiError.code,
      }),
      {
        status: apiError.statusCode,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
