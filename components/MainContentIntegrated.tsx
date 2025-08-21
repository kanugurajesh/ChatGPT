"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronDown, Mic, Cloud, ArrowUp, Copy, ThumbsUp, ThumbsDown,
  RefreshCw, MoreHorizontal, Edit3
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
  isNavExpanded, showImageView, currentImage, onCloseImageView, onSetImage, onNewChat
}: MainContentProps) {
  const [isTemporaryChat, setIsTemporaryChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const { isMobile, isSmallScreen } = useResponsive();

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function getContextMessages(msgArr: Message[]) {
    return msgArr.slice(-MAX_CONTEXT).map(m => ({
      role: m.role,
      content: m.content
    }));
  }

  // Streaming API call for AI message
  const handleSendMessage = async (content: string = inputValue) => {
    if (!content.trim()) return;
    setIsLoading(true);

    const newMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      role: "user",
      timestamp: new Date()
    };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInputValue("");

    // Stream from API
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: getContextMessages(updatedMessages) }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      let streamingText = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        streamingText += chunk;

        setMessages(msgs =>
          [...updatedMessages, {
            id: (Date.now() + 1).toString(),
            content: streamingText,
            role: "assistant",
            timestamp: new Date()
          }]
        );
      }
    } catch (err) {
      setMessages(msgs =>
        [...updatedMessages, {
          id: (Date.now() + 2).toString(),
          content: "Error getting response from Gemini.",
          role: "assistant",
          timestamp: new Date()
        }]
      );
    }
    setIsLoading(false);
  };

  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditContent(content);
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editContent.trim()) return;
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const updatedMessages = messages.slice(0, messageIndex + 1);
    updatedMessages[messageIndex] = {
      ...messages[messageIndex],
      content: editContent.trim()
    };
    setMessages(updatedMessages);
    setEditingMessageId(null);
    setEditContent("");

    if (messages[messageIndex].role === "user") {
      setIsLoading(true);
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: getContextMessages(updatedMessages) }),
        });

        const reader = response.body.getReader();
        let streamingText = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = new TextDecoder().decode(value);
          streamingText += chunk;
          setMessages(msgs =>
            [...updatedMessages, {
              id: (Date.now() + 3).toString(),
              content: streamingText,
              role: "assistant",
              timestamp: new Date()
            }]
          );
        }
      } catch (err) {
        setMessages(msgs =>
          [...updatedMessages, {
            id: (Date.now() + 4).toString(),
            content: "Error getting response from Gemini.",
            role: "assistant",
            timestamp: new Date()
          }]
        );
      }
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleRegenerateResponse = async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;
    const updatedMessages = messages.slice(0, messageIndex);
    setMessages(updatedMessages);
    setIsLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: getContextMessages(updatedMessages) }),
      });

      const reader = response.body.getReader();
      let streamingText = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        streamingText += chunk;
        setMessages(msgs =>
          [...updatedMessages, {
            id: (Date.now() + 5).toString(),
            content: streamingText,
            role: "assistant",
            timestamp: new Date()
          }]
        );
      }
    } catch (err) {
      setMessages(msgs =>
        [...updatedMessages, {
          id: (Date.now() + 6).toString(),
          content: "Error getting response from Gemini.",
          role: "assistant",
          timestamp: new Date()
        }]
      );
    }
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setInputValue(textarea.value);
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const copyToClipboard = async (text: string) => {
    try { await navigator.clipboard.writeText(text); }
    catch (err) { console.error('Failed to copy text: ', err); }
  };

  const resetChat = () => {
    setMessages([]);
    setInputValue("");
    setIsLoading(false);
    setEditingMessageId(null);
    setEditContent("");
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
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
        <>
          <div className="flex flex-col h-full relative pt-2">
            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  {isTemporaryChat ? (
                    <>
                      <div className="font-bold">Temporary Chat</div>
                      <div className="text-xs text-muted-foreground bg-gray-900 rounded p-1 my-2">
                        This chat won't appear in history, use or update memory, or be used to train models. For safety purposes, we may keep a copy for 30 days.
                      </div>
                    </>
                  ) : (
                    <div className="font-bold">Ready when you are.</div>
                  )}
                  <Textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="I can help you with coding, writing, analysis, math, and much more."
                    minRows={2}
                    className="min-h-20 bg-[#2f2f2f] border-[#404040] text-white resize-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={() => handleSendMessage()}
                    disabled={!inputValue.trim() || isLoading}
                    size="icon"
                    className={cn(
                      "mb-1 w-8 h-8 rounded-full transition-all",
                      inputValue.trim() && !isLoading
                        ? "bg-white text-black hover:bg-gray-200"
                        : "bg-gray-600 text-gray-400 cursor-not-allowed"
                    )}
                    aria-label="Send message"
                  >
                    <ArrowUp />
                  </Button>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id}>
                    <div>{message.role === 'user' ? "R" : null}</div>
                    <div className="font-bold">{message.role === 'user' ? 'You' : 'Gemini'}</div>
                    {editingMessageId === message.id ? (
                      <>
                        <Textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          className="min-h-20 bg-[#2f2f2f] border-[#404040] text-white resize-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          autoFocus
                        />
                        <Button
                          onClick={() => handleSaveEdit(message.id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >Save &amp; Submit</Button>
                        <Button onClick={handleCancelEdit}>Cancel</Button>
                      </>
                    ) : (
                      <div>{message.content}</div>
                    )}
                    {editingMessageId !== message.id && (
                      <Button
                        onClick={() => copyToClipboard(message.content)}
                        className="h-8 px-2 text-gray-400 hover:text-white hover:bg-[#2f2f2f]"
                        aria-label="Copy message"
                      ><Copy /></Button>
                    )}
                    {message.role === 'user' && (
                      <Button
                        onClick={() => handleEditMessage(message.id, message.content)}
                        className="h-8 px-2 text-gray-400 hover:text-white hover:bg-[#2f2f2f]"
                        aria-label="Edit message"
                      ><Edit3 /></Button>
                    )}
                    {message.role === 'assistant' && (
                      <Button
                        onClick={() => handleRegenerateResponse(message.id)}
                        className="h-8 px-2 text-gray-400 hover:text-white hover:bg-[#2f2f2f]"
                        aria-label="Regenerate response"
                      ><RefreshCw /></Button>
                    )}
                  </div>
                ))
              )}
              {isLoading && (
                <div className="text-blue-600 font-bold">Gemini is typing...</div>
              )}
              <div ref={messagesEndRef} />
            </div>
            {messages.length > 0 && (
              <div className="flex items-center border-t p-2 bg-black">
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  minRows={2}
                  className="min-h-20 bg-[#2f2f2f] border-[#404040] text-white resize-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                />
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isLoading}
                  size="icon"
                  className={cn(
                    "mb-1 w-8 h-8 rounded-full transition-all",
                    inputValue.trim() && !isLoading
                      ? "bg-white text-black hover:bg-gray-200"
                      : "bg-gray-600 text-gray-400 cursor-not-allowed"
                  )}
                  aria-label="Send message"
                >
                  <ArrowUp />
                </Button>
              </div>
            )}
          </div>
        </>
      )}
      {isNavExpanded && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50" />
      )}
    </div>
  );
}
