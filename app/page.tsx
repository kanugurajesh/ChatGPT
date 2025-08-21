"use client"

import { useState } from "react"
import { LeftNavigation } from "@/components/LeftNavigation"
import { MainContent } from "@/components/MainContent"

export default function ChatGPTClone() {
  const [navExpanded, setNavExpanded] = useState(false)
  const [showImageView, setShowImageView] = useState(false)
  const [currentImage, setCurrentImage] = useState<string | null>(null)

  const toggleNavigation = () => {
    setNavExpanded(!navExpanded)
  }

  const closeNavigation = () => {
    setNavExpanded(false)
  }

  const handleImageClick = () => {
    setShowImageView(true)
  }

  const closeImageView = () => {
    setShowImageView(false)
  }

  return (
    <div className="flex h-screen bg-[#212121] text-white relative overflow-hidden">
      {/* Left Navigation */}
      <LeftNavigation 
        isExpanded={navExpanded} 
        onToggle={toggleNavigation}
        onClose={closeNavigation}
        onImageClick={handleImageClick}
      />

      {/* Main Content */}
      <MainContent 
        isNavExpanded={navExpanded} 
        showImageView={showImageView}
        currentImage={currentImage}
        onCloseImageView={closeImageView}
        onSetImage={setCurrentImage}
      />

    </div>
  )
}
