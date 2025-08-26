"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Paperclip, Search, BookOpen } from "lucide-react";
import { UnAuthHeader } from "./UnAuthHeader";
import { UnAuthFooter } from "./UnAuthFooter";

export function UnAuthLanding() {
  const [inputValue, setInputValue] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
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
              placeholder="Ask anything"
              className="w-full bg-[#2f2f2f] border border-gray-600 text-white placeholder-gray-400 resize-none min-h-[60px] max-h-[200px] focus:ring-1 focus:ring-gray-500 focus:border-gray-500 text-base py-4 pl-6 pr-16 rounded-3xl"
              style={{ height: "60px" }}
            />
            
            {/* Send Button - Positioned inside input on right */}
            <div className="absolute right-3 bottom-3">
              <Button
                disabled={!inputValue.trim()}
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
          </div>

          {/* Action Buttons - Below input */}
          <div className="flex items-center justify-start gap-3 ml-4">
            <Button
              variant="ghost"
              size="sm"
              className="bg-transparent hover:bg-[#3A3A3A] text-gray-400 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Paperclip className="w-4 h-4" />
              Attach
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="bg-transparent hover:bg-[#3A3A3A] text-gray-400 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Search
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="bg-transparent hover:bg-[#3A3A3A] text-gray-400 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Study
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <UnAuthFooter />
    </div>
  );
}