"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Edit3, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileAttachment {
  type: "file";
  mediaType: string;
  url: string;
  name: string;
  size: number;
}

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  timestamp: Date;
  isEditing?: boolean;
  attachments?: FileAttachment[];
  metadata?: {
    model?: string;
    tokens?: number;
    imageGenerated?: boolean;
    regenerated?: boolean;
    isStreaming?: boolean;
    editHistory?: Array<{
      content: string;
      timestamp: Date;
    }>;
  };
}

interface UserMessageProps {
  message: Message;
  editingMessageId: string | null;
  editContent: string;
  isEditingSave: boolean;
  copiedMessageId: string | null;
  isSavingToMongoDB: boolean;
  onEditMessage: (messageId: string, content: string) => void;
  onSaveEdit: (messageId: string) => void;
  onCancelEdit: () => void;
  onCopyToClipboard: (text: string, messageId: string) => void;
  onEditContentChange: (content: string) => void;
}

export function UserMessage({
  message,
  editingMessageId,
  editContent,
  isEditingSave,
  copiedMessageId,
  isSavingToMongoDB,
  onEditMessage,
  onSaveEdit,
  onCancelEdit,
  onCopyToClipboard,
  onEditContentChange,
}: UserMessageProps) {
  return (
    <div className="flex flex-col items-end mb-6 group">
      <div
        className={cn(
          "bg-[#2f2f2f] text-white rounded-3xl p-3 text-base relative",
          editingMessageId === message.id && "w-full"
        )}
      >
        {editingMessageId === message.id ? (
          <div className="rounded-2xl p-2 w-full">
            <Textarea
              value={editContent}
              onChange={(e) => onEditContentChange(e.target.value)}
              className="w-full bg-transparent border-none text-white placeholder-gray-400 resize-none min-h-[30px] max-h-[200px] focus:ring-0 focus:outline-none text-base p-1 mb-4"
              autoFocus
              placeholder="Edit your message..."
            />
            <div className="flex justify-end space-x-2">
              <Button
                onClick={onCancelEdit}
                disabled={isEditingSave}
                className="bg-black hover:bg-[#4a4b4a] text-white border-none rounded-full px-4 py-2 h-8 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </Button>
              <Button
                onClick={() => onSaveEdit(message.id)}
                disabled={isEditingSave}
                className="bg-white hover:bg-gray-100 text-black border-none rounded-full px-4 py-2 h-8 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEditingSave ? "Saving..." : "Send"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* File attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-3 space-y-2">
                {message.attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-[#404040] rounded-lg"
                  >
                    {attachment.mediaType.startsWith("image/") ? (
                      <div className="w-16 h-16 rounded overflow-hidden bg-gray-600">
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Replace with file icon on error
                            const imgElement = e.target as HTMLImageElement;
                            imgElement.style.display = "none";
                            const parent = imgElement.parentElement;
                            if (parent) {
                              parent.innerHTML =
                                '<div class="w-10 h-10 rounded bg-gray-600 flex items-center justify-center"><svg class="h-6 w-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></div>';
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-600 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {attachment.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {(attachment.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="whitespace-pre-wrap">{message.content}</div>
          </>
        )}
      </div>
      {/* Copy and Edit buttons for user messages - only visible on hover */}
      <div className="flex items-center mt-2 mr-2 space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          onClick={() => onCopyToClipboard(message.content, message.id)}
          className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg"
          size="icon"
        >
          {copiedMessageId === message.id ? (
            <span className="text-green-400 text-xs font-medium">✓</span>
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
        <Button
          onClick={() => onEditMessage(message.id, message.content)}
          disabled={isSavingToMongoDB}
          className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          size="icon"
          title={
            isSavingToMongoDB
              ? "Please wait for message to finish saving"
              : "Edit message"
          }
        >
          <Edit3 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}