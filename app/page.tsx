"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, Mic, Edit, Search, Sparkles, Zap } from "lucide-react"

export default function ChatGPTClone() {
  return (
    <div className="flex h-screen bg-[#212121] text-white">
      {/* Left Sidebar */}
      <div className="w-12 bg-[#0c0c0c] flex flex-col items-center py-3 justify-between">
        <div>
          {/* ChatGPT Logo/Icon */}
          <div className="w-6 h-6 mb-4 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
              <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.078 6.078 0 0 0 6.529 2.9 5.973 5.973 0 0 0 4.258 1.786c1.638 0 3.185-.65 4.299-1.786a5.987 5.987 0 0 0 4.007-2.9 6.042 6.042 0 0 0-.75-7.094l.003-.003z"/>
            </svg>
          </div>

          {/* Navigation Icons */}
          <div className="flex flex-col gap-1">
            <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-400 hover:text-white hover:bg-[#2f2f2f]">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-400 hover:text-white hover:bg-[#2f2f2f]">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-400 hover:text-white hover:bg-[#2f2f2f]">
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Bottom User Avatar */}
        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-medium">R</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="flex items-center justify-center px-6 py-4 relative">
          <div className="absolute left-6 flex items-center gap-2">
            <Button variant="ghost" className="text-white hover:bg-[#2f2f2f] font-medium px-3 py-2 h-auto text-lg">
              ChatGPT
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <Button className="bg-[#6366f1] hover:bg-[#5855eb] text-white px-4 py-2 rounded-full text-sm font-medium">
            Upgrade to Go
          </Button>
        </header>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-4xl space-y-10">
            {/* Main Title */}
            <div className="text-center">
              <h1 className="text-4xl font-light text-white">What can I help with?</h1>
            </div>

            {/* Input Area */}
            <div className="relative">
              <div className="flex items-center bg-[#2f2f2f] rounded-3xl px-4 py-3 shadow-sm">
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white transition-colors p-0 h-auto w-auto mr-3">
                  <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center">
                    <span className="text-xs text-white font-light">+</span>
                  </div>
                </Button>

                <Input
                  placeholder="Ask anything"
                  className="flex-1 border-0 bg-transparent text-white placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 text-base p-0 h-auto"
                />

                <div className="flex items-center gap-1 ml-3">
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white transition-colors p-0 h-auto w-auto">
                    <Mic className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white transition-colors p-0 h-auto w-auto ml-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3" />
                      <circle cx="12" cy="3" r="1" />
                      <circle cx="12" cy="21" r="1" />
                      <circle cx="3" cy="12" r="1" />
                      <circle cx="21" cy="12" r="1" />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
