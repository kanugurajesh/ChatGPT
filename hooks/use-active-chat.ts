"use client"

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { ChatService } from '@/lib/services/chatService'

interface FileAttachment {
  type: 'file';
  mediaType: string;
  url: string;
  name: string;
  size: number;
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  attachments?: FileAttachment[]
  metadata?: any
}

export interface ActiveChat {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}

export function useActiveChat(initialChatId?: string) {
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  const { user, isSignedIn } = useUser()

  // Load a chat by ID
  const loadChat = useCallback(async (chatId: string) => {
    // Skip loading for temporary chats (they don't exist in database)
    if (chatId.startsWith('temp-')) {
      return
    }
    
    if (!isSignedIn || !user?.id) {
      setError('Please sign in to load chats')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Chat not found')
        }
        throw new Error(`Failed to load chat: ${response.status}`)
      }

      const chatData = await response.json()
      
      // Debug: Log the raw chat data
      console.log('Raw chat data from API:', {
        id: chatData.id,
        title: chatData.title,
        messageCount: chatData.messages?.length || 0,
        messages: chatData.messages?.map((msg: any, index: number) => ({
          index,
          id: msg.id,
          role: msg.role,
          content: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : ''),
          timestamp: msg.timestamp
        })) || []
      });
      
      const formattedChat: ActiveChat = {
        id: chatData.id,
        title: chatData.title,
        messages: chatData.messages
          .map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            attachments: msg.attachments || [],
            metadata: msg.metadata,
          }))
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
        createdAt: new Date(chatData.createdAt),
        updatedAt: new Date(chatData.updatedAt),
      }
      
      // Debug: Log the formatted chat
      console.log('Formatted chat:', {
        id: formattedChat.id,
        messageCount: formattedChat.messages.length,
        messages: formattedChat.messages.map((msg, index) => ({
          index,
          id: msg.id,
          role: msg.role,
          content: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : ''),
          timestamp: msg.timestamp.toISOString()
        }))
      });
      
      setActiveChat(formattedChat)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chat')
      setActiveChat(null)
    } finally {
      setIsLoading(false)
    }
  }, [isSignedIn, user?.id])

  // Create a new chat
  const createNewChat = useCallback(async (title: string, initialMessage?: {
    role: 'user' | 'assistant' | 'system'
    content: string
  }): Promise<string | null> => {
    if (!isSignedIn || !user?.id) {
      setError('Please sign in to create a chat')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          initialMessage,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to create chat: ${response.status}`)
      }

      const newChat = await response.json()
      
      const formattedChat: ActiveChat = {
        id: newChat.id,
        title: newChat.title,
        messages: newChat.messages?.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          attachments: msg.attachments || [],
          metadata: msg.metadata,
        })) || [],
        createdAt: new Date(newChat.createdAt),
        updatedAt: new Date(newChat.updatedAt),
      }
      
      setActiveChat(formattedChat)
      return newChat.id
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create chat')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [isSignedIn, user?.id])

  // Add a message to the active chat
  const addMessage = useCallback(async (
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: any,
    optimistic = true,
    messageId?: string
  ): Promise<boolean> => {
    if (!activeChat) {
      setError('No active chat')
      return false
    }
    
    // Skip database operations for temporary chats
    if (activeChat.id.startsWith('temp-')) {
      return true // Return success for temporary chats
    }
    
    if (!isSignedIn || !user?.id) {
      setError('User not signed in')
      return false
    }

    const finalMessageId = messageId || `temp-${Date.now()}`
    const newMessage: ChatMessage = {
      id: finalMessageId,
      role,
      content,
      timestamp: new Date(),
      attachments: metadata?.attachments || [],
      metadata,
    }

    // Optimistically update UI
    if (optimistic) {
      setActiveChat(prev => prev ? {
        ...prev,
        messages: [...prev.messages, newMessage],
        updatedAt: new Date(),
      } : null)
    }

    setIsSaving(true)
    setError(null)

    try {

      const response = await fetch(`/api/chats/${activeChat.id}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          content,
          metadata,
          messageId: finalMessageId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to save message: ${response.status} - ${errorData}`)
      }

      const updatedChat = await response.json()
      
      // Update with the actual response from server
      const formattedChat: ActiveChat = {
        id: updatedChat.id,
        title: updatedChat.title,
        messages: updatedChat.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          attachments: msg.attachments || [],
          metadata: msg.metadata,
        })),
        createdAt: new Date(updatedChat.createdAt),
        updatedAt: new Date(updatedChat.updatedAt),
      }
      
      setActiveChat(formattedChat)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save message')
      
      // Remove optimistic update on error
      if (optimistic) {
        setActiveChat(prev => prev ? {
          ...prev,
          messages: prev.messages.filter(msg => msg.id !== finalMessageId),
        } : null)
      }
      
      return false
    } finally {
      setIsSaving(false)
    }
  }, [activeChat, isSignedIn, user?.id])

  // Update chat title
  const updateTitle = useCallback(async (newTitle: string): Promise<boolean> => {
    if (!activeChat) {
      return false
    }
    
    // For temporary chats, just update locally without API call
    if (activeChat.id.startsWith('temp-')) {
      setActiveChat(prev => prev ? { ...prev, title: newTitle } : null)
      return true
    }
    
    if (!isSignedIn || !user?.id) {
      return false
    }

    // Optimistically update UI
    setActiveChat(prev => prev ? { ...prev, title: newTitle } : null)
    
    try {
      const response = await fetch(`/api/chats/${activeChat.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTitle }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update title: ${response.status}`)
      }

      const updatedChat = await response.json()
      setActiveChat(prev => prev ? { 
        ...prev, 
        title: updatedChat.title,
        updatedAt: new Date(updatedChat.updatedAt)
      } : null)
      
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update title')
      
      // Revert optimistic update
      setActiveChat(prev => prev ? { ...prev, title: activeChat.title } : null)
      return false
    }
  }, [activeChat, isSignedIn, user?.id])

  // Generate title from first message
  const generateTitle = useCallback((firstUserMessage: string): string => {
    const maxLength = 50
    const cleaned = firstUserMessage.trim()
    
    if (cleaned.length <= maxLength) {
      return cleaned
    }
    
    // Try to cut at a word boundary
    const truncated = cleaned.substring(0, maxLength)
    const lastSpace = truncated.lastIndexOf(' ')
    
    if (lastSpace > maxLength * 0.7) {
      return truncated.substring(0, lastSpace) + '...'
    }
    
    return truncated + '...'
  }, [])

  // Clear the active chat
  const clearActiveChat = useCallback(() => {
    setActiveChat(null)
    setError(null)
  }, [])

  // Load initial chat if provided (skip temporary chats)
  useEffect(() => {
    if (initialChatId && !initialChatId.startsWith('temp-') && isSignedIn && user?.id) {
      loadChat(initialChatId)
    }
  }, [initialChatId, isSignedIn, user?.id, loadChat])

  return {
    activeChat,
    isLoading,
    isSaving,
    error,
    
    // Actions
    loadChat,
    createNewChat,
    addMessage,
    updateTitle,
    clearActiveChat,
    
    // Helpers
    generateTitle,
    clearError: () => setError(null),
    
    // Computed values
    messageCount: activeChat?.messages.length || 0,
    hasMessages: (activeChat?.messages.length || 0) > 0,
    lastMessage: activeChat?.messages[activeChat.messages.length - 1] || null,
  }
}