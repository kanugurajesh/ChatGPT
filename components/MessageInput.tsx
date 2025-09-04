"use client";

import { useRef, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, ArrowUp, Plus, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResponsive } from "@/hooks/use-responsive";

interface MessageInputProps {
  inputValue: string;
  isLoading: boolean;
  isStreaming: boolean;
  isTemporaryChat: boolean;
  isSignedIn: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSendMessage: () => void;
  onStopGeneration: () => void;
  onFileDialogOpen: () => void;
  showFirstPrompt?: boolean;
}

export const MessageInput = forwardRef<HTMLTextAreaElement | null, MessageInputProps>(
  function MessageInput(
    {
      inputValue,
      isLoading,
      isStreaming,
      isTemporaryChat,
      isSignedIn,
      onInputChange,
      onKeyDown,
      onSendMessage,
      onStopGeneration,
      onFileDialogOpen,
      showFirstPrompt = false,
    },
    ref
  ) {
    const { isMobile, useOverlayNav } = useResponsive();

    const InputSection = (
      <div
        className={cn(
          "w-full flex justify-center",
          isMobile
            ? "px-1"
            : useOverlayNav
            ? "px-4 max-w-full"
            : "px-6 max-w-4xl"
        )}
      >
        <div className={cn(isMobile ? "w-[95%]" : "w-full max-w-4xl")}>
          <div className="relative bg-[#2A2A2A] rounded-3xl border border-gray-700 flex items-center">
            <Button
              onClick={onFileDialogOpen}
              className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg ml-3"
              size="icon"
            >
              <Plus className="w-5 h-5" />
            </Button>
            <Textarea
              ref={ref}
              value={inputValue}
              onChange={onInputChange}
              onKeyDown={onKeyDown}
              placeholder="Message ChatGPT"
              className="flex-1 bg-transparent border-none text-white placeholder-gray-400 resize-none min-h-[24px] max-h-[200px] focus:ring-0 focus:outline-none text-base py-3 px-3"
              style={{ height: "auto", lineHeight: "24px" }}
              disabled={isLoading}
            />
            <div className="flex items-center mr-3 space-x-2">
              <Button
                className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg"
                size="icon"
              >
                <Mic className="w-5 h-5" />
              </Button>
              {isLoading || isStreaming ? (
                <Button
                  onClick={onStopGeneration}
                  size="icon"
                  className="w-8 h-8 rounded-full bg-[#424242] text-white transition-all"
                  aria-label="Stop generation"
                >
                  <Square className="w-[1px] h-[1px] bg-white rounded-xs" />
                </Button>
              ) : (
                <Button
                  onClick={onSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  size="icon"
                  className={cn(
                    "w-8 h-8 rounded-full transition-all",
                    inputValue.trim() && !isLoading
                      ? "bg-white text-black hover:bg-gray-200"
                      : "bg-gray-600 text-gray-500 cursor-not-allowed"
                  )}
                  aria-label="Send message"
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div className="text-center mt-3 text-xs text-gray-500">
          {isTemporaryChat ? (
            <div className="flex items-center justify-center gap-2"></div>
          ) : isSignedIn ? (
            <div className="flex items-center justify-center gap-2"></div>
          ) : (
            <span>⚠️ Sign in to save your chat history</span>
          )}
        </div>
      </div>
    );

    if (showFirstPrompt) {
      return InputSection;
    }

    // Bottom input bar for existing messages
    return (
      <div className="bg-[#212121] sticky bottom-0 z-10">
        <div className="flex justify-center w-full">
          <div
            className={cn(
              "w-full py-4 flex justify-center",
              isMobile
                ? "px-1"
                : useOverlayNav
                ? "px-4 max-w-full"
                : "px-4 max-w-4xl"
            )}
          >
            <div className={cn(isMobile ? "w-[95%]" : "w-full max-w-4xl")}>
              <div className="relative bg-[#2A2A2A] rounded-3xl border border-gray-700 flex items-center">
                <Button
                  onClick={onFileDialogOpen}
                  className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg ml-3"
                  size="icon"
                >
                  <Plus className="w-5 h-5" />
                </Button>
                <Textarea
                  ref={ref}
                  value={inputValue}
                  onChange={onInputChange}
                  onKeyDown={onKeyDown}
                  placeholder="Message ChatGPT"
                  className="flex-1 bg-transparent border-none text-white placeholder-gray-400 resize-none min-h-[24px] max-h-[200px] focus:ring-0 focus:outline-none text-base py-3 px-3"
                  style={{ height: "auto", lineHeight: "24px" }}
                  disabled={isLoading}
                />
                <div className="flex items-center mr-3 space-x-2">
                  <Button
                    className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg"
                    size="icon"
                  >
                    <Mic className="w-5 h-5" />
                  </Button>
                  {isLoading || isStreaming ? (
                    <Button
                      onClick={onStopGeneration}
                      size="icon"
                      className="w-8 h-8 rounded-full bg-[#424242] text-white hover:bg-red-700 transition-all"
                      aria-label="Stop generation"
                    >
                      <Square className="w-[1px] h-[1px] bg-white rounded-xs" />
                    </Button>
                  ) : (
                    <Button
                      onClick={onSendMessage}
                      disabled={!inputValue.trim() || isLoading}
                      size="icon"
                      className={cn(
                        "w-8 h-8 rounded-full transition-all",
                        inputValue.trim() && !isLoading
                          ? "bg-white text-black hover:bg-gray-200"
                          : "bg-gray-600 text-gray-500 cursor-not-allowed"
                      )}
                      aria-label="Send message"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Status indicator */}
            <div className="text-center mt-3 text-xs text-gray-500">
              {isTemporaryChat ? (
                <div className="flex items-center justify-center gap-2"></div>
              ) : isSignedIn ? (
                <div className="flex items-center justify-center gap-2"></div>
              ) : (
                <span>⚠️ Sign in to save your chat history</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);