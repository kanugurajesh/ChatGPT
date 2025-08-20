"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Search, Edit3 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface SearchPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchPanel({ isOpen, onClose }: SearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedChat, setSelectedChat] = useState("")

  const chatHistory = [
    "Add Playwright MCP",
    "Create ChatGPT UI prompt", 
    "System design interview prep",
    "System design questions",
    "Software engineer salary Atlan",
    "Generate SameGPT UI"
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-16"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
              mass: 0.5,
            }}
            className="bg-[#2f2f2f] border border-[#4a4a4a] rounded-xl w-full max-w-lg mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="flex items-center gap-3 p-4 border-b border-[#4a4a4a]"
            >
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 border-0 bg-transparent text-white placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="p-4 max-h-96 overflow-y-auto"
            >
              {/* New Chat Option */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="mb-4"
              >
                <label className="flex items-center gap-3 p-3 bg-[#3a3a3a] rounded-lg cursor-pointer hover:bg-[#404040] transition-colors duration-200">
                  <input
                    type="radio"
                    name="chat"
                    value="new-chat"
                    checked={selectedChat === "new-chat"}
                    onChange={(e) => setSelectedChat(e.target.value)}
                    className="sr-only"
                  />
                  <div className="w-4 h-4 border-2 border-gray-400 rounded-full flex items-center justify-center">
                    {selectedChat === "new-chat" && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <Edit3 className="h-4 w-4 text-gray-300" />
                  <span className="text-sm text-white font-medium">New chat</span>
                </label>
              </motion.div>

              {/* Today Section */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}
                className="mb-3"
              >
                <h3 className="text-sm text-gray-400 mb-2">Today</h3>
                <div className="space-y-2">
                  {chatHistory.map((chat, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.05, duration: 0.3 }}
                    >
                      <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-[#3a3a3a] transition-colors duration-200">
                        <input
                          type="radio"
                          name="chat"
                          value={chat}
                          checked={selectedChat === chat}
                          onChange={(e) => setSelectedChat(e.target.value)}
                          className="sr-only"
                        />
                        <div className="w-4 h-4 border-2 border-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
                          {selectedChat === chat && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                        <span className="text-sm text-white">{chat}</span>
                      </label>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
