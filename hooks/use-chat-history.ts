"use client"

import { useState, useEffect } from 'react'

export interface ChatHistoryItem {
  id: string
  title: string
  timestamp: Date
}

const defaultChatHistory: ChatHistoryItem[] = [
  { id: '1', title: 'Plan mode in Claude Code', timestamp: new Date('2024-01-15') },
  { id: '2', title: 'New chat', timestamp: new Date('2024-01-14') },
  { id: '3', title: 'What is programming', timestamp: new Date('2024-01-13') },
  { id: '4', title: 'New chat', timestamp: new Date('2024-01-12') },
  { id: '5', title: 'Extract text from image', timestamp: new Date('2024-01-11') },
  { id: '6', title: 'Greeting exchange', timestamp: new Date('2024-01-10') },
  { id: '7', title: 'Create MacBook image', timestamp: new Date('2024-01-09') },
  { id: '8', title: 'Image generation time', timestamp: new Date('2024-01-08') },
  { id: '9', title: 'Add Playwright MCP Server', timestamp: new Date('2024-01-07') }
]

export function useChatHistory() {
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>(defaultChatHistory)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addChatToHistory = (title: string) => {
    const newChat: ChatHistoryItem = {
      id: Date.now().toString(),
      title,
      timestamp: new Date()
    }
    setChatHistory(prev => [newChat, ...prev])
  }

  const removeChatFromHistory = (id: string) => {
    setChatHistory(prev => prev.filter(chat => chat.id !== id))
  }

  const getChatTitles = () => {
    return chatHistory.map(chat => chat.title)
  }

  return {
    chatHistory,
    isLoading,
    error,
    addChatToHistory,
    removeChatFromHistory,
    getChatTitles
  }
}