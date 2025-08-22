import { Memory } from 'mem0ai';

interface MemoryConfig {
  provider: string;
  config: {
    model: string;
    temperature?: number;
  };
}

interface MemoryEntry {
  id: string;
  memory: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface MemorySearchResult {
  results: MemoryEntry[];
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

class MemoryService {
  private memory: Memory;
  private initialized = false;

  constructor() {
    // Initialize with Google Gemini configuration
    const config: MemoryConfig = {
      provider: "google_ai",
      config: {
        model: "gemini-2.0-flash-exp",
        temperature: 0.1
      }
    };
    
    // Use the existing Google API key from environment
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      process.env.GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    }
    
    this.memory = new Memory(config);
  }

  /**
   * Initialize the memory service
   */
  async initialize(): Promise<void> {
    if (!this.initialized) {
      try {
        // Test the memory service
        await this.memory.search({ query: "test", user_id: "system", limit: 1 });
        this.initialized = true;
      } catch (error) {
        console.warn('Memory service initialization failed:', error);
        // Continue without memory for now
      }
    }
  }

  /**
   * Add conversation messages to memory
   */
  async addConversation(messages: Message[], userId: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      await this.memory.add(messages, { user_id: userId });
    } catch (error) {
      console.error('Failed to add memory:', error);
    }
  }

  /**
   * Search for relevant memories
   */
  async searchMemories(query: string, userId: string, limit: number = 5): Promise<MemoryEntry[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const results: MemorySearchResult = await this.memory.search({
        query,
        user_id: userId,
        limit
      });
      return results.results || [];
    } catch (error) {
      console.error('Failed to search memories:', error);
      return [];
    }
  }

  /**
   * Get all memories for a user
   */
  async getAllMemories(userId: string): Promise<MemoryEntry[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const results: MemorySearchResult = await this.memory.getAll({ user_id: userId });
      return results.results || [];
    } catch (error) {
      console.error('Failed to get all memories:', error);
      return [];
    }
  }

  /**
   * Delete a specific memory
   */
  async deleteMemory(memoryId: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      await this.memory.delete({ memory_id: memoryId });
      return true;
    } catch (error) {
      console.error('Failed to delete memory:', error);
      return false;
    }
  }

  /**
   * Clear all memories for a user
   */
  async clearUserMemories(userId: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      await this.memory.delete({ user_id: userId });
      return true;
    } catch (error) {
      console.error('Failed to clear user memories:', error);
      return false;
    }
  }

  /**
   * Generate a context string from relevant memories
   */
  formatMemoriesForContext(memories: MemoryEntry[]): string {
    if (memories.length === 0) {
      return '';
    }

    const memoryStrings = memories.map((entry, index) => 
      `${index + 1}. ${entry.memory}`
    ).join('\n');

    return `Previous conversation context:\n${memoryStrings}`;
  }
}

// Export singleton instance
export const memoryService = new MemoryService();
export type { MemoryEntry, Message };