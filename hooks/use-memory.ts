import { useState, useCallback } from 'react';
import { type MemoryEntry } from '@/lib/memory';

interface UseMemoryReturn {
  memories: MemoryEntry[];
  isLoading: boolean;
  error: string | null;
  searchMemories: (query: string, userId?: string) => Promise<void>;
  getAllMemories: (userId?: string) => Promise<void>;
  deleteMemory: (memoryId: string, userId?: string) => Promise<void>;
  clearAllMemories: (userId?: string) => Promise<void>;
}

export function useMemory(): UseMemoryReturn {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchMemories = useCallback(async (query: string, userId = 'default_user') => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        userId,
        query,
        limit: '10'
      });

      const response = await fetch(`/api/memory?${params}`);
      const data = await response.json();

      if (data.success) {
        setMemories(data.memories);
      } else {
        setError(data.error || 'Failed to search memories');
      }
    } catch (err) {
      setError('Network error while searching memories');
      console.error('Memory search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAllMemories = useCallback(async (userId = 'default_user') => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ userId });
      const response = await fetch(`/api/memory?${params}`);
      const data = await response.json();

      if (data.success) {
        setMemories(data.memories);
      } else {
        setError(data.error || 'Failed to get memories');
      }
    } catch (err) {
      setError('Network error while getting memories');
      console.error('Memory get error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteMemory = useCallback(async (memoryId: string, userId = 'default_user') => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        userId,
        memoryId
      });

      const response = await fetch(`/api/memory?${params}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        // Remove the deleted memory from the local state
        setMemories(prev => prev.filter(m => m.id !== memoryId));
      } else {
        setError(data.error || 'Failed to delete memory');
      }
    } catch (err) {
      setError('Network error while deleting memory');
      console.error('Memory delete error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearAllMemories = useCallback(async (userId = 'default_user') => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ userId });
      const response = await fetch(`/api/memory?${params}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        setMemories([]);
      } else {
        setError(data.error || 'Failed to clear memories');
      }
    } catch (err) {
      setError('Network error while clearing memories');
      console.error('Memory clear error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    memories,
    isLoading,
    error,
    searchMemories,
    getAllMemories,
    deleteMemory,
    clearAllMemories
  };
}