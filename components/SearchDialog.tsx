"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Edit, X, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchDialogProps {
  isOpen: boolean
  onClose: () => void
}

const chatHistory = [
  {
    period: "Today",
    chats: [
      "Add Playwright MCP Server"
    ]
  },
  {
    period: "Previous 30 Days", 
    chats: [
      "Code for subarray difference",
      "Pagination Strategies Overview",
      "New chat"
    ]
  },
  {
    period: "July",
    chats: [
      "IoT Smart Energy in Rural Areas",
      "Semantic Matching Overview", 
      "Git pull tracking fix",
      "Gmail Newsletter Creation Guide"
    ]
  }
]

export function SearchDialog({ isOpen, onClose }: SearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")

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
          <div className="flex-1">
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#404040] border-none text-white placeholder-gray-400 focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
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
              className="w-full justify-start text-white hover:bg-[#404040] h-12 px-4"
            >
              <Edit className="h-5 w-5 mr-3 shrink-0" />
              <span className="text-base">New chat</span>
            </Button>
          </div>

          {/* Chat History */}
          <div className="p-4">
            {chatHistory.map((section, sectionIndex) => (
              <div key={sectionIndex} className="mb-6 last:mb-0">
                <h3 className="text-sm text-gray-400 font-medium mb-3">
                  {section.period}
                </h3>
                <div className="space-y-1">
                  {section.chats
                    .filter(chat => 
                      searchQuery === "" || 
                      chat.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((chat, chatIndex) => (
                    <Button
                      key={chatIndex}
                      variant="ghost"
                      className="w-full justify-start text-white hover:bg-[#404040] h-auto py-3 px-4 text-left"
                    >
                      <Clock className="h-4 w-4 mr-3 shrink-0 text-gray-400" />
                      <span className="text-sm truncate">{chat}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ))}
            
            {/* No results message */}
            {searchQuery && chatHistory.every(section => 
              section.chats.every(chat => 
                !chat.toLowerCase().includes(searchQuery.toLowerCase())
              )
            ) && (
              <div className="text-center py-8 text-gray-400">
                <p>No chats found matching "{searchQuery}"</p>
              </div>
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