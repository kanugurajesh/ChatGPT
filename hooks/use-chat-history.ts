"use client"

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'

export interface ChatHistoryItem {
  id: string
  title: string
  timestamp: Date
  createdAt: Date
  updatedAt: Date
  isArchived?: boolean
  messageCount?: number
}

export interface CreateChatOptions {
  title: string
  initialMessage?: {
    role: 'user' | 'assistant' | 'system'
    content: string
    attachments?: Array<{
      type: 'file';
      mediaType: string;
      url: string;
      name: string;
      size: number;
    }>;
  }
}

export function useChatHistory() {
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  
  const { user, isSignedIn } = useUser()

  // Fetch chat history from API
  const fetchChatHistory = useCallback(async (options?: {
    limit?: number
    offset?: number
    includeArchived?: boolean
    searchQuery?: string
  }) => {
    if (!isSignedIn || !user?.id) {
      setChatHistory([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (options?.limit) params.set('limit', options.limit.toString())
      if (options?.offset) params.set('offset', options.offset.toString())
      if (options?.includeArchived) params.set('includeArchived', 'true')
      if (options?.searchQuery) params.set('search', options.searchQuery)

      const response = await fetch(`/api/chats?${params}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch chats: ${response.status}`)
      }

      const data = await response.json()
      
      const formattedChats: ChatHistoryItem[] = data.chats.map((chat: any) => ({
        id: chat.id,
        title: chat.title,
        timestamp: new Date(chat.updatedAt),
        createdAt: new Date(chat.createdAt),
        updatedAt: new Date(chat.updatedAt),
        isArchived: chat.isArchived,
        messageCount: chat.metadata?.totalMessages || 0,
      }))

      setChatHistory(formattedChats)
      setHasMore(data.hasMore)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chat history')
      setChatHistory([])
    } finally {
      setIsLoading(false)
    }
  }, [isSignedIn, user?.id])

  // Create a new chat
  const createNewChat = useCallback(async (options: CreateChatOptions): Promise<string | null> => {
    if (!isSignedIn || !user?.id) {
      setError('Please sign in to create a chat')
      return null
    }

    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      })

      if (!response.ok) {
        throw new Error(`Failed to create chat: ${response.status}`)
      }

      const newChat = await response.json()
      
      // Add to local state immediately for better UX
      const formattedChat: ChatHistoryItem = {
        id: newChat.id,
        title: newChat.title,
        timestamp: new Date(newChat.updatedAt),
        createdAt: new Date(newChat.createdAt),
        updatedAt: new Date(newChat.updatedAt),
        isArchived: newChat.isArchived,
        messageCount: newChat.messages?.length || 0,
      }
      
      setChatHistory(prev => [formattedChat, ...prev])
      setTotal(prev => prev + 1)
      
      return newChat.id
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create chat')
      return null
    }
  }, [isSignedIn, user?.id])

  // Delete a chat
  const deleteChat = useCallback(async (chatId: string): Promise<boolean> => {
    if (!isSignedIn || !user?.id) {
      return false
    }

    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to delete chat: ${response.status}`)
      }

      // Remove from local state
      setChatHistory(prev => prev.filter(chat => chat.id !== chatId))
      setTotal(prev => prev - 1)
      
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete chat')
      return false
    }
  }, [isSignedIn, user?.id])

  // Update chat title
  const updateChatTitle = useCallback(async (chatId: string, newTitle: string): Promise<boolean> => {
    if (!isSignedIn || !user?.id) {
      return false
    }

    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTitle }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update chat: ${response.status}`)
      }

      const updatedChat = await response.json()
      
      // Update local state
      setChatHistory(prev => 
        prev.map(chat => 
          chat.id === chatId 
            ? { ...chat, title: updatedChat.title, updatedAt: new Date(updatedChat.updatedAt) }
            : chat
        )
      )
      
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update chat title')
      return false
    }
  }, [isSignedIn, user?.id])

  // Search chats
  const searchChats = useCallback(async (query: string, limit = 10) => {
    if (!isSignedIn || !user?.id || !query.trim()) {
      return []
    }

    try {
      const params = new URLSearchParams({
        q: query.trim(),
        limit: limit.toString()
      })

      const response = await fetch(`/api/chats/search?${params}`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`)
      }

      const data = await response.json()
      return data.results.map((chat: any) => ({
        id: chat.id,
        title: chat.title,
        timestamp: new Date(chat.updatedAt),
        createdAt: new Date(chat.createdAt),
        updatedAt: new Date(chat.updatedAt),
        isArchived: chat.isArchived,
        messageCount: chat.metadata?.totalMessages || 0,
      }))
    } catch (err) {
      return []
    }
  }, [isSignedIn, user?.id])

  // Load initial chat history when component mounts or user signs in
  useEffect(() => {
    fetchChatHistory()
  }, [fetchChatHistory])

  // Update message count for a specific chat
  const updateChatMessageCount = useCallback((chatId: string, increment: number = 1) => {
    setChatHistory(prev => 
      prev.map(chat => 
        chat.id === chatId 
          ? { 
              ...chat, 
              messageCount: (chat.messageCount || 0) + increment,
              updatedAt: new Date() // Update timestamp to reflect recent activity
            }
          : chat
      )
    )
  }, [])

  // Helper functions for backward compatibility
  const addChatToHistory = (title: string) => {
    createNewChat({ title })
  }

  const removeChatFromHistory = (id: string) => {
    deleteChat(id)
  }

  const getChatTitles = () => {
    return chatHistory.map(chat => chat.title)
  }

  return {
    chatHistory,
    isLoading,
    error,
    hasMore,
    total,
    
    // CRUD operations
    createNewChat,
    deleteChat,
    updateChatTitle,
    fetchChatHistory,
    searchChats,
    
    // Message count management
    updateChatMessageCount,
    
    // Backward compatibility
    addChatToHistory,
    removeChatFromHistory,
    getChatTitles,
    
    // Clear error
    clearError: () => setError(null),
  }
}