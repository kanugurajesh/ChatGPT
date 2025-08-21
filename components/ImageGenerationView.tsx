"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Mic } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageGenerationViewProps {
  currentImage: string | null
  onClose: () => void
  onSetImage: (image: string | null) => void
}

export function ImageGenerationView({ currentImage, onClose, onSetImage }: ImageGenerationViewProps) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Header with close button */}
      <header className="flex items-center justify-between px-6 py-4">
        <h2 className="text-lg font-medium text-white">Image Generation</h2>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="text-gray-400 hover:text-white hover:bg-[#2f2f2f] w-8 h-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {currentImage ? (
          // Show existing image UI
          <div className="w-full max-w-2xl space-y-6">
            <div className="bg-[#2f2f2f] rounded-lg p-4 flex justify-center">
              <img 
                src={currentImage} 
                alt="Generated content" 
                className="max-w-full max-h-80 object-contain rounded-lg"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => onSetImage(null)}
                className="bg-[#6366f1] hover:bg-[#5855eb] text-white px-4 py-2 rounded-full"
              >
                Generate New
              </Button>
              <Button 
                variant="outline" 
                className="border-[#2f2f2f] text-white hover:bg-[#2f2f2f] px-4 py-2 rounded-full"
              >
                Download
              </Button>
            </div>
          </div>
        ) : (
          // Show empty state UI
          <div className="w-full max-w-4xl space-y-10 text-center">
            {/* Main Title */}
            <div>
              <h1 className="text-4xl font-light text-white mb-4">Visualize anything, find it here</h1>
              <p className="text-xl text-gray-400">Ask ChatGPT to turn any idea into an image, diagram, or visual.</p>
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
        )}
      </div>
    </div>
  )
}