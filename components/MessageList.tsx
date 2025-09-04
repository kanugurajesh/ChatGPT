"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useResponsive } from "@/hooks/use-responsive";
import { UserMessage } from "./UserMessage";
import { AssistantMessage } from "./AssistantMessage";
import { MessageInput } from "./MessageInput";

interface FileAttachment {
  type: "file";
  mediaType: string;
  url: string;
  name: string;
  size: number;
}

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  timestamp: Date;
  isEditing?: boolean;
  attachments?: FileAttachment[];
  metadata?: {
    model?: string;
    tokens?: number;
    imageGenerated?: boolean;
    regenerated?: boolean;
    isStreaming?: boolean;
    editHistory?: Array<{
      content: string;
      timestamp: Date;
    }>;
  };
}

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  isGeneratingImage: boolean;
  isTemporaryChat: boolean;
  isSignedIn: boolean;
  inputValue: string;
  editingMessageId: string | null;
  editContent: string;
  isEditingSave: boolean;
  copiedMessageId: string | null;
  likedMessages: Set<string>;
  dislikedMessages: Set<string>;
  isSavingToMongoDB: boolean;
  generatingImageMessageIds: Set<string>;
  generatedImages: { [messageId: string]: { url: string; publicId: string } };
  failedMessageIds: Set<string>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onEditMessage: (messageId: string, content: string) => void;
  onSaveEdit: (messageId: string) => void;
  onCancelEdit: () => void;
  onCopyToClipboard: (text: string, messageId: string) => void;
  onEditContentChange: (content: string) => void;
  onLikeMessage: (messageId: string) => void;
  onDislikeMessage: (messageId: string) => void;
  onRegenerateResponse: (messageId: string) => void;
  onSetImage: (image: string | null) => void;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSendMessage: () => void;
  onStopGeneration: () => void;
  onFileDialogOpen: () => void;
}

export function MessageList({
  messages,
  isLoading,
  isStreaming,
  isGeneratingImage,
  isTemporaryChat,
  isSignedIn,
  inputValue,
  editingMessageId,
  editContent,
  isEditingSave,
  copiedMessageId,
  likedMessages,
  dislikedMessages,
  isSavingToMongoDB,
  generatingImageMessageIds,
  generatedImages,
  failedMessageIds,
  textareaRef,
  onEditMessage,
  onSaveEdit,
  onCancelEdit,
  onCopyToClipboard,
  onEditContentChange,
  onLikeMessage,
  onDislikeMessage,
  onRegenerateResponse,
  onSetImage,
  onInputChange,
  onKeyDown,
  onSendMessage,
  onStopGeneration,
  onFileDialogOpen,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { isMobile, useOverlayNav } = useResponsive();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    // Empty state with input
    return (
      <div
        className={cn(
          "flex flex-col items-center h-full",
          isMobile ? "justify-start pt-8" : "justify-center"
        )}
      >
        <div className="w-full flex flex-col items-center">
          <div className={cn("text-center", isMobile ? "mb-6" : "mb-8")}>
            {isTemporaryChat ? (
              <>
                <div className="text-2xl font-semibold text-white mb-4">
                  Temporary Chat
                </div>
                <div className="text-sm text-gray-400 bg-gray-800 rounded-lg px-4 py-2 max-w-md mx-auto">
                  This chat won't appear in history, use or update memory, or be
                  used to train models. For safety information,{" "}
                  <a href="#" className="text-blue-400 underline">
                    see our Privacy Policy.
                  </a>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-semibold text-white mb-4">
                  ChatGPT
                </div>
                <div className="text-gray-400">How can I help you today?</div>
              </>
            )}
          </div>

          {/* Input area for first prompt */}
          <MessageInput
            ref={textareaRef}
            inputValue={inputValue}
            isLoading={isLoading}
            isStreaming={isStreaming}
            isTemporaryChat={isTemporaryChat}
            isSignedIn={isSignedIn}
            onInputChange={onInputChange}
            onKeyDown={onKeyDown}
            onSendMessage={onSendMessage}
            onStopGeneration={onStopGeneration}
            onFileDialogOpen={onFileDialogOpen}
            showFirstPrompt={true}
          />
        </div>
      </div>
    );
  }

  // Messages view
  return (
    <>
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="h-full flex flex-col">
          <div
            className={cn(
              "flex-1 mx-auto w-full",
              isMobile
                ? "py-4 px-2"
                : useOverlayNav
                ? "py-6 px-4 max-w-full"
                : "py-6 px-4 max-w-4xl"
            )}
          >
            {messages.map((message) => {
              const isMessageFailed = failedMessageIds.has(message.id);
              
              return (
                <div key={message.id} className={`mb-8 ${isMessageFailed ? 'opacity-60' : ''}`}>
                  {isMessageFailed && (
                    <div className="text-red-400 text-sm mb-2 px-2">
                      ⚠️ Failed to save this message
                    </div>
                  )}
                  {message.role === "user" ? (
                    <UserMessage
                      message={message}
                      editingMessageId={editingMessageId}
                      editContent={editContent}
                      isEditingSave={isEditingSave}
                      copiedMessageId={copiedMessageId}
                      isSavingToMongoDB={isSavingToMongoDB}
                      onEditMessage={onEditMessage}
                      onSaveEdit={onSaveEdit}
                      onCancelEdit={onCancelEdit}
                      onCopyToClipboard={onCopyToClipboard}
                      onEditContentChange={onEditContentChange}
                    />
                  ) : (
                    <AssistantMessage
                      message={message}
                      isStreaming={isStreaming && Boolean(message.metadata?.isStreaming)}
                      isLoading={isLoading}
                      copiedMessageId={copiedMessageId}
                      likedMessages={likedMessages}
                      dislikedMessages={dislikedMessages}
                      generatingImageMessageIds={generatingImageMessageIds}
                      generatedImages={generatedImages}
                      onCopyToClipboard={onCopyToClipboard}
                      onLikeMessage={onLikeMessage}
                      onDislikeMessage={onDislikeMessage}
                      onRegenerateResponse={onRegenerateResponse}
                      onSetImage={onSetImage}
                    />
                  )}
                </div>
              );
            })}

            {isLoading && !isGeneratingImage && (
              <div className="flex items-center justify-start py-4">
                <div className="relative flex items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded-full animate-ping opacity-75"></div>
                  <div className="absolute w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Bottom input bar */}
      <MessageInput
        ref={textareaRef}
        inputValue={inputValue}
        isLoading={isLoading}
        isStreaming={isStreaming}
        isTemporaryChat={isTemporaryChat}
        isSignedIn={isSignedIn}
        onInputChange={onInputChange}
        onKeyDown={onKeyDown}
        onSendMessage={onSendMessage}
        onStopGeneration={onStopGeneration}
        onFileDialogOpen={onFileDialogOpen}
        showFirstPrompt={false}
      />
    </>
  );
}