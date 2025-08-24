"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Edit, Search, User, X, ChevronDown, Image, Brain, MoreHorizontal, Share, Archive, Trash2, Pencil } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { SidebarToggle } from "./SidebarToggle"
import { SearchDialog } from "./SearchDialog"
import { ManageMemory } from "./ManageMemory"
import { useResponsive } from "@/hooks/use-responsive"
import { useChatHistory } from "@/hooks/use-chat-history"
import { cn } from "@/lib/utils"
// import Image from "next/image"
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
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const { isMobile, useOverlayNav } = useResponsive()
  const { user, isSignedIn, isLoaded } = useUser()
  const { chatHistory, isLoading: chatHistoryLoading, error: chatHistoryError, deleteChat, updateChatTitle } = useChatHistory()

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

  const handleRenameStart = (chatId: string, currentTitle: string) => {
    setEditingChatId(chatId)
    setEditTitle(currentTitle)
  }

  const handleRenameCancel = () => {
    setEditingChatId(null)
    setEditTitle('')
  }

  const handleRenameSave = async (chatId: string) => {
    if (editTitle.trim() && editTitle.trim() !== chatHistory.find(c => c.id === chatId)?.title) {
      await updateChatTitle(chatId, editTitle.trim())
    }
    setEditingChatId(null)
    setEditTitle('')
  }

  const handleDeleteChat = async (chatId: string) => {
    if (window.confirm('Are you sure you want to delete this chat?')) {
      await deleteChat(chatId)
      // If the deleted chat was active, we might want to navigate away
      if (activeChatId === chatId) {
        onNewChat() // Start a new chat
      }
    }
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
      {/* Backdrop when expanded - for overlay navigation */}
      {isExpanded && useOverlayNav && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={onClose}
        />
      )}

      <div className={cn(
        "bg-[#0c0c0c] flex flex-col py-3 transition-all duration-300 ease-out relative overflow-hidden",
        isMobile 
          ? isExpanded 
            ? "fixed left-0 top-0 w-[335px] h-screen z-30" 
            : "hidden"
          : useOverlayNav
            ? isExpanded 
              ? "fixed left-0 top-0 w-[335px] h-screen z-30" 
              : "w-12 h-full"
            : isExpanded 
              ? "w-[275px] h-full z-30" 
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
                  {!isMobile && <ChevronDown className="h-4 w-4 text-gray-400" />}
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
              {isExpanded && <span className="ml-3 transition-opacity duration-300 ease-out">Gallery</span>}
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
                  <div key={chat.id} className="group relative">
                    {editingChatId === chat.id ? (
                      <div className="bg-[#2f2f2f] rounded-md p-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleRenameSave(chat.id)
                            } else if (e.key === 'Escape') {
                              handleRenameCancel()
                            }
                          }}
                          className="w-full bg-[#1a1a1a] text-white text-sm px-2 py-1 rounded border border-gray-600 focus:outline-none focus:border-gray-400"
                          autoFocus
                        />
                        <div className="flex justify-end gap-1 mt-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleRenameCancel}
                            className="h-6 px-2 text-xs text-gray-400 hover:text-white"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRenameSave(chat.id)}
                            className="h-6 px-2 text-xs text-white bg-[#0069d9] hover:bg-[#0056b3]"
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <Button
                          variant="ghost"
                          onClick={() => onChatSelect?.(chat.id)}
                          className={cn(
                            "w-full justify-start text-white hover:bg-[#2f2f2f] h-auto py-2 px-3 text-sm text-left transition-colors group-hover:pr-10",
                            activeChatId === chat.id && "bg-[#2f2f2f]"
                          )}
                        >
                          <div className="truncate flex-1 pr-2">
                            <div className="truncate font-medium">{chat.title}</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {chat.messageCount || 0} messages • {new Date(chat.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-[#404040]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4 text-gray-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent 
                            className="bg-[#2f2f2f] border-gray-600 text-white min-w-[140px]"
                            align="end"
                          >
                            <DropdownMenuItem 
                              disabled 
                              className="text-gray-500 cursor-not-allowed focus:bg-transparent focus:text-gray-500"
                            >
                              <Share className="mr-2 h-4 w-4" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRenameStart(chat.id, chat.title)
                              }}
                              className="text-white hover:bg-[#404040] focus:bg-[#404040] cursor-pointer"
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              disabled 
                              className="text-gray-500 cursor-not-allowed focus:bg-transparent focus:text-gray-500"
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Archive
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-gray-600" />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteChat(chat.id)
                              }}
                              className="text-red-400 hover:bg-red-900/20 focus:bg-red-900/20 cursor-pointer"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
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
      <SearchDialog 
        isOpen={isSearchOpen} 
        onClose={handleSearchClose}
        onChatSelect={onChatSelect}
        onNewChat={onNewChat}
      />
      
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