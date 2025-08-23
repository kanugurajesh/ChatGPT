"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Memory {
  id: string;
  memory: string;
  created_at?: string;
}

interface ManageMemoryProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function ManageMemory({ isOpen, onClose, userId }: ManageMemoryProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  const fetchMemories = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/memory?limit=50`, {
        credentials: 'include'
      });
      
      console.log('Memory fetch response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Memory fetch data:', data);
        setMemories(Array.isArray(data) ? data : []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch memories:', response.status, errorData);
        if (response.status === 401) {
          console.error('Authentication required to view memories');
        }
        setMemories([]);
      }
    } catch (error) {
      console.error('Error fetching memories:', error);
      setMemories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMemory = async (memoryId: string) => {
    setDeletingId(memoryId);
    try {
      const response = await fetch(`/api/memory?memoryId=${memoryId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        setMemories(prev => prev.filter(memory => memory.id !== memoryId));
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to delete memory:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error deleting memory:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const deleteAllMemories = async () => {
    setDeletingAll(true);
    try {
      const response = await fetch(`/api/memory?deleteAll=true`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        setMemories([]);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to delete all memories:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error deleting all memories:', error);
    } finally {
      setDeletingAll(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      fetchMemories();
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#2f2f2f] rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-600">
          <div>
            <h2 className="text-xl font-semibold text-white">Saved memories</h2>
            <p className="text-sm text-gray-400 mt-1">
              ChatGPT tries to remember your recent chats, but it may forget things over time. Saved memories are never forgotten.{" "}
              <span className="text-blue-400 cursor-pointer hover:underline">Learn more</span>
            </p>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center text-gray-400 py-8">
              Loading memories...
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <div>No saved memories found.</div>
              <div className="text-xs mt-2">Start chatting while signed in to save memories!</div>
            </div>
          ) : (
            <div className="space-y-3">
              {memories.map((memory) => (
                <div
                  key={memory.id}
                  className="bg-[#3f3f3f] rounded-lg p-4 border border-gray-600 group hover:bg-[#454545] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 text-white text-sm leading-relaxed pr-4">
                      {memory.memory}
                    </div>
                    <Button
                      onClick={() => deleteMemory(memory.id)}
                      disabled={deletingId === memory.id}
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "text-gray-400 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0",
                        deletingId === memory.id && "opacity-100"
                      )}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {memories.length > 0 && (
          <div className="p-6 border-t border-gray-600 flex justify-end">
            <Button
              onClick={deleteAllMemories}
              disabled={deletingAll || isLoading}
              variant="outline"
              className={cn(
                "text-red-400 border-red-400 hover:bg-red-400/10 hover:text-red-300 hover:border-red-300",
                deletingAll && "opacity-50 cursor-not-allowed"
              )}
            >
              {deletingAll ? "Deleting..." : "Delete all"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}