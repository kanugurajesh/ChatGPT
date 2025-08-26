import { NextRequest, NextResponse } from 'next/server';
import { MemoryService } from '@/lib/memory';
import { auth } from '@clerk/nextjs/server';
import { env } from '@/lib/env';
import { backgroundMemorySaver } from '@/lib/services/backgroundSaver';

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('Memory status check requested by user:', clerkUserId);
    
    // Get environment configuration status
    const envConfig = env.getConfig();
    const serviceStatus = env.getServiceStatus();
    
    // Get background saver status
    const queueStatus = backgroundMemorySaver.getStatus();
    
    // Test memory service connectivity (if configured)
    let memoryServiceTest = null;
    if (MemoryService.isConfigured()) {
      try {
        // Try to get memories to test the connection
        const testMemories = await MemoryService.getAllMemories(clerkUserId, 1);
        memoryServiceTest = {
          success: true,
          memoriesCount: testMemories?.length || 0,
          message: 'Memory service is accessible'
        };
      } catch (error) {
        memoryServiceTest = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: 'Memory service connection failed'
        };
      }
    } else {
      memoryServiceTest = {
        success: false,
        message: 'Memory service not configured - missing MEM0_API_KEY'
      };
    }
    
    const status = {
      timestamp: new Date().toISOString(),
      user: {
        id: clerkUserId,
        authenticated: true
      },
      environment: {
        hasMemoryApiKey: !!envConfig.MEM0_API_KEY,
        memoryApiKeyLength: envConfig.MEM0_API_KEY?.length || 0,
        nodeEnv: envConfig.NODE_ENV
      },
      services: serviceStatus,
      memoryService: {
        configured: MemoryService.isConfigured(),
        test: memoryServiceTest
      },
      backgroundSaver: {
        ...queueStatus,
        maxRetries: 3,
        retryDelay: 1000
      }
    };
    
    console.log('Memory status check results:', status);
    
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error checking memory status:', error);
    return NextResponse.json({ 
      error: 'Failed to check memory status', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}