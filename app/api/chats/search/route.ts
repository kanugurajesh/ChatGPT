import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ChatService } from '@/lib/services/chatService';

// GET /api/chats/search - Search chats by content
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query.trim()) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const results = await ChatService.searchChats(userId, query, limit);

    return NextResponse.json({
      query,
      results,
      count: results.length,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to search chats' }, { status: 500 });
  }
}