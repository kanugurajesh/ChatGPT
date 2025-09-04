"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Edit3, RefreshCw } from "lucide-react";

interface MessageEditDialogProps {
  isOpen: boolean;
  messageContent: string;
  hasSubsequentMessages: boolean;
  onClose: () => void;
  onEditOnly: () => void;
  onEditAndRegenerate: () => void;
}

export function MessageEditDialog({
  isOpen,
  messageContent,
  hasSubsequentMessages,
  onClose,
  onEditOnly,
  onEditAndRegenerate,
}: MessageEditDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] border border-gray-600 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <Edit3 className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-medium text-white">Edit Message</h3>
        </div>

        <div className="mb-4">
          <p className="text-gray-300 text-sm mb-3">
            You're about to edit this message:
          </p>
          <div className="bg-[#2f2f2f] rounded-lg p-3 text-gray-200 text-sm max-h-24 overflow-y-auto">
            "{messageContent.slice(0, 150)}{messageContent.length > 150 ? '...' : ''}"
          </div>
        </div>

        {hasSubsequentMessages && (
          <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-medium text-sm">
                Subsequent Messages Found
              </span>
            </div>
            <p className="text-yellow-200 text-xs">
              There are messages after this one in the conversation. Choose how you want to handle them:
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={onEditOnly}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white justify-start gap-2 h-auto py-3 px-4"
          >
            <Edit3 className="w-4 h-4" />
            <div className="text-left">
              <div className="font-medium">Edit Only</div>
              <div className="text-xs opacity-80">
                Keep all responses and messages below unchanged
              </div>
            </div>
          </Button>

          {hasSubsequentMessages && (
            <Button
              onClick={onEditAndRegenerate}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 justify-start gap-2 h-auto py-3 px-4"
            >
              <RefreshCw className="w-4 h-4" />
              <div className="text-left">
                <div className="font-medium">Edit and Regenerate</div>
                <div className="text-xs opacity-80">
                  Remove all following messages and regenerate response
                </div>
              </div>
            </Button>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-600">
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-gray-400 hover:text-white hover:bg-gray-700"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}