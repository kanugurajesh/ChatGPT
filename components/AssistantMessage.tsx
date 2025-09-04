"use client";

import { Button } from "@/components/ui/button";
import {
  Copy,
  RefreshCw,
  Share,
  ThumbsUp,
  ThumbsDown,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { ImageSkeleton } from "./ui/image-skeleton";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  timestamp: Date;
  isEditing?: boolean;
  attachments?: any[];
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

interface AssistantMessageProps {
  message: Message;
  isStreaming: boolean;
  isLoading: boolean;
  copiedMessageId: string | null;
  likedMessages: Set<string>;
  dislikedMessages: Set<string>;
  generatingImageMessageIds: Set<string>;
  generatedImages: { [messageId: string]: { url: string; publicId: string } };
  onCopyToClipboard: (text: string, messageId: string) => void;
  onLikeMessage: (messageId: string) => void;
  onDislikeMessage: (messageId: string) => void;
  onRegenerateResponse: (messageId: string) => void;
  onSetImage: (image: string | null) => void;
}

export function AssistantMessage({
  message,
  isStreaming,
  isLoading,
  copiedMessageId,
  likedMessages,
  dislikedMessages,
  generatingImageMessageIds,
  generatedImages,
  onCopyToClipboard,
  onLikeMessage,
  onDislikeMessage,
  onRegenerateResponse,
  onSetImage,
}: AssistantMessageProps) {
  // Debug logs
  console.log('AssistantMessage render:', {
    messageId: message.id,
    hasGeneratingId: generatingImageMessageIds.has(message.id),
    hasGeneratedImage: !!generatedImages[message.id],
    generatedImage: generatedImages[message.id],
    allGeneratedImages: Object.keys(generatedImages)
  });

  return (
    <div className="flex flex-col">
      
      {/* Display image skeleton while generating or generated image if available */}
      {(generatingImageMessageIds.has(message.id) ||
        generatedImages[message.id]) && (
        <div className="mb-4">
          {generatingImageMessageIds.has(message.id) ? (
            // Show skeleton while generating
            <ImageSkeleton />
          ) : generatedImages[message.id] ? (
            // Show generated image
            <>
              {(() => {
                console.log('Rendering image div for:', message.id, generatedImages[message.id]);
                return null;
              })()}
              <div className="bg-gray-900 rounded-lg p-4 max-w-lg">
                <img
                  src={generatedImages[message.id].url}
                  alt="Generated image"
                  className="w-full h-auto rounded-lg"
                  onLoad={() => console.log('Image loaded successfully:', generatedImages[message.id].url)}
                  onError={(e) => {
                    console.error('Image load error:', e, generatedImages[message.id].url);
                    // Hide the broken image
                    (e.target as HTMLImageElement).style.display = "none";
                    // Show error message
                    const errorDiv = document.createElement("div");
                    errorDiv.className =
                      "text-red-400 text-sm p-2 bg-red-900/20 rounded";
                    errorDiv.textContent = "Image failed to load";
                    (e.target as HTMLImageElement).parentNode?.appendChild(
                      errorDiv
                    );
                  }}
                onClick={() => {
                  onSetImage(generatedImages[message.id].url);
                }}
                style={{ cursor: "pointer" }}
              />
              <div className="mt-2 flex justify-end">
                <Button
                  onClick={async () => {
                    try {
                      const imageUrl = generatedImages[message.id].url;
                      const response = await fetch(imageUrl);
                      const blob = await response.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `generated-image-${Date.now()}.png`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    } catch (error) {
                      console.error("Failed to download image:", error);
                    }
                  }}
                  className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg"
                  size="icon"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
            </>
          ) : (
            <>
              {console.log('NOT rendering image - conditions:', {
                hasGeneratingId: generatingImageMessageIds.has(message.id),
                hasGeneratedImage: !!generatedImages[message.id],
                generatedImage: generatedImages[message.id]
              })}
            </>
          )}
        </div>
      )}

      <div className="text-white text-base leading-relaxed mb-3">
        {/* Show streaming indicator if message is being streamed */}
        {message.metadata?.isStreaming && !message.content.trim() && (
          <div className="flex items-center justify-start py-4">
            <div className="relative flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-full animate-ping opacity-75"></div>
              <div className="absolute w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>
        )}
        
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              code: ({ node, className, children, ...props }: any) => {
                const inline = !className;
                const match = /language-(\w+)/.exec(className || "");
                return !inline && match ? (
                  <pre className="bg-gray-800 rounded-lg p-4 overflow-x-auto">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                ) : (
                  <code
                    className="bg-gray-800 px-2 py-1 rounded text-sm"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => <div>{children}</div>,
              p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
              ul: ({ children }) => (
                <ul className="list-disc pl-6 mb-4">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-6 mb-4">{children}</ol>
              ),
              li: ({ children }) => <li className="mb-2">{children}</li>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-gray-600 pl-4 italic text-gray-300 mb-4">
                  {children}
                </blockquote>
              ),
              h1: ({ children }) => (
                <h1 className="text-2xl font-bold mb-4">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl font-bold mb-3">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg font-bold mb-2">{children}</h3>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto mb-4">
                  <table className="min-w-full border border-gray-600">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-gray-600 px-4 py-2 bg-gray-800 font-bold text-left">
                  {children}
                </th>
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

      {/* Action buttons for AI responses - only show when response is complete */}
      {!isStreaming && !isLoading && message.content.trim() && (
        <div className="flex items-center space-x-2 ml-0">
          <Button
            onClick={() => onCopyToClipboard(message.content, message.id)}
            className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-all duration-200"
            size="icon"
          >
            {copiedMessageId === message.id ? (
              <span className="text-green-400 text-xs font-medium animate-pulse">
                ✓
              </span>
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
          <Button
            onClick={() => onLikeMessage(message.id)}
            className={cn(
              "h-8 w-8 p-0 bg-transparent hover:bg-gray-700 rounded-lg transition-all duration-200 transform hover:scale-110",
              likedMessages.has(message.id)
                ? "text-blue-400 hover:text-blue-300"
                : "text-gray-400 hover:text-white"
            )}
            size="icon"
          >
            <ThumbsUp
              className={cn(
                "w-4 h-4 transition-all duration-200",
                likedMessages.has(message.id) && "animate-bounce"
              )}
            />
          </Button>
          <Button
            onClick={() => onDislikeMessage(message.id)}
            className={cn(
              "h-8 w-8 p-0 bg-transparent hover:bg-gray-700 rounded-lg transition-all duration-200 transform hover:scale-110",
              dislikedMessages.has(message.id)
                ? "text-red-400 hover:text-red-300"
                : "text-gray-400 hover:text-white"
            )}
            size="icon"
          >
            <ThumbsDown
              className={cn(
                "w-4 h-4 transition-all duration-200",
                dislikedMessages.has(message.id) && "animate-bounce"
              )}
            />
          </Button>
          <Button
            onClick={() => onRegenerateResponse(message.id)}
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
      )}
    </div>
  );
}