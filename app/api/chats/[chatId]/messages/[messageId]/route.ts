import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ChatService } from '@/lib/services/chatService';

interface RouteParams {
  params: Promise<{ chatId: string; messageId: string }>;
}

// PUT /api/chats/[chatId]/messages/[messageId] - Update a message and prepare for regeneration
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { chatId, messageId } = await params;
    
    console.log(`Edit request - ChatID: ${chatId}, MessageID: ${messageId}, UserID: ${userId}`);
    const body = await request.json();
    const { content, regenerateResponse = false } = body;

    if (!chatId || !messageId) {
      return NextResponse.json({ error: 'Chat ID and Message ID are required' }, { status: 400 });
    }

    if (content === undefined || content === null) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'Content must be a string' }, { status: 400 });
    }

    // Verify chat exists and belongs to user
    const existingChat = await ChatService.getChatById(chatId, userId);
    if (!existingChat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    if (regenerateResponse) {
      // Use the new method that only removes the immediate next assistant response
      const result = await ChatService.updateMessageAndRegenerateImmediate({
        chatId,
        messageId,
        content,
        userId
      });

      console.log('API Response - Returning context messages:', result.contextMessages.map(m => ({ 
        id: m.id, 
        role: m.role, 
        content: m.content.substring(0, 100) + '...' 
      })));

      return NextResponse.json({ 
        chat: result.chat, 
        shouldRegenerate: regenerateResponse,
        removedMessages: result.removedMessages,
        assistantMessageToReplace: result.assistantMessageToReplace,
        contextMessages: result.contextMessages
      }, { status: 200 });
    } else {
      // Use the simple update method that preserves subsequent messages
      const updatedChat = await ChatService.updateMessageOnly({
        chatId,
        messageId,
        content,
        userId
      });

      if (!updatedChat) {
        return NextResponse.json({ error: 'Failed to update message or message not found' }, { status: 404 });
      }

      return NextResponse.json({ 
        chat: updatedChat, 
        shouldRegenerate: regenerateResponse 
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Error updating message:', error);
    
    // Provide more specific error information
    let errorMessage = 'Failed to update message';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: error instanceof Error ? error.stack : String(error)
    }, { status: 500 });
  }
}

// DELETE /api/chats/[chatId]/messages/[messageId] - Delete a message for regeneration
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { chatId, messageId } = await params;

    if (!chatId || !messageId) {
      return NextResponse.json({ error: 'Chat ID and Message ID are required' }, { status: 400 });
    }

    // Verify chat exists and belongs to user
    const existingChat = await ChatService.getChatById(chatId, userId);
    if (!existingChat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Delete the message from the chat
    const updatedChat = await ChatService.deleteMessage(chatId, messageId, userId);
    
    if (!updatedChat) {
      return NextResponse.json({ error: 'Message not found or failed to delete' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      chat: updatedChat
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting message:', error);
    
    let errorMessage = 'Failed to delete message';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: error instanceof Error ? error.stack : String(error)
    }, { status: 500 });
  }
}