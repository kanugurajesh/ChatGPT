"use client"
import { Button } from "@/components/ui/button"
import { X, Search, MessageSquare, Library, Plus, Edit3, Users, Sparkles, Briefcase, Image, Minimize2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  onSearchClick: () => void
}

export function Sidebar({ isOpen, onClose, onSearchClick }: SidebarProps) {
  const aiTools = [
    { id: 1, name: "Sora", icon: Sparkles, description: "AI video generator" },
    { id: 2, name: "GPTs", icon: Users, description: "Custom GPT models" },
    { id: 3, name: "CrewAI Assistant", icon: Briefcase, description: "Multi-agent AI" },
    { id: 4, name: "Grimoire", icon: Sparkles, description: "Code wizard" },
    { id: 5, name: "Image generator", icon: Image, description: "Create images" },
  ]

  const chatHistory = [
    "Add Playwright MCP",
    "Create ChatGPT UI prompt", 
    "System design interview prep",
    "System design questions",
    "Software engineer salary Atlan",
    "Generate SameGPT UI",
    "Task completion plan guidance",
    "Commit hash usage",
    "Celery uses and functions",
    "Activate Plan Mode Windows"
  ]

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ x: -320 }}
        animate={{ x: isOpen ? 0 : -320 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          mass: 0.8,
        }}
        className="fixed inset-y-0 left-0 z-50 w-60 bg-[#171717] border-r border-[#2a2a2a] flex flex-col"
      >
        {/* Header with Close Button */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="flex items-center justify-between p-3"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"
                  className="text-black"
                />
              </svg>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="w-6 h-6 text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-colors duration-200"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </motion.div>

        {/* Top Navigation */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="px-3 space-y-1"
        >
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-gray-300 hover:bg-[#2a2a2a] hover:text-white transition-all duration-200 px-3 py-2"
          >
            <Edit3 className="h-4 w-4" />
            New chat
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSearchClick}
            className="w-full justify-start gap-2 text-gray-300 hover:bg-[#2a2a2a] hover:text-white transition-all duration-200 px-3 py-2"
          >
            <Search className="h-4 w-4" />
            Search chats
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-gray-300 hover:bg-[#2a2a2a] hover:text-white transition-all duration-200 px-3 py-2"
          >
            <Library className="h-4 w-4" />
            Library
          </Button>
        </motion.div>

        {/* AI Tools Section */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="px-3 mt-4 space-y-1"
        >
          {aiTools.map((tool, index) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + index * 0.05, duration: 0.3 }}
            >
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-gray-300 hover:bg-[#2a2a2a] hover:text-white transition-all duration-200 px-3 py-2"
              >
                <tool.icon className="h-4 w-4" />
                {tool.name}
              </Button>
            </motion.div>
          ))}
        </motion.div>

        {/* Chats Section */}
        <div className="flex-1 overflow-y-auto mt-6">
          <div className="px-3">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="mb-3"
            >
              <h3 className="text-sm font-medium text-gray-400 mb-2">Chats</h3>
              <div className="space-y-1">
                {chatHistory.map((chat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + index * 0.02, duration: 0.3 }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left text-gray-300 hover:bg-[#2a2a2a] hover:text-white px-3 py-2 h-auto transition-all duration-200 text-sm"
                    >
                      <span className="truncate">{chat}</span>
                    </Button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="p-3 border-t border-[#2a2a2a]"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">R</span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">Rajesh Kanugu</div>
              <div className="text-xs text-gray-400">Free</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </>
  )
}
