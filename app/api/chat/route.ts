import { google } from '@ai-sdk/google';
import { streamText, generateObject } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { MemoryService, type MemoryMessage } from '@/lib/memory';
import { auth } from '@clerk/nextjs/server';

const MAX_CONTEXT = 20;

interface FileAttachment {
  type: 'file';
  mediaType: string;
  url: string;
  name: string;
  size: number;
}


export async function POST(req: NextRequest) {
  const body = await req.json();
  const history = (Array.isArray(body?.messages) ? body.messages : []) as { role: string, content: string }[];
  const attachments = body?.attachments as FileAttachment[] | undefined;
  const chatId = body?.chatId as string | undefined;
  const trimmedHistory = history.slice(-MAX_CONTEXT);
  
  // Get authenticated user ID from Clerk, fallback to request body for unauthenticated users
  const { userId: clerkUserId } = await auth();
  const userId = clerkUserId || body?.userId || 'default_user';
  const isAuthenticated = !!clerkUserId;

  const model = google('models/gemini-2.0-flash-exp');

  // Get the latest user message for processing
  const latestUserMessage = trimmedHistory.filter(msg => msg.role === 'user').pop();

  // Continue with regular chat processing for memory search
  
  let memoryContext = '';
  
  // Retrieve relevant memories only for authenticated users
  if (isAuthenticated && latestUserMessage?.content && userId) {
    try {
      console.log('Searching memories for user:', userId, 'query:', latestUserMessage.content);
      
      // Try both specific search and getting all memories for better context
      const [searchResults, allMemories] = await Promise.all([
        MemoryService.searchMemory(latestUserMessage.content, {
          user_id: userId,
          limit: 5
        }).catch(err => {
          console.error('Memory search failed:', err);
          return [];
        }),
        MemoryService.getAllMemories(userId, 10).catch(err => {
          console.error('Get all memories failed:', err);
          return [];
        })
      ]);
      
      console.log('Memory search results:', searchResults);
      console.log('All memories count:', allMemories?.length || 0);
      
      // Use search results first, then fall back to recent memories
      let relevantMemories = '';
      
      if (searchResults && Array.isArray(searchResults) && searchResults.length > 0) {
        relevantMemories = searchResults
          .filter(memory => memory?.memory && memory.memory.trim().length > 0)
          .map(memory => `- ${memory.memory}`)
          .join('\n');
      } else if (allMemories && Array.isArray(allMemories) && allMemories.length > 0) {
        // If no search results, include recent memories for better context
        relevantMemories = allMemories
          .slice(0, 3)
          .filter(memory => memory?.memory && memory.memory.trim().length > 0)
          .map(memory => `- ${memory.memory}`)
          .join('\n');
      }
      
      if (relevantMemories) {
        memoryContext = `\n\nRelevant context from our previous conversations:
${relevantMemories}

Please use this context to provide more personalized and contextual responses when relevant.`;
        console.log('Memory context added to prompt');
      } else {
        console.log('No relevant memories found to add to context');
      }
    } catch (error) {
      console.error('Memory retrieval failed:', error);
      // Continue without memory context if search fails
    }
  } else {
    console.log('Memory search skipped - authenticated:', isAuthenticated, 'hasMessage:', !!latestUserMessage?.content, 'userId:', userId);
  }

  // Enhance the conversation with memory context and system instruction
  let messages = [...trimmedHistory];
  
  if (memoryContext && messages.length > 0) {
    // Add system message at the beginning if we have memory context
    messages = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant. When provided with relevant context from previous conversations, use that information to give more personalized and contextual responses. Pay close attention to user preferences, facts they\'ve shared, and previous discussions.'
      },
      ...messages
    ];
    
    // Add memory context to the latest user message
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'user') {
      messages[messages.length - 1] = {
        ...lastMessage,
        content: lastMessage.content + memoryContext
      };
    }
  }

  // Convert to multimodal format if attachments exist
  let multimodalMessages = messages;
  if (attachments && attachments.length > 0 && messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'user') {
      // Convert files to the format expected by AI SDK
      const fileParts = attachments.map(attachment => ({
        type: 'image' as const, // Use 'image' for Gemini multimodal
        image: attachment.url,
      }));
      
      // Create multimodal message
      multimodalMessages = [
        ...messages.slice(0, -1),
        {
          role: 'user',
          content: [
            { type: 'text', text: lastMessage.content },
            ...fileParts
          ]
        }
      ];
    }
  }

  const { textStream } = await streamText({
    model,
    messages: multimodalMessages,
  });

  // Note: Memory storage is now handled client-side after conversation completes

  // Return streaming response
  return new Response(textStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}