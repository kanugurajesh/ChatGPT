import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ChatService } from '@/lib/services/chatService';

interface RouteParams {
  params: Promise<{ chatId: string }>;
}

// PUT /api/chats/[chatId]/messages/assistant - Update an assistant message
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { chatId } = await params;
    const body = await request.json();
    const { messageId, content, metadata } = body;

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

    const updatedChat = await ChatService.updateOrCreateAssistantMessage({
      chatId,
      messageId,
      content,
      metadata
    });

    if (!updatedChat) {
      return NextResponse.json({ error: 'Failed to update assistant message' }, { status: 500 });
    }

    return NextResponse.json(updatedChat, { status: 200 });
  } catch (error) {
    console.error('Error updating assistant message:', error);
    return NextResponse.json({ error: 'Failed to update assistant message' }, { status: 500 });
  }
}