"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Mic,
  ArrowUp,
  Copy,
  RefreshCw,
  Edit3,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Share,
  Download,
  FileText,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatHeader } from "./ChatHeader";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileUploadDialog } from "./FileUploadDialog";
import { useResponsive } from "@/hooks/use-responsive";
import { sessionManager } from "@/lib/session";
import { useUser } from "@clerk/nextjs";
import { useActiveChat } from "@/hooks/use-active-chat";
import { useChatHistory } from "@/hooks/use-chat-history";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { backgroundMemorySaver } from "@/lib/services/backgroundSaver";
import { ImageSkeleton } from "./ui/image-skeleton";

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
}

interface MainContentProps {
  isNavExpanded: boolean;
  showImageView: boolean;
  currentImage: string | null;
  onCloseImageView: () => void;
  onSetImage: (image: string | null) => void;
  onNewChat: () => void;
  activeChatId?: string;
  onChatCreated?: (chatId: string) => void;
  onToggle?: () => void;
}

const MAX_CONTEXT = 20;

// Function to detect if a prompt is requesting image generation
const isImageGenerationRequest = (text: string): boolean => {
  const lowerText = text.toLowerCase();

  // Check for explicit image generation requests
  const imagePatterns = [
    /generate.*image/,
    /create.*image/,
    /draw.*image/,
    /make.*image/,
    /generate.*picture/,
    /create.*picture/,
    /draw.*picture/,
    /make.*picture/,
    /generate.*photo/,
    /create.*photo/,
    /draw.*photo/,
    /make.*photo/,
    /generate.*illustration/,
    /create.*illustration/,
    /draw.*illustration/,
    /paint.*something/,
    /sketch.*something/,
    /render.*something/,
    /visualize.*something/,
    /show me.*image/,
    /create.*art/,
    /generate.*art/,
    /make.*art/,
    /draw.*art/,
  ];

  // Also check for simple keywords that commonly indicate image requests
  const simpleKeywords = ["paint", "sketch", "render", "visualize", "design"];

  // Check patterns first
  const hasImagePattern = imagePatterns.some((pattern) =>
    pattern.test(lowerText)
  );

  // Check simple keywords (but only if they seem to be the main action)
  const hasSimpleKeyword = simpleKeywords.some(
    (keyword) =>
      lowerText.startsWith(keyword) || lowerText.includes(` ${keyword} `)
  );

  return hasImagePattern || hasSimpleKeyword;
};

export function MainContent({
  isNavExpanded,
  showImageView,
  currentImage,
  onCloseImageView,
  onSetImage,
  activeChatId,
  onChatCreated,
  onToggle,
}: MainContentProps) {
  const [isTemporaryChat, setIsTemporaryChat] = useState(false);
  const [selectedModel, setSelectedModel] = useState("chatgpt");
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [userId, setUserId] = useState<string>("default_user");
  // Removed memory tracking states
  const [isSavingToMongoDB, setIsSavingToMongoDB] = useState(false);
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<{
    [messageId: string]: { url: string; publicId: string };
  }>({});
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatingImageMessageIds, setGeneratingImageMessageIds] = useState<
    Set<string>
  >(new Set());
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [likedMessages, setLikedMessages] = useState<Set<string>>(new Set());
  const [dislikedMessages, setDislikedMessages] = useState<Set<string>>(
    new Set()
  );
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { isMobile, useOverlayNav } = useResponsive();
  const { user, isSignedIn, isLoaded } = useUser();

  // MongoDB-powered chat management
  const {
    activeChat,
    isLoading: chatLoading,
    addMessage,
    createNewChat,
    updateTitle,
    generateTitle,
    loadChat,
    clearActiveChat,
  } = useActiveChat(activeChatId);
  const { fetchChatHistory } = useChatHistory();

  // Persistent message state - prioritizes local state over DB
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [shouldLoadFromDB, setShouldLoadFromDB] = useState(true);

  // Use local messages as the source of truth, only fall back to DB when needed
  const messages: Message[] =
    localMessages.length > 0 || !shouldLoadFromDB || isTemporaryChat
      ? localMessages
      : activeChat?.messages.map((msg) => ({
          id: msg.id,
          content: msg.content,
          role: msg.role,
          timestamp: msg.timestamp,
        })) || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load from DB when active chat changes or when there are no local messages
  useEffect(() => {
    if (activeChatId) {
      // Skip entire effect for temporary chats to avoid state interference
      if (activeChatId.startsWith("temp-")) {
        return;
      }

      // Always load the chat when activeChatId changes
      if (!activeChat || activeChat.id !== activeChatId) {
        // This is a persistent chat, disable temporary mode
        setIsTemporaryChat(false);
        // Reset local state when switching chats
        setLocalMessages([]);
        setShouldLoadFromDB(true);
        // Load from database
        loadChat(activeChatId);
      }

      // Load messages from activeChat into local state
      if (activeChat?.id === activeChatId && shouldLoadFromDB) {

        const dbMessages: Message[] = activeChat.messages.map((msg) => ({
          id: msg.id,
          content: msg.content,
          role: msg.role,
          timestamp: msg.timestamp,
          attachments: msg.attachments || [], // Provide default empty array
        }));

        // Method 1: Restore generated images from message metadata (existing approach)
        const restoredFromMetadata: {
          [messageId: string]: { url: string; publicId: string };
        } = {};
        let imageCountFromMetadata = 0;
        activeChat.messages.forEach((msg) => {
          if (msg.metadata?.generatedImage && msg.metadata.generatedImage.url) {
            restoredFromMetadata[msg.id] = {
              url: msg.metadata.generatedImage.url,
              publicId: msg.metadata.generatedImage.publicId,
            };
            imageCountFromMetadata++;
          }
        });

        // Method 2: Query GeneratedImage collection as fallback (new robust approach)
        const loadGeneratedImagesFromAPI = async () => {
          try {
            const response = await fetch(
              `/api/images/gallery?type=generated&chatId=${activeChatId}`
            );

            if (response.ok) {
              const data = await response.json();

              // Match generated images to assistant messages by messageId
              const restoredFromAPI: {
                [messageId: string]: { url: string; publicId: string };
              } = {};

              if (data.images && data.images.length > 0) {
                const assistantMessages = activeChat.messages.filter(
                  (m) => m.role === "assistant"
                );

                data.images.forEach((apiImage: any, index: number) => {
                  // Method 1: Match by messageId if available (for new images)
                  if (apiImage.messageId) {
                    restoredFromAPI[apiImage.messageId] = {
                      url: apiImage.cloudinaryUrl,
                      publicId: apiImage.cloudinaryPublicId,
                    };
                  }
                  // Method 2: Fallback to order-based matching for legacy images (temporary)
                  else if (assistantMessages[index]) {
                    const messageId = assistantMessages[index].id;
                    restoredFromAPI[messageId] = {
                      url: apiImage.cloudinaryUrl,
                      publicId: apiImage.cloudinaryPublicId,
                    };
                  } else {
                  }
                });
              }

              // Combine both methods - metadata takes precedence, API as fallback
              const combinedImages = {
                ...restoredFromAPI,
                ...restoredFromMetadata,
              };


              // Validate image URLs before setting state
              const validatedImages: {
                [messageId: string]: { url: string; publicId: string };
              } = {};
              const validationPromises = Object.entries(combinedImages).map(
                async ([messageId, imageData]) => {
                  try {
                    // Quick validation - just check if URL is a valid string and has expected format
                    if (
                      imageData.url &&
                      typeof imageData.url === "string" &&
                      imageData.url.startsWith("http")
                    ) {
                      validatedImages[messageId] = imageData;
                    } else {
                    }
                  } catch (error) {
                  }
                }
              );

              await Promise.allSettled(validationPromises);
              setGeneratedImages(validatedImages);
            } else {
              setGeneratedImages(restoredFromMetadata);
            }
          } catch (error) {
            setGeneratedImages(restoredFromMetadata);
          }
        };

        setLocalMessages(dbMessages);
        setShouldLoadFromDB(false);

        // Load generated images (async, won't block UI)
        loadGeneratedImagesFromAPI();
      }
    } else {
      // Reset for new chat - clear everything
      clearActiveChat();
      setInputValue("");
      setIsLoading(false);
      setEditingMessageId(null);
      setEditContent("");
      setIsStreaming(false);
      setLocalMessages([]);
      setShouldLoadFromDB(true);
      setIsSavingToMongoDB(false);
      setGeneratedImages({});
      setIsGeneratingImage(false);
      setGeneratingImageMessageIds(new Set());
    }
  }, [activeChatId, activeChat, shouldLoadFromDB, clearActiveChat]);

  useEffect(() => {
    // Initialize user ID - use Clerk user ID if authenticated, otherwise session ID
    if (isLoaded) {
      if (isSignedIn && user?.id) {
        setUserId(user.id);
      } else if (typeof window !== "undefined") {
        const sessionId = sessionManager.getOrCreateSession();
        setUserId(sessionId);
      }
    }
  }, [user, isSignedIn, isLoaded]);

  // Handle stopping the current request
  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);
      setIsStreaming(false);
      setIsGeneratingImage(false);
      setGeneratingImageMessageIds(new Set());
    }
  };

  // Handle file uploads
  const handleFilesSelected = async (
    attachments: FileAttachment[],
    messageText?: string
  ) => {
    let content = messageText;

    if (!content) {
      // Auto-generate prompt based on file types
      const imageFiles = attachments.filter((f) =>
        f.mediaType.startsWith("image/")
      );
      const documentFiles = attachments.filter(
        (f) =>
          f.mediaType === "application/pdf" ||
          f.mediaType.includes("text") ||
          f.mediaType.includes("document")
      );
      const otherFiles = attachments.filter(
        (f) => !f.mediaType.startsWith("image/") && !documentFiles.includes(f)
      );

      if (
        imageFiles.length > 0 &&
        documentFiles.length === 0 &&
        otherFiles.length === 0
      ) {
        content =
          imageFiles.length === 1
            ? "What do you see in this image? Please describe it in detail."
            : "What do you see in these images? Please describe each one.";
      } else if (
        documentFiles.length > 0 &&
        imageFiles.length === 0 &&
        otherFiles.length === 0
      ) {
        content =
          documentFiles.length === 1
            ? "Please analyze this document and tell me what it contains. Summarize the key points."
            : "Please analyze these documents and tell me what they contain. Summarize the key points from each.";
      } else {
        content =
          "Please analyze these files and tell me what they contain. Provide insights about each file.";
      }
    }

    await handleSendMessage(content, attachments);
  };

  // Image generation function
  const handleImageGeneration = async (
    prompt: string,
    chatId: string,
    messageId?: string
  ): Promise<{ url: string; publicId: string; imageId: string } | null> => {
    try {
      setIsGeneratingImage(true);


      const response = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          chatId: chatId, // Use the passed chatId parameter
          messageId: messageId,
          isTemporaryChat: isTemporaryChat,
        }),
        signal: abortController?.signal,
      });

      const result = await response.json();

      if (!response.ok) {
        return null;
      }

      if (result.success && result.imageUrl) {
        return {
          url: result.imageUrl,
          publicId: result.cloudinaryPublicId,
          imageId: result.imageId,
        };
      }

      return null;
    } catch (error) {
      // Check if it was an abort error
      if (error instanceof Error && error.name === "AbortError") {
        return null;
      }

      return null;
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Streaming API call with conditional persistence
  const handleSendMessage = async (
    content: string = inputValue,
    attachments?: FileAttachment[]
  ) => {
    if (!content.trim() && !attachments?.length) return;
    if (!isSignedIn && !isTemporaryChat) {
      return;
    }

    // Create new AbortController for this request
    const controller = new AbortController();
    setAbortController(controller);

    setIsLoading(true);
    setInputValue("");

    try {
      let currentChatId = activeChatId;

      // Handle chat creation differently for temporary vs persistent chats
      if (!activeChat) {
        if (isTemporaryChat) {
          // For temporary chats, generate a local ID and skip database operations
          currentChatId = `temp-${crypto.randomUUID()}`;
          // Create a temporary activeChat object
          const tempActiveChat = {
            id: currentChatId,
            title: generateTitle(content.trim()),
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          // We'll manage this locally instead of through the hook
          // Notify parent component about temporary chat (use temp ID)
          onChatCreated?.(currentChatId);
        } else {
          // For persistent chats, create in database
          const title = generateTitle(content.trim());
          currentChatId =
            (await createNewChat(title, {
              role: "user",
              content: content.trim(),
            })) || undefined;

          if (!currentChatId) {
            throw new Error("Failed to create new chat");
          }

          // Notify parent component about new chat (not for temporary chats)
          onChatCreated?.(currentChatId);

          // Refresh chat history in sidebar
          fetchChatHistory();

          // Continue with AI response since the initial message was already added
        }
      }

      // Get current messages for context
      const contextMessages = messages.slice(-MAX_CONTEXT).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Add the new user message to context
      contextMessages.push({
        role: "user",
        content: content.trim(),
      });

      // Check if this is an image generation request
      const isImageRequest = isImageGenerationRequest(content.trim());

      // Create new messages for the current conversation
      const userMessage: Message = {
        id: crypto.randomUUID(),
        content: content.trim(),
        role: "user",
        timestamp: new Date(),
        attachments: attachments,
      };

      const assistantId = crypto.randomUUID();
      let assistantMessage: Message = {
        id: assistantId,
        content: isImageRequest ? "" : "",
        role: "assistant",
        timestamp: new Date(),
      };

      // Add user message to local state immediately
      const updatedMessages = [...messages, userMessage, assistantMessage];
      setLocalMessages(updatedMessages);
      setShouldLoadFromDB(false); // We're now managing state locally

      if (isImageRequest) {
        // Handle image generation
        setIsStreaming(true);

        // Add this message ID to generating set
        setGeneratingImageMessageIds((prev) => new Set([...prev, assistantId]));

        // Generate image - use currentChatId (not activeChatId which can be null)
        if (!currentChatId) {
          throw new Error("No valid chat ID for image generation");
        }
        const imageResult = await handleImageGeneration(
          content.trim(),
          currentChatId,
          assistantId
        );

        if (imageResult) {
          // Store the generated image
          setGeneratedImages((prev) => ({
            ...prev,
            [assistantId]: {
              url: imageResult.url,
              publicId: imageResult.publicId,
            },
          }));

          // Update assistant message with success text and image
          const imageMessage = `I've generated an image based on your request: "${content.trim()}"`;
          assistantMessage = {
            ...assistantMessage,
            content: imageMessage,
          };
        } else {
          // Update with error message if image generation failed
          assistantMessage = {
            ...assistantMessage,
            content:
              "Sorry, I was unable to generate an image. Please try again with a different prompt.",
          };
        }

        // Update the assistant message in local state
        setLocalMessages((prev) =>
          prev.map((msg) => (msg.id === assistantId ? assistantMessage : msg))
        );

        setIsStreaming(false);

        // Remove from generating set
        setGeneratingImageMessageIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(assistantId);
          return newSet;
        });

        // Save to MongoDB in background (skip for temporary chats)
        if ((imageResult || !imageResult) && !isTemporaryChat) {
          // Save regardless of success/failure
          setIsSavingToMongoDB(true);

          const backgroundSave = async () => {
            try {

              // For existing chats, save the user message first
              // Note: For new chats, user message was already saved during createNewChat
              if (activeChat) {
                await addMessage(
                  "user",
                  content.trim(),
                  { attachments },
                  false
                );
              } else {
              }

              // Then save the assistant response with image metadata
              const messageMetadata = {
                model: selectedModel,
                tokens: assistantMessage.content.length,
                imageGenerated: !!imageResult,
                generatedImage: imageResult
                  ? {
                      url: imageResult.url,
                      publicId: imageResult.publicId,
                      imageId: imageResult.imageId,
                      messageId: assistantId, // Link image to message
                      prompt: content.trim(),
                      generatedAt: new Date().toISOString(),
                    }
                  : undefined,
              };


              // Save assistant message - use direct API call if activeChat is null (new chats)
              if (activeChat) {
                await addMessage(
                  "assistant",
                  assistantMessage.content,
                  messageMetadata,
                  false
                );
              } else {
                // For new chats, use direct API call since activeChat is still null
                const response = await fetch(
                  `/api/chats/${currentChatId}/messages`,
                  {
                    method: "POST",
                    credentials: "include",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      role: "assistant",
                      content: assistantMessage.content,
                      metadata: messageMetadata,
                    }),
                  }
                );

                if (!response.ok) {
                  throw new Error(
                    `Failed to save assistant message: ${response.status}`
                  );
                }

              }

              return true;
            } catch (error) {
              return false;
            } finally {
              setIsSavingToMongoDB(false);
            }
          };

          backgroundSave()
            .then((mongoSaveSuccess) => {
              // Add memory storage for authenticated users
              if (mongoSaveSuccess && isSignedIn && user?.id) {
                try {
                  const memoryMessages = [
                    { role: "user" as const, content: content.trim() },
                    {
                      role: "assistant" as const,
                      content: assistantMessage.content,
                    },
                  ];

                  const memoryTaskId = backgroundMemorySaver.addMemoryTask(
                    memoryMessages,
                    {
                      chatId: currentChatId,
                      model: selectedModel,
                      imageGenerated: !!imageResult,
                      timestamp: new Date().toISOString(),
                    }
                  );

                } catch (memoryError) {
                }
              }

              // Refresh chat history in sidebar (skip for temporary chats)
              if (!isTemporaryChat) {
                fetchChatHistory();
              }
            })
            .catch((error) => {
            });
        }

        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: contextMessages,
          userId: isTemporaryChat ? "anonymous" : user?.id || userId,
          attachments: attachments,
          chatId: currentChatId,
          isTemporaryChat: isTemporaryChat,
        }),
        signal: controller.signal,
      });

      if (!response.body) throw new Error("No response body");

      // Check if this response contains a generated image
      const generatedImageHeader = response.headers.get("X-Generated-Image");
      let generatedImageData = null;
      if (generatedImageHeader) {
        try {
          generatedImageData = JSON.parse(generatedImageHeader);
        } catch (e) {
        }
      }

      const reader = response.body.getReader();
      let streamingText = "";

      // For regular chat (not image generation), update the assistant message to empty for streaming
      assistantMessage.content = "";
      setLocalMessages((prev) =>
        prev.map((msg) => (msg.id === assistantId ? assistantMessage : msg))
      );
      setIsStreaming(true);

      // Stream the response with real-time updates
      while (true) {
        try {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = new TextDecoder().decode(value);
          streamingText += chunk;

          // Update the assistant message content in real-time
          setLocalMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, content: streamingText } : msg
            )
          );
        } catch (streamError) {
          // Check if the stream was aborted
          if (
            streamError instanceof Error &&
            streamError.name === "AbortError"
          ) {
            break;
          }
          throw streamError;
        }
      }

      // End streaming mode immediately - local state is now the source of truth
      setIsStreaming(false);

      // Save to MongoDB in background without affecting UI state (skip for temporary chats)
      if (streamingText.trim() && !isTemporaryChat) {
        setIsSavingToMongoDB(true);

        // Background save - don't await this, let it run async
        const backgroundSave = async () => {
          try {
            // For existing chats, save the user message first
            if (activeChat) {
              await addMessage("user", content.trim(), { attachments }, false);
            }

            // Then save the assistant response
            await addMessage(
              "assistant",
              streamingText.trim(),
              {
                model: selectedModel,
                tokens: streamingText.length,
              },
              false
            );

            return true;
          } catch (error) {
            return false;
          } finally {
            setIsSavingToMongoDB(false);
          }
        };

        // Start background save and handle memory storage
        backgroundSave()
          .then((mongoSaveSuccess) => {
            // Add memory storage for authenticated users
            if (mongoSaveSuccess && isSignedIn && user?.id) {
              try {
                const memoryMessages = [
                  { role: "user" as const, content: content.trim() },
                  { role: "assistant" as const, content: streamingText.trim() },
                ];

                const memoryTaskId = backgroundMemorySaver.addMemoryTask(
                  memoryMessages,
                  {
                    chatId: currentChatId,
                    model: selectedModel,
                    timestamp: new Date().toISOString(),
                  }
                );

              } catch (memoryError) {
              }
            }

            // Refresh chat history in sidebar (skip for temporary chats)
            if (!isTemporaryChat) {
              fetchChatHistory();
            }
          })
          .catch((error) => {
          });
      }
    } catch (err) {

      // Check if it was an abort error (user clicked stop)
      if (
        err instanceof Error &&
        (err.name === "AbortError" || err.message.includes("aborted"))
      ) {

        // Clean up the UI state
        setIsStreaming(false);
        setIsSavingToMongoDB(false);

        // Add a message indicating the request was stopped
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          if (lastMessage.role === "assistant" && !lastMessage.content.trim()) {
            // Remove the empty assistant message
            setLocalMessages((prev) => prev.slice(0, -1));
          }
        }
      } else if (
        err instanceof TypeError &&
        err.message.includes("Failed to fetch")
      ) {
        // Network error (could be due to abort)
        setIsStreaming(false);
        setIsSavingToMongoDB(false);

        // Clean up empty assistant messages
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          if (lastMessage.role === "assistant" && !lastMessage.content.trim()) {
            setLocalMessages((prev) => prev.slice(0, -1));
          }
        }
      } else {
        // End streaming mode and reset states
        setIsStreaming(false);
        setIsSavingToMongoDB(false);

        // Add error message to chat if we have an active chat
        if (activeChatId) {
          try {
            await addMessage(
              "assistant",
              "Sorry, I encountered an error. Please try again.",
              { error: true },
              false
            );
          } catch (dbError) {
          }
        }
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditContent(content);
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editContent.trim()) return;
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;

    // For now, we'll regenerate from the edited message
    // This is a simplified approach - in a full implementation,
    // you might want to update the message in the database directly
    setEditingMessageId(null);
    setEditContent("");

    if (messages[messageIndex].role === "user") {
      // Regenerate response from this point
      await handleSendMessage(editContent.trim());
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleRegenerateResponse = async (messageId: string) => {
    if (isLoading || isStreaming) return;

    // Find the message to regenerate and the previous user message
    const messageIndex = messages.findIndex((msg) => msg.id === messageId);
    if (messageIndex === -1 || messages[messageIndex].role !== "assistant") {
      return;
    }

    // Find the corresponding user message (should be the one right before)
    const userMessageIndex = messageIndex - 1;
    if (userMessageIndex < 0 || messages[userMessageIndex].role !== "user") {
      return;
    }

    const userMessage = messages[userMessageIndex];
    const isImageRequest = isImageGenerationRequest(userMessage.content);

    try {
      setIsLoading(true);
      setIsStreaming(true);

      // Remove the old assistant response from local state
      const messagesUpToUser = messages.slice(0, messageIndex);

      // Create a new assistant message
      const newAssistantId = crypto.randomUUID();
      const newAssistantMessage: Message = {
        id: newAssistantId,
        content: isImageRequest ? "" : "",
        role: "assistant",
        timestamp: new Date(),
      };

      // Update local state with new assistant message
      const updatedMessages = [...messagesUpToUser, newAssistantMessage];
      setLocalMessages(updatedMessages);

      if (isImageRequest) {
        // Handle image regeneration
        setGeneratingImageMessageIds(
          (prev) => new Set([...prev, newAssistantId])
        );
        const imageResult = await handleImageGeneration(
          userMessage.content,
          activeChatId!,
          newAssistantId
        );

        if (imageResult) {
          setGeneratedImages((prev) => ({
            ...prev,
            [newAssistantId]: {
              url: imageResult.url,
              publicId: imageResult.publicId,
            },
          }));

          newAssistantMessage.content = `I've regenerated an image based on your request: "${userMessage.content}"`;
        } else {
          newAssistantMessage.content =
            "Sorry, I was unable to regenerate the image. Please try again.";
        }

        // Update the message in local state
        setLocalMessages((prev) =>
          prev.map((msg) =>
            msg.id === newAssistantId ? newAssistantMessage : msg
          )
        );

        // Remove from generating set
        setGeneratingImageMessageIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(newAssistantId);
          return newSet;
        });

        // Save to MongoDB (skip for temporary chats)
        if (!isTemporaryChat) {
          setIsSavingToMongoDB(true);
          try {
            await addMessage(
              "assistant",
              newAssistantMessage.content,
              {
                model: selectedModel,
                tokens: newAssistantMessage.content.length,
                imageGenerated: !!imageResult,
                regenerated: true,
                generatedImage: imageResult
                  ? {
                      url: imageResult.url,
                      publicId: imageResult.publicId,
                      imageId: imageResult.imageId,
                      messageId: newAssistantId, // Link image to message
                      prompt: userMessage.content,
                      generatedAt: new Date().toISOString(),
                    }
                  : undefined,
              },
              false
            );
          } catch (error) {
          } finally {
            setIsSavingToMongoDB(false);
          }
        }
      } else {
        // Handle text regeneration
        const historyForAPI = messagesUpToUser
          .filter((msg) => msg.role !== "system")
          .slice(-MAX_CONTEXT)
          .map((msg) => ({
            role: msg.role,
            content: msg.content,
          }));

        // Make API call for text response
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: historyForAPI,
            userId: isTemporaryChat ? "anonymous" : userId,
            chatId: activeChatId,
            attachments: userMessage.attachments,
            isTemporaryChat: isTemporaryChat,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body reader available");
        }

        let fullContent = "";
        const decoder = new TextDecoder();

        // Stream the response
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;

          // Update the assistant message with streaming content
          setLocalMessages((prev) =>
            prev.map((msg) =>
              msg.id === newAssistantId ? { ...msg, content: fullContent } : msg
            )
          );
        }

        // Save the final response to MongoDB (skip for temporary chats)
        if (!isTemporaryChat) {
          setIsSavingToMongoDB(true);
          try {
            await addMessage(
              "assistant",
              fullContent,
              {
                model: selectedModel,
                tokens: fullContent.length,
                regenerated: true,
              },
              false
            );

            // Background memory saving removed
          } catch (error) {
          } finally {
            setIsSavingToMongoDB(false);
          }
        }
      }

      // Refresh chat history (skip for temporary chats)
      if (!isTemporaryChat) {
        fetchChatHistory();
      }
    } catch (error) {
      // Restore original message on error
      setLocalMessages(messages);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setInputValue(textarea.value);
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      // Clear the feedback after 2 seconds
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
    }
  };

  const handleLikeMessage = (messageId: string) => {
    setLikedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
        // Remove from disliked if it was disliked
        setDislikedMessages((prevDisliked) => {
          const newDislikedSet = new Set(prevDisliked);
          newDislikedSet.delete(messageId);
          return newDislikedSet;
        });
      }
      return newSet;
    });
  };

  const handleDislikeMessage = (messageId: string) => {
    setDislikedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
        // Remove from liked if it was liked
        setLikedMessages((prevLiked) => {
          const newLikedSet = new Set(prevLiked);
          newLikedSet.delete(messageId);
          return newLikedSet;
        });
      }
      return newSet;
    });
  };

  const resetChat = () => {
    // Reset local state
    setInputValue("");
    setIsLoading(false);
    setEditingMessageId(null);
    setEditContent("");
    setIsStreaming(false);
    setLocalMessages([]);
    setShouldLoadFromDB(true);
    setIsSavingToMongoDB(false);
    setGeneratedImages({});
    setIsGeneratingImage(false);
    setGeneratingImageMessageIds(new Set());
    setAbortController(null);
    setCopiedMessageId(null);
    setLikedMessages(new Set());
    setDislikedMessages(new Set());
  };

  const handleTemporaryChatToggle = (enabled: boolean) => {
    setIsTemporaryChat(enabled);
    // Reset chat when switching modes to avoid mixing temporary and persistent data
    if (messages.length > 0) {
      resetChat();
    }
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).resetMainContentChat = resetChat;
    }
  }, []);

  // Debug logging for generated images
  useEffect(() => {
  }, [generatedImages]);

  return (
    <div>
      {showImageView ? (
        <div className="flex-1 flex flex-col items-center justify-center relative">
          <Button
            onClick={onCloseImageView}
            className="absolute top-4 right-4 h-10 w-10 p-0 bg-black/50 hover:bg-black/70 text-white rounded-full z-10"
            size="icon"
          >
            ✕
          </Button>
          {currentImage && (
            <div className="w-full h-full flex items-center justify-center p-4">
              <img
                src={currentImage}
                alt="Generated image preview"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          )}
        </div>
      ) : (
        <div className={cn("flex flex-col h-screen relative")}>
          {/* Mobile Header with Full Width Layout */}
          {isMobile && (
            <div className="flex items-center justify-between py-3 px-4 bg-[#2f2f2f] w-full">
              {/* Hamburger Menu - Far Left */}
              <div className="flex items-center space-x-2">
                {!isNavExpanded && onToggle && (
                  <Button
                    onClick={onToggle}
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-[#404040] w-10 h-10 p-0 flex-shrink-0"
                    aria-label="Open navigation menu"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                      data-rtl-flip=""
                      className="icon-lg text-token-text-secondary mx-2"
                    >
                      <circle cx="15" cy="5" r="5" fill="#0285FF"></circle>
                      {/* Top line */}
                      <rect
                        x="2"
                        y="4"
                        width="14"
                        height="1.5"
                        rx="0.75"
                        fill="currentColor"
                      ></rect>
                      {/* Bottom line */}
                      <rect
                        x="2"
                        y="14"
                        width="16"
                        height="1.5"
                        rx="0.75"
                        fill="currentColor"
                      ></rect>
                    </svg>
                  </Button>
                )}

                {/* Upgrade Button - Center Left */}
                <div className={cn("flex-1 flex justify-center")}>
                  <Button className="bg-[#6366f1] hover:bg-[#414071] text-white px-4 py-2 rounded-full text-sm font-medium">
                    <div className="w-4 h-4 mr-2 flex items-center justify-center">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                      >
                        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.078 6.078 0 0 0 6.529 2.9 5.973 5.973 0 0 0 4.258 1.786c1.638 0 3.185-.65 4.299-1.786a5.987 5.987 0 0 0 4.007-2.9 6.042 6.042 0 0 0-.75-7.094l.003-.003z" />
                      </svg>
                    </div>
                    Upgrade to Go
                  </Button>
                </div>
              </div>

              {/* Temporary Chat Toggle - Far Right */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() =>
                        handleTemporaryChatToggle(!isTemporaryChat)
                      }
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-[#404040] w-10 h-10 p-0 flex-shrink-0"
                      aria-label={
                        isTemporaryChat
                          ? "Turn off temporary chat"
                          : "Turn on temporary chat"
                      }
                    >
                      {isTemporaryChat ? (
                        // Active state - show checkmark version
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          xmlns="http://www.w3.org/2000/svg"
                          data-rtl-flip=""
                          className="icon"
                        >
                          <path
                            d="M11.7304 7.35195C11.9273 7.04193 12.3384 6.95002 12.6484 7.14687C12.9582 7.34374 13.0502 7.75487 12.8535 8.06484L9.67868 13.0648C9.56765 13.2397 9.38114 13.3525 9.17477 13.3705C8.96844 13.3885 8.76558 13.3096 8.62595 13.1566L6.80075 11.1566L6.7197 11.0482C6.56149 10.7827 6.60647 10.4337 6.84372 10.2172C7.08112 10.0007 7.43256 9.98823 7.68259 10.1703L7.78317 10.2601L9.02145 11.6166L11.7304 7.35195Z"
                            data-rtl-flip=""
                          ></path>
                          <path d="M4.52148 15.1664C4.61337 14.8108 4.39951 14.4478 4.04395 14.3559C3.73281 14.2756 3.41605 14.4295 3.28027 14.7074L3.2334 14.8334C3.13026 15.2324 3.0046 15.6297 2.86133 16.0287L2.71289 16.4281C2.63179 16.6393 2.66312 16.8775 2.79688 17.06C2.93067 17.2424 3.14825 17.3443 3.37402 17.3305L3.7793 17.3002C4.62726 17.2265 5.44049 17.0856 6.23438 16.8764C6.84665 17.1788 7.50422 17.4101 8.19434 17.558C8.55329 17.6347 8.9064 17.4062 8.9834 17.0473C9.06036 16.6881 8.83177 16.3342 8.47266 16.2572C7.81451 16.1162 7.19288 15.8862 6.62305 15.5814C6.50913 15.5205 6.38084 15.4946 6.25391 15.5053L6.12793 15.5277C5.53715 15.6955 4.93256 15.819 4.30566 15.9027C4.33677 15.8052 4.36932 15.7081 4.39844 15.6098L4.52148 15.1664Z"></path>
                          <path d="M15.7998 14.5365C15.5786 14.3039 15.2291 14.2666 14.9668 14.4301L14.8604 14.5131C13.9651 15.3633 12.8166 15.9809 11.5273 16.2572C11.1682 16.3342 10.9396 16.6881 11.0166 17.0473C11.0936 17.4062 11.4467 17.6347 11.8057 17.558C13.2388 17.2509 14.5314 16.5858 15.5713 15.6644L15.7754 15.4769C16.0417 15.224 16.0527 14.8028 15.7998 14.5365Z"></path>
                          <path d="M2.23828 7.58925C1.97668 8.34846 1.83496 9.15956 1.83496 10.0004C1.835 10.7359 1.94324 11.4483 2.14551 12.1234L2.23828 12.4105C2.35793 12.7576 2.73588 12.9421 3.08301 12.8226C3.3867 12.718 3.56625 12.4153 3.52637 12.1088L3.49512 11.9769C3.2808 11.3548 3.16508 10.6908 3.16504 10.0004C3.16504 9.30975 3.28072 8.64512 3.49512 8.02284C3.61476 7.67561 3.43024 7.29679 3.08301 7.17714C2.73596 7.05777 2.35799 7.2423 2.23828 7.58925Z"></path>
                          <path d="M16.917 12.8226C17.2641 12.9421 17.6421 12.7576 17.7617 12.4105C18.0233 11.6515 18.165 10.8411 18.165 10.0004C18.165 9.15956 18.0233 8.34846 17.7617 7.58925C17.642 7.2423 17.264 7.05777 16.917 7.17714C16.5698 7.29679 16.3852 7.67561 16.5049 8.02284C16.7193 8.64512 16.835 9.30975 16.835 10.0004C16.8349 10.6908 16.7192 11.3548 16.5049 11.9769C16.3852 12.3242 16.5698 12.703 16.917 12.8226Z"></path>
                          <path d="M8.9834 2.95253C8.90632 2.59372 8.55322 2.36509 8.19434 2.44179C6.76126 2.74891 5.46855 3.41404 4.42871 4.33534L4.22461 4.52284C3.95829 4.77575 3.94729 5.19696 4.2002 5.46327C4.42146 5.69603 4.77088 5.73326 5.0332 5.56972L5.13965 5.48769C6.03496 4.63746 7.18337 4.01888 8.47266 3.74257C8.83177 3.66561 9.06036 3.31165 8.9834 2.95253Z"></path>
                          <path d="M15.5713 4.33534C14.5314 3.41404 13.2387 2.74891 11.8057 2.44179C11.4468 2.36509 11.0937 2.59372 11.0166 2.95253C10.9396 3.31165 11.1682 3.66561 11.5273 3.74257C12.7361 4.00161 13.8209 4.56094 14.6895 5.33046L14.8604 5.48769L14.9668 5.56972C15.2291 5.73326 15.5785 5.69603 15.7998 5.46327C16.0211 5.23025 16.0403 4.87902 15.8633 4.62538L15.7754 4.52284L15.5713 4.33534Z"></path>
                        </svg>
                      ) : (
                        // Inactive state - show regular version
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          xmlns="http://www.w3.org/2000/svg"
                          data-rtl-flip=""
                        >
                          <path d="M4.52148 15.1664C4.61337 14.8108 4.39951 14.4478 4.04395 14.3559C3.73281 14.2756 3.41605 14.4295 3.28027 14.7074L3.2334 14.8334C3.13026 15.2324 3.0046 15.6297 2.86133 16.0287L2.71289 16.4281C2.63179 16.6393 2.66312 16.8775 2.79688 17.06C2.93067 17.2424 3.14825 17.3443 3.37402 17.3305L3.7793 17.3002C4.62726 17.2265 5.44049 17.0856 6.23438 16.8764C6.84665 17.1788 7.50422 17.4101 8.19434 17.558C8.55329 17.6348 8.9064 17.4062 8.9834 17.0473C9.06036 16.6882 8.83177 16.3342 8.47266 16.2572C7.81451 16.1162 7.19288 15.8862 6.62305 15.5815C6.50913 15.5206 6.38084 15.4946 6.25391 15.5053L6.12793 15.5277C5.53715 15.6955 4.93256 15.819 4.30566 15.9027C4.33677 15.8053 4.36932 15.7081 4.39844 15.6098L4.52148 15.1664Z"></path>
                          <path d="M15.7998 14.5365C15.5786 14.3039 15.2291 14.2666 14.9668 14.4301L14.8604 14.5131C13.9651 15.3633 12.8166 15.9809 11.5273 16.2572C11.1682 16.3342 10.9396 16.6882 11.0166 17.0473C11.0936 17.4062 11.4467 17.6348 11.8057 17.558C13.2388 17.2509 14.5314 16.5858 15.5713 15.6645L15.7754 15.477C16.0417 15.2241 16.0527 14.8028 15.7998 14.5365Z"></path>
                          <path d="M2.23828 7.58927C1.97668 8.34847 1.83496 9.15958 1.83496 10.0004C1.835 10.736 1.94324 11.4483 2.14551 12.1234L2.23828 12.4106C2.35793 12.7576 2.73588 12.9421 3.08301 12.8227C3.3867 12.718 3.56625 12.4154 3.52637 12.1088L3.49512 11.977C3.2808 11.3549 3.16508 10.6908 3.16504 10.0004C3.16504 9.30977 3.28072 8.64514 3.49512 8.02286C3.61476 7.67563 3.43024 7.2968 3.08301 7.17716C2.73596 7.05778 2.35799 7.24232 2.23828 7.58927Z"></path>
                          <path d="M16.917 12.8227C17.2641 12.9421 17.6421 12.7576 17.7617 12.4106C18.0233 11.6515 18.165 10.8411 18.165 10.0004C18.165 9.15958 18.0233 8.34847 17.7617 7.58927C17.642 7.24231 17.264 7.05778 16.917 7.17716C16.5698 7.2968 16.3852 7.67563 16.5049 8.02286C16.7193 8.64514 16.835 9.30977 16.835 10.0004C16.8349 10.6908 16.7192 11.3549 16.5049 11.977C16.3852 12.3242 16.5698 12.703 16.917 12.8227Z"></path>
                          <path d="M8.9834 2.95255C8.90632 2.59374 8.55322 2.3651 8.19434 2.44181C6.76126 2.74892 5.46855 3.41405 4.42871 4.33536L4.22461 4.52286C3.95829 4.77577 3.94729 5.19697 4.2002 5.46329C4.42146 5.69604 4.77088 5.73328 5.0332 5.56973L5.13965 5.4877C6.03496 4.63748 7.18337 4.0189 8.47266 3.74259C8.83177 3.66563 9.06036 3.31166 8.9834 2.95255Z"></path>
                          <path d="M15.5713 4.33536C14.5314 3.41405 13.2387 2.74892 11.8057 2.44181C11.4468 2.3651 11.0937 2.59374 11.0166 2.95255C10.9396 3.31166 11.1682 3.66563 11.5273 3.74259C12.7361 4.00163 13.8209 4.56095 14.6895 5.33048L14.8604 5.4877L14.9668 5.56973C15.2291 5.73327 15.5785 5.69604 15.7998 5.46329C16.0211 5.23026 16.0403 4.87903 15.8633 4.6254L15.7754 4.52286L15.5713 4.33536Z"></path>
                        </svg>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="bg-black text-white text-sm px-2 py-1 rounded"
                  >
                    {isTemporaryChat
                      ? "Turn off temporary chat"
                      : "Turn on temporary chat"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* Chat Header - Medium and Desktop screens */}
          {!isMobile && (
            <div className="">
              <ChatHeader
                isTemporaryChat={isTemporaryChat}
                onTemporaryChatToggle={handleTemporaryChatToggle}
                selectedModel={selectedModel}
                onModelChange={handleModelChange}
                activeChat={activeChat != null}
              />
            </div>
          )}

          {/* Chat area */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {messages.length === 0 ? (
              // Empty state
              <div
                className={cn(
                  "flex flex-col items-center h-full",
                  isMobile ? "justify-start pt-8" : "justify-center"
                )}
              >
                <div className="w-full flex flex-col items-center">
                  <div
                    className={cn("text-center", isMobile ? "mb-6" : "mb-8")}
                  >
                    {isTemporaryChat ? (
                      <>
                        <div className="text-2xl font-semibold text-white mb-4">
                          Temporary Chat
                        </div>
                        <div className="text-sm text-gray-400 bg-gray-800 rounded-lg px-4 py-2 max-w-md mx-auto">
                          This chat won't appear in history, use or update
                          memory, or be used to train models. For safety
                          purposes, we may keep a copy for 30 days.
                        </div>
                      </>
                    ) : (
                      <div
                        className={cn(
                          "text-2xl font-medium text-white",
                          isMobile && "mt-20"
                        )}
                      >
                        Ready when you are.
                      </div>
                    )}
                  </div>
                  {/* Input area (first prompt) */}
                  <div
                    className={cn(
                      "w-full flex justify-center",
                      isMobile
                        ? "px-1"
                        : useOverlayNav
                        ? "px-4 max-w-full"
                        : "px-6 max-w-4xl"
                    )}
                  >
                    <div
                      className={cn(isMobile ? "w-[95%]" : "w-full max-w-4xl")}
                    >
                      <div className="relative bg-[#2A2A2A] rounded-3xl border border-gray-700 flex items-center">
                        <Button
                          onClick={() => setIsFileDialogOpen(true)}
                          className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg ml-3"
                          size="icon"
                        >
                          <Plus className="w-5 h-5" />
                        </Button>
                        <Textarea
                          ref={textareaRef}
                          value={inputValue}
                          onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                          placeholder="Message ChatGPT"
                          className="flex-1 bg-transparent border-none text-white placeholder-gray-400 resize-none min-h-[24px] max-h-[200px] focus:ring-0 focus:outline-none text-base py-3 px-3"
                          style={{ height: "auto", lineHeight: "24px" }}
                          disabled={isLoading}
                        />
                        <div className="flex items-center mr-3 space-x-2">
                          <Button
                            className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg cursor-pointer"
                            size="icon"
                          >
                            <Mic className="w-5 h-5" />
                          </Button>
                          {isLoading || isStreaming ? (
                            <Button
                              onClick={handleStopGeneration}
                              size="icon"
                              className="w-8 h-8 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all"
                              aria-label="Stop generation"
                            >
                              <Square className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleSendMessage()}
                              disabled={!inputValue.trim() || isLoading}
                              size="icon"
                              className={cn(
                                "w-8 h-8 rounded-full transition-all",
                                inputValue.trim() && !isLoading
                                  ? "bg-white text-black hover:bg-gray-200"
                                  : "bg-gray-600 text-gray-500"
                              )}
                              aria-label="Send message"
                            >
                              <svg
                                width="20"
                                height="20"
                                viewBox="0 0 20 20"
                                fill="white"
                                xmlns="http://www.w3.org/2000/svg"
                                color="white"
                              >
                                <path d="M7.167 15.416V4.583a.75.75 0 0 1 1.5 0v10.833a.75.75 0 0 1-1.5 0Zm4.166-2.5V7.083a.75.75 0 0 1 1.5 0v5.833a.75.75 0 0 1-1.5 0ZM3 11.25V8.75a.75.75 0 0 1 1.5 0v2.5a.75.75 0 0 1-1.5 0Zm12.5 0V8.75a.75.75 0 0 1 1.5 0v2.5a.75.75 0 0 1-1.5 0Z"></path>
                              </svg>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Messages
              <div className="flex justify-center w-full mt-2 overflow-y-auto flex-1">
                <div
                  className={cn(
                    "w-full h-full",
                    isMobile
                      ? "py-4 px-2"
                      : useOverlayNav
                      ? "py-6 px-4 max-w-full"
                      : "py-6 px-4 max-w-4xl"
                  )}
                >
                  {messages.map((message) => (
                    <div key={message.id} className="mb-8">
                      {message.role === "user" ? (
                        // User message - right aligned pill
                        <div className="flex flex-col items-end mb-6 group">
                          <div
                            className={cn(
                              "bg-[#2f2f2f] text-white rounded-3xl p-3 text-base relative",
                              editingMessageId == message.id && "w-full"
                            )}
                          >
                            {editingMessageId === message.id ? (
                              <div className="rounded-2xl p-2 w-full ">
                                <Textarea
                                  value={editContent}
                                  onChange={(e) =>
                                    setEditContent(e.target.value)
                                  }
                                  className="w-full bg-transparent border-none text-white placeholder-gray-400 resize-none min-h-[30px] max-h-[200px] focus:ring-0 focus:outline-none text-base p-1 mb-4"
                                  autoFocus
                                  placeholder="Edit your message..."
                                />
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    onClick={handleCancelEdit}
                                    className="bg-black hover:bg-[#4a4b4a] text-white border-none rounded-full px-4 py-2 h-8 text-sm font-medium"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={() => handleSaveEdit(message.id)}
                                    className="bg-white hover:bg-gray-100 text-black border-none rounded-full px-4 py-2 h-8 text-sm font-medium"
                                  >
                                    Send
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* File attachments */}
                                {message.attachments &&
                                  message.attachments.length > 0 && (
                                    <div className="mb-3 space-y-2">
                                      {message.attachments.map(
                                        (attachment, index) => (
                                          <div
                                            key={index}
                                            className="flex items-center gap-2 p-2 bg-[#404040] rounded-lg"
                                          >
                                            {attachment.mediaType.startsWith(
                                              "image/"
                                            ) ? (
                                              <div className="w-16 h-16 rounded overflow-hidden bg-gray-600">
                                                <img
                                                  src={attachment.url}
                                                  alt={attachment.name}
                                                  className="w-full h-full object-cover"
                                                  onError={(e) => {
                                                    // Replace with file icon on error
                                                    const imgElement =
                                                      e.target as HTMLImageElement;
                                                    imgElement.style.display =
                                                      "none";
                                                    const parent =
                                                      imgElement.parentElement;
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
                                                {(
                                                  attachment.size / 1024
                                                ).toFixed(1)}{" "}
                                                KB
                                              </p>
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  )}
                                <div className="whitespace-pre-wrap">
                                  {message.content}
                                </div>
                              </>
                            )}
                          </div>
                          {/* Copy and Edit buttons for user messages - only visible on hover */}
                          <div className="flex items-center mt-2 mr-2 space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              onClick={() =>
                                copyToClipboard(message.content, message.id)
                              }
                              className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg"
                              size="icon"
                            >
                              {copiedMessageId === message.id ? (
                                <span className="text-green-400 text-xs font-medium">
                                  ✓
                                </span>
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              onClick={() =>
                                handleEditMessage(message.id, message.content)
                              }
                              className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg"
                              size="icon"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // AI message - left aligned with buttons
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
                                <div className="bg-gray-800 rounded-lg p-4 max-w-lg">
                                  <img
                                    src={generatedImages[message.id].url}
                                    alt="Generated image"
                                    className="w-full h-auto rounded-lg"
                                    onClick={() => {
                                      onSetImage(
                                        generatedImages[message.id].url
                                      );
                                    }}
                                    style={{ cursor: "pointer" }}
                                    onError={(e) => {
                                      // Hide the broken image
                                      (
                                        e.target as HTMLImageElement
                                      ).style.display = "none";
                                      // Show error message
                                      const errorDiv =
                                        document.createElement("div");
                                      errorDiv.className =
                                        "text-red-400 text-sm p-2 bg-red-900/20 rounded";
                                      errorDiv.textContent =
                                        "Image failed to load";
                                      (
                                        e.target as HTMLImageElement
                                      ).parentNode?.appendChild(errorDiv);
                                    }}
                                  />
                                  <div className="mt-2 flex justify-end">
                                    <Button
                                      onClick={async () => {
                                        try {
                                          const imageUrl =
                                            generatedImages[message.id].url;
                                          const response = await fetch(
                                            imageUrl
                                          );
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
                                        }
                                      }}
                                      className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg"
                                      size="icon"
                                    >
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          )}

                          <div className="text-white text-base leading-relaxed mb-3">
                            <div className="prose prose-invert max-w-none">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeHighlight]}
                                components={{
                                  code: ({
                                    node,
                                    className,
                                    children,
                                    ...props
                                  }: any) => {
                                    const inline = !className;
                                    const match = /language-(\w+)/.exec(
                                      className || ""
                                    );
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
                                  p: ({ children }) => (
                                    <p className="mb-4 last:mb-0">{children}</p>
                                  ),
                                  ul: ({ children }) => (
                                    <ul className="list-disc pl-6 mb-4">
                                      {children}
                                    </ul>
                                  ),
                                  ol: ({ children }) => (
                                    <ol className="list-decimal pl-6 mb-4">
                                      {children}
                                    </ol>
                                  ),
                                  li: ({ children }) => (
                                    <li className="mb-2">{children}</li>
                                  ),
                                  blockquote: ({ children }) => (
                                    <blockquote className="border-l-4 border-gray-600 pl-4 italic text-gray-300 mb-4">
                                      {children}
                                    </blockquote>
                                  ),
                                  h1: ({ children }) => (
                                    <h1 className="text-2xl font-bold mb-4">
                                      {children}
                                    </h1>
                                  ),
                                  h2: ({ children }) => (
                                    <h2 className="text-xl font-bold mb-3">
                                      {children}
                                    </h2>
                                  ),
                                  h3: ({ children }) => (
                                    <h3 className="text-lg font-bold mb-2">
                                      {children}
                                    </h3>
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
                                    <td className="border border-gray-600 px-4 py-2">
                                      {children}
                                    </td>
                                  ),
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          </div>

                          {/* Action buttons for AI responses - only show when response is complete */}
                          {!isStreaming &&
                            !isLoading &&
                            message.content.trim() && (
                              <div className="flex items-center space-x-2 ml-0">
                                <Button
                                  onClick={() =>
                                    copyToClipboard(message.content, message.id)
                                  }
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
                                  onClick={() => handleLikeMessage(message.id)}
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
                                      likedMessages.has(message.id) &&
                                        "animate-bounce"
                                    )}
                                  />
                                </Button>
                                <Button
                                  onClick={() =>
                                    handleDislikeMessage(message.id)
                                  }
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
                                      dislikedMessages.has(message.id) &&
                                        "animate-bounce"
                                    )}
                                  />
                                </Button>
                                <Button
                                  onClick={() =>
                                    handleRegenerateResponse(message.id)
                                  }
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
                      )}
                    </div>
                  ))}

                  {isLoading && !isGeneratingImage && (
                    <div className="text-gray-400 text-sm animate-pulse">
                      ChatGPT is thinking…
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}
          </div>

          {/* Bottom input bar */}
          {messages.length > 0 && (
            <div className="bg-[#212121] sticky bottom-0 z-10">
              <div className="flex justify-center w-full">
                <div
                  className={cn(
                    "w-full py-4 flex justify-center",
                    isMobile
                      ? "px-1"
                      : useOverlayNav
                      ? "px-4 max-w-full"
                      : "px-4 max-w-4xl"
                  )}
                >
                  <div
                    className={cn(isMobile ? "w-[95%]" : "w-full max-w-4xl")}
                  >
                    <div className="relative bg-[#2A2A2A] rounded-3xl border border-gray-700 flex items-center">
                      <Button
                        onClick={() => setIsFileDialogOpen(true)}
                        className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg ml-3"
                        size="icon"
                      >
                        <Plus className="w-5 h-5" />
                      </Button>
                      <Textarea
                        ref={textareaRef}
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Message ChatGPT"
                        className="flex-1 bg-transparent border-none text-white placeholder-gray-400 resize-none min-h-[24px] max-h-[200px] focus:ring-0 focus:outline-none text-base py-3 px-3"
                        style={{ height: "auto", lineHeight: "24px" }}
                        disabled={isLoading}
                      />
                      <div className="flex items-center mr-3 space-x-2">
                        <Button
                          className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg"
                          size="icon"
                        >
                          <Mic className="w-5 h-5" />
                        </Button>
                        {isLoading || isStreaming ? (
                          <Button
                            onClick={handleStopGeneration}
                            size="icon"
                            className="w-8 h-8 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all"
                            aria-label="Stop generation"
                          >
                            <Square className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleSendMessage()}
                            disabled={!inputValue.trim() || isLoading}
                            size="icon"
                            className={cn(
                              "w-8 h-8 rounded-full transition-all",
                              inputValue.trim() && !isLoading
                                ? "bg-white text-black hover:bg-gray-200"
                                : "bg-gray-600 text-gray-500 cursor-not-allowed"
                            )}
                            aria-label="Send message"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status indicator */}
                  <div className="text-center mt-3 text-xs text-gray-500">
                    {isTemporaryChat ? (
                      <div className="flex items-center justify-center gap-2"></div>
                    ) : isSignedIn ? (
                      <div className="flex items-center justify-center gap-2"></div>
                    ) : (
                      <span>⚠️ Sign in to save your chat history</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* File Upload Dialog */}
      <FileUploadDialog
        isOpen={isFileDialogOpen}
        onClose={() => setIsFileDialogOpen(false)}
        onFilesSelected={handleFilesSelected}
      />
    </div>
  );
}
