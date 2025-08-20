"use client"

import { useState } from "react"
import { LeftNavigation } from "@/components/LeftNavigation"
import { MainContent } from "@/components/MainContent"

export default function ChatGPTClone() {
  const [navExpanded, setNavExpanded] = useState(false)

  const toggleNavigation = () => {
    setNavExpanded(!navExpanded)
  }

  const closeNavigation = () => {
    setNavExpanded(false)
  }

  return (
    <div className="flex h-screen bg-[#212121] text-white relative overflow-hidden">
      {/* Left Navigation */}
      <LeftNavigation 
        isExpanded={navExpanded} 
        onToggle={toggleNavigation}
        onClose={closeNavigation}
      />

      {/* Main Content */}
      <MainContent isNavExpanded={navExpanded} />

    </div>
  )
}
