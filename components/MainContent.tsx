"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, Mic } from "lucide-react"
import { cn } from "@/lib/utils"
import { ImageGenerationView } from "./ImageGenerationView"

interface MainContentProps {
  isNavExpanded: boolean
  showImageView: boolean
  currentImage: string | null
  onCloseImageView: () => void
  onSetImage: (image: string | null) => void
}

export function MainContent({ isNavExpanded, showImageView, currentImage, onCloseImageView, onSetImage }: MainContentProps) {
  return (
    <div className={cn(
      "flex-1 flex flex-col transition-all duration-300 ease-out",
      isNavExpanded ? "ml-0" : "ml-0"
    )}>
      {showImageView ? (
        /* Show Image Generation View */
        <ImageGenerationView 
          currentImage={currentImage}
          onClose={onCloseImageView}
          onSetImage={onSetImage}
        />
      ) : (
        <>
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
        </>
      )}

      {/* Overlay when nav is expanded */}
      {isNavExpanded && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-30"
          style={{ left: '240px' }}
        />
      )}
    </div>
  )
}