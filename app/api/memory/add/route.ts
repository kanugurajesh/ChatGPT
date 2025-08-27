import { NextRequest, NextResponse } from 'next/server';
import { MemoryService, MemoryMessage } from '@/lib/memory';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Authentication required to save memories' }, { status: 401 });
    }

    const { messages, metadata } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }


    const result = await MemoryService.addMemory(messages as MemoryMessage[], {
      user_id: clerkUserId,
      metadata: metadata || {}
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add memory' }, { status: 500 });
  }
}