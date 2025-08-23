import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ChatService } from '@/lib/services/chatService';

// GET /api/chats/stats - Get chat statistics for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const stats = await ChatService.getChatStats(userId);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching chat stats:', error);
    return NextResponse.json({ error: 'Failed to fetch chat statistics' }, { status: 500 });
  }
}