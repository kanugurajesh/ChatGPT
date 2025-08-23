/**
 * API Response Types
 */

// Common API response structure
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Chat API Types
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  userId?: string;
  chatId?: string;
  attachments?: FileAttachment[];
}

export interface ChatResponse extends ApiResponse {
  data?: {
    message: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
}

// File attachment types
export interface FileAttachment {
  type: 'file';
  mediaType: string;
  url: string;
  name: string;
  size: number;
}

// Memory API Types
export interface MemoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface MemorySearchRequest {
  query: string;
  userId: string;
  limit?: number;
}

export interface MemoryAddRequest {
  messages: MemoryMessage[];
  userId: string;
  metadata?: Record<string, any>;
}

export interface MemorySearchResponse extends ApiResponse {
  data?: Array<{
    id: string;
    memory: string;
    score?: number;
    metadata?: Record<string, any>;
  }>;
}

// Image Generation Types
export interface ImageGenerationRequest {
  prompt: string;
  userId?: string;
  style?: 'realistic' | 'artistic' | 'cartoon';
  size?: '256x256' | '512x512' | '1024x1024';
}

export interface ImageGenerationResponse extends ApiResponse {
  data?: {
    imageUrl: string;
    prompt: string;
    metadata?: Record<string, any>;
  };
}

// Chat History Types
export interface ChatListRequest {
  userId: string;
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
  searchQuery?: string;
}

export interface ChatStats {
  totalChats: number;
  archivedChats: number;
  totalMessages: number;
  avgMessagesPerChat: number;
}

export interface ChatStatsResponse extends ApiResponse {
  data?: ChatStats;
}