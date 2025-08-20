"use client"

import { Button } from "@/components/ui/button"
import { X, MessageSquare, Search, Sparkles, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatSidebarProps {
  isOpen: boolean
  onClose: () => void
}

const chatHistory = [
  "Add Playwright MCP Server",
  "Code for subarray difference",
  "Pagination Strategies Overview", 
  "New chat",
  "IoT Smart Energy in Rural Areas",
  "Semantic Matching Overview",
  "Git pull tracking fix",
  "Gmail Newsletter Creation Guide",
  "Azure DevOps Repository Error",
  "Cursor IDE Clarification",
  "SQL Injection Learning App",
  "Stored Procedures Overview",
  "FastAPI React JSON Response",
  "TCP/IP Encapsulation Order"
]

export function ChatSidebar({ isOpen, onClose }: ChatSidebarProps) {
  if (!isOpen) return null

  return (
    <div className={cn(
      "fixed inset-y-0 left-12 w-64 bg-[#171717] border-r border-[#2f2f2f] transform transition-transform duration-200 ease-in-out z-50",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-[#2f2f2f]">
          <h2 className="text-white font-medium">ChatGPT</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-[#2f2f2f] w-8 h-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation Options */}
        <div className="p-3 space-y-2 border-b border-[#2f2f2f]">
          <Button variant="ghost" className="w-full justify-start text-white hover:bg-[#2f2f2f] h-9">
            <MessageSquare className="h-4 w-4 mr-3" />
            New chat
          </Button>
          <Button variant="ghost" className="w-full justify-start text-white hover:bg-[#2f2f2f] h-9">
            <Search className="h-4 w-4 mr-3" />
            Search chats
          </Button>
          <Button variant="ghost" className="w-full justify-start text-white hover:bg-[#2f2f2f] h-9">
            <Sparkles className="h-4 w-4 mr-3" />
            Library
          </Button>
        </div>

        {/* Additional Options */}
        <div className="p-3 space-y-2 border-b border-[#2f2f2f]">
          <Button variant="ghost" className="w-full justify-start text-white hover:bg-[#2f2f2f] h-9">
            <div className="w-4 h-4 mr-3 rounded-full bg-orange-500 flex items-center justify-center">
              <span className="text-xs text-white">◉</span>
            </div>
            Sora
          </Button>
          <Button variant="ghost" className="w-full justify-start text-white hover:bg-[#2f2f2f] h-9">
            <User className="h-4 w-4 mr-3" />
            GPTs
          </Button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="text-xs text-gray-400 mb-2 font-medium">Chats</div>
          <div className="space-y-1">
            {chatHistory.map((chat, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start text-white hover:bg-[#2f2f2f] h-auto py-2 px-3 text-sm text-left"
              >
                <span className="truncate">{chat}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* User Profile */}
        <div className="p-3 border-t border-[#2f2f2f]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">R</span>
            </div>
            <div className="flex-1">
              <div className="text-white text-sm font-medium">Rajesh</div>
              <div className="text-gray-400 text-xs">Free</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}