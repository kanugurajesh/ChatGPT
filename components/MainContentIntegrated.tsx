"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Mic,
  ArrowUp,
  Copy,
  RefreshCw,
  Edit3,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageGenerationView } from "./ImageGenerationView";
import { useResponsive } from "@/hooks/use-responsive";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  isEditing?: boolean;
}

interface MainContentProps {
  isNavExpanded: boolean;
  showImageView: boolean;
  currentImage: string | null;
  onCloseImageView: () => void;
  onSetImage: (image: string | null) => void;
  onNewChat: () => void;
}

const MAX_CONTEXT = 20;

export function MainContent({
  isNavExpanded,
  showImageView,
  currentImage,
  onCloseImageView,
  onSetImage,
  onNewChat,
}: MainContentProps) {
  const [isTemporaryChat, setIsTemporaryChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { isMobile } = useResponsive();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function getContextMessages(msgArr: Message[]) {
    return msgArr.slice(-MAX_CONTEXT).map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }

  // Streaming API call
  const handleSendMessage = async (content: string = inputValue) => {
    if (!content.trim()) return;
    setIsLoading(true);

    const newMessage: Message = {
      id: crypto.randomUUID(),
      content: content.trim(),
      role: "user",
      timestamp: new Date(),
    };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInputValue("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: getContextMessages(updatedMessages) }),
      });

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      let streamingText = "";

      const assistantId = crypto.randomUUID();
      setMessages([
        ...updatedMessages,
        {
          id: assistantId,
          content: "",
          role: "assistant",
          timestamp: new Date(),
        },
      ]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        streamingText += chunk;

        setMessages((msgs) =>
          msgs.map((m) =>
            m.id === assistantId ? { ...m, content: streamingText } : m
          )
        );
      }
    } catch (err) {
      setMessages((msgs) => [
        ...updatedMessages,
        {
          id: crypto.randomUUID(),
          content: "Error getting response from Gemini.",
          role: "assistant",
          timestamp: new Date(),
        },
      ]);
    }
    setIsLoading(false);
  };

  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditContent(content);
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editContent.trim()) return;
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;

    const updatedMessages = [...messages];
    updatedMessages[messageIndex] = {
      ...messages[messageIndex],
      content: editContent.trim(),
    };
    setMessages(updatedMessages);
    setEditingMessageId(null);
    setEditContent("");

    if (messages[messageIndex].role === "user") {
      await handleSendMessage(editContent.trim());
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleRegenerateResponse = async (messageId: string) => {
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;
    const updatedMessages = messages.slice(0, messageIndex);
    setMessages(updatedMessages);
    await handleSendMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setInputValue(textarea.value);
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const resetChat = () => {
    setMessages([]);
    setInputValue("");
    setIsLoading(false);
    setEditingMessageId(null);
    setEditContent("");
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).resetMainContentChat = resetChat;
    }
  }, []);

  return (
    <div>
      {showImageView ? (
        <ImageGenerationView
          image={currentImage}
          onClose={onCloseImageView}
          onSetImage={onSetImage}
          onNewChat={onNewChat}
        />
      ) : (
        <div className="flex flex-col h-full relative">
          {/* Chat area */}
          <div className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              // Empty state
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-full flex flex-col items-center">
                  <div className="text-center mb-8">
                    {isTemporaryChat ? (
                      <>
                        <div className="text-2xl font-semibold text-white mb-4">
                          Temporary Chat
                        </div>
                        <div className="text-sm text-gray-400 bg-gray-800 rounded-lg px-4 py-2 max-w-md mx-auto">
                          This chat won't appear in history, use or update
                          memory, or be used to train models. For safety
                          purposes, we may keep a copy for 30 days.
                        </div>
                      </>
                    ) : (
                      <div className="text-2xl font-medium text-white mb-8">
                        Ready when you are.
                      </div>
                    )}
                  </div>
                  {/* Input area (first prompt) */}
                  <div className="w-full max-w-3xl px-6">
                    <div className="relative bg-[#2A2A2A] rounded-lg border border-gray-700 flex items-center">
                      <Plus className="w-5 h-5 text-gray-400 ml-3 mr-2 cursor-pointer hover:text-gray-300" />
                      <Textarea
                        ref={textareaRef}
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything"
                        className="flex-1 bg-transparent border-none text-white placeholder-gray-400 resize-none min-h-[24px] max-h-[200px] focus:ring-0 focus:outline-none text-base py-3"
                        style={{ height: "auto", lineHeight: "24px" }}
                        disabled={isLoading}
                      />
                      <Mic className="w-5 h-5 text-gray-400 mx-2 cursor-pointer hover:text-gray-300" />
                      <Button
                        onClick={() => handleSendMessage()}
                        disabled={!inputValue.trim() || isLoading}
                        size="icon"
                        className={cn(
                          "w-8 h-8 rounded-full mr-3 transition-all",
                          inputValue.trim() && !isLoading
                            ? "bg-white text-black hover:bg-gray-200"
                            : "bg-gray-600 text-gray-500 cursor-not-allowed"
                        )}
                        aria-label="Send message"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Messages
              <div className="flex justify-center w-full">
                <div className="w-full max-w-3xl px-4 py-6 space-y-6">
                  {messages.map((message) => (
                    <div key={message.id} className="text-base whitespace-pre-wrap leading-relaxed text-gray-100">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-400 text-sm">
                          {message.role === "user" ? "You" : "ChatGPT"}
                        </span>
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => copyToClipboard(message.content)}
                            className="h-7 w-7 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white"
                            size="icon"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          {message.role === "user" && (
                            <Button
                              onClick={() =>
                                handleEditMessage(message.id, message.content)
                              }
                              className="h-7 w-7 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white"
                              size="icon"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                          )}
                          {message.role === "assistant" && (
                            <Button
                              onClick={() =>
                                handleRegenerateResponse(message.id)
                              }
                              className="h-7 w-7 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white"
                              size="icon"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {editingMessageId === message.id ? (
                        <div className="space-y-3">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg resize-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                          />
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => handleSaveEdit(message.id)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                              size="sm"
                            >
                              Save & Submit
                            </Button>
                            <Button
                              onClick={handleCancelEdit}
                              variant="outline"
                              size="sm"
                              className="text-white border-gray-600 hover:bg-gray-800"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p>{message.content}</p>
                      )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="text-gray-400 text-sm animate-pulse">
                      ChatGPT is thinking…
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}
          </div>

          {/* Bottom input bar */}
          {messages.length > 0 && (
            <div className="border-t border-gray-700 bg-[#212121]">
              <div className="flex justify-center w-full">
                <div className="w-full max-w-3xl px-4 py-4">
                  <div className="relative bg-[#2A2A2A] rounded-lg border border-gray-700 flex items-center">
                    <Plus className="w-5 h-5 text-gray-400 ml-3 mr-2 cursor-pointer hover:text-gray-300" />
                    <Textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask anything"
                      className="flex-1 bg-transparent border-none text-white placeholder-gray-400 resize-none min-h-[24px] max-h-[200px] focus:ring-0 focus:outline-none text-base py-3"
                      style={{ height: "auto", lineHeight: "24px" }}
                      disabled={isLoading}
                    />
                    <Mic className="w-5 h-5 text-gray-400 mx-2 cursor-pointer hover:text-gray-300" />
                    <Button
                      onClick={() => handleSendMessage()}
                      disabled={!inputValue.trim() || isLoading}
                      size="icon"
                      className={cn(
                        "w-8 h-8 rounded-full mr-3 transition-all",
                        inputValue.trim() && !isLoading
                          ? "bg-white text-black hover:bg-gray-200"
                          : "bg-gray-600 text-gray-500 cursor-not-allowed"
                      )}
                      aria-label="Send message"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {isNavExpanded && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50" />
      )}
    </div>
  );
}
