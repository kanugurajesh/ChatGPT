import MemoryClient from 'mem0ai';

// Initialize the Mem0 client with API key from environment
const memoryClient = new MemoryClient({ 
  apiKey: process.env.MEM0_API_KEY || ""
});

export { memoryClient };

// Types for memory operations
export interface MemoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface MemorySearchOptions {
  user_id: string;
  limit?: number;
}

export interface MemoryAddOptions {
  user_id: string;
  metadata?: Record<string, any>;
}

// Memory service functions
export class MemoryService {
  static async addMemory(messages: MemoryMessage[], options: MemoryAddOptions) {
    try {
      const result = await memoryClient.add(messages, options);
      return result;
    } catch (error) {
      console.error('Error adding memory:', error);
      throw error;
    }
  }

  static async searchMemory(query: string, options: MemorySearchOptions) {
    try {
      const results = await memoryClient.search(query, {
        user_id: options.user_id,
        limit: options.limit || 5
      });

      return results;
    } catch (error) {
      console.error('Error searching memory:', error);
      throw error;
    }
  }

  static async getAllMemories(userId: string, limit = 10) {
    try {
      const results = await memoryClient.getAll({
        user_id: userId,
        limit: limit
      });

      return results;
    } catch (error) {
      console.error('Error getting all memories:', error);
      throw error;
    }
  }

  static async deleteMemory(memoryId: string) {
    try {
      const result = await memoryClient.delete(memoryId);
      return result;
    } catch (error) {
      console.error('Error deleting memory:', error);
      throw error;
    }
  }

  static async deleteAllMemories(userId: string) {
    try {
      const result = await memoryClient.deleteAll({
        user_id: userId
      });
      return result;
    } catch (error) {
      console.error('Error deleting all memories:', error);
      throw error;
    }
  }
}