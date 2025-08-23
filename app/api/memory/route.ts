import { NextRequest, NextResponse } from 'next/server';
import { MemoryService } from '@/lib/memory';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    console.log('Memory GET request - Clerk userId:', clerkUserId);
    
    if (!clerkUserId) {
      console.log('No authenticated user found for memory request');
      return NextResponse.json({ error: 'Authentication required to view memories' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log('Fetching memories for user:', clerkUserId, 'limit:', limit);
    const memories = await MemoryService.getAllMemories(clerkUserId, limit);
    console.log('Found memories:', memories?.length || 0);
    
    return NextResponse.json(memories);
  } catch (error) {
    console.error('Error fetching memories:', error);
    return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Authentication required to delete memories' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const memoryId = searchParams.get('memoryId');
    const deleteAll = searchParams.get('deleteAll') === 'true';

    if (deleteAll) {
      await MemoryService.deleteAllMemories(clerkUserId);
      return NextResponse.json({ success: true, message: 'All memories deleted' });
    } else if (memoryId) {
      await MemoryService.deleteMemory(memoryId);
      return NextResponse.json({ success: true, message: 'Memory deleted' });
    } else {
      return NextResponse.json({ error: 'Memory ID is required' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error deleting memory:', error);
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
  }
}