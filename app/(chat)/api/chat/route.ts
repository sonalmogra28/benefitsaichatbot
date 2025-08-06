import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from 'ai';
import { auth } from '@/app/(auth)/stack-auth';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import { convertToUIMessages, generateUUID } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { compareBenefitsPlans } from '@/lib/ai/tools/compare-benefits-plans';
import { calculateBenefitsCost } from '@/lib/ai/tools/calculate-benefits-cost';
import { showBenefitsDashboard } from '@/lib/ai/tools/show-benefits-dashboard';
import { showCostCalculator } from '@/lib/ai/tools/show-cost-calculator';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';
import type { ChatModel } from '@/lib/ai/models';
import type { VisibilityType } from '@/components/visibility-selector';
import type { Session } from 'next-auth';
import { trackChatEvent } from '@/lib/services/conversation.service';

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('REDIS_URL')) {
        // Resumable streams are disabled due to missing REDIS_URL
      } else {
        // Error initializing stream context
      }
    }
  }

  return globalStreamContext;
}

// Helper function to convert AuthSession to Session
function toSession(authSession: any /* TODO: Define proper AuthSession type */): Session {
  return {
    ...authSession,
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel['id'];
      selectedVisibilityType: VisibilityType;
    } = requestBody;

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const userType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError('rate_limit:chat').toResponse();
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError('forbidden:chat').toResponse();
      }
    }

    const messagesFromDb = await getMessagesByChatId({ id });
    const uiMessages = [message, ...convertToUIMessages(messagesFromDb)];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }: { writer: any /* TODO: Define DataStreamWriter type */ }) => {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages: convertToModelMessages(uiMessages),
          stopWhen: stepCountIs(5),
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning'
              ? []
              : [
                  'comparePlans',
                  'calculateBenefitsCost',
                  'showBenefitsDashboard',
                  'showCostCalculator',
                  'createDocument',
                  'updateDocument',
                  'requestSuggestions',
                ],
          experimental_transform: smoothStream({ chunking: 'word' }),
          tools: {
            comparePlans: compareBenefitsPlans,
            calculateBenefitsCost,
            showBenefitsDashboard,
            showCostCalculator,
            createDocument: createDocument({
              session: toSession(session),
              dataStream,
            }),
            updateDocument: updateDocument({
              session: toSession(session),
              dataStream,
            }),
            requestSuggestions: requestSuggestions({
              session: toSession(session),
              dataStream,
            }),
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          }),
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages, usage }: { messages: any[] /* TODO: Define Message type */; usage?: any }) => {
        const startTime = Date.now();
        
        // Save messages
        await saveMessages({
          messages: messages.map((message: any /* TODO: Define Message type */) => ({
            chatId: id,
            id: message.id,
            role: message.role,
            parts: message.parts,
            attachments: [],
            createdAt: new Date(),
          })),
        });
        
        // Track analytics for the assistant's response
        const assistantMessage = messages.find((m: any) => m.role === 'assistant');
        if (assistantMessage && session?.user) {
          const responseTime = Date.now() - startTime;
          
          // Track chat event
          await trackChatEvent({
            companyId: session.user.companyId || '',
            userId: session.user.id,
            chatId: id,
            messageId: assistantMessage.id,
            eventType: 'message_sent',
            responseTime,
            tokensUsed: usage?.totalTokens,
            cost: usage?.totalTokens ? (usage.totalTokens * 0.00002) : undefined, // Rough estimate
            metadata: {
              model: selectedChatModel,
              toolsUsed: assistantMessage.toolInvocations?.length || 0,
            },
          });
          
          // Track tool usage
          if (assistantMessage.toolInvocations?.length > 0) {
            for (const tool of assistantMessage.toolInvocations) {
              await trackChatEvent({
                companyId: session.user.companyId || '',
                userId: session.user.id,
                chatId: id,
                messageId: assistantMessage.id,
                eventType: 'tool_used',
                toolName: tool.toolName,
                metadata: {
                  toolArgs: tool.args,
                },
              });
            }
          }
        }
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () =>
          stream.pipeThrough(new JsonToSseTransformStream()),
        ),
      );
    } else {
      return new Response(stream);
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    // Log error in production with proper error service
    return new Response('Internal server error', { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getChatById({ id });

  if (!chat) {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
