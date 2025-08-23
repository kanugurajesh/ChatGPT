"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Upload, FileText, Image as ImageIcon, File, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface FileUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesSelected: (files: FileAttachment[], message?: string) => void;
  chatId?: string;
  messageId?: string;
}

interface FileAttachment {
  type: 'file';
  mediaType: string;
  url: string;
  name: string;
  size: number;
}

export function FileUploadDialog({ isOpen, onClose, onFilesSelected, chatId, messageId }: FileUploadDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supportedFormats = {
    images: ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
    documents: ['.pdf', '.txt', '.docx', '.doc'],
    other: ['.csv', '.json', '.xml']
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImageFile = (file: File) => {
    return file.type.startsWith('image/');
  };

  const isPdfFile = (file: File) => {
    return file.type === 'application/pdf';
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      setSelectedFiles(prev => [...prev, ...fileArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files) {
      const fileArray = Array.from(files);
      setSelectedFiles(prev => [...prev, ...fileArray]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const uploadToCloudinary = async (file: File): Promise<{url: string, fileId: string, metadata: any}> => {
    const formData = new FormData();
    formData.append('file', file);
    if (chatId) formData.append('chatId', chatId);
    if (messageId) formData.append('messageId', messageId);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload file');
    }
    
    const data = await response.json();
    return {
      url: data.url,
      fileId: data.fileId,
      metadata: data.metadata
    };
  };

  const handleSend = async () => {
    if (selectedFiles.length === 0) return;
    
    setIsUploading(true);
    try {
      const uploadPromises = selectedFiles.map(async (file) => {
        const result = await uploadToCloudinary(file);
        return {
          type: 'file' as const,
          mediaType: file.type,
          url: result.url,
          name: file.name,
          size: file.size,
          fileId: result.fileId,
          metadata: result.metadata
        };
      });

      const attachments = await Promise.all(uploadPromises);
      onFilesSelected(attachments, message.trim() || undefined);
      
      // Reset state
      setSelectedFiles([]);
      setMessage("");
      onClose();
    } catch (error) {
      console.error('Upload failed:', error);
      // Show user-friendly error
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (isImageFile(file)) return <ImageIcon className="h-8 w-8 text-blue-400" />;
    if (isPdfFile(file)) return <FileText className="h-8 w-8 text-red-400" />;
    return <File className="h-8 w-8 text-gray-400" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Dialog */}
      <div className="relative bg-[#2f2f2f] rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#404040]">
          <h2 className="text-lg font-semibold text-white">Upload Files</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-[#404040]"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-gray-500 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-white font-medium mb-2">Drop files here or click to browse</p>
            <p className="text-sm text-gray-400">
              Supports: Images (PNG, JPG, WEBP), Documents (PDF, TXT, DOCX), and more
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.docx,.doc,.csv,.json,.xml"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Selected files list */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              <h3 className="text-sm font-medium text-white">Selected Files:</h3>
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-[#404040] rounded-lg">
                  {getFileIcon(file)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                  </div>
                  {isImageFile(file) && (
                    <div className="w-12 h-12 rounded overflow-hidden bg-gray-600">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                    className="text-gray-400 hover:text-white hover:bg-[#2f2f2f] h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Message input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Message (optional)</label>
            <Input
              placeholder="Add a message about these files..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-[#404040] border-none text-white placeholder-gray-400 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t border-[#404040]">
          <div className="text-sm text-gray-400">
            {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="text-gray-300 border-gray-600 hover:bg-[#404040]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={selectedFiles.length === 0 || isUploading}
              className="bg-white text-black hover:bg-gray-200 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Send Files'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}