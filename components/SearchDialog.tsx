"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Edit, X, Clock, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { useChatHistory, ChatHistoryItem } from "@/hooks/use-chat-history"
import { useUser } from "@clerk/nextjs"

interface SearchDialogProps {
  isOpen: boolean
  onClose: () => void
  onChatSelect?: (chatId: string) => void
  onNewChat?: () => void
}

// Helper function to group chats by time periods
function groupChatsByPeriod(chats: ChatHistoryItem[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const monthAgo = new Date(today)
  monthAgo.setMonth(monthAgo.getMonth() - 1)

  const groups = {
    today: [] as ChatHistoryItem[],
    yesterday: [] as ChatHistoryItem[],
    week: [] as ChatHistoryItem[],
    month: [] as ChatHistoryItem[],
    older: [] as ChatHistoryItem[],
  }

  chats.forEach(chat => {
    const chatDate = new Date(chat.updatedAt)
    if (chatDate >= today) {
      groups.today.push(chat)
    } else if (chatDate >= yesterday) {
      groups.yesterday.push(chat)
    } else if (chatDate >= weekAgo) {
      groups.week.push(chat)
    } else if (chatDate >= monthAgo) {
      groups.month.push(chat)
    } else {
      groups.older.push(chat)
    }
  })

  return [
    { period: "Today", chats: groups.today },
    { period: "Yesterday", chats: groups.yesterday },
    { period: "Previous 7 days", chats: groups.week },
    { period: "Previous 30 days", chats: groups.month },
    { period: "Older", chats: groups.older },
  ].filter(group => group.chats.length > 0)
}

export function SearchDialog({ isOpen, onClose, onChatSelect, onNewChat }: SearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ChatHistoryItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const { chatHistory, searchChats, isLoading } = useChatHistory()
  const { isSignedIn } = useUser()

  // Debounced search function with hybrid approach
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!searchQuery.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        let results: ChatHistoryItem[] = []
        
        // First try API search (for content search)
        if (isSignedIn) {
          try {
            results = await searchChats(searchQuery)
          } catch (error) {
            console.warn('API search failed, falling back to client-side search:', error)
          }
        }
        
        // If API search returns no results or fails, do client-side filtering
        if (results.length === 0) {
          const query = searchQuery.toLowerCase().trim()
          results = chatHistory.filter(chat => 
            chat.title.toLowerCase().includes(query)
          )
        }
        
        setSearchResults(results)
      } catch (error) {
        console.error('Search error:', error)
        // Fallback to client-side search
        const query = searchQuery.toLowerCase().trim()
        const fallbackResults = chatHistory.filter(chat => 
          chat.title.toLowerCase().includes(query)
        )
        setSearchResults(fallbackResults)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, searchChats, chatHistory, isSignedIn])

  // Reset search when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("")
      setSearchResults([])
      setIsSearching(false)
    }
  }, [isOpen])

  const handleChatClick = (chatId: string) => {
    onChatSelect?.(chatId)
    onClose()
  }

  const handleNewChatClick = () => {
    onNewChat?.()
    onClose()
  }

  // Determine which chats to display
  const displayChats = searchQuery.trim() ? searchResults : chatHistory
  const groupedChats = groupChatsByPeriod(displayChats)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div 
        className={cn(
          "relative bg-[#2f2f2f] rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] mx-4",
          "transform transition-all duration-300 ease-out",
          isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"
        )}
        style={{
          animation: isOpen ? 'popup 0.3s ease-out forwards' : undefined
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#404040]">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={isSignedIn ? "Search chats..." : "Sign in to search chats"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={!isSignedIn}
              className="bg-[#404040] border-none text-white placeholder-gray-400 focus:ring-1 focus:ring-blue-500 pl-10 disabled:opacity-50 disabled:cursor-not-allowed"
              autoFocus={isSignedIn}
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="ml-3 text-gray-400 hover:text-white hover:bg-[#404040]"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-96">
          {/* New Chat Option */}
          <div className="p-4 border-b border-[#404040]">
            <Button
              variant="ghost"
              onClick={handleNewChatClick}
              className="w-full justify-start text-white hover:bg-[#404040] h-12 px-4"
            >
              <Edit className="h-5 w-5 mr-3 shrink-0" />
              <span className="text-base">New chat</span>
            </Button>
          </div>

          {/* Chat History */}
          <div className="p-4">
            {!isSignedIn ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm mb-2">Sign in to search your chat history</p>
                <p className="text-xs text-gray-500">Your conversations will be saved and searchable</p>
              </div>
            ) : isLoading && !searchQuery ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-600 rounded mb-2 w-20"></div>
                    <div className="space-y-2">
                      <div className="h-8 bg-gray-700 rounded"></div>
                      <div className="h-8 bg-gray-700 rounded w-3/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : groupedChats.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {searchQuery ? (
                  <div>
                    <p>No chats found matching "{searchQuery}"</p>
                    <p className="text-xs text-gray-500 mt-1">Try different keywords or check your spelling</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm mb-2">No chats yet</p>
                    <p className="text-xs text-gray-500">Start a conversation to see it here</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                {groupedChats.map((section, sectionIndex) => (
                  <div key={sectionIndex} className="mb-6 last:mb-0">
                    <h3 className="text-sm text-gray-400 font-medium mb-3">
                      {section.period}
                    </h3>
                    <div className="space-y-1">
                      {section.chats.map((chat) => (
                        <Button
                          key={chat.id}
                          variant="ghost"
                          onClick={() => handleChatClick(chat.id)}
                          className="w-full justify-start text-white hover:bg-[#404040] h-auto py-3 px-4 text-left"
                        >
                          <Clock className="h-4 w-4 mr-3 shrink-0 text-gray-400" />
                          <div className="flex-1 truncate text-left">
                            <div className="text-sm truncate font-medium">{chat.title}</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {chat.messageCount || 0} messages • {new Date(chat.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Custom animation styles */}
      <style jsx>{`
        @keyframes popup {
          0% {
            transform: scale(0.8) translateY(20px);
            opacity: 0;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}