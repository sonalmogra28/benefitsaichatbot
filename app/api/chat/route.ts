import { NextResponse, type NextRequest } from 'next/server';
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { CHAT_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { ragSystem } from '@/lib/ai/rag-system';

export async function POST(request: NextRequest) {
  try {
    // Extract user info from middleware
    const userId = request.headers.get('x-user-id');
    const companyId = request.headers.get('x-company-id');

    if (!userId || !companyId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { messages, chatId: existingChatId } = await request.json();

    // Determine the chat ID
    const chatId =
      existingChatId ||
      adminDb
        .collection('companies')
        .doc(companyId)
        .collection('conversations')
        .doc().id;

    // Save user message to Firestore
    const userMessage = messages[messages.length - 1];
    const userMessageRef = adminDb.doc(
      `companies/${companyId}/conversations/${chatId}/messages/${userMessage.id}`,
    );

    await userMessageRef.set({
      ...userMessage,
      userId,
      timestamp: FieldValue.serverTimestamp(),
    });

    // Retrieve relevant context from RAG system
    const searchResults = await ragSystem.search(
      userMessage.content,
      companyId,
    );
    const context = searchResults
      .map((result) => result.chunk.content)
      .join('\n\n');
    if (searchResults.length > 0) {
      console.log(
        'RAG search results:',
        searchResults.map((r) => ({
          chunkId: r.chunk.id,
          documentId: r.chunk.documentId,
          score: r.score,
        })),
      );
    }
    const systemPrompt = context
      ? `Context:\n${context}\n\n${CHAT_SYSTEM_PROMPT}`
      : CHAT_SYSTEM_PROMPT;

    // Call the Google AI model
    const result = await streamText({
      model: google('gemini-1.5-flash-latest'),
      system: systemPrompt,
      messages,
      async onFinish({ text, toolCalls, toolResults, usage, finishReason }) {
        // Save assistant message to Firestore
        const assistantMessageRef = adminDb.doc(
          `companies/${companyId}/conversations/${chatId}/messages/ai-message-${Date.now()}`,
        );

        await assistantMessageRef.set({
          role: 'assistant',
          content: text || null,
          toolCalls: toolCalls || null,
          toolResults: toolResults || null,
          usage,
          finishReason,
          userId,
          timestamp: FieldValue.serverTimestamp(),
        });

        // Update the conversation metadata
        await adminDb.doc(`companies/${companyId}/conversations/${chatId}`).set(
          {
            userId,
            updatedAt: FieldValue.serverTimestamp(),
            lastMessage: text ? text.substring(0, 100) : '[AI Response]',
          },
          { merge: true },
        );
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
