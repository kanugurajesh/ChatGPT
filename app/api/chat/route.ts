import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { memoryService, type Message } from '@/lib/memory';

const MAX_CONTEXT = 20;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const history = (Array.isArray(body?.messages) ? body.messages : []) as { role: string, content: string }[];
  const userId = body?.userId || 'default_user';
  const useMemory = body?.useMemory !== false; // Default to true
  
  const trimmedHistory = history.slice(-MAX_CONTEXT);
  let systemContext = '';

  // Add memory context if enabled
  if (useMemory && trimmedHistory.length > 0) {
    try {
      await memoryService.initialize();
      
      // Get the latest user message to search for relevant memories
      const latestUserMessage = trimmedHistory
        .filter(msg => msg.role === 'user')
        .slice(-1)[0];

      if (latestUserMessage) {
        const relevantMemories = await memoryService.searchMemories(
          latestUserMessage.content,
          userId,
          5
        );

        if (relevantMemories.length > 0) {
          systemContext = memoryService.formatMemoriesForContext(relevantMemories);
        }
      }
    } catch (error) {
      console.error('Memory service error:', error);
      // Continue without memory if it fails
    }
  }

  const model = google('models/gemini-2.0-flash-exp');

  // Prepare messages with memory context
  const messages: Message[] = [];
  
  // Add system message with memory context if available
  if (systemContext) {
    messages.push({
      role: 'system',
      content: `${systemContext}\n\nPlease use this context to provide more personalized and relevant responses. If the context is relevant to the current conversation, reference it naturally. If not relevant, ignore it and respond normally.`
    });
  }

  // Add conversation history
  messages.push(...trimmedHistory as Message[]);

  const { textStream } = await streamText({
    model,
    messages,
  });

  // Store conversation in memory after streaming (fire and forget)
  if (useMemory && trimmedHistory.length > 0) {
    // Note: We'll store the conversation after the assistant response is generated
    // For now, we'll store the current conversation context
    setImmediate(async () => {
      try {
        await memoryService.addConversation(trimmedHistory as Message[], userId);
      } catch (error) {
        console.error('Failed to store conversation in memory:', error);
      }
    });
  }

  // Return streaming response
  return new Response(textStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}