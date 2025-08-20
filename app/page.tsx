"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, Mic } from "lucide-react"
import { Sidebar } from "@/components/sidebar"
import { SearchPanel } from "@/components/search-panel"
import { ImageGallery } from "@/components/image-gallery"
import { LeftNav } from "@/components/left-nav"
import { motion, AnimatePresence } from "framer-motion"

export default function ChatGPTClone() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [imageGalleryOpen, setImageGalleryOpen] = useState(false)
  const [currentView, setCurrentView] = useState<"chat" | "library">("chat")

  return (
    <div className="flex h-screen bg-[#212121] text-white">
      {/* Left Vertical Navigation */}
      <LeftNav 
        onChatGPTClick={() => setSidebarOpen(true)} 
        onSearchClick={() => setSearchOpen(true)}
        onLibraryClick={() => {
          setCurrentView("library")
          setSidebarOpen(false)
        }}
      />

      {/* Chat History Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onSearchClick={() => setSearchOpen(true)} />

      {/* Main Content Area with Left Margin for Nav */}
      <div className="flex-1 flex flex-col ml-16">
        {/* Top Header */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between p-6"
        >
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="text-white hover:bg-[#2a2a2a] transition-colors duration-200 text-base font-medium px-3 py-2 h-auto"
            >
              ChatUI
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-xs bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 px-4 py-2 rounded-full"
          >
            ↗ Upgrade your plan
          </Button>
        </motion.header>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {currentView === "chat" ? (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col items-center justify-center px-8"
            >
              <div className="w-full max-w-3xl space-y-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-center"
                >
                  <h1 className="text-4xl font-normal text-white mb-12">What can I help with?</h1>
                </motion.div>

                {/* Input Area */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="relative"
                >
                  <div className="flex items-center gap-3 bg-[#2f2f2f] rounded-3xl p-4 border border-[#4a4a4a]">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-white transition-all duration-200"
                    >
                      <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center">
                        <span className="text-sm text-white font-light">+</span>
                      </div>
                    </Button>

                    <Input
                      placeholder="Ask anything"
                      className="flex-1 border-0 bg-transparent text-white placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
                    />

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-white transition-all duration-200"
                      >
                        <Mic className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-white transition-all duration-200"
                      >
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
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="library"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ImageGallery />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search Panel */}
      <SearchPanel isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
