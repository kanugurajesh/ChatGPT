import { NextRequest, NextResponse } from 'next/server';
import { MemoryService } from '@/lib/memory';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('Debug: Getting all memories for user:', clerkUserId);
    
    const memories = await MemoryService.getAllMemories(clerkUserId, 100);
    
    console.log('Debug: Found memories count:', memories?.length || 0);
    console.log('Debug: Memory details:', memories);
    
    return NextResponse.json({
      userId: clerkUserId,
      memoryCount: memories?.length || 0,
      memories: memories
    });
  } catch (error) {
    console.error('Debug: Error fetching memories:', error);
    return NextResponse.json({ error: 'Failed to fetch memories', details: error }, { status: 500 });
  }
}