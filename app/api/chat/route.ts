import { google } from '@ai-sdk/google';
import { streamText, generateObject } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { MemoryService, type MemoryMessage } from '@/lib/memory';
import { auth } from '@clerk/nextjs/server';
import { handleApiError, createError, withRetry } from '@/lib/errors';
import { env } from '@/lib/env';
import { createRequestLogger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

const MAX_CONTEXT = 20;

interface FileAttachment {
  type: 'file';
  mediaType: string;
  url: string;
  name: string;
  size: number;
}


export async function POST(req: NextRequest) {
  const requestId = uuidv4();
  const log = createRequestLogger(requestId);
  
  try {
    log.info('Chat API request received');
    
    // Validate request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      log.warn('Invalid JSON in request body', { error: (error as Error).message });
      throw createError.invalidRequest('Invalid JSON in request body');
    }

    const history = (Array.isArray(body?.messages) ? body.messages : []) as { role: string, content: string }[];
    const attachments = body?.attachments as FileAttachment[] | undefined;
    const chatId = body?.chatId as string | undefined;
    
    // Validate required fields
    if (!history || history.length === 0) {
      log.warn('Missing required messages field');
      throw createError.missingFields(['messages']);
    }

    const trimmedHistory = history.slice(-MAX_CONTEXT);
    
    // Get authenticated user ID from Clerk, fallback to request body for unauthenticated users
    let userId: string;
    let isAuthenticated = false;
    
    try {
      const { userId: clerkUserId } = await auth();
      userId = clerkUserId || body?.userId || 'default_user';
      isAuthenticated = !!clerkUserId;
      log.debug('User authentication status', { 
        userId: userId.substring(0, 8) + '...', 
        isAuthenticated,
        chatId 
      });
    } catch (error) {
      log.warn('Authentication check failed', { error: (error as Error).message });
      userId = body?.userId || 'default_user';
    }

    // Update logger context with user ID
    const userLog = createRequestLogger(requestId, userId);

    // Validate AI service configuration
    if (!env.isServiceConfigured('ai')) {
      userLog.error('AI service not properly configured');
      throw createError.internal('AI service not properly configured');
    }

    const model = google('models/gemini-2.0-flash-exp');

    // Get the latest user message for processing
    const latestUserMessage = trimmedHistory.filter(msg => msg.role === 'user').pop();

    // Continue with regular chat processing for memory search
    let memoryContext = '';
    
    // Retrieve relevant memories only for authenticated users
    if (isAuthenticated && latestUserMessage?.content && userId) {
      try {
        userLog.info('Searching memories for user', { 
          query: latestUserMessage.content.substring(0, 50) + '...' 
        });
        
        // Try both specific search and getting all memories for better context with retry
        const [searchResults, allMemories] = await withRetry(async () => {
          return Promise.all([
            MemoryService.searchMemory(latestUserMessage.content, {
              user_id: userId,
              limit: 5
            }).catch(err => {
              userLog.warn('Memory search failed', { error: err.message });
              return [];
            }),
            MemoryService.getAllMemories(userId, 10).catch(err => {
              userLog.warn('Get all memories failed', { error: err.message });
              return [];
            })
          ]);
        }, 2, 500); // Retry twice with 500ms base delay
      
      userLog.debug('Memory search completed', { 
        searchResultsCount: searchResults?.length || 0,
        allMemoriesCount: allMemories?.length || 0 
      });
      
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
        userLog.info('Memory context added to prompt');
      } else {
        userLog.debug('No relevant memories found to add to context');
      }
    } catch (error) {
      userLog.error('Memory retrieval failed', error as Error);
      // Continue without memory context if search fails
    }
  } else {
    userLog.debug('Memory search skipped', { 
      isAuthenticated, 
      hasMessage: !!latestUserMessage?.content 
    });
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

    // Generate AI response with error handling
    let textStream;
    try {
      const result = await withRetry(async () => {
        return streamText({
          model,
          messages: multimodalMessages,
        });
      }, 2, 1000);
      
      textStream = result.textStream;
    } catch (error) {
      userLog.error('AI generation failed', error as Error);
      throw createError.internal('Failed to generate AI response', error as Error);
    }

    // Note: Memory storage is now handled client-side after conversation completes

    // Return streaming response
    return new Response(textStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });

  } catch (error) {
    log.error('Chat API error', error as Error, { requestId, userId });
    const { error: errorResponse, status } = handleApiError(error);
    
    return NextResponse.json(
      { success: false, ...errorResponse },
      { status }
    );
  }
}