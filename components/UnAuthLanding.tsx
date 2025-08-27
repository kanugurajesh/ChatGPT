"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Paperclip, Search, BookOpen } from "lucide-react";
import { UnAuthHeader } from "./UnAuthHeader";
import { UnAuthFooter } from "./UnAuthFooter";
import { useToast } from "@/components/ui/use-toast";

export function UnAuthLanding() {
  const [inputValue, setInputValue] = useState("");
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      toast({
        title: "Please log in",
        description: "You need to log in to send messages.",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#212121] text-white">
      {/* Header */}
      <UnAuthHeader />

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        {/* ChatGPT Title */}
        <div className="mb-16">
          <h1 className="text-5xl font-normal text-white text-center tracking-tight">
            ChatGPT
          </h1>
        </div>

        {/* Input Container */}
        <div className="w-full max-w-3xl">
          {/* Main Input Area */}
          <div className="relative mb-4">
            <Textarea
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Ask anything"
              className="w-full bg-[#2f2f2f] border border-[#2f2f2f] text-white placeholder-gray-400 resize-none min-h-[100px] max-h-[200px] text-base py-4 pl-6 pr-16 rounded-3xl focus:outline-none focus:ring-0 focus:shadow-none focus:border-[#2f2f2f]"
              style={{ height: "60px", boxShadow: "none" }}
            />

            {/* Send Button - Positioned inside input on right */}
            <div className="absolute right-3 bottom-3">
              <Button
                disabled={!inputValue.trim()}
                onClick={handleSendMessage}
                size="icon"
                className={`w-8 h-8 rounded-full transition-all ${
                  inputValue.trim()
                    ? "bg-white text-black hover:bg-gray-200"
                    : "bg-gray-600 text-gray-500 cursor-not-allowed"
                }`}
                aria-label="Send message"
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center justify-start gap-3 ml-4 absolute top-14 left-0">
              <Button
                variant="ghost"
                size="sm"
                className="bg-transparent hover:bg-[#3A3A3A] text-gray-400 hover:text-white p-3 text-sm font-medium transition-colors flex items-center gap-2 border-[1px] border-gray-500 rounded-2xl"
              >
                <Paperclip className="w-4 h-4" />
                Attach
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="bg-transparent hover:bg-[#3A3A3A] text-gray-400 hover:text-white p-3 text-sm font-medium transition-colors flex items-center gap-2 border-[1px] border-gray-500 rounded-2xl"
              >
                <Search className="w-4 h-4" />
                Search
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="bg-transparent hover:bg-[#3A3A3A] text-gray-400 hover:text-white p-3 text-sm font-medium transition-colors flex items-center gap-2 border-[1px] border-gray-500 rounded-2xl"
              >
                <BookOpen className="w-4 h-4" />
                Study
              </Button>
            </div>
          </div>

          {/* Action Buttons - Below input */}
        </div>
      </div>

      {/* Footer */}
      <UnAuthFooter />
    </div>
  );
}
