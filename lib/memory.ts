import MemoryClient from 'mem0ai';
import { env } from './env';

// Initialize the Mem0 client with validated API key
let memoryClient: MemoryClient | null = null;

// Only initialize if the service is properly configured
if (env.isServiceConfigured('memory')) {
  memoryClient = new MemoryClient({ 
    apiKey: env.getConfig().MEM0_API_KEY!
  });
}

export { memoryClient };

import type { MemoryMessage, MemorySearchRequest, MemoryAddRequest } from '@/types/api';

// Types for memory operations (keeping original names for compatibility)
export type { MemoryMessage };

export interface MemorySearchOptions {
  user_id: string;
  limit?: number;
}

export interface MemoryAddOptions {
  user_id: string;
  metadata?: Record<string, any>;
}

export interface MemorySearchResult {
  id: string;
  memory: string;
  score?: number;
  metadata?: Record<string, any>;
}

// Memory service functions
export class MemoryService {
  private static checkMemoryClient(): void {
    if (!memoryClient) {
      throw new Error('Memory service is not configured. Please set MEM0_API_KEY environment variable.');
    }
  }

  static isConfigured(): boolean {
    return env.isServiceConfigured('memory');
  }

  static async addMemory(messages: MemoryMessage[], options: MemoryAddOptions): Promise<any | null> {
    if (!this.isConfigured()) {
      console.warn('Memory service not configured, skipping memory add', { 
        hasApiKey: !!env.getConfig().MEM0_API_KEY,
        userId: options.user_id 
      });
      return null;
    }
    
    try {
      this.checkMemoryClient();
      console.log('Adding memory to Mem0 service:', { 
        messagesCount: messages.length,
        userId: options.user_id,
        metadata: options.metadata
      });
      
      const result = await memoryClient!.add(messages, options);
      
      console.log('Memory added successfully:', { 
        result,
        messagesCount: messages.length,
        userId: options.user_id
      });
      
      return result;
    } catch (error) {
      console.error('Error adding memory:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        messagesCount: messages.length,
        userId: options.user_id,
        metadata: options.metadata
      });
      throw error;
    }
  }

  static async searchMemory(query: string, options: MemorySearchOptions): Promise<MemorySearchResult[]> {
    if (!this.isConfigured()) {
      console.warn('Memory service not configured, returning empty results');
      return [];
    }
    
    try {
      this.checkMemoryClient();
      const results = await memoryClient!.search(query, {
        user_id: options.user_id,
        limit: options.limit || 5
      });

      // Filter out results without memory content and transform to our interface
      return results
        .filter(result => result.memory !== undefined)
        .map(result => ({
          id: result.id,
          memory: result.memory!,
          score: result.score,
          metadata: result.metadata
        }));
    } catch (error) {
      console.error('Error searching memory:', error);
      throw error;
    }
  }

  static async getAllMemories(userId: string, limit = 10): Promise<MemorySearchResult[]> {
    if (!this.isConfigured()) {
      console.warn('Memory service not configured, returning empty results');
      return [];
    }
    
    try {
      this.checkMemoryClient();
      const results = await memoryClient!.getAll({
        user_id: userId,
        limit: limit
      });

      // Filter out results without memory content and transform to our interface
      return results
        .filter(result => result.memory !== undefined)
        .map(result => ({
          id: result.id,
          memory: result.memory!,
          score: result.score,
          metadata: result.metadata
        }));
    } catch (error) {
      console.error('Error getting all memories:', error);
      throw error;
    }
  }

  static async deleteMemory(memoryId: string): Promise<any | null> {
    if (!this.isConfigured()) {
      console.warn('Memory service not configured, skipping memory delete');
      return null;
    }
    
    try {
      this.checkMemoryClient();
      const result = await memoryClient!.delete(memoryId);
      return result;
    } catch (error) {
      console.error('Error deleting memory:', error);
      throw error;
    }
  }

  static async deleteAllMemories(userId: string): Promise<any | null> {
    if (!this.isConfigured()) {
      console.warn('Memory service not configured, skipping memory delete all');
      return null;
    }
    
    try {
      this.checkMemoryClient();
      const result = await memoryClient!.deleteAll({
        user_id: userId
      });
      return result;
    } catch (error) {
      console.error('Error deleting all memories:', error);
      throw error;
    }
  }
}