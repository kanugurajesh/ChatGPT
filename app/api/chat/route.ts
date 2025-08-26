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

type MessageContent = string | Array<{ type: 'text'; text: string } | { type: 'image'; image: string }>;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: MessageContent;
}


export async function POST(req: NextRequest) {
  const requestId = uuidv4();
  const log = createRequestLogger(requestId);
  let userId: string = 'default_user';
  
  try {
    log.info('Chat API request received');
    
    // Check if request was aborted
    if (req.signal?.aborted) {
      log.info('Request was aborted before processing');
      return new Response(null, { status: 499 }); // Client Closed Request
    }
    
    // Validate request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      const errorMessage = (error as Error).message;
      
      // Check if the error is due to request abortion
      if (errorMessage.includes('aborted') || errorMessage.includes('AbortError') || req.signal?.aborted) {
        log.info('Request aborted during JSON parsing');
        return new Response(null, { status: 499 }); // Client Closed Request
      }
      
      log.warn('Invalid JSON in request body', { error: errorMessage });
      throw createError.invalidRequest('Invalid JSON in request body');
    }

    const history = (Array.isArray(body?.messages) ? body.messages : []) as ChatMessage[];
    const attachments = body?.attachments as FileAttachment[] | undefined;
    const chatId = body?.chatId as string | undefined;
    
    // Validate required fields
    if (!history || history.length === 0) {
      log.warn('Missing required messages field');
      throw createError.missingFields(['messages']);
    }
    
    // Validate that messages have valid content
    const validMessages = history.filter(msg => {
      if (!msg || !msg.role || !msg.content) return false;
      if (typeof msg.content === 'string') return msg.content.trim().length > 0;
      if (Array.isArray(msg.content)) return msg.content.some(part => 
        (part.type === 'text' && part.text?.trim().length > 0) ||
        (part.type === 'image' && part.image)
      );
      return false;
    });
    
    if (validMessages.length === 0) {
      log.warn('No valid messages found');
      throw createError.invalidRequest('Messages must contain valid content');
    }

    const trimmedHistory = validMessages.slice(-MAX_CONTEXT);
    
    // Get authenticated user ID from Clerk, fallback to request body for unauthenticated users
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
        const contentText = typeof latestUserMessage.content === 'string' 
          ? latestUserMessage.content 
          : latestUserMessage.content.find(part => part.type === 'text')?.text || '';
        
        userLog.info('Searching memories for user', { 
          query: contentText.substring(0, 50) + '...' 
        });
        
        // Try both specific search and getting all memories for better context with retry
        const [searchResults, allMemories] = await withRetry(async () => {
          return Promise.all([
            MemoryService.searchMemory(contentText, {
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
  let messages: ChatMessage[] = [...trimmedHistory];
  
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
    if (lastMessage.role === 'user' && typeof lastMessage.content === 'string') {
      messages[messages.length - 1] = {
        ...lastMessage,
        content: lastMessage.content + memoryContext
      };
    }
  }

  // Convert to multimodal format if attachments exist
  let multimodalMessages: ChatMessage[] = messages;
  if (attachments && attachments.length > 0 && messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'user' && typeof lastMessage.content === 'string') {
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

    // Final check for request abortion before AI call
    if (req.signal?.aborted) {
      userLog.info('Request was aborted before AI generation');
      return new Response(null, { status: 499 }); // Client Closed Request
    }

    // Final validation of messages before sending to AI
    if (!multimodalMessages || multimodalMessages.length === 0) {
      userLog.warn('No valid messages to send to AI');
      throw createError.invalidRequest('No valid messages to process');
    }

    // Validate that at least one message has content
    const hasValidContent = multimodalMessages.some(msg => {
      if (typeof msg.content === 'string') return msg.content.trim().length > 0;
      if (Array.isArray(msg.content)) return msg.content.some(part => 
        (part.type === 'text' && part.text?.trim().length > 0) ||
        (part.type === 'image' && part.image)
      );
      return false;
    });

    if (!hasValidContent) {
      userLog.warn('Messages do not contain valid content for AI');
      throw createError.invalidRequest('Messages must contain valid text or image content');
    }

    // Generate AI response with error handling
    let textStream;
    try {
      const result = await withRetry(async () => {
        // Check for abortion during retry attempts
        if (req.signal?.aborted) {
          throw new Error('Request aborted during AI generation');
        }
        
        return streamText({
          model,
          messages: multimodalMessages as any,
        });
      }, 2, 1000);
      
      textStream = result.textStream;
    } catch (error) {
      const errorMessage = (error as Error).message;
      
      // Check if the error is due to request abortion
      if (errorMessage.includes('aborted') || errorMessage.includes('AbortError') || req.signal?.aborted) {
        userLog.info('AI generation was aborted');
        return new Response(null, { status: 499 }); // Client Closed Request
      }
      
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