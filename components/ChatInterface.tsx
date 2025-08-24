"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mic, Paperclip, Square } from "lucide-react";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // TODO: Implement actual chat API call
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm a placeholder response. The chat functionality needs to be implemented.",
        timestamp: new Date()
      };

      setTimeout(() => {
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Chat error:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#212121]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p>Start a conversation...</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-[#6366f1] text-white'
                    : 'bg-[#2f2f2f] text-white'
                }`}
              >
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#2f2f2f] text-white rounded-lg p-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[#2f2f2f]">
        <form onSubmit={handleSubmit} className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="resize-none bg-[#2f2f2f] border-[#404040] text-white placeholder:text-gray-400 focus:border-[#6366f1] min-h-[44px] max-h-32"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
          </div>
          <div className="flex space-x-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white hover:bg-[#2f2f2f]"
              disabled={isLoading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white hover:bg-[#2f2f2f]"
              disabled={isLoading}
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Button
              type="submit"
              size="icon"
              className="bg-[#6366f1] hover:bg-[#5855eb] text-white"
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? <Square className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}