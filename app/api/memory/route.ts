import { NextRequest, NextResponse } from 'next/server';
import { memoryService } from '@/lib/memory';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'default_user';
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '10');

    await memoryService.initialize();

    let memories;
    if (query) {
      // Search for specific memories
      memories = await memoryService.searchMemories(query, userId, limit);
    } else {
      // Get all memories for the user
      memories = await memoryService.getAllMemories(userId);
    }

    return NextResponse.json({ 
      success: true, 
      memories: memories || [] 
    });
  } catch (error) {
    console.error('Memory API GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve memories' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'default_user';
    const memoryId = searchParams.get('memoryId');

    await memoryService.initialize();

    let success;
    if (memoryId) {
      // Delete specific memory
      success = await memoryService.deleteMemory(memoryId);
    } else {
      // Clear all memories for user
      success = await memoryService.clearUserMemories(userId);
    }

    return NextResponse.json({ 
      success,
      message: memoryId ? 'Memory deleted' : 'All memories cleared'
    });
  } catch (error) {
    console.error('Memory API DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete memories' },
      { status: 500 }
    );
  }
}