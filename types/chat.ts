/**
 * Chat and Message Types
 */

export interface BaseMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
}

export interface UIMessage extends BaseMessage {
  isEditing?: boolean;
  attachments?: FileAttachment[];
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  model?: string;
  tokens?: number;
  imageGenerated?: boolean;
  regenerated?: boolean;
  editHistory?: Array<{
    content: string;
    timestamp: Date;
  }>;
}

export interface FileAttachment {
  type: 'file' | 'image';
  mediaType: string;
  url: string;
  name: string;
  size: number;
  uploadedAt?: Date;
}

export interface Chat {
  id: string;
  userId: string;
  title: string;
  messages: BaseMessage[];
  createdAt: Date;
  updatedAt: Date;
  isArchived?: boolean;
  metadata?: ChatMetadata;
  tags?: string[];
}

export interface ChatMetadata {
  model?: string;
  totalTokens?: number;
  lastModel?: string;
  messageCount?: number;
}

// Chat UI State Types
export interface ChatUIState {
  isLoading: boolean;
  isStreaming: boolean;
  editingMessageId: string | null;
  editContent: string;
  selectedModel: string;
  inputValue: string;
  isStoringMemory: boolean;
  isSavingToMongoDB: boolean;
  backgroundMemoryTasks: string[];
  generatedImages: Record<string, string>;
  isGeneratingImage: boolean;
}

// Chat Hook Types
export interface UseChatReturn {
  messages: UIMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  sendMessage: (content: string, attachments?: FileAttachment[]) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  regenerateMessage: (messageId: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  clearChat: () => void;
}

export interface UseChatHistoryReturn {
  chats: Chat[];
  isLoading: boolean;
  error: string | null;
  fetchChatHistory: () => Promise<void>;
  searchChats: (query: string) => Promise<Chat[]>;
  deleteChat: (chatId: string) => Promise<boolean>;
  archiveChat: (chatId: string, isArchived: boolean) => Promise<boolean>;
}

// Session Types
export interface UserSession {
  id: string;
  createdAt: Date;
  lastActive: Date;
}

export interface SessionStats {
  total: number;
  active: number;
  expired: number;
}