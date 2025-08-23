"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Edit, Search, User, X, ChevronDown, Image, Brain, Library } from "lucide-react"
import { SidebarToggle } from "./SidebarToggle"
import { SearchDialog } from "./SearchDialog"
import { ManageMemory } from "./ManageMemory"
import { useResponsive } from "@/hooks/use-responsive"
import { useChatHistory } from "@/hooks/use-chat-history"
import { cn } from "@/lib/utils"
import { useUser, SignInButton, UserButton } from "@clerk/nextjs"

interface LeftNavigationProps {
  isExpanded: boolean
  onToggle: () => void
  onClose: () => void
  onImageClick: () => void
  onNewChat: () => void
  onChatSelect?: (chatId: string) => void
  activeChatId?: string
}


export function LeftNavigation({ isExpanded, onToggle, onClose, onImageClick, onNewChat, onChatSelect, activeChatId }: LeftNavigationProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMemoryOpen, setIsMemoryOpen] = useState(false)
  const { isMobile } = useResponsive()
  const { user, isSignedIn, isLoaded } = useUser()
  const { chatHistory, isLoading: chatHistoryLoading, error: chatHistoryError } = useChatHistory()

  const handleSearchClick = () => {
    setIsSearchOpen(true)
  }

  const handleSearchClose = () => {
    setIsSearchOpen(false)
  }

  const handleMemoryClick = () => {
    setIsMemoryOpen(true)
  }

  const handleMemoryClose = () => {
    setIsMemoryOpen(false)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + B to toggle sidebar
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault()
        onToggle()
      }
      // Escape to close sidebar when expanded
      if (event.key === 'Escape' && isExpanded) {
        event.preventDefault()
        onClose()
      }
      // Ctrl/Cmd + K to open search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault()
        setIsSearchOpen(true)
      }
      // Ctrl/Cmd + N for new chat
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault()
        onNewChat()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isExpanded, onToggle, onClose, onNewChat])


  return (
    <>
      {/* Backdrop when expanded - only on mobile */}
      {isExpanded && isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={onClose}
        />
      )}

      <div className={cn(
        "bg-[#0c0c0c] flex flex-col py-3 transition-all duration-300 ease-out relative overflow-hidden",
        isMobile 
          ? isExpanded 
            ? "fixed left-0 top-0 w-80 h-screen z-30" 
            : "w-12 h-full"
          : isExpanded 
            ? "w-60 h-full z-30" 
            : "w-12 h-full"
      )}>
        {/* Top Section */}
        <div className={cn(
          "transition-all duration-300 ease-out",
          isExpanded ? "px-3" : "px-0"
        )}>
          {/* Header - ChatGPT Logo/Toggle */}
          <div className={cn(
            "flex items-center mb-4 transition-all duration-300 ease-out",
            isExpanded ? "justify-between" : "justify-center"
          )}>
            {isExpanded ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
                      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.078 6.078 0 0 0 6.529 2.9 5.973 5.973 0 0 0 4.258 1.786c1.638 0 3.185-.65 4.299-1.786a5.987 5.987 0 0 0 4.007-2.9 6.042 6.042 0 0 0-.75-7.094l.003-.003z"/>
                    </svg>
                  </div>
                  <span className="text-white font-medium text-lg">ChatGPT</span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onClose}
                  className="text-gray-400 hover:text-white hover:bg-[#2f2f2f] w-6 h-6"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <div className="w-6 h-6 flex items-center justify-center">
                <SidebarToggle onClick={onToggle} />
              </div>
            )}
          </div>

          {/* Navigation Options */}
          <div className={cn(
            "space-y-1 transition-all duration-300 ease-out",
            isExpanded ? "mb-4" : "mb-4"
          )}>
            <Button 
              variant="ghost"
              onClick={onNewChat}
              className={cn(
                "text-white hover:bg-[#2f2f2f] transition-all duration-300 ease-out",
                isExpanded ? "w-full justify-start h-9 px-3" : "w-8 h-8 p-0 mx-auto flex justify-center"
              )}
            >
              <Edit className="h-4 w-4 shrink-0" />
              {isExpanded && <span className="ml-3 transition-opacity duration-300 ease-out">New chat</span>}
            </Button>

            <Button 
              variant="ghost"
              onClick={handleSearchClick}
              className={cn(
                "text-white hover:bg-[#2f2f2f] transition-all duration-300 ease-out",
                isExpanded ? "w-full justify-start h-9 px-3" : "w-8 h-8 p-0 mx-auto flex justify-center"
              )}
            >
              <Search className="h-4 w-4 shrink-0" />
              {isExpanded && <span className="ml-3 transition-opacity duration-300 ease-out">Search chats</span>}
            </Button>


            <Button 
              variant="ghost"
              onClick={onImageClick}
              className={cn(
                "text-white hover:bg-[#2f2f2f] transition-all duration-300 ease-out",
                isExpanded ? "w-full justify-start h-9 px-3" : "w-8 h-8 p-0 mx-auto flex justify-center"
              )}
            >
              <Image className="h-4 w-4 shrink-0" />
              {isExpanded && <span className="ml-3 transition-opacity duration-300 ease-out">Generate</span>}
            </Button>

            <Button 
              variant="ghost"
              className={cn(
                "text-white hover:bg-[#2f2f2f] transition-all duration-300 ease-out",
                isExpanded ? "w-full justify-start h-9 px-3" : "w-8 h-8 p-0 mx-auto flex justify-center"
              )}
            >
              <Library className="h-4 w-4 shrink-0" />
              {isExpanded && <span className="ml-3 transition-opacity duration-300 ease-out">Library</span>}
            </Button>

            <Button 
              variant="ghost"
              onClick={handleMemoryClick}
              disabled={!isLoaded || !isSignedIn}
              className={cn(
                "text-white hover:bg-[#2f2f2f] transition-all duration-300 ease-out",
                (!isLoaded || !isSignedIn) && "opacity-50 cursor-not-allowed",
                isExpanded ? "w-full justify-start h-9 px-3" : "w-8 h-8 p-0 mx-auto flex justify-center"
              )}
              title={!isLoaded ? "Loading..." : !isSignedIn ? "Sign in to access memories" : "Memories"}
            >
              <Brain className="h-4 w-4 shrink-0" />
              {isExpanded && <span className="ml-3 transition-opacity duration-300 ease-out">Memories</span>}
            </Button>
          </div>

          {/* Additional Options - Only show when expanded */}
          {isExpanded && (
            <div className="space-y-1 mb-4 border-t border-[#2f2f2f] pt-4">
              <Button variant="ghost" className="w-full justify-start text-white hover:bg-[#2f2f2f] h-9 px-3">
                <div className="w-4 h-4 mr-3 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                  <span className="text-xs text-white">◉</span>
                </div>
                <span className="transition-opacity duration-300 ease-out">Sora</span>
              </Button>

              <Button variant="ghost" className="w-full justify-start text-white hover:bg-[#2f2f2f] h-9 px-3">
                <User className="h-4 w-4 mr-3 shrink-0" />
                <span className="transition-opacity duration-300 ease-out">GPTs</span>
              </Button>
            </div>
          )}
        </div>

        {/* Chat History - Only show when expanded */}
        {isExpanded && (
          <div className="flex-1 overflow-y-auto px-3">
            <div className="text-xs text-gray-400 mb-2 font-medium">Chats</div>
            {chatHistoryError ? (
              <div className="text-red-400 text-sm px-3 py-2">Failed to load chat history</div>
            ) : chatHistoryLoading ? (
              <div className="space-y-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-[#2f2f2f] animate-pulse h-9 rounded-md" />
                ))}
              </div>
            ) : !isSignedIn ? (
              <div className="text-center text-gray-400 py-8">
                <div className="text-sm mb-2">Sign in to view your chat history</div>
                <div className="text-xs text-gray-500">Your conversations will be saved and accessible across devices</div>
              </div>
            ) : chatHistory.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <div className="text-sm mb-2">No chats yet</div>
                <div className="text-xs text-gray-500">Start a conversation to see it here</div>
              </div>
            ) : (
              <div className="space-y-1">
                {chatHistory.map((chat) => (
                  <Button
                    key={chat.id}
                    variant="ghost"
                    onClick={() => onChatSelect?.(chat.id)}
                    className={cn(
                      "w-full justify-start text-white hover:bg-[#2f2f2f] h-auto py-2 px-3 text-sm text-left transition-colors",
                      activeChatId === chat.id && "bg-[#2f2f2f]"
                    )}
                  >
                    <div className="truncate flex-1">
                      <div className="truncate font-medium">{chat.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {chat.messageCount || 0} messages • {new Date(chat.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bottom User Avatar */}
        <div className={cn(
          "transition-all duration-300 ease-out border-t border-[#2f2f2f] pt-3",
          isExpanded ? "px-3" : "px-0 flex justify-center"
        )}>
          {isExpanded ? (
            <div className="flex items-center gap-3">
              {isSignedIn ? (
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8",
                      userButtonTrigger: "focus:shadow-none"
                    }
                  }}
                />
              ) : (
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                {isSignedIn ? (
                  <>
                    <div className="text-white text-sm font-medium">{user?.firstName || user?.username || 'User'}</div>
                    <div className="text-gray-400 text-xs">Authenticated</div>
                  </>
                ) : (
                  <>
                    <SignInButton mode="modal">
                      <button className="text-white text-sm font-medium hover:text-gray-300">Sign in</button>
                    </SignInButton>
                    <div className="text-gray-400 text-xs">Guest mode</div>
                  </>
                )}
              </div>
            </div>
          ) : (
            isSignedIn ? (
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-6 h-6",
                    userButtonTrigger: "focus:shadow-none"
                  }
                }}
              />
            ) : (
              <SignInButton mode="modal">
                <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-500">
                  <User className="h-3 w-3 text-white" />
                </div>
              </SignInButton>
            )
          )}
        </div>
      </div>

      {/* Search Dialog */}
      <SearchDialog isOpen={isSearchOpen} onClose={handleSearchClose} />
      
      {/* Memory Management Dialog */}
      {isLoaded && isSignedIn && user?.id && (
        <ManageMemory 
          isOpen={isMemoryOpen} 
          onClose={handleMemoryClose} 
          userId={user.id} 
        />
      )}
    </>
  )
}