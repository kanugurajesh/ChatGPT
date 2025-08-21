"use client";

import { useState, useEffect } from "react";
import { LeftNavigation } from "@/components/LeftNavigation";
import { MainContent } from "@/components/MainContentIntegrated";
import { useResponsive } from "@/hooks/use-responsive";

export default function ChatGPTClone() {
  const { isMobile, isSmallScreen } = useResponsive();
  const [navExpanded, setNavExpanded] = useState(false);
  const [showImageView, setShowImageView] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  const toggleNavigation = () => {
    setNavExpanded(!navExpanded);
  };

  // Auto-close nav on mobile when view changes
  useEffect(() => {
    if (isMobile && showImageView) {
      setNavExpanded(false);
    }
  }, [showImageView, isMobile]);

  const closeNavigation = () => {
    setNavExpanded(false);
  };

  const handleImageClick = () => {
    setShowImageView(true);
  };

  const handleNewChat = () => {
    if (typeof window !== "undefined" && (window as any).resetMainContentChat) {
      (window as any).resetMainContentChat();
    }
  };

  const closeImageView = () => {
    setShowImageView(false);
  };

  return (
    <div className="flex w-screen h-screen bg-[#212121] text-white relative overflow-hidden">
      {/* Mobile backdrop */}
      {isMobile && navExpanded && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={closeNavigation}
        />
      )}
      <LeftNavigation
        isExpanded={navExpanded}
        onToggle={toggleNavigation}
        onClose={closeNavigation}
        onImageClick={handleImageClick}
        onNewChat={handleNewChat}
      />

      {/* Chat area takes remaining space */}
      <div className="flex w-full justify-center">
        <MainContent
          isNavExpanded={navExpanded}
          showImageView={showImageView}
          currentImage={currentImage}
          onCloseImageView={closeImageView}
          onSetImage={setCurrentImage}
          onNewChat={handleNewChat}
        />
      </div>
    </div>
  );
}
