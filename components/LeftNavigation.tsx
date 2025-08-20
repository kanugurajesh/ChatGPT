"use client"

import { Button } from "@/components/ui/button"
import { Edit, Search, Sparkles, User, X, ChevronDown } from "lucide-react"
import { SidebarToggle } from "./SidebarToggle"
import { cn } from "@/lib/utils"

interface LeftNavigationProps {
  isExpanded: boolean
  onToggle: () => void
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

export function LeftNavigation({ isExpanded, onToggle, onClose }: LeftNavigationProps) {
  return (
    <>
      {/* Backdrop when expanded */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-30"
          onClick={onClose}
        />
      )}

      <div className={cn(
        "bg-[#0c0c0c] flex flex-col py-3 transition-all duration-300 ease-out relative z-40 h-full overflow-hidden",
        isExpanded ? "w-60" : "w-12"
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
              className={cn(
                "text-white hover:bg-[#2f2f2f] transition-all duration-300 ease-out",
                isExpanded ? "w-full justify-start h-9 px-3" : "w-8 h-8 p-0 mx-auto flex justify-center"
              )}
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              {isExpanded && <span className="ml-3 transition-opacity duration-300 ease-out">Library</span>}
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
        )}

        {/* Bottom User Avatar */}
        <div className={cn(
          "transition-all duration-300 ease-out border-t border-[#2f2f2f] pt-3",
          isExpanded ? "px-3" : "px-0 flex justify-center"
        )}>
          {isExpanded ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                <span className="text-white text-sm font-medium">R</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium">Rajesh</div>
                <div className="text-gray-400 text-xs">Free</div>
              </div>
            </div>
          ) : (
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-medium">R</span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}