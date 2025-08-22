"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useMemory } from '@/hooks/use-memory';
import { sessionManager } from '@/lib/session';
import {
  Search,
  Trash2,
  RefreshCw,
  Brain,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MemoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MemoryPanel({ isOpen, onClose }: MemoryPanelProps) {
  const {
    memories,
    isLoading,
    error,
    searchMemories,
    getAllMemories,
    deleteMemory,
    clearAllMemories
  } = useMemory();

  const [searchQuery, setSearchQuery] = useState('');
  const [userId, setUserId] = useState<string>('default_user');

  useEffect(() => {
    // Get user session ID for memory management
    if (typeof window !== 'undefined') {
      const sessionId = sessionManager.getOrCreateSession();
      setUserId(sessionId);
    }
  }, []);

  useEffect(() => {
    if (isOpen && userId) {
      getAllMemories(userId);
    }
  }, [isOpen, userId, getAllMemories]);

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      await searchMemories(searchQuery.trim(), userId);
    } else {
      await getAllMemories(userId);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (confirm('Are you sure you want to delete this memory?')) {
      await deleteMemory(memoryId, userId);
    }
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear all memories? This action cannot be undone.')) {
      await clearAllMemories(userId);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#2A2A2A] rounded-lg border border-gray-700 w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Brain className="w-6 h-6 text-blue-400" />
              <div>
                <h2 className="text-xl font-semibold text-white">Memory Management</h2>
                <p className="text-sm text-gray-400">View and manage your conversation memories</p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              className="text-gray-400 hover:text-white hover:bg-gray-700"
            >
              ×
            </Button>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex space-x-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search memories..."
                className="pl-10 bg-[#1A1A1A] border-gray-600 text-white placeholder-gray-400 focus:border-blue-400"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </Button>
          </div>

          <div className="flex justify-between items-center">
            <Badge variant="secondary" className="bg-gray-700 text-gray-300">
              {memories.length} {memories.length === 1 ? 'memory' : 'memories'} found
            </Badge>
            <div className="flex space-x-2">
              <Button
                onClick={() => getAllMemories(userId)}
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                Refresh
              </Button>
              <Button
                onClick={handleClearAll}
                variant="outline"
                size="sm"
                disabled={isLoading || memories.length === 0}
                className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded-lg flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-red-400">{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
              <span className="ml-3 text-gray-400">Loading memories...</span>
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No memories found</h3>
              <p className="text-gray-500 text-sm">
                {searchQuery ? 'Try a different search term' : 'Start a conversation to build memories'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {memories.map((memory) => (
                <Card key={memory.id} className="bg-[#1A1A1A] border-gray-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-white text-sm font-medium flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{formatDate(memory.created_at)}</span>
                      </CardTitle>
                      <Button
                        onClick={() => handleDeleteMemory(memory.id)}
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-red-400 hover:bg-red-900/20 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {memory.memory}
                    </p>
                    <Separator className="my-3 bg-gray-700" />
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>User: {memory.user_id}</span>
                      <span>Updated: {formatDate(memory.updated_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}