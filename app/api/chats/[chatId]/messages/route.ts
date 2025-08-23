import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ChatService } from '@/lib/services/chatService';

interface RouteParams {
  params: { chatId: string };
}

// POST /api/chats/[chatId]/messages - Add a message to a chat
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { chatId } = await params;
    const body = await request.json();
    const { role, content, metadata } = body;

    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    if (!role || content === undefined || content === null) {
      console.error('Invalid message data:', { role, content, hasContent: !!content });
      return NextResponse.json({ error: 'Role and content are required' }, { status: 400 });
    }

    // Allow empty content but not undefined/null
    if (typeof content !== 'string') {
      console.error('Content must be a string:', { content, type: typeof content });
      return NextResponse.json({ error: 'Content must be a string' }, { status: 400 });
    }

    if (!['user', 'assistant', 'system'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be user, assistant, or system' }, { status: 400 });
    }

    // Verify chat exists and belongs to user
    const existingChat = await ChatService.getChatById(chatId, userId);
    if (!existingChat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const updatedChat = await ChatService.addMessage({
      chatId,
      role,
      content,
      metadata,
    });

    if (!updatedChat) {
      return NextResponse.json({ error: 'Failed to add message' }, { status: 500 });
    }

    return NextResponse.json(updatedChat, { status: 201 });
  } catch (error) {
    console.error('Error adding message:', error);
    return NextResponse.json({ error: 'Failed to add message' }, { status: 500 });
  }
}