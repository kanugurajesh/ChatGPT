import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { MemoryService, type MemoryMessage } from '@/lib/memory';
import { auth } from '@clerk/nextjs/server';

const MAX_CONTEXT = 20;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const history = (Array.isArray(body?.messages) ? body.messages : []) as { role: string, content: string }[];
  const trimmedHistory = history.slice(-MAX_CONTEXT);
  
  // Get authenticated user ID from Clerk, fallback to request body for unauthenticated users
  const { userId: clerkUserId } = await auth();
  const userId = clerkUserId || body?.userId || 'default_user';
  const isAuthenticated = !!clerkUserId;

  const model = google('models/gemini-2.0-flash-exp');

  // Get the latest user message for memory search
  const latestUserMessage = trimmedHistory.filter(msg => msg.role === 'user').pop();
  
  let memoryContext = '';
  
  // Retrieve relevant memories only for authenticated users
  if (isAuthenticated && latestUserMessage?.content && userId) {
    try {
      const memories = await MemoryService.searchMemory(latestUserMessage.content, {
        user_id: userId,
        limit: 3
      });
      
      if (memories && Array.isArray(memories) && memories.length > 0) {
        const relevantMemories = memories
          .filter(memory => memory?.memory && memory.memory.trim().length > 0)
          .map(memory => `- ${memory.memory}`)
          .join('\n');
        
        if (relevantMemories) {
          memoryContext = `\n\nRelevant context from our previous conversations:
${relevantMemories}

Please use this context to provide more personalized and contextual responses when relevant.`;
        }
      }
    } catch (error) {
      console.error('Memory search failed:', error);
      // Continue without memory context if search fails
    }
  }

  // Enhance the system message or the first message with memory context
  let messages = [...trimmedHistory];
  if (memoryContext && messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'user') {
      messages[messages.length - 1] = {
        ...lastMessage,
        content: lastMessage.content + memoryContext
      };
    }
  }

  const { textStream } = await streamText({
    model,
    messages,
  });

  // Store conversation in memory after generating response
  // Only store memories for authenticated users
  if (isAuthenticated && userId && trimmedHistory.length >= 2) {
    const memoryMessages: MemoryMessage[] = trimmedHistory.slice(-2).map(msg => ({
      role: msg.role as "user" | "assistant",
      content: msg.content
    }));

    // Store memory asynchronously without blocking the response
    MemoryService.addMemory(memoryMessages, { user_id: userId })
      .catch(error => console.error('Failed to store memory:', error));
  }

  // Return streaming response
  return new Response(textStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}