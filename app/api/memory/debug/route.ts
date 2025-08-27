import { NextRequest, NextResponse } from 'next/server';
import { MemoryService } from '@/lib/memory';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    
    const memories = await MemoryService.getAllMemories(clerkUserId, 100);
    
    
    return NextResponse.json({
      userId: clerkUserId,
      memoryCount: memories?.length || 0,
      memories: memories
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch memories', details: error }, { status: 500 });
  }
}