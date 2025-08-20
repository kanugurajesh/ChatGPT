"use client"

import { useState } from "react"
import { LeftNavigation } from "@/components/LeftNavigation"
import { MainContent } from "@/components/MainContent"
import { ChatSidebar } from "@/components/ChatSidebar"

export default function ChatGPTClone() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen bg-[#212121] text-white relative">
      {/* Left Navigation */}
      <LeftNavigation onSidebarToggle={toggleSidebar} />

      {/* Chat Sidebar */}
      <ChatSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* Main Content */}
      <MainContent />

      {/* Overlay for mobile/small screens */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}
    </div>
  )
}
