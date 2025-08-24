import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ChatService } from '@/lib/services/chatService';

interface RouteParams {
  params: Promise<{ chatId: string }>;
}

// GET /api/chats/[chatId] - Get a specific chat by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { chatId } = await params;
    
    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    const chat = await ChatService.getChatById(chatId, userId);
    
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json(chat);
  } catch (error) {
    console.error('Error fetching chat:', error);
    return NextResponse.json({ error: 'Failed to fetch chat' }, { status: 500 });
  }
}

// PUT /api/chats/[chatId] - Update chat (title, archive status, etc.)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { chatId } = await params;
    const body = await request.json();
    const { title, isArchived } = body;

    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    let updatedChat;

    // Update title if provided
    if (title !== undefined) {
      if (!title.trim()) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      updatedChat = await ChatService.updateChatTitle(chatId, userId, title);
    }

    // Update archive status if provided
    if (isArchived !== undefined) {
      updatedChat = await ChatService.toggleArchiveChat(chatId, userId, isArchived);
    }

    if (!updatedChat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json(updatedChat);
  } catch (error) {
    console.error('Error updating chat:', error);
    return NextResponse.json({ error: 'Failed to update chat' }, { status: 500 });
  }
}

// DELETE /api/chats/[chatId] - Delete a chat
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { chatId } = await params;
    
    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    const deleted = await ChatService.deleteChat(chatId, userId);
    
    if (!deleted) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 });
  }
}