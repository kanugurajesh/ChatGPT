"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChatHeader } from "./ChatHeader";
import { FileUploadDialog } from "./FileUploadDialog";
import { MobileHeader } from "./MobileHeader";
import { ChatArea } from "./ChatArea";
import { ImageView } from "./ImageView";
import { useResponsive } from "@/hooks/use-responsive";
import { sessionManager } from "@/lib/session";
import { useUser } from "@clerk/nextjs";
import { useActiveChat } from "@/hooks/use-active-chat";
import { useChatHistory } from "@/hooks/use-chat-history";
import "highlight.js/styles/github-dark.css";
import { backgroundMemorySaver } from "@/lib/services/backgroundSaver";

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
    /generate.*art/,
    /create.*art/,
    /draw.*art/,
    /make.*art/,
    /generate.*illustration/,
    /create.*illustration/,
    /draw.*illustration/,
    /make.*illustration/,
    /generate.*graphic/,
    /create.*graphic/,
    /design.*logo/,
    /create.*logo/,
  ];

  // Also check for simple keywords that might indicate image generation
  const simpleKeywords = ["paint", "sketch", "render", "visualize", "design"];

  const hasImagePattern = imagePatterns.some((pattern) =>
    pattern.test(lowerText)
  );

  const hasSimpleKeyword = simpleKeywords.some(
    (keyword) => lowerText.includes(keyword) && lowerText.includes("for me")
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
  const [isEditingSave, setIsEditingSave] = useState(false);
  const [userId, setUserId] = useState<string>("default_user");
  // Removed memory tracking states
  const [isSavingToMongoDB, setIsSavingToMongoDB] = useState(false);
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<{
    [messageId: string]: { url: string; publicId: string };
  }>({});

  // Debug generatedImages state changes
  useEffect(() => {
    console.log('generatedImages state changed:', generatedImages);
  }, [generatedImages]);
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
  const [error, setError] = useState<string | null>(null);
  const [failedMessageIds, setFailedMessageIds] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  // Derive messages from active chat
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]); // For optimistic updates

  // Local streaming state
  const [isStreamingLocal, setIsStreamingLocal] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  
  // Track pending messages for newly created chats
  const [pendingUserMessage, setPendingUserMessage] = useState<Message | null>(null);
  const [pendingAssistantMessage, setPendingAssistantMessage] = useState<Message | null>(null);

  // Combine database messages, local messages, and streaming message
  const messages: Message[] = React.useMemo(() => {
    // Start with database messages from activeChat
    const dbMessages: Message[] = activeChat?.messages?.map((msg) => ({
      id: msg.id,
      content: msg.content,
      role: msg.role as "user" | "assistant" | "system",
      timestamp: new Date(msg.timestamp),
      attachments: msg.attachments?.map((att) => ({
        type: "file" as const,
        mediaType: att.mediaType,
        url: att.url,
        name: att.name,
        size: att.size,
      })),
      metadata: {
        model: msg.metadata?.model,
        tokens: msg.metadata?.tokens,
        imageGenerated: msg.metadata?.imageGenerated,
        regenerated: msg.metadata?.regenerated,
        generatedImageUrl: msg.metadata?.generatedImageUrl,
        generatedImagePublicId: msg.metadata?.generatedImagePublicId,
        editHistory: msg.metadata?.editHistory?.map((edit: any) => ({
          content: edit.content,
          timestamp: new Date(edit.timestamp),
        })),
      },
    })) || [];

    // Add local messages (for temporary chats or before DB sync)
    const allMessages = [...dbMessages, ...localMessages, ...pendingMessages];
    
    // Add streaming message if it exists
    if (streamingMessage) {
      allMessages.push(streamingMessage);
    }
    
    // Remove duplicates by ID (database messages take precedence)
    const uniqueMessages = allMessages.reduce((acc, msg) => {
      const existing = acc.find(m => m.id === msg.id);
      if (!existing) {
        acc.push(msg);
      }
      return acc;
    }, [] as Message[]);
    
    // Sort by timestamp to maintain proper order
    const sortedMessages = uniqueMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Debug: Log final messages that will be rendered
    console.log('Final messages for rendering:', {
      activeChatId: activeChat?.id,
      totalMessages: sortedMessages.length,
      messages: sortedMessages.map((msg, index) => ({
        index,
        id: msg.id,
        role: msg.role,
        content: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : ''),
        timestamp: msg.timestamp.toISOString()
      }))
    });
    
    return sortedMessages;
  }, [activeChat?.messages, localMessages, pendingMessages, streamingMessage]);

  // Restore generatedImages from database only when opening chat from history (after refresh)
  useEffect(() => {
    // Only restore if:
    // 1. We have activeChat messages from database
    // 2. generatedImages is empty (indicates page refresh)
    // 3. Not currently generating an image
    console.log('Checking for image restoration:', {
      hasMessages: !!activeChat?.messages,
      messagesLength: activeChat?.messages?.length || 0,
      generatedImagesEmpty: Object.keys(generatedImages).length === 0,
      isGeneratingImage,
      messages: activeChat?.messages?.map(msg => ({
        id: msg.id,
        hasImageUrl: !!msg.metadata?.generatedImageUrl,
        hasPublicId: !!msg.metadata?.generatedImagePublicId,
        imageUrl: msg.metadata?.generatedImageUrl,
        publicId: msg.metadata?.generatedImagePublicId
      }))
    });
    
    if (activeChat?.messages && Object.keys(generatedImages).length === 0 && !isGeneratingImage) {
      const restoredImages: { [messageId: string]: { url: string; publicId: string } } = {};
      
      activeChat.messages.forEach(msg => {
        if (msg.metadata?.generatedImageUrl && msg.metadata?.generatedImagePublicId) {
          restoredImages[msg.id] = {
            url: msg.metadata.generatedImageUrl,
            publicId: msg.metadata.generatedImagePublicId
          };
          console.log('Found image to restore:', {
            messageId: msg.id,
            url: msg.metadata.generatedImageUrl,
            publicId: msg.metadata.generatedImagePublicId
          });
        }
      });
      
      // Restore images if any were found
      if (Object.keys(restoredImages).length > 0) {
        console.log('Restoring images from database:', restoredImages);
        setGeneratedImages(restoredImages);
      } else {
        console.log('No images found to restore');
      }
    }
  }, [activeChat?.messages, generatedImages, isGeneratingImage]);

  // Handle pending messages when activeChat becomes available after creation
  useEffect(() => {
    const handlePendingMessages = async () => {
      if (activeChat && !isTemporaryChat) {
        // Save pending user message
        if (pendingUserMessage) {
          console.log('Saving pending user message to newly created chat');
          const success = await addMessage(
            pendingUserMessage.role,
            pendingUserMessage.content,
            { 
              attachments: pendingUserMessage.attachments,
              timestamp: pendingUserMessage.timestamp.toISOString()
            },
            false,
            pendingUserMessage.id
          );
          
          if (success) {
            setPendingUserMessage(null);
            // Don't remove from local messages during image generation to maintain message order
            if (!isGeneratingImage) {
              setLocalMessages(prev => prev.filter(m => m.id !== pendingUserMessage.id));
            }
          }
        }
        
        // Save pending assistant message
        if (pendingAssistantMessage) {
          console.log('Saving pending assistant message to newly created chat');
          const success = await addMessage(
            pendingAssistantMessage.role,
            pendingAssistantMessage.content,
            pendingAssistantMessage.metadata,
            false,
            pendingAssistantMessage.id
          );
          
          if (success) {
            setPendingAssistantMessage(null);
            // Don't remove from local messages during image generation to maintain message order
            if (!isGeneratingImage) {
              setLocalMessages(prev => prev.filter(m => m.id !== pendingAssistantMessage.id));
            }
          }
        }

        // Save any additional pending messages (like image generation assistant messages)
        if (pendingMessages.length > 0) {
          console.log('Saving pending messages to newly created chat:', pendingMessages.length);
          for (const message of pendingMessages) {
            console.log('Saving pending message with metadata:', {
              id: message.id,
              metadata: message.metadata,
              hasImageUrl: !!message.metadata?.generatedImageUrl,
              hasPublicId: !!message.metadata?.generatedImagePublicId
            });
            
            const success = await addMessage(
              message.role,
              message.content,
              message.metadata,
              false,
              message.id
            );
            
            console.log('Pending message save result:', success);
            
            if (success) {
              setPendingMessages(prev => prev.filter(m => m.id !== message.id));
              // Don't remove from local messages during image generation to maintain message order
              if (!isGeneratingImage) {
                setLocalMessages(prev => prev.filter(m => m.id !== message.id));
              }
            }
          }
        }
      }
    };
    
    handlePendingMessages();
  }, [activeChat?.id, isTemporaryChat, pendingUserMessage, pendingAssistantMessage, pendingMessages, addMessage, isGeneratingImage]);

  // Handle file selection from dialog
  const handleFilesSelected = async (files: File[]) => {
    try {
      setIsFileDialogOpen(false);

      // Convert files to base64 for now - in production, you'd upload to cloud storage
      const attachments: FileAttachment[] = await Promise.all(
        files.map(async (file) => {
          return new Promise<FileAttachment>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                type: "file",
                mediaType: file.type,
                url: reader.result as string, // This would be a cloud storage URL in production
                name: file.name,
                size: file.size,
              });
            };
            reader.readAsDataURL(file);
          });
        })
      );

      // If there's text in the input, send the message with attachments
      if (inputValue.trim()) {
        await handleSendMessage(inputValue, attachments);
        setInputValue("");
      } else {
        // Just show the attachments in the input for now
        // In a real implementation, you might want to show a preview
        console.log("Files selected:", attachments);
      }
    } catch (error) {
      console.error("Error handling file selection:", error);
    }
  };

  // Streaming states
  const [streamingContent, setStreamingContent] = useState("");
  const [currentStreamingId, setCurrentStreamingId] = useState<string | null>(
    null
  );

  // Handle stop generation
  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);
      setIsGeneratingImage(false);
      setGeneratingImageMessageIds(new Set());

      // Clean up streaming state
      setStreamingContent("");
      setCurrentStreamingId(null);
      setIsStreamingLocal(false);
    }
  };

  // Image generation helper
  const generateImageWithFlux = async (
    prompt: string,
    messageId: string,
    chatId: string | undefined
  ): Promise<string> => {
    try {
      if (!chatId) {
        throw new Error("Chat ID is required for image generation");
      }
      
      const response = await fetch("/api/images/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          prompt, 
          chatId: chatId,
          messageId 
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Image generation API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`Failed to generate image: ${response.status} - ${errorData}`);
      }

      const { imageUrl, cloudinaryPublicId } = await response.json();

      // Store the generated image with its public ID
      console.log('Storing generated image:', { messageId, imageUrl, cloudinaryPublicId });
      setGeneratedImages((prev) => {
        const newState = {
          ...prev,
          [messageId]: { url: imageUrl, publicId: cloudinaryPublicId },
        };
        console.log('Updated generatedImages state:', newState);
        return newState;
      });

      return imageUrl;
    } catch (error) {
      console.error("Error generating image:", error);
      throw error;
    }
  };

  // Enhanced message sending with proper database integration
  const handleSendMessage = async (
    content?: string,
    attachments: FileAttachment[] = []
  ) => {
    const messageContent = content?.trim() || inputValue.trim();
    if (!messageContent && attachments.length === 0) return;

    try {
      const currentUserId = user?.id || userId;
      setIsLoading(true);

      // Create abort controller for this request
      const controller = new AbortController();
      setAbortController(controller);

      const userMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: messageContent,
        role: "user",
        timestamp: new Date(),
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      let chatForSaving = activeChat;
      let currentChatId = activeChatId;
      
      // If no active chat exists and not temporary, create one
      if (!activeChat && !isTemporaryChat) {
        // Store the user message as pending until chat is created
        setPendingUserMessage(userMessage);
        // Add to local messages for immediate UI feedback
        setLocalMessages((prev) => [...prev, userMessage]);
        
        const newChatId = await createNewChat(userMessage.content.slice(0, 50));
        currentChatId = newChatId; // Update the chat ID to use for image generation
        if (newChatId && onChatCreated) {
          onChatCreated(newChatId);
        }
        // The useEffect will handle saving the pending message when activeChat is available
      } else if (!isTemporaryChat && activeChat) {
        // Existing chat - save normally
        setPendingMessages((prev) => [...prev, userMessage]);
        // Save to database
        const success = await addMessage(
          userMessage.role,
          userMessage.content,
          { 
            attachments: userMessage.attachments,
            timestamp: userMessage.timestamp.toISOString()
          },
          false, // optimistic = false since we're handling it manually
          userMessage.id
        );
        
        if (success) {
          // Remove from pending since it's now in the database
          setPendingMessages((prev) => prev.filter(m => m.id !== userMessage.id));
          // Clear any previous errors for this message
          setFailedMessageIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(userMessage.id);
            return newSet;
          });
        } else {
          // Mark message as failed
          console.error('Failed to save user message to database');
          setError('Failed to save message. Please try again.');
          setFailedMessageIds((prev) => new Set([...prev, userMessage.id]));
        }
      } else {
        // For temporary chats, use local messages
        setLocalMessages((prev) => [...prev, userMessage]);
      }

      setInputValue("");

      // Check if this is an image generation request
      const isImageRequest = isImageGenerationRequest(messageContent);

      if (isImageRequest) {
        setIsGeneratingImage(true);
        
        // Create assistant message first to get its ID for image association
        const assistantMessage: Message = {
          id: `msg_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`,
          content: "I've generated an image based on your request.",
          role: "assistant",
          timestamp: new Date(),
          metadata: {
            imageGenerated: true,
          },
        };

        // Add assistant message to local messages immediately for proper ordering
        setLocalMessages((prev) => [...prev, assistantMessage]);

        setGeneratingImageMessageIds(
          (prev) => new Set([...prev, assistantMessage.id])
        );

        try {
          const imageUrl = await generateImageWithFlux(messageContent, assistantMessage.id, currentChatId);

          // Clear generating state after successful image generation
          setGeneratingImageMessageIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(assistantMessage.id);
            return newSet;
          });

          // Get the image data immediately after generation
          // Access the fresh generatedImages state through a callback
          setGeneratedImages((currentImages) => {
            const imageData = currentImages[assistantMessage.id];
            console.log('Preparing to save image metadata to database:', {
              messageId: assistantMessage.id,
              imageData,
              currentChatId,
              isTemporaryChat
            });
            
            if (imageData && !isTemporaryChat && currentChatId) {
              const updatedAssistantMessage = {
                ...assistantMessage,
                metadata: {
                  ...assistantMessage.metadata,
                  generatedImageUrl: imageData.url,
                  generatedImagePublicId: imageData.publicId,
                }
              };

              console.log('Updated assistant message for database:', updatedAssistantMessage);
              setPendingMessages((prev) => [...prev, updatedAssistantMessage]);
            }
            
            return currentImages; // Return unchanged state
          });
          
          // Note: Assistant message already added to localMessages above for immediate display
        } catch (error) {
          console.error("Error generating image:", error);
          
          // Remove from generating set if failed
          setGeneratingImageMessageIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(assistantMessage.id);
            return newSet;
          });

          // Update assistant message to show error
          const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
          const updatedAssistantMessage = {
            ...assistantMessage,
            content: `Sorry, I couldn't generate the image. Error: ${errorMessage}`
          };

          // Update the message in localMessages
          setLocalMessages((prev) => 
            prev.map(msg => 
              msg.id === assistantMessage.id ? updatedAssistantMessage : msg
            )
          );

          setError(`Failed to generate image: ${errorMessage}`);
        } finally {
          setIsGeneratingImage(false);
          
          // Clean up local messages after image generation completes
          // Only clear if we have database messages and no pending messages
          setTimeout(() => {
            if (activeChat?.messages && pendingMessages.length === 0) {
              // Only remove messages that exist in database to avoid duplicates
              setLocalMessages(prev => 
                prev.filter(localMsg => 
                  !activeChat.messages.some(dbMsg => dbMsg.id === localMsg.id)
                )
              );
            }
          }, 500); // Increased timeout to ensure database messages are loaded
        }
      } else {
        // Prepare context for API call
        const contextMessages = messages.slice(-MAX_CONTEXT).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        // Add the new user message to the context
        const allMessages = [
          ...contextMessages,
          { role: "user" as const, content: messageContent }
        ];

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: allMessages,
            userId: currentUserId,
            sessionId: "default-session",
            model: selectedModel,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantResponse = "";

        if (reader) {
          // Create assistant message for streaming
          const assistantId = `msg_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`;
          setCurrentStreamingId(assistantId);
          setIsStreamingLocal(true);
          
          // Create a streaming message placeholder
          const streamingMsg: Message = {
            id: assistantId,
            content: "",
            role: "assistant",
            timestamp: new Date(),
            metadata: {
              model: selectedModel,
              isStreaming: true,
            },
          };
          setStreamingMessage(streamingMsg);

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              console.log("Received chunk:", chunk); // Debug log
              const lines = chunk.split("\n");

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6);
                  console.log("Processing SSE data:", data); // Debug log
                  
                  if (data === "[DONE]") {
                    console.log("Stream completed with [DONE]"); // Debug log
                    break;
                  }

                  try {
                    const parsed = JSON.parse(data);
                    console.log("Parsed streaming data:", parsed); // Debug log
                    
                    if (parsed.content) {
                      assistantResponse += parsed.content;
                      setStreamingContent(assistantResponse);
                      
                      // Update the streaming message content
                      setStreamingMessage(prev => prev ? {
                        ...prev,
                        content: assistantResponse
                      } : null);
                      
                      console.log("Updated streaming content, length:", assistantResponse.length); // Debug log
                    }
                  } catch (parseError) {
                    console.error("Error parsing streaming data:", parseError);
                    console.log("Raw streaming data:", data);
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }

          // Create final assistant message
          const finalAssistantMessage: Message = {
            id: assistantId,
            content: assistantResponse,
            role: "assistant",
            timestamp: new Date(),
            metadata: {
              model: selectedModel,
              tokens: assistantResponse.length,
            },
          };

          // Save assistant message to database or local state FIRST
          if (!isTemporaryChat) {
            // Check if we have an active chat
            if (activeChat) {
              setPendingMessages((prev) => [...prev, finalAssistantMessage]);
              // Save to database
              const success = await addMessage(
                finalAssistantMessage.role,
                finalAssistantMessage.content,
                finalAssistantMessage.metadata,
                false, // optimistic = false
                finalAssistantMessage.id
              );
              
              if (success) {
                // Remove from pending since it's now in the database
                setPendingMessages((prev) => prev.filter(m => m.id !== finalAssistantMessage.id));
                // Clear any previous errors
                setFailedMessageIds((prev) => {
                  const newSet = new Set(prev);
                  newSet.delete(finalAssistantMessage.id);
                  return newSet;
                });
              } else {
                console.error('Failed to save assistant message to database');
                setError('Failed to save response. The conversation may not be saved.');
                setFailedMessageIds((prev) => new Set([...prev, finalAssistantMessage.id]));
              }
            } else {
              // No active chat yet (newly created chat, state not updated yet)
              // Store as pending and add to local messages for UI
              setPendingAssistantMessage(finalAssistantMessage);
              setLocalMessages((prev) => [...prev, finalAssistantMessage]);
              console.log('Assistant message stored as pending - activeChat not yet available');
            }
          } else {
            // For temporary chats, use local messages
            setLocalMessages((prev) => [...prev, finalAssistantMessage]);
          }

          // Clear streaming state AFTER saving the message
          setStreamingContent("");
          setCurrentStreamingId(null);
          setIsStreamingLocal(false);
          setStreamingMessage(null);

          // Generate title if this is the first exchange
          if (
            activeChat &&
            activeChat.messages.length === 0 &&
            !isTemporaryChat
          ) {
            const title = await generateTitle(messageContent);
            if (title) {
              await updateTitle(title);
            }
          }

          // TODO: Save to background memory without blocking UI
          // backgroundMemorySaver.saveConversation(currentUserId, messageContent, assistantResponse);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Request was aborted");
        setError(null); // Clear error on user abort
      } else {
        console.error("Error sending message:", error);
        setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
      setIsStreamingLocal(false);
      setAbortController(null);
    }
  };

  // Handle edit message
  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditContent(content);
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editContent.trim()) return;

    try {
      setIsEditingSave(true);

      // Find the message being edited
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex === -1) return;

      const originalMessage = messages[messageIndex];

      // Create edit history entry
      const editHistoryEntry = {
        content: originalMessage.content,
        timestamp: new Date(),
      };

      // Update the message with new content and edit history
      const updatedMessage: Message = {
        ...originalMessage,
        content: editContent.trim(),
        metadata: {
          ...originalMessage.metadata,
          editHistory: [
            ...(originalMessage.metadata?.editHistory || []),
            editHistoryEntry,
          ],
        },
      };

      // Check if message exists in the database
      if (activeChat && !isTemporaryChat) {
        const messageExistsInDB = activeChat?.messages.some(
          (m) => m.id === messageId
        );

        if (messageExistsInDB) {
          // Update existing message in database
          try {
            const response = await fetch(`/api/messages/${messageId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content: editContent.trim(),
                editHistory: updatedMessage.metadata?.editHistory,
              }),
            });

            if (!response.ok) {
              throw new Error("Failed to update message in database");
            }
            
            // The activeChat hook should automatically refresh when API succeeds
          } catch (dbError) {
            console.error("Database update failed:", dbError);
            // Fall back to local update if database fails
            setLocalMessages((prev) =>
              prev.map((msg) => (msg.id === messageId ? updatedMessage : msg))
            );
            setPendingMessages((prev) =>
              prev.map((msg) => (msg.id === messageId ? updatedMessage : msg))
            );
          }
        } else {
          // Message not in DB, update local/pending messages
          setLocalMessages((prev) =>
            prev.map((msg) => (msg.id === messageId ? updatedMessage : msg))
          );
          setPendingMessages((prev) =>
            prev.map((msg) => (msg.id === messageId ? updatedMessage : msg))
          );
        }
      } else {
        // Update local messages for temporary chat
        setLocalMessages((prev) =>
          prev.map((msg) => (msg.id === messageId ? updatedMessage : msg))
        );
      }

      // If this was a user message and it triggered regeneration of subsequent messages
      if (originalMessage.role === "user") {
        // Remove all messages after this one and regenerate
        const messagesUpToUser = messages.slice(0, messageIndex + 1);
        // Update the user message in this slice
        messagesUpToUser[messageIndex] = updatedMessage;

        // Clear subsequent messages and regenerate
        // For database chats, this needs more sophisticated handling
        if (isTemporaryChat) {
          setLocalMessages(messagesUpToUser.filter(msg => msg.role === 'user'));
        } else {
          // Clear pending messages that come after this user message
          setPendingMessages([]);
          setStreamingMessage(null);
        }

        // Regenerate assistant response
        await handleRegenerateResponse(messageId);
      }

      setEditingMessageId(null);
      setEditContent("");
    } catch (error) {
      console.error("Error saving edit:", error);
    } finally {
      setIsEditingSave(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleRegenerateResponse = async (messageId: string) => {
    try {
      setIsLoading(true);

      // Find the message that triggered the regeneration
      const messageIndex = messages.findIndex((msg) => msg.id === messageId);
      if (messageIndex === -1) return;

      // If it's a user message, get all messages up to and including this one
      const messagesUpToUser = messages.slice(0, messageIndex + 1);
      const lastUserMessage = messagesUpToUser[messagesUpToUser.length - 1];

      if (lastUserMessage.role !== "user") return;

      // Handle regeneration for local messages or temporary chats
      if (activeChat && !isTemporaryChat) {
        // For now, handle regeneration manually since regenerateMessage is not available
        // Remove all assistant messages after the user message
        const filteredMessages = messagesUpToUser;
        setLocalMessages(filteredMessages);
        // Regenerate response
        await handleSendMessage(lastUserMessage.content);
      } else {
        // Handle regeneration for local messages or temporary chats
        // Remove all assistant messages after the user message
        const filteredMessages = messagesUpToUser;
        setLocalMessages(filteredMessages);

        // Regenerate response
        await handleSendMessage(lastUserMessage.content);
      }
    } catch (error) {
      console.error("Error regenerating response:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard events
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
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
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

  const handleTemporaryChatToggle = (enabled: boolean) => {
    setIsTemporaryChat(enabled);
    // Clear all message state when toggling temporary chat (unless generating image)
    if (enabled && !isGeneratingImage) {
      setLocalMessages([]);
      setPendingMessages([]);
      setStreamingMessage(null);
      setError(null);
      setFailedMessageIds(new Set());
      setStreamingContent("");
      setCurrentStreamingId(null);
      setIsStreamingLocal(false);
    }
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [abortController]);

  // Clear all message state when activeChatId changes, but preserve during image generation
  useEffect(() => {
    // Don't clear local messages if we're currently generating an image
    if (!isGeneratingImage) {
      setLocalMessages([]); // Clear local messages from previous chat
      // Don't clear generatedImages - they should persist for the session
    }
    setPendingMessages([]);
    setStreamingMessage(null);
    setError(null);
    setFailedMessageIds(new Set());
    setStreamingContent("");
    setCurrentStreamingId(null);
    setIsStreamingLocal(false);
  }, [activeChatId, isGeneratingImage]);

  // Load chat when activeChatId changes, or clear when undefined
  useEffect(() => {
    console.log("activeChatId changed:", activeChatId); // Debug log
    if (activeChatId && !activeChatId.startsWith('temp-') && isSignedIn && user?.id && loadChat) {
      console.log("Loading chat:", activeChatId); // Debug log
      loadChat(activeChatId);
    } else if (!activeChatId && clearActiveChat) {
      console.log("Clearing active chat for new chat"); // Debug log
      // Clear active chat when starting a new chat
      clearActiveChat();
    }
  }, [activeChatId, isSignedIn, user?.id, loadChat, clearActiveChat]);

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Set up global reset function for chat
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).resetMainContentChat = () => {
        setLocalMessages([]);
        setPendingMessages([]);
        setInputValue("");
        setIsLoading(false);
        setEditingMessageId(null);
        setEditContent("");
        // Don't clear generated images - they should persist for the session
        setIsGeneratingImage(false);
        setGeneratingImageMessageIds(new Set());
        setAbortController(null);
        setStreamingContent("");
        setCurrentStreamingId(null);
        setStreamingMessage(null);
        setError(null);
        setFailedMessageIds(new Set());
        setIsStreamingLocal(false);
      };
    }
  }, []);

  return (
    <div>
      {showImageView ? (
        <ImageView
          currentImage={currentImage}
          onCloseImageView={onCloseImageView}
        />
      ) : (
        <div className={cn("flex flex-col h-screen relative")}>
          {/* Mobile Header with Full Width Layout */}
          {isMobile && (
            <MobileHeader
              isNavExpanded={isNavExpanded}
              isTemporaryChat={isTemporaryChat}
              onToggle={onToggle}
              onTemporaryChatToggle={handleTemporaryChatToggle}
            />
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

          {/* Error display */}
          {error && (
            <div className="mx-auto w-full max-w-4xl px-4 mb-4">
              <div className="bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-300 ml-2"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Chat area */}
          <ChatArea
            messages={messages}
            isLoading={isLoading}
            isStreaming={isStreamingLocal}
            isGeneratingImage={isGeneratingImage}
            isTemporaryChat={isTemporaryChat}
            isSignedIn={isSignedIn || false}
            inputValue={inputValue}
            editingMessageId={editingMessageId}
            editContent={editContent}
            isEditingSave={isEditingSave}
            copiedMessageId={copiedMessageId}
            likedMessages={likedMessages}
            dislikedMessages={dislikedMessages}
            isSavingToMongoDB={isSavingToMongoDB}
            generatingImageMessageIds={generatingImageMessageIds}
            generatedImages={generatedImages}
            failedMessageIds={failedMessageIds}
            textareaRef={textareaRef}
            onEditMessage={handleEditMessage}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            onCopyToClipboard={copyToClipboard}
            onEditContentChange={setEditContent}
            onLikeMessage={handleLikeMessage}
            onDislikeMessage={handleDislikeMessage}
            onRegenerateResponse={handleRegenerateResponse}
            onSetImage={onSetImage}
            onInputChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onSendMessage={handleSendMessage}
            onStopGeneration={handleStopGeneration}
            onFileDialogOpen={() => setIsFileDialogOpen(true)}
          />
        </div>
      )}

      {/* File Upload Dialog */}
      <FileUploadDialog
        isOpen={isFileDialogOpen}
        onClose={() => setIsFileDialogOpen(false)}
        onFilesSelected={handleFilesSelected as any}
      />
    </div>
  );
}