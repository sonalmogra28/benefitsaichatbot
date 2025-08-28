import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { ragSystem } from '@/lib/ai/rag-system';
import { benefitsTools } from '@/lib/ai/tools/benefits-tools';
import { auth } from '@/lib/firebase/admin';
import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// Benefits-specific system prompt
const BENEFITS_SYSTEM_PROMPT = `You are an expert Benefits Assistant AI helping employees understand and manage their benefits.

Your capabilities include:
- Answering questions about health, dental, vision, life, and disability insurance
- Explaining benefits terminology in simple terms
- Calculating costs and comparing plans
- Guiding through enrollment processes
- Providing information about HSA, FSA, and 401k accounts
- Helping with claims and coverage questions

Important guidelines:
- Be accurate with all numbers and calculations
- Cite specific plan documents when available
- Protect user privacy and confidentiality
- Direct complex policy questions to HR when appropriate
- Be empathetic about healthcare costs and concerns
- Use the available tools to provide precise information

Remember: You have access to the company's benefits documents through RAG search, and specialized tools for calculations and comparisons.`;

export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    let userId = 'anonymous';
    let companyId = 'demo';
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await auth.verifyIdToken(token);
        userId = decodedToken.uid;
        companyId = decodedToken.companyId || 'demo';
      } catch (error) {
        console.log('Token verification failed, using anonymous mode');
      }
    }

    // Parse request body
    const { messages, id: chatId } = await request.json();
    
    // Get the latest user message
    const lastMessage = messages[messages.length - 1];
    const userQuery = lastMessage.content;

    // Search for relevant documents using RAG
    let context = '';
    try {
      const searchResults = await ragSystem.search(userQuery, companyId, 5);
      if (searchResults.length > 0) {
        context = ragSystem.generateContext(searchResults);
      }
    } catch (error) {
      console.error('RAG search error:', error);
      // Continue without context if RAG fails
    }

    // Prepare the enhanced prompt with context
    const enhancedMessages = [
      {
        role: 'system',
        content: BENEFITS_SYSTEM_PROMPT + (context ? `\n\nContext from company documents:\n${context}` : ''),
      },
      ...messages,
    ];

    // Check if we have Google AI credentials
    const hasGoogleAI = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    
    if (!hasGoogleAI) {
      // Return a helpful message if AI is not configured
      return new Response(
        JSON.stringify({
          message: `I'm your Benefits Assistant! However, AI services are not fully configured yet. 

To get started:
1. Add your Google AI API key to the environment variables
2. Or configure Vertex AI with Google Cloud credentials

Once configured, I'll be able to:
- Answer your benefits questions
- Compare insurance plans
- Calculate costs
- Help with enrollment
- And much more!

For now, you can explore the interface and test the various features.`,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Stream the response using Google AI
    const result = await streamText({
      model: google('gemini-2.0-flash-exp'),
      messages: enhancedMessages,
      tools: benefitsTools,
      toolChoice: 'auto',
      temperature: 0.7,
      maxTokens: 2048,
      onFinish: async ({ text, usage }: any) => {
        // Save the conversation to Firestore
        try {
          if (chatId && userId !== 'anonymous') {
            const messageRef = db
              .collection('chats')
              .doc(chatId)
              .collection('messages')
              .doc();
            
            await messageRef.set({
              id: messageRef.id,
              chatId,
              userId,
              role: 'assistant',
              content: text,
              timestamp: FieldValue.serverTimestamp(),
              usage,
            });
          }
        } catch (error) {
          console.error('Error saving message:', error);
        }
      },
    });

    // Return the streaming response
    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    
    // Return a fallback response
    return new Response(
      JSON.stringify({
        error: 'An error occurred while processing your request.',
        message: 'Please try again or contact support if the issue persists.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// GET endpoint to retrieve chat history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('id');
    
    if (!chatId) {
      return new Response('Chat ID is required', { status: 400 });
    }

    // Get auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    // Fetch chat messages
    const messagesSnapshot = await db
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .get();
    
    const messages = messagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || null,
    }));
    
    return new Response(JSON.stringify({ messages }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

// DELETE endpoint to delete a chat
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('id');
    
    if (!chatId) {
      return new Response('Chat ID is required', { status: 400 });
    }

    // Get auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    // Check if user owns the chat
    const chatDoc = await db.collection('chats').doc(chatId).get();
    if (!chatDoc.exists || chatDoc.data()?.userId !== decodedToken.uid) {
      return new Response('Forbidden', { status: 403 });
    }
    
    // Delete all messages in the chat
    const messagesSnapshot = await db
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .get();
    
    const batch = db.batch();
    messagesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete the chat document
    batch.delete(db.collection('chats').doc(chatId));
    
    await batch.commit();
    
    return new Response('Chat deleted successfully', { status: 200 });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return new Response('Internal server error', { status: 500 });
  }
}