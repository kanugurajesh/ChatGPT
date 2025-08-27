"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditHistoryEntry {
  content: string;
  timestamp: Date;
}

interface MessageEditHistoryProps {
  editHistory: EditHistoryEntry[];
  className?: string;
}

export function MessageEditHistory({ editHistory, className }: MessageEditHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!editHistory || editHistory.length === 0) {
    return null;
  }

  const formatTimestamp = (timestamp: Date) => {
    // Ensure timestamp is a Date object
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    
    try {
      if (typeof Intl !== 'undefined' && Intl.RelativeTimeFormatter) {
        return new Intl.RelativeTimeFormatter('en', { numeric: 'auto' }).format(
          Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          'day'
        );
      }
    } catch {
      // Fall through to fallback
    }
    
    // Fallback implementation
    const now = Date.now();
    const diff = date.getTime() - now;
    const days = Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24));
    const hours = Math.floor(Math.abs(diff) / (1000 * 60 * 60));
    const minutes = Math.floor(Math.abs(diff) / (1000 * 60));
    
    if (days > 0) {
      return diff < 0 ? `${days} day${days !== 1 ? 's' : ''} ago` : `in ${days} day${days !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return diff < 0 ? `${hours} hour${hours !== 1 ? 's' : ''} ago` : `in ${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return diff < 0 ? `${minutes} minute${minutes !== 1 ? 's' : ''} ago` : `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      return 'just now';
    }
  };

  return (
    <div className={cn("mt-2", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-6 px-2 py-0 text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-700/50"
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 mr-1" />
        ) : (
          <ChevronRight className="w-3 h-3 mr-1" />
        )}
        <Clock className="w-3 h-3 mr-1" />
        {editHistory.length} edit{editHistory.length !== 1 ? 's' : ''}
      </Button>
      
      {isExpanded && (
        <div className="mt-2 space-y-2 border-l-2 border-gray-600 pl-3">
          {editHistory.map((edit, index) => (
            <div key={index} className="bg-gray-800/50 rounded p-2 text-sm">
              <div className="text-gray-400 text-xs mb-1">
                {formatTimestamp(edit.timestamp)}
              </div>
              <div className="text-gray-300 whitespace-pre-wrap">
                {edit.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}