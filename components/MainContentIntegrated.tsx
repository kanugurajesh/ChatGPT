"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ChevronDown, Mic, Cloud, ArrowUp, Copy, ThumbsUp, ThumbsDown, RefreshCw, MoreHorizontal, Edit3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ImageGenerationView } from "./ImageGenerationView"
import { useResponsive } from "@/hooks/use-responsive"
import { useState, useRef, useEffect } from "react"

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  isEditing?: boolean
}

interface MainContentProps {
  isNavExpanded: boolean
  showImageView: boolean
  currentImage: string | null
  onCloseImageView: () => void
  onSetImage: (image: string | null) => void
  onNewChat: () => void
}

export function MainContent({ isNavExpanded, showImageView, currentImage, onCloseImageView, onSetImage, onNewChat }: MainContentProps) {
  const [isTemporaryChat, setIsTemporaryChat] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { isMobile, isSmallScreen } = useResponsive()

  const toggleTemporaryChat = () => {
    setIsTemporaryChat(!isTemporaryChat)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (content: string = inputValue) => {
    if (!content.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      role: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newMessage])
    setInputValue("")
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: `Hey! How's it going?`,
        role: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiResponse])
      setIsLoading(false)
    }, 1000)
  }

  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId)
    setEditContent(content)
  }

  const handleSaveEdit = async (messageId: string) => {
    if (!editContent.trim()) return

    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex === -1) return

    const updatedMessages = messages.slice(0, messageIndex + 1)
    updatedMessages[messageIndex] = {
      ...messages[messageIndex],
      content: editContent.trim()
    }

    setMessages(updatedMessages)
    setEditingMessageId(null)
    setEditContent("")

    if (messages[messageIndex].role === 'user') {
      setIsLoading(true)
      
      setTimeout(() => {
        const aiResponse: Message = {
          id: Date.now().toString(),
          content: `Hey! How's it going?`,
          role: 'assistant',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiResponse])
        setIsLoading(false)
      }, 1000)
    }
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditContent("")
  }

  const handleRegenerateResponse = (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex === -1) return

    const updatedMessages = messages.slice(0, messageIndex)
    setMessages(updatedMessages)
    setIsLoading(true)

    setTimeout(() => {
      const aiResponse: Message = {
        id: Date.now().toString(),
        content: `Hey! How's it going?`,
        role: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiResponse])
      setIsLoading(false)
    }, 1000)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target
    setInputValue(textarea.value)
    
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const resetChat = () => {
    setMessages([])
    setInputValue("")
    setIsLoading(false)
    setEditingMessageId(null)
    setEditContent("")
  }

  // Expose resetChat to parent
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).resetMainContentChat = resetChat
    }
  }, [])

  return (
    <div className={cn(
      "flex-1 flex flex-col transition-all duration-300 ease-out",
      isMobile ? "ml-0" : isNavExpanded ? "ml-0" : "ml-0"
    )}>
      {showImageView ? (
        /* Show Image Generation View */
        <ImageGenerationView 
          currentImage={currentImage}
          onClose={onCloseImageView}
          onSetImage={onSetImage}
        />
      ) : (
        <>
          {/* Top Header */}
          <header className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="text-white hover:bg-[#2f2f2f] font-medium px-3 py-2 h-auto text-lg">
                ChatGPT
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </div>

            <Button className="bg-[#6366f1] hover:bg-[#5855eb] text-white px-4 py-2 rounded-full text-sm font-medium">
              Upgrade to Go
            </Button>

            <div className="flex items-center gap-2">
              <Button
                onClick={toggleTemporaryChat}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-[#2f2f2f] rounded-lg p-2 h-auto w-auto"
                title={isTemporaryChat ? "Turn off temporary chat" : "Turn on temporary chat"}
              >
                <Cloud className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {messages.length === 0 ? (
              /* Empty State with Centered Input */
              <div className="flex-1 flex flex-col items-center justify-center px-6">
                <div className="w-full max-w-2xl space-y-8">
                  <div className="text-center">
                    {isTemporaryChat ? (
                      <>
                        <h1 className={cn(
                          "font-light text-white mb-4",
                          isMobile ? "text-2xl" : "text-4xl"
                        )}>Temporary Chat</h1>
                        <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
                          This chat won't appear in history, use or update ChatGPT's memory, 
                          or be used to train our models. For safety purposes, we may keep a 
                          copy of this chat for up to 30 days.
                        </p>
                      </>
                    ) : (
                      <h1 className={cn(
                        "font-light text-white mb-8",
                        isMobile ? "text-2xl" : "text-4xl"
                      )}>Ready when you are.</h1>
                    )}
                  </div>

                  {/* Centered Input */}
                  <div className="w-full">
                    <div className={cn(
                      "flex items-end bg-[#2f2f2f] rounded-3xl shadow-sm",
                      isMobile ? "px-3 py-2" : "px-4 py-3"
                    )}>
                      <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white transition-colors p-0 h-auto w-auto mr-3 mb-2">
                        <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center">
                          <span className="text-xs text-white font-light">+</span>
                        </div>
                      </Button>

                      <div className="flex-1 min-h-6 max-h-48">
                        <Textarea
                          ref={textareaRef}
                          value={inputValue}
                          onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                          placeholder="Ask anything"
                          className="min-h-6 max-h-48 border-0 bg-transparent text-white placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 text-base p-0 resize-none overflow-hidden"
                          rows={1}
                          aria-label="Type your message"
                        />
                      </div>

                      <div className="flex items-end gap-1 ml-3">
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white transition-colors p-0 h-auto w-auto mb-2">
                          <Mic className="h-5 w-5" />
                        </Button>
                        
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white transition-colors p-0 h-auto w-auto mb-2">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2a5 5 0 0 1 5 5v6a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z"/>
                            <path d="M19 10v3a7 7 0 0 1-14 0v-3"/>
                            <line x1="12" y1="19" x2="12" y2="23"/>
                            <line x1="8" y1="23" x2="16" y2="23"/>
                          </svg>
                        </Button>
                        
                        {inputValue.trim() && (
                          <Button 
                            onClick={() => handleSendMessage()}
                            disabled={!inputValue.trim() || isLoading}
                            size="icon" 
                            className={cn(
                              "mb-1 w-8 h-8 rounded-full transition-all",
                              "bg-white text-black hover:bg-gray-200"
                            )}
                            aria-label="Send message"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Chat Messages */
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto w-full">
                  {messages.map((message, index) => (
                    <div
                      key={message.id}
                      className={cn(
                        "group border-b border-[#2f2f2f] animate-fade-in transition-all duration-200 ease-in-out",
                        isMobile ? "px-4 py-4" : "px-6 py-6",
                        message.role === 'user' ? "bg-transparent" : "bg-[#171717]"
                      )}
                      role="article"
                      aria-label={`${message.role === 'user' ? 'Your' : 'ChatGPT'} message`}
                    >
                      <div className={cn(
                        "flex",
                        isMobile ? "gap-3" : "gap-4"
                      )}>
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {message.role === 'user' ? (
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-medium">R</span>
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
                                <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.078 6.078 0 0 0 6.529 2.9 5.973 5.973 0 0 0 4.258 1.786c1.638 0 3.185-.65 4.299-1.786a5.987 5.987 0 0 0 4.007-2.9 6.042 6.042 0 0 0-.75-7.094l.003-.003z"/>
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Message Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-white">
                              {message.role === 'user' ? 'You' : 'ChatGPT'}
                            </span>
                          </div>

                          {editingMessageId === message.id ? (
                            <div className="space-y-3">
                              <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="min-h-20 bg-[#2f2f2f] border-[#404040] text-white resize-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveEdit(message.id)}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  Save & Submit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleCancelEdit}
                                  className="text-gray-300 hover:text-white hover:bg-[#2f2f2f]"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="prose prose-invert max-w-none">
                              <p className="text-gray-100 leading-7 whitespace-pre-wrap">
                                {message.content}
                              </p>
                            </div>
                          )}

                          {/* Message Actions */}
                          {editingMessageId !== message.id && (
                            <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(message.content)}
                                className="h-8 px-2 text-gray-400 hover:text-white hover:bg-[#2f2f2f]"
                                aria-label="Copy message"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>

                              {message.role === 'user' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditMessage(message.id, message.content)}
                                  className="h-8 px-2 text-gray-400 hover:text-white hover:bg-[#2f2f2f]"
                                  aria-label="Edit message"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              )}

                              {message.role === 'assistant' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRegenerateResponse(message.id)}
                                    className="h-8 px-2 text-gray-400 hover:text-white hover:bg-[#2f2f2f]"
                                    aria-label="Regenerate response"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 px-2 text-gray-400 hover:text-white hover:bg-[#2f2f2f]"
                                    aria-label="Good response"
                                  >
                                    <ThumbsUp className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 px-2 text-gray-400 hover:text-white hover:bg-[#2f2f2f]"
                                    aria-label="Bad response"
                                  >
                                    <ThumbsDown className="h-4 w-4" />
                                  </Button>
                                </>
                              )}

                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-gray-400 hover:text-white hover:bg-[#2f2f2f]"
                                aria-label="More options"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {isLoading && (
                    <div className={cn(
                      "border-b border-[#2f2f2f] bg-[#171717] animate-fade-in",
                      isMobile ? "px-4 py-4" : "px-6 py-6"
                    )}>
                      <div className={cn(
                        "flex",
                        isMobile ? "gap-3" : "gap-4"
                      )}>
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
                            <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.078 6.078 0 0 0 6.529 2.9 5.973 5.973 0 0 0 4.258 1.786c1.638 0 3.185-.65 4.299-1.786a5.987 5.987 0 0 0 4.007-2.9 6.042 6.042 0 0 0-.75-7.094l.003-.003z"/>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-white">ChatGPT</span>
                          </div>
                          <div className="flex items-center gap-1" aria-label="ChatGPT is typing">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}

            {/* Input Area - Only show when messages exist */}
            {messages.length > 0 && (
              <div className={cn(
                "border-t border-[#2f2f2f]",
                isMobile ? "p-3" : "p-4"
              )}>
                <div className="max-w-4xl mx-auto">
                  <div className="relative">
                    <div className={cn(
                      "flex items-end bg-[#2f2f2f] rounded-3xl shadow-sm",
                      isMobile ? "px-3 py-2" : "px-4 py-3"
                    )}>
                      <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white transition-colors p-0 h-auto w-auto mr-3 mb-2">
                        <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center">
                          <span className="text-xs text-white font-light">+</span>
                        </div>
                      </Button>

                      <div className="flex-1 min-h-6 max-h-48">
                        <Textarea
                          value={inputValue}
                          onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                          placeholder="Message ChatGPT"
                          className="min-h-6 max-h-48 border-0 bg-transparent text-white placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 text-base p-0 resize-none overflow-hidden"
                          rows={1}
                          aria-label="Type your message"
                        />
                      </div>

                      <div className="flex items-end gap-1 ml-3">
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white transition-colors p-0 h-auto w-auto mb-2">
                          <Mic className="h-5 w-5" />
                        </Button>
                        
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
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Overlay when nav is expanded */}
      {isNavExpanded && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-30"
          style={{ left: '240px' }}
        />
      )}
    </div>
  )
}