"use client";

import { useState, useEffect } from "react";
import { LeftNavigation } from "@/components/LeftNavigation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MainContent } from "@/components/MainContentIntegrated";
import { useResponsive } from "@/hooks/use-responsive";
import { sessionManager } from "@/lib/session";
import { useUser } from "@clerk/nextjs";

export default function ChatGPTClone() {
  const { isMobile, isSmallScreen } = useResponsive();
  const { user, isLoaded } = useUser();
  const [navExpanded, setNavExpanded] = useState(false);
  const [showImageView, setShowImageView] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('default_user');
  const [activeChatId, setActiveChatId] = useState<string | undefined>(undefined);

  const toggleNavigation = () => {
    setNavExpanded(!navExpanded);
  };

  // Initialize user ID - use Clerk user ID if authenticated, otherwise session ID
  useEffect(() => {
    if (isLoaded) {
      if (user?.id) {
        setUserId(user.id);
      } else if (typeof window !== 'undefined') {
        const sessionId = sessionManager.getOrCreateSession();
        setUserId(sessionId);
      }
    }
  }, [user, isLoaded]);

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
    setActiveChatId(undefined);
    if (typeof window !== "undefined" && (window as any).resetMainContentChat) {
      (window as any).resetMainContentChat();
    }
  };

  const handleChatCreated = (chatId: string) => {
    setActiveChatId(chatId);
  };

  const handleChatSelected = (chatId: string) => {
    setActiveChatId(chatId);
    if (isMobile) {
      setNavExpanded(false); // Close sidebar on mobile
    }
  };

  const closeImageView = () => {
    setShowImageView(false);
  };

  return (
    <div className="flex w-screen h-screen bg-[#212121] text-white relative overflow-hidden">
      <ErrorBoundary>
        <LeftNavigation
          isExpanded={navExpanded}
          onToggle={toggleNavigation}
          onClose={closeNavigation}
          onImageClick={handleImageClick}
          onNewChat={handleNewChat}
          onChatSelect={handleChatSelected}
          activeChatId={activeChatId}
        />
      </ErrorBoundary>

      {/* Chat area takes remaining space */}
      <div className="flex w-full justify-center">
        <MainContent
          isNavExpanded={navExpanded}
          showImageView={showImageView}
          currentImage={currentImage}
          onCloseImageView={closeImageView}
          onSetImage={setCurrentImage}
          onNewChat={handleNewChat}
          activeChatId={activeChatId}
          onChatCreated={handleChatCreated}
        />
      </div>
    </div>
  );
}
