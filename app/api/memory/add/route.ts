import { NextRequest, NextResponse } from 'next/server';
import { MemoryService, MemoryMessage } from '@/lib/memory';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      console.log('Memory add: No authenticated user');
      return NextResponse.json({ error: 'Authentication required to save memories' }, { status: 401 });
    }

    const { messages, metadata } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    console.log('Adding memory for user:', clerkUserId, 'messages:', messages);

    const result = await MemoryService.addMemory(messages as MemoryMessage[], {
      user_id: clerkUserId,
      metadata: metadata || {}
    });

    console.log('Memory add result:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error adding memory:', error);
    return NextResponse.json({ error: 'Failed to add memory' }, { status: 500 });
  }
}