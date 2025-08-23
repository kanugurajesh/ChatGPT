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
  ThumbsUp,
  ThumbsDown,
  Share,
  MoreHorizontal,
  Download,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageGenerationView } from "./ImageGenerationView";
import { ChatHeader } from "./ChatHeader";
import { FileUploadDialog } from "./FileUploadDialog";
import { useResponsive } from "@/hooks/use-responsive";
import { sessionManager } from "@/lib/session";
import { useUser } from "@clerk/nextjs";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface FileAttachment {
  type: 'file';
  mediaType: string;
  url: string;
  name: string;
  size: number;
}

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  isEditing?: boolean;
  attachments?: FileAttachment[];
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
  const [selectedModel, setSelectedModel] = useState("chatgpt");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [userId, setUserId] = useState<string>('default_user');
  const [isStoringMemory, setIsStoringMemory] = useState(false);
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { isMobile } = useResponsive();
  const { user, isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Initialize user ID - use Clerk user ID if authenticated, otherwise session ID
    if (isLoaded) {
      if (isSignedIn && user?.id) {
        setUserId(user.id);
      } else if (typeof window !== 'undefined') {
        const sessionId = sessionManager.getOrCreateSession();
        setUserId(sessionId);
      }
    }
  }, [user, isSignedIn, isLoaded]);

  function getContextMessages(msgArr: Message[]) {
    return msgArr.slice(-MAX_CONTEXT).map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }

  // Handle file uploads
  const handleFilesSelected = async (attachments: FileAttachment[], messageText?: string) => {
    let content = messageText;
    
    if (!content) {
      // Auto-generate prompt based on file types
      const imageFiles = attachments.filter(f => f.mediaType.startsWith('image/'));
      const documentFiles = attachments.filter(f => f.mediaType === 'application/pdf' || f.mediaType.includes('text') || f.mediaType.includes('document'));
      const otherFiles = attachments.filter(f => !f.mediaType.startsWith('image/') && !documentFiles.includes(f));
      
      if (imageFiles.length > 0 && documentFiles.length === 0 && otherFiles.length === 0) {
        content = imageFiles.length === 1 
          ? "What do you see in this image? Please describe it in detail."
          : "What do you see in these images? Please describe each one.";
      } else if (documentFiles.length > 0 && imageFiles.length === 0 && otherFiles.length === 0) {
        content = documentFiles.length === 1
          ? "Please analyze this document and tell me what it contains. Summarize the key points."
          : "Please analyze these documents and tell me what they contain. Summarize the key points from each.";
      } else {
        content = "Please analyze these files and tell me what they contain. Provide insights about each file.";
      }
    }
    
    await handleSendMessage(content, attachments);
  };

  // Streaming API call
  const handleSendMessage = async (content: string = inputValue, attachments?: FileAttachment[]) => {
    if (!content.trim() && !attachments?.length) return;
    setIsLoading(true);

    const newMessage: Message = {
      id: crypto.randomUUID(),
      content: content.trim(),
      role: "user",
      timestamp: new Date(),
      attachments: attachments,
    };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInputValue("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: getContextMessages(updatedMessages),
          userId: userId,
          attachments: attachments
        }),
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

      // Store memory after conversation is complete (only for authenticated users)
      if (isSignedIn && user?.id && streamingText.trim()) {
        setIsStoringMemory(true);
        const conversationToStore = [
          { role: "user", content: content.trim() },
          { role: "assistant", content: streamingText.trim() }
        ];
        
        console.log('Storing conversation memory:', conversationToStore);
        
        try {
          const memoryResponse = await fetch('/api/memory/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              messages: conversationToStore,
              metadata: { timestamp: new Date().toISOString() }
            })
          });
          
          if (memoryResponse.ok) {
            console.log('Memory stored successfully');
          } else {
            const errorData = await memoryResponse.json().catch(() => ({}));
            console.error('Failed to store memory:', memoryResponse.status, errorData);
          }
        } catch (error) {
          console.error('Error storing memory:', error);
        } finally {
          setIsStoringMemory(false);
        }
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

  const handleTemporaryChatToggle = (enabled: boolean) => {
    setIsTemporaryChat(enabled);
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
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
        <div className="flex flex-col h-full relative w-[800px]">
          {/* Chat Header */}
          <div className="flex items-center justify-between">
            <ChatHeader
              isTemporaryChat={isTemporaryChat}
              onTemporaryChatToggle={handleTemporaryChatToggle}
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
            />
          </div>
          
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
                  <div className="px-6 w-full max-w-4xl">
                    <div className="relative bg-[#2A2A2A] rounded-3xl border border-gray-700 flex items-center">
                      <Button
                        onClick={() => setIsFileDialogOpen(true)}
                        className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg ml-3"
                        size="icon"
                      >
                        <Plus className="w-5 h-5" />
                      </Button>
                      <Textarea
                        ref={textareaRef}
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
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
                        <Button
                          onClick={() => handleSendMessage()}
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
                      </div>
                    </div>
                    
                    {/* Status indicator */}
                    <div className="text-center mt-3 text-xs text-gray-500">
                      {isSignedIn ? (
                        <div className="flex items-center justify-center gap-2">
                          <span>✓ Signed in as {user?.firstName || 'User'}</span>
                          {isStoringMemory && <span>• Saving memory...</span>}
                        </div>
                      ) : (
                        <span>Guest mode - Sign in to save memories</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Messages
              <div className="flex justify-center w-full mt-2">
                <div className="w-full max-w-4xl px-4 py-6">
                  {messages.map((message) => (
                    <div key={message.id} className="mb-8">
                      {message.role === "user" ? (
                        // User message - right aligned pill
                        <div className="flex flex-col items-end mb-6 group">
                          <div className="bg-[#2f2f2f] text-white rounded-3xl px-5 py-3 max-w-[80%] text-base relative">
                            {editingMessageId === message.id ? (
                              <div className="relative bg-[#2A2A2A] rounded-3xl border border-gray-700 p-0 min-w-[500px]">
                                <Textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="w-full bg-transparent border-none text-white placeholder-gray-400 resize-none min-h-[60px] max-h-[200px] focus:ring-0 focus:outline-none text-base p-4 pr-24"
                                  autoFocus
                                  placeholder="Edit your message..."
                                />
                                <div className="absolute bottom-3 right-3 flex space-x-2">
                                  <Button
                                    onClick={handleCancelEdit}
                                    variant="outline"
                                    size="sm"
                                    className="text-gray-400 border-gray-600 hover:bg-gray-700 hover:text-white bg-gray-800 rounded-lg"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={() => handleSaveEdit(message.id)}
                                    size="sm"
                                    className="bg-white text-black hover:bg-gray-200 rounded-lg"
                                  >
                                    Send
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* File attachments */}
                                {message.attachments && message.attachments.length > 0 && (
                                  <div className="mb-3 space-y-2">
                                    {message.attachments.map((attachment, index) => (
                                      <div key={index} className="flex items-center gap-2 p-2 bg-[#404040] rounded-lg">
                                        {attachment.mediaType.startsWith('image/') ? (
                                          <div className="w-16 h-16 rounded overflow-hidden bg-gray-600">
                                            <img
                                              src={attachment.url}
                                              alt={attachment.name}
                                              className="w-full h-full object-cover"
                                            />
                                          </div>
                                        ) : (
                                          <div className="w-10 h-10 rounded bg-gray-600 flex items-center justify-center">
                                            <FileText className="h-6 w-6 text-gray-300" />
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-white truncate">{attachment.name}</p>
                                          <p className="text-xs text-gray-400">{(attachment.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="whitespace-pre-wrap">
                                  {message.content}
                                </div>
                              </>
                            )}
                          </div>
                          {/* Copy and Edit buttons for user messages - only visible on hover */}
                          <div className="flex items-center mt-2 mr-2 space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              onClick={() => copyToClipboard(message.content)}
                              className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg"
                              size="icon"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleEditMessage(message.id, message.content)}
                              className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg"
                              size="icon"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // AI message - left aligned with buttons
                        <div className="flex flex-col">
                          <div className="text-white text-base leading-relaxed mb-3">
                            <div className="prose prose-invert max-w-none">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeHighlight]}
                                components={{
                                  code: ({ node, inline, className, children, ...props }) => {
                                    const match = /language-(\w+)/.exec(className || '');
                                    return !inline && match ? (
                                      <pre className="bg-gray-800 rounded-lg p-4 overflow-x-auto">
                                        <code className={className} {...props}>
                                          {children}
                                        </code>
                                      </pre>
                                    ) : (
                                      <code className="bg-gray-800 px-2 py-1 rounded text-sm" {...props}>
                                        {children}
                                      </code>
                                    );
                                  },
                                  pre: ({ children }) => <div>{children}</div>,
                                  p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                                  ul: ({ children }) => <ul className="list-disc pl-6 mb-4">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal pl-6 mb-4">{children}</ol>,
                                  li: ({ children }) => <li className="mb-2">{children}</li>,
                                  blockquote: ({ children }) => (
                                    <blockquote className="border-l-4 border-gray-600 pl-4 italic text-gray-300 mb-4">
                                      {children}
                                    </blockquote>
                                  ),
                                  h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
                                  h2: ({ children }) => <h2 className="text-xl font-bold mb-3">{children}</h2>,
                                  h3: ({ children }) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
                                  table: ({ children }) => (
                                    <div className="overflow-x-auto mb-4">
                                      <table className="min-w-full border border-gray-600">{children}</table>
                                    </div>
                                  ),
                                  th: ({ children }) => (
                                    <th className="border border-gray-600 px-4 py-2 bg-gray-800 font-bold text-left">{children}</th>
                                  ),
                                  td: ({ children }) => (
                                    <td className="border border-gray-600 px-4 py-2">{children}</td>
                                  ),
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          </div>
                          
                          {/* Action buttons for AI responses */}
                          <div className="flex items-center space-x-2 ml-0">
                            <Button
                              onClick={() => copyToClipboard(message.content)}
                              className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg"
                              size="icon"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg"
                              size="icon"
                            >
                              <ThumbsUp className="w-4 h-4" />
                            </Button>
                            <Button
                              className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg"
                              size="icon"
                            >
                              <ThumbsDown className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleRegenerateResponse(message.id)}
                              className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg"
                              size="icon"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                            <Button
                              className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg"
                              size="icon"
                            >
                              <Share className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
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
            <div className="bg-[#212121] sticky bottom-0 z-10">
              <div className="flex justify-center w-full">
                <div className="w-full max-w-4xl px-4 py-4">
                  <div className="relative bg-[#2A2A2A] rounded-3xl border border-gray-700 flex items-center">
                    <Button
                      onClick={() => setIsFileDialogOpen(true)}
                      className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg ml-3"
                      size="icon"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                    <Textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
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
                      <Button
                        onClick={() => handleSendMessage()}
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
                    </div>
                  </div>
                  
                  {/* Status indicator */}
                  <div className="text-center mt-3 text-xs text-gray-500">
                    {isSignedIn ? (
                      <div className="flex items-center justify-center gap-2">
                        <span>✓ Signed in as {user?.firstName || 'User'}</span>
                        {isStoringMemory && <span>• Saving memory...</span>}
                      </div>
                    ) : (
                      <span>Guest mode - Sign in to save memories</span>
                    )}
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
      
      {/* File Upload Dialog */}
      <FileUploadDialog
        isOpen={isFileDialogOpen}
        onClose={() => setIsFileDialogOpen(false)}
        onFilesSelected={handleFilesSelected}
      />
    </div>
  );
}
