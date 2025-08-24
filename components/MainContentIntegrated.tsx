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
  MoreHorizontal,
  Download,
  FileText,
  Menu,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatHeader } from "./ChatHeader";
import { FileUploadDialog } from "./FileUploadDialog";
import { useResponsive } from "@/hooks/use-responsive";
import { sessionManager } from "@/lib/session";
import { useUser } from "@clerk/nextjs";
import { useActiveChat } from "@/hooks/use-active-chat";
import { useChatHistory } from "@/hooks/use-chat-history";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { backgroundMemorySaver } from '@/lib/services/backgroundSaver';
import { ImageSkeleton } from "./ui/image-skeleton";

interface FileAttachment {
  type: 'file';
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
  const simpleKeywords = [
    'paint', 'sketch', 'render', 'visualize', 'design'
  ];
  
  // Check patterns first
  const hasImagePattern = imagePatterns.some(pattern => pattern.test(lowerText));
  
  // Check simple keywords (but only if they seem to be the main action)
  const hasSimpleKeyword = simpleKeywords.some(keyword => 
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
  onNewChat,
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
  const [userId, setUserId] = useState<string>('default_user');
  const [isStoringMemory, setIsStoringMemory] = useState(false);
  const [backgroundMemoryTasks, setBackgroundMemoryTasks] = useState<string[]>([]);
  const [isSavingToMongoDB, setIsSavingToMongoDB] = useState(false);
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<{[messageId: string]: {url: string, publicId: string}}>({});
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatingImageMessageIds, setGeneratingImageMessageIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { isMobile, useOverlayNav } = useResponsive();
  const { user, isSignedIn, isLoaded } = useUser();

  // MongoDB-powered chat management
  const { activeChat, isLoading: chatLoading, addMessage, createNewChat, updateTitle, generateTitle, loadChat, clearActiveChat } = useActiveChat(activeChatId);
  const { fetchChatHistory } = useChatHistory();

  // Persistent message state - prioritizes local state over DB
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [shouldLoadFromDB, setShouldLoadFromDB] = useState(true);

  // Use local messages as the source of truth, only fall back to DB when needed
  const messages: Message[] = localMessages.length > 0 || !shouldLoadFromDB
    ? localMessages 
    : (activeChat?.messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.role,
        timestamp: msg.timestamp,
      })) || []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load from DB when active chat changes or when there are no local messages
  useEffect(() => {
    if (activeChatId) {
      // Always load the chat when activeChatId changes
      if (!activeChat || activeChat.id !== activeChatId) {
        // Reset local state when switching chats
        setLocalMessages([]);
        setShouldLoadFromDB(true);
        loadChat(activeChatId);
      }
      
      // Load messages from activeChat into local state
      if (activeChat?.id === activeChatId && shouldLoadFromDB) {
        console.log('Loading chat from DB:', {
          chatId: activeChatId,
          messageCount: activeChat.messages.length,
          messages: activeChat.messages.map(m => ({
            id: m.id,
            role: m.role,
            hasAttachments: !!(m.attachments && m.attachments.length > 0),
            hasGeneratedImage: !!(m.metadata?.generatedImage),
            metadata: m.metadata
          }))
        });

        const dbMessages: Message[] = activeChat.messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          role: msg.role,
          timestamp: msg.timestamp,
          attachments: msg.attachments || [], // Provide default empty array
        }));
        
        // Method 1: Restore generated images from message metadata (existing approach)
        const restoredFromMetadata: {[messageId: string]: {url: string, publicId: string}} = {};
        let imageCountFromMetadata = 0;
        activeChat.messages.forEach(msg => {
          if (msg.metadata?.generatedImage && msg.metadata.generatedImage.url) {
            restoredFromMetadata[msg.id] = {
              url: msg.metadata.generatedImage.url,
              publicId: msg.metadata.generatedImage.publicId
            };
            imageCountFromMetadata++;
            console.log('📝 Restored image from metadata:', {
              messageId: msg.id,
              imageUrl: msg.metadata.generatedImage.url,
              publicId: msg.metadata.generatedImage.publicId
            });
          }
        });
        
        // Method 2: Query GeneratedImage collection as fallback (new robust approach)
        const loadGeneratedImagesFromAPI = async () => {
          try {
            console.log('🔍 Querying GeneratedImage collection for chat:', activeChatId);
            const response = await fetch(`/api/images/gallery?type=generated&chatId=${activeChatId}`);
            
            if (response.ok) {
              const data = await response.json();
              console.log('📊 Generated images from API:', {
                count: data.images?.length || 0,
                images: data.images?.map((img: any) => ({
                  id: img.id,
                  url: img.cloudinaryUrl,
                  generatedAt: img.generatedAt
                }))
              });

              // Match generated images to assistant messages by messageId
              const restoredFromAPI: {[messageId: string]: {url: string, publicId: string}} = {};
              
              if (data.images && data.images.length > 0) {
                const assistantMessages = activeChat.messages.filter(m => m.role === 'assistant');
                
                data.images.forEach((apiImage: any, index: number) => {
                  // Method 1: Match by messageId if available (for new images)
                  if (apiImage.messageId) {
                    restoredFromAPI[apiImage.messageId] = {
                      url: apiImage.cloudinaryUrl,
                      publicId: apiImage.cloudinaryPublicId
                    };
                    console.log('🔗 Matched API image to message by messageId:', {
                      messageId: apiImage.messageId,
                      imageUrl: apiImage.cloudinaryUrl,
                      generatedAt: apiImage.generatedAt
                    });
                  } 
                  // Method 2: Fallback to order-based matching for legacy images (temporary)
                  else if (assistantMessages[index]) {
                    const messageId = assistantMessages[index].id;
                    restoredFromAPI[messageId] = {
                      url: apiImage.cloudinaryUrl,
                      publicId: apiImage.cloudinaryPublicId
                    };
                    console.log('🔄 Matched legacy image by order (temporary fix):', {
                      messageId,
                      imageUrl: apiImage.cloudinaryUrl,
                      generatedAt: apiImage.generatedAt,
                      warning: 'Legacy image without messageId - should be updated'
                    });
                  } else {
                    console.warn('⚠️ Unable to match image - no messageId and no corresponding assistant message:', {
                      imageId: apiImage.id,
                      generatedAt: apiImage.generatedAt,
                      chatId: apiImage.chatId,
                      availableAssistantMessages: assistantMessages.length
                    });
                  }
                });
              }

              // Combine both methods - metadata takes precedence, API as fallback
              const combinedImages = { ...restoredFromAPI, ...restoredFromMetadata };
              
              console.log('✅ Chat restoration complete:', {
                messagesLoaded: dbMessages.length,
                imagesFromMetadata: imageCountFromMetadata,
                imagesFromAPI: Object.keys(restoredFromAPI).length,
                totalImagesRestored: Object.keys(combinedImages).length,
                finalImages: Object.keys(combinedImages).map(msgId => ({
                  messageId: msgId,
                  url: combinedImages[msgId].url,
                  publicId: combinedImages[msgId].publicId
                }))
              });
              
              // Validate image URLs before setting state
              const validatedImages: {[messageId: string]: {url: string, publicId: string}} = {};
              const validationPromises = Object.entries(combinedImages).map(async ([messageId, imageData]) => {
                try {
                  // Quick validation - just check if URL is a valid string and has expected format
                  if (imageData.url && typeof imageData.url === 'string' && imageData.url.startsWith('http')) {
                    validatedImages[messageId] = imageData;
                    console.log('✅ Image URL validated:', { messageId, url: imageData.url });
                  } else {
                    console.warn('⚠️ Invalid image URL detected:', { messageId, url: imageData.url });
                  }
                } catch (error) {
                  console.error('❌ Error validating image:', { messageId, error });
                }
              });
              
              await Promise.allSettled(validationPromises);
              setGeneratedImages(validatedImages);
            } else {
              console.warn('⚠️ Failed to fetch generated images from API, using metadata only');
              setGeneratedImages(restoredFromMetadata);
            }
          } catch (error) {
            console.error('❌ Error loading generated images from API:', error);
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
      setIsStoringMemory(false);
      setBackgroundMemoryTasks([]);
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
      } else if (typeof window !== 'undefined') {
        const sessionId = sessionManager.getOrCreateSession();
        setUserId(sessionId);
      }
    }
  }, [user, isSignedIn, isLoaded]);

  // Setup background memory saver callbacks
  useEffect(() => {
    backgroundMemorySaver.setCallbacks({
      onStart: (taskId) => {
        setBackgroundMemoryTasks(prev => [...prev, taskId]);
        setIsStoringMemory(true);
      },
      onSuccess: (taskId) => {
        console.log(`Background memory save completed: ${taskId}`);
      },
      onError: (taskId, error) => {
        console.error(`Background memory save failed: ${taskId}`, error);
      },
      onComplete: (taskId, success) => {
        setBackgroundMemoryTasks(prev => prev.filter(id => id !== taskId));
        // Only set to false if no more tasks are running
        setIsStoringMemory(prev => {
          const remainingTasks = backgroundMemoryTasks.filter(id => id !== taskId);
          return remainingTasks.length > 0;
        });
      }
    });
  }, [backgroundMemoryTasks]);

  // Handle file uploads
  const handleFilesSelected = async (attachments: FileAttachment[], messageText?: string) => {
    let content = messageText;
    
    if (!content) {
      // Auto-generate prompt based on file types
      const imageFiles = attachments.filter(f => f.mediaType.startsWith('image/'));
      const documentFiles = attachments.filter(f => f.mediaType === 'application/pdf' || f.mediaType.includes('text') || f.mediaType.includes('document'));
      const otherFiles = attachments.filter(f => !f.mediaType.startsWith('image/') && !documentFiles.includes(f));
      
      if (imageFiles.length > 0 && documentFiles.length === 0 && otherFiles.length === 0) {
        content = imageFiles.length === 1 
          ? "What do you see in this image? Please describe it in detail."
          : "What do you see in these images? Please describe each one.";
      } else if (documentFiles.length > 0 && imageFiles.length === 0 && otherFiles.length === 0) {
        content = documentFiles.length === 1
          ? "Please analyze this document and tell me what it contains. Summarize the key points."
          : "Please analyze these documents and tell me what they contain. Summarize the key points from each.";
      } else {
        content = "Please analyze these files and tell me what they contain. Provide insights about each file.";
      }
    }
    
    await handleSendMessage(content, attachments);
  };

  // Image generation function
  const handleImageGeneration = async (prompt: string, chatId: string, messageId?: string): Promise<{url: string, publicId: string, imageId: string} | null> => {
    try {
      setIsGeneratingImage(true);
      
      console.log('🎨 Starting image generation:', {
        prompt: prompt.trim(),
        chatId: chatId,
        messageId: messageId,
        activeChatId: activeChatId, // For comparison
        hasActiveChat: !!activeChat,
        activeChatTitle: activeChat?.title
      });

      const response = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: prompt.trim(),
          chatId: chatId, // Use the passed chatId parameter
          messageId: messageId
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('🔥 Image generation API failed:', {
          status: response.status,
          statusText: response.statusText,
          error: result.error,
          prompt: prompt.trim(),
          chatId: chatId,
          messageId: messageId
        });
        return null;
      }

      if (result.success && result.imageUrl) {
        console.log('🎨 Image generation successful:', {
          imageUrl: result.imageUrl,
          imageId: result.imageId,
          messageId: messageId,
          prompt: prompt.trim(),
          metadata: result.metadata
        });
        return {
          url: result.imageUrl,
          publicId: result.cloudinaryPublicId,
          imageId: result.imageId
        };
      }

      console.warn('⚠️ Image generation response missing data:', {
        success: result.success,
        hasImageUrl: !!result.imageUrl,
        result: result
      });
      return null;
    } catch (error) {
      console.error('💥 Critical error during image generation:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        prompt: prompt.trim(),
        chatId: chatId,
        messageId: messageId
      });
      return null;
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Streaming API call with MongoDB persistence
  const handleSendMessage = async (content: string = inputValue, attachments?: FileAttachment[]) => {
    if (!content.trim() && !attachments?.length) return;
    if (!isSignedIn) {
      console.error('User must be signed in to send messages');
      return;
    }
    
    setIsLoading(true);
    setInputValue("");

    try {
      let currentChatId = activeChatId;
      
      // Create new chat if this is the first message
      if (!activeChat) {
        const title = generateTitle(content.trim());
        currentChatId = (await createNewChat(title, {
          role: 'user',
          content: content.trim()
        })) || undefined;
        
        if (!currentChatId) {
          throw new Error('Failed to create new chat');
        }
        
        // Notify parent component about new chat
        onChatCreated?.(currentChatId);
        
        // Refresh chat history in sidebar
        fetchChatHistory();
        
        // Continue with AI response since the initial message was already added
      } else {
        // For existing chats, we'll add the user message to local state (already done below)
        // MongoDB save will happen in the background after the AI response
      }

      // Get current messages for context
      const contextMessages = messages.slice(-MAX_CONTEXT).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Add the new user message to context
      contextMessages.push({
        role: 'user',
        content: content.trim(),
      });

      // Check if this is an image generation request
      const isImageRequest = isImageGenerationRequest(content.trim());
      console.log('Image generation check:', { content: content.trim(), isImageRequest });
      
      // Create new messages for the current conversation
      const userMessage: Message = {
        id: crypto.randomUUID(),
        content: content.trim(),
        role: 'user',
        timestamp: new Date(),
        attachments: attachments,
      };

      const assistantId = crypto.randomUUID();
      let assistantMessage: Message = {
        id: assistantId,
        content: isImageRequest ? '' : '',
        role: 'assistant',
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
        setGeneratingImageMessageIds(prev => new Set([...prev, assistantId]));
        
        // Generate image - use currentChatId (not activeChatId which can be null)
        if (!currentChatId) {
          throw new Error('No valid chat ID for image generation');
        }
        const imageResult = await handleImageGeneration(content.trim(), currentChatId, assistantId);
        
        if (imageResult) {
          // Store the generated image
          setGeneratedImages(prev => ({
            ...prev,
            [assistantId]: { url: imageResult.url, publicId: imageResult.publicId }
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
            content: 'Sorry, I was unable to generate an image. Please try again with a different prompt.',
          };
        }

        // Update the assistant message in local state
        setLocalMessages(prev => 
          prev.map(msg => 
            msg.id === assistantId 
              ? assistantMessage
              : msg
          )
        );

        setIsStreaming(false);
        
        // Remove from generating set
        setGeneratingImageMessageIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(assistantId);
          return newSet;
        });

        // Save to MongoDB in background
        if (imageResult || !imageResult) { // Save regardless of success/failure
          setIsSavingToMongoDB(true);
          
          const backgroundSave = async () => {
            try {
              console.log('🔄 Starting background save for image generation:', {
                chatId: activeChatId,
                hasActiveChat: !!activeChat,
                imageResult: imageResult ? {
                  url: imageResult.url,
                  publicId: imageResult.publicId,
                  imageId: imageResult.imageId
                } : null,
                messageContent: assistantMessage.content
              });

              // For existing chats, save the user message first
              // Note: For new chats, user message was already saved during createNewChat
              if (activeChat) {
                console.log('💾 Saving user message for existing chat...');
                await addMessage('user', content.trim(), { attachments }, false);
              } else {
                console.log('💾 Skipping user message save - already saved during new chat creation');
              }
              
              // Then save the assistant response with image metadata
              const messageMetadata = { 
                model: selectedModel,
                tokens: assistantMessage.content.length,
                imageGenerated: !!imageResult,
                generatedImage: imageResult ? {
                  url: imageResult.url,
                  publicId: imageResult.publicId,
                  imageId: imageResult.imageId,
                  messageId: assistantId, // Link image to message
                  prompt: content.trim(),
                  generatedAt: new Date().toISOString()
                } : undefined
              };

              console.log('💾 Saving assistant message with metadata:', messageMetadata);
              
              // Save assistant message - use direct API call if activeChat is null (new chats)
              if (activeChat) {
                await addMessage('assistant', assistantMessage.content, messageMetadata, false);
              } else {
                // For new chats, use direct API call since activeChat is still null
                console.log('💾 Using direct API call for new chat assistant message...');
                const response = await fetch(`/api/chats/${currentChatId}/messages`, {
                  method: 'POST',
                  credentials: 'include',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    role: 'assistant',
                    content: assistantMessage.content,
                    metadata: messageMetadata,
                  }),
                });
                
                if (!response.ok) {
                  throw new Error(`Failed to save assistant message: ${response.status}`);
                }
                
                console.log('✅ Assistant message saved via direct API call');
              }
              
              console.log('✅ MongoDB background save completed successfully');
              return true;
            } catch (error) {
              console.error('❌ MongoDB background save failed:', {
                error: error instanceof Error ? error.message : error,
                stack: error instanceof Error ? error.stack : undefined,
                chatId: activeChatId,
                imageResult: imageResult ? 'present' : 'null'
              });
              return false;
            } finally {
              setIsSavingToMongoDB(false);
            }
          };

          backgroundSave().then((mongoSaveSuccess) => {
            // Refresh chat history in sidebar
            fetchChatHistory();
          }).catch(error => {
            console.error('Background save workflow failed:', error);
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
          userId: user?.id || userId,
          attachments: attachments,
          chatId: currentChatId
        }),
      });

      if (!response.body) throw new Error("No response body");
      
      // Check if this response contains a generated image
      const generatedImageHeader = response.headers.get('X-Generated-Image');
      let generatedImageData = null;
      if (generatedImageHeader) {
        try {
          generatedImageData = JSON.parse(generatedImageHeader);
        } catch (e) {
          console.error('Failed to parse generated image data:', e);
        }
      }
      
      const reader = response.body.getReader();
      let streamingText = "";

      // For regular chat (not image generation), update the assistant message to empty for streaming
      assistantMessage.content = '';
      setLocalMessages(prev => 
        prev.map(msg => 
          msg.id === assistantId 
            ? assistantMessage
            : msg
        )
      );
      setIsStreaming(true);

      // Stream the response with real-time updates
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        streamingText += chunk;

        // Update the assistant message content in real-time
        setLocalMessages(prev => 
          prev.map(msg => 
            msg.id === assistantId 
              ? { ...msg, content: streamingText }
              : msg
          )
        );
      }

      // End streaming mode immediately - local state is now the source of truth
      setIsStreaming(false);

      // Save to MongoDB in background without affecting UI state
      if (streamingText.trim()) {
        setIsSavingToMongoDB(true);
        
        // Background save - don't await this, let it run async
        const backgroundSave = async () => {
          try {
            // For existing chats, save the user message first
            if (activeChat) {
              await addMessage('user', content.trim(), { attachments }, false);
            }
            
            // Then save the assistant response
            await addMessage('assistant', streamingText.trim(), { 
              model: selectedModel,
              tokens: streamingText.length 
            }, false);
            
            console.log('MongoDB background save completed successfully');
            return true;
          } catch (error) {
            console.error('MongoDB background save failed:', error);
            return false;
          } finally {
            setIsSavingToMongoDB(false);
          }
        };

        // Start background save and handle memory storage
        backgroundSave().then((mongoSaveSuccess) => {
          // Only save to memory if MongoDB save was successful
          if (isSignedIn && user?.id && mongoSaveSuccess) {
            const conversationToStore = [
              { role: "user" as const, content: content.trim() },
              { role: "assistant" as const, content: streamingText.trim() }
            ];
            
            console.log('Queuing conversation for background memory storage');
            
            // Add to background memory queue
            backgroundMemorySaver.addMemoryTask(conversationToStore, { 
              timestamp: new Date().toISOString(),
              model: selectedModel,
              tokens: streamingText.length
            });
          }

          // Refresh chat history in sidebar
          fetchChatHistory();
        }).catch(error => {
          console.error('Background save workflow failed:', error);
        });
      }
      
    } catch (err) {
      console.error('Error in chat flow:', err);
      
      // End streaming mode and reset states
      setIsStreaming(false);
      setIsSavingToMongoDB(false);
      
      // Add error message to chat if we have an active chat
      if (activeChatId) {
        await addMessage('assistant', 'Sorry, I encountered an error. Please try again.', { error: true }, false);
      }
    } finally {
      setIsLoading(false);
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
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1 || messages[messageIndex].role !== 'assistant') {
      console.error('Invalid message for regeneration:', messageId);
      return;
    }

    // Find the corresponding user message (should be the one right before)
    const userMessageIndex = messageIndex - 1;
    if (userMessageIndex < 0 || messages[userMessageIndex].role !== 'user') {
      console.error('Could not find corresponding user message for regeneration');
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
        content: isImageRequest ? '' : '',
        role: 'assistant',
        timestamp: new Date(),
      };

      // Update local state with new assistant message
      const updatedMessages = [...messagesUpToUser, newAssistantMessage];
      setLocalMessages(updatedMessages);

      if (isImageRequest) {
        // Handle image regeneration
        setGeneratingImageMessageIds(prev => new Set([...prev, newAssistantId]));
        const imageResult = await handleImageGeneration(userMessage.content, activeChatId!, newAssistantId);
        
        if (imageResult) {
          setGeneratedImages(prev => ({
            ...prev,
            [newAssistantId]: { url: imageResult.url, publicId: imageResult.publicId }
          }));
          
          newAssistantMessage.content = `I've regenerated an image based on your request: "${userMessage.content}"`;
        } else {
          newAssistantMessage.content = 'Sorry, I was unable to regenerate the image. Please try again.';
        }

        // Update the message in local state
        setLocalMessages(prev => 
          prev.map(msg => 
            msg.id === newAssistantId 
              ? newAssistantMessage
              : msg
          )
        );
        
        // Remove from generating set
        setGeneratingImageMessageIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(newAssistantId);
          return newSet;
        });

        // Save to MongoDB
        setIsSavingToMongoDB(true);
        try {
          await addMessage('assistant', newAssistantMessage.content, { 
            model: selectedModel,
            tokens: newAssistantMessage.content.length,
            imageGenerated: !!imageResult,
            regenerated: true,
            generatedImage: imageResult ? {
              url: imageResult.url,
              publicId: imageResult.publicId,
              imageId: imageResult.imageId,
              messageId: newAssistantId, // Link image to message
              prompt: userMessage.content,
              generatedAt: new Date().toISOString()
            } : undefined
          }, false);
        } catch (error) {
          console.error('Failed to save regenerated image response to MongoDB:', error);
        } finally {
          setIsSavingToMongoDB(false);
        }
      } else {
        // Handle text regeneration
        const historyForAPI = messagesUpToUser
          .filter(msg => msg.role !== 'system')
          .slice(-MAX_CONTEXT)
          .map(msg => ({
            role: msg.role,
            content: msg.content,
          }));

        // Make API call for text response
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: historyForAPI,
            userId,
            chatId: activeChatId,
            attachments: userMessage.attachments,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body reader available');
        }

        let fullContent = '';
        const decoder = new TextDecoder();

        // Stream the response
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;

          // Update the assistant message with streaming content
          setLocalMessages(prev => 
            prev.map(msg => 
              msg.id === newAssistantId 
                ? { ...msg, content: fullContent }
                : msg
            )
          );
        }

        // Save the final response to MongoDB
        setIsSavingToMongoDB(true);
        try {
          await addMessage('assistant', fullContent, { 
            model: selectedModel,
            tokens: fullContent.length,
            regenerated: true
          }, false);
          
          // Start background memory saving for authenticated users
          if (isSignedIn && fullContent.trim()) {
            const memoryMessages = [
              { role: 'user' as const, content: userMessage.content },
              { role: 'assistant' as const, content: fullContent }
            ];
            
            backgroundMemorySaver.addMemoryTask(memoryMessages, { userId });
            setIsStoringMemory(true);
            
            const taskId = Date.now().toString();
            setBackgroundMemoryTasks(prev => [...prev, taskId]);
            
            setTimeout(() => {
              setBackgroundMemoryTasks(prev => prev.filter(id => id !== taskId));
              if (backgroundMemoryTasks.length <= 1) {
                setIsStoringMemory(false);
              }
            }, 3000);
          }
        } catch (error) {
          console.error('Failed to save regenerated response to MongoDB:', error);
        } finally {
          setIsSavingToMongoDB(false);
        }
      }

      // Refresh chat history
      fetchChatHistory();
      
    } catch (error) {
      console.error('Error regenerating response:', error);
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
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
    setIsStoringMemory(false);
    setBackgroundMemoryTasks([]);
    setGeneratedImages({});
    setIsGeneratingImage(false);
    setGeneratingImageMessageIds(new Set());
  };

  const handleTemporaryChatToggle = (enabled: boolean) => {
    setIsTemporaryChat(enabled);
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
    console.log('Generated images state updated:', {
      imageCount: Object.keys(generatedImages).length,
      images: Object.entries(generatedImages).map(([messageId, data]) => ({
        messageId,
        url: data.url,
        publicId: data.publicId
      }))
    });
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
        <div className={cn(
          "flex flex-col h-full relative",
          useOverlayNav ? "w-full" : "w-[800px]"
        )}>
          {/* Mobile Header with Full Width Layout */}
          {isMobile && (
            <div className="flex items-center justify-between py-3 px-4 bg-[#2f2f2f] w-full -mx-4">
              {/* Hamburger Menu - Far Left */}
              {!isNavExpanded && onToggle && (
                <Button
                  onClick={onToggle}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-[#404040] w-10 h-10 p-0 flex-shrink-0"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}
              
              {/* Upgrade Button - Center Left */}
              <div className="flex-1 flex justify-center">
                <Button className="bg-[#6366f1] hover:bg-[#5855eb] text-white px-4 py-2 rounded-full text-sm font-medium">
                  <div className="w-4 h-4 mr-2 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="currentColor">
                      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.078 6.078 0 0 0 6.529 2.9 5.973 5.973 0 0 0 4.258 1.786c1.638 0 3.185-.65 4.299-1.786a5.987 5.987 0 0 0 4.007-2.9 6.042 6.042 0 0 0-.75-7.094l.003-.003z"/>
                    </svg>
                  </div>
                  Upgrade to Go
                </Button>
              </div>
              
              {/* Settings Icon - Far Right */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-[#404040] w-10 h-10 p-0 flex-shrink-0"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          )}
          
          {/* Chat Header - Medium and Desktop screens */}
          {!isMobile && (
            <div className="flex items-center justify-between">
              <ChatHeader
                isTemporaryChat={isTemporaryChat}
                onTemporaryChatToggle={handleTemporaryChatToggle}
                selectedModel={selectedModel}
                onModelChange={handleModelChange}
              />
            </div>
          )}
          
          {/* Chat area */}
          <div className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              // Empty state
              <div className={cn(
                "flex flex-col items-center h-full",
                isMobile ? "justify-start pt-8" : "justify-center"
              )}>
                <div className="w-full flex flex-col items-center">
                  <div className={cn(
                    "text-center",
                    isMobile ? "mb-6" : "mb-8"
                  )}>
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
                      <div className="text-2xl font-medium text-white mb-8">
                        Ready when you are.
                      </div>
                    )}
                  </div>
                  {/* Input area (first prompt) */}
                  <div className={cn(
                    "w-full flex justify-center",
                    isMobile ? "px-1" : useOverlayNav ? "px-4 max-w-full" : "px-6 max-w-4xl"
                  )}>
                    <div className={cn(
                      isMobile ? "w-[95%]" : "w-full max-w-4xl"
                    )}>
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
                      </div>
                    </div>
                    </div>
                    
                    {/* Status indicator */}
                    <div className="text-center mt-3 text-xs text-gray-500">
                      {isSignedIn ? (
                        <div className="flex items-center justify-center gap-2">
                          <span>✓ Signed in as {user?.firstName || 'User'}</span>
                          {isSavingToMongoDB && <span>• Saving chat...</span>}
                          {isStoringMemory && <span>• Saving memory...</span>}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <span>⚠️ Please sign in to save and access your chat history</span>
                          <span className="text-xs text-gray-600">Your conversations will be lost without signing in</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Messages
              <div className="flex justify-center w-full mt-2">
                <div className={cn(
                  "w-full",
                  isMobile ? "py-4 px-2" : useOverlayNav ? "py-6 px-4 max-w-full" : "py-6 px-4 max-w-4xl"
                )}>
                  {messages.map((message) => (
                    <div key={message.id} className="mb-8">
                      {message.role === "user" ? (
                        // User message - right aligned pill
                        <div className="flex flex-col items-end mb-6 group">
                          <div className="bg-[#2f2f2f] text-white rounded-3xl px-5 py-3 max-w-[80%] text-base relative">
                            {editingMessageId === message.id ? (
                              <div className="relative bg-[#2A2A2A] rounded-3xl border border-gray-700 p-0 min-w-[500px]">
                                <Textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="w-full bg-transparent border-none text-white placeholder-gray-400 resize-none min-h-[60px] max-h-[200px] focus:ring-0 focus:outline-none text-base p-4 pr-24"
                                  autoFocus
                                  placeholder="Edit your message..."
                                />
                                <div className="absolute bottom-3 right-3 flex space-x-2">
                                  <Button
                                    onClick={handleCancelEdit}
                                    variant="outline"
                                    size="sm"
                                    className="text-gray-400 border-gray-600 hover:bg-gray-700 hover:text-white bg-gray-800 rounded-lg"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={() => handleSaveEdit(message.id)}
                                    size="sm"
                                    className="bg-white text-black hover:bg-gray-200 rounded-lg"
                                  >
                                    Send
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* File attachments */}
                                {message.attachments && message.attachments.length > 0 && (
                                  <div className="mb-3 space-y-2">
                                    {message.attachments.map((attachment, index) => (
                                      <div key={index} className="flex items-center gap-2 p-2 bg-[#404040] rounded-lg">
                                        {attachment.mediaType.startsWith('image/') ? (
                                          <div className="w-16 h-16 rounded overflow-hidden bg-gray-600">
                                            <img
                                              src={attachment.url}
                                              alt={attachment.name}
                                              className="w-full h-full object-cover"
                                              onError={(e) => {
                                                console.error('Failed to load attachment image:', {
                                                  fileName: attachment.name,
                                                  url: attachment.url,
                                                  error: e
                                                });
                                                // Replace with file icon on error
                                                const imgElement = e.target as HTMLImageElement;
                                                imgElement.style.display = 'none';
                                                const parent = imgElement.parentElement;
                                                if (parent) {
                                                  parent.innerHTML = '<div class="w-10 h-10 rounded bg-gray-600 flex items-center justify-center"><svg class="h-6 w-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></div>';
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
                                          <p className="text-sm font-medium text-white truncate">{attachment.name}</p>
                                          <p className="text-xs text-gray-400">{(attachment.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                      </div>
                                    ))}
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
                              onClick={() => copyToClipboard(message.content)}
                              className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg"
                              size="icon"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleEditMessage(message.id, message.content)}
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
                          {(generatingImageMessageIds.has(message.id) || generatedImages[message.id]) && (
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
                                      onSetImage(generatedImages[message.id].url);
                                    }}
                                    style={{ cursor: 'pointer' }}
                                    onError={(e) => {
                                      console.error('Failed to load generated image:', {
                                        messageId: message.id,
                                        imageUrl: generatedImages[message.id].url,
                                        error: e
                                      });
                                      // Hide the broken image
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      // Show error message
                                      const errorDiv = document.createElement('div');
                                      errorDiv.className = 'text-red-400 text-sm p-2 bg-red-900/20 rounded';
                                      errorDiv.textContent = 'Image failed to load';
                                      (e.target as HTMLImageElement).parentNode?.appendChild(errorDiv);
                                    }}
                                  />
                                  <div className="mt-2 flex justify-end">
                                    <Button
                                      onClick={async () => {
                                        try {
                                          const imageUrl = generatedImages[message.id].url;
                                          const response = await fetch(imageUrl);
                                          const blob = await response.blob();
                                          const url = URL.createObjectURL(blob);
                                          const a = document.createElement('a');
                                          a.href = url;
                                          a.download = `generated-image-${Date.now()}.png`;
                                          document.body.appendChild(a);
                                          a.click();
                                          document.body.removeChild(a);
                                          URL.revokeObjectURL(url);
                                        } catch (error) {
                                          console.error('Failed to download image:', error);
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
                                  code: ({ node, className, children, ...props }: any) => {
                                    const inline = !className;
                                    const match = /language-(\w+)/.exec(className || '');
                                    return !inline && match ? (
                                      <pre className="bg-gray-800 rounded-lg p-4 overflow-x-auto">
                                        <code className={className} {...props}>
                                          {children}
                                        </code>
                                      </pre>
                                    ) : (
                                      <code className="bg-gray-800 px-2 py-1 rounded text-sm" {...props}>
                                        {children}
                                      </code>
                                    );
                                  },
                                  pre: ({ children }) => <div>{children}</div>,
                                  p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                                  ul: ({ children }) => <ul className="list-disc pl-6 mb-4">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal pl-6 mb-4">{children}</ol>,
                                  li: ({ children }) => <li className="mb-2">{children}</li>,
                                  blockquote: ({ children }) => (
                                    <blockquote className="border-l-4 border-gray-600 pl-4 italic text-gray-300 mb-4">
                                      {children}
                                    </blockquote>
                                  ),
                                  h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
                                  h2: ({ children }) => <h2 className="text-xl font-bold mb-3">{children}</h2>,
                                  h3: ({ children }) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
                                  table: ({ children }) => (
                                    <div className="overflow-x-auto mb-4">
                                      <table className="min-w-full border border-gray-600">{children}</table>
                                    </div>
                                  ),
                                  th: ({ children }) => (
                                    <th className="border border-gray-600 px-4 py-2 bg-gray-800 font-bold text-left">{children}</th>
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
                                onClick={() => copyToClipboard(message.content)}
                                className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg"
                                size="icon"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg"
                                size="icon"
                              >
                                <ThumbsUp className="w-4 h-4" />
                              </Button>
                              <Button
                                className="h-8 w-8 p-0 bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg"
                                size="icon"
                              >
                                <ThumbsDown className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => handleRegenerateResponse(message.id)}
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
                <div className={cn(
                  "w-full py-4 flex justify-center",
                  isMobile ? "px-1" : useOverlayNav ? "px-4 max-w-full" : "px-4 max-w-4xl"
                )}>
                  <div className={cn(
                    isMobile ? "w-[95%]" : "w-full max-w-4xl"
                  )}>
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
                    </div>
                  </div>
                  </div>
                  
                  {/* Status indicator */}
                  <div className="text-center mt-3 text-xs text-gray-500">
                    {isSignedIn ? (
                      <div className="flex items-center justify-center gap-2">
                        <span>✓ Signed in as {user?.firstName || 'User'}</span>
                        {isSavingToMongoDB && <span>• Saving chat...</span>}
                        {isStoringMemory && <span>• Saving memory...</span>}
                      </div>
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
