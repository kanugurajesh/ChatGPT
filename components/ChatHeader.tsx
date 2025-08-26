"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, MessageCircle, Check } from "lucide-react";

interface ChatHeaderProps {
  isTemporaryChat: boolean;
  onTemporaryChatToggle: (enabled: boolean) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
}

const MODELS = [
  { id: "chatgpt-go", name: "ChatGPT Go", description: "Our smartest model & more" },
  { id: "chatgpt", name: "ChatGPT", description: "Great for everyday tasks" }
];

export function ChatHeader({ 
  isTemporaryChat, 
  onTemporaryChatToggle, 
  selectedModel, 
  onModelChange 
}: ChatHeaderProps) {
  return (
    <div className="flex w-full justify-between items-center p-4 bg-[#212121]">
      {/* Model Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="text-white hover:bg-gray-700 flex items-center space-x-2 text-lg font-medium"
          >
            <span>{MODELS.find(m => m.id === selectedModel)?.name || "ChatGPT"}</span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-[#2A2A2A] border-gray-600 text-white min-w-[280px]">
          {MODELS.map((model) => (
            <DropdownMenuItem
              key={model.id}
              onClick={() => onModelChange(model.id)}
              className="cursor-pointer hover:bg-gray-700 p-4 flex items-center justify-between"
            >
              <div className="flex flex-col">
                <span className="font-medium">{model.name}</span>
                <span className="text-sm text-gray-400">{model.description}</span>
              </div>
              {selectedModel === model.id && (
                <Check className="w-4 h-4 text-white" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Center - Upgrade to Go Button */}
      <Button
        variant="outline"
        className="bg-purple-600 hover:bg-purple-700 text-white border-purple-600 hover:border-purple-700 px-4 py-2 rounded-full text-sm font-medium"
      >
        Upgrade to Go
      </Button>

      {/* Temporary Chat Toggle */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => onTemporaryChatToggle(!isTemporaryChat)}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-gray-700 flex items-center space-x-2 px-3 py-2 rounded-lg"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent 
            side="bottom"
            className="bg-black text-white text-sm px-2 py-1 rounded"
          >
            {isTemporaryChat ? "Turn off temporary chat" : "Turn on temporary chat"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}