import connectDB from '@/lib/mongodb';
import Chat, { IChat, IMessage } from '@/lib/models/Chat';
import { v4 as uuidv4 } from 'uuid';
import { createError, withRetry, AppError } from '@/lib/errors';

export interface CreateChatData {
  userId: string;
  title: string;
  initialMessage?: {
    role: 'user' | 'assistant' | 'system';
    content: string;
  };
}

export interface AddMessageData {
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: any;
}

export interface ChatListOptions {
  userId: string;
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
  searchQuery?: string;
}

// Chat summary type for list operations (without messages for performance)
export interface ChatSummary {
  id: string;
  userId: string;
  title: string;
  messages: IMessage[]; // Empty array for compatibility with IChat interface
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    totalMessages?: number;
    lastActivity?: Date;
    [key: string]: any;
  };
  tags?: string[];
  isArchived: boolean;
}

export class ChatService {
  /**
   * Create a new chat conversation
   */
  static async createChat(data: CreateChatData): Promise<IChat> {
    // Validate input
    if (!data.userId || !data.title) {
      throw createError.missingFields(['userId', 'title']);
    }

    if (data.title.trim().length === 0) {
      throw createError.invalidRequest('Title cannot be empty');
    }

    if (data.title.length > 200) {
      throw createError.invalidRequest('Title too long (max 200 characters)');
    }

    try {
      await connectDB();
    } catch (error) {
      throw createError.databaseConnection(error as Error);
    }

    console.log('Creating new chat:', {
      userId: data.userId,
      title: data.title,
      hasInitialMessage: !!data.initialMessage
    });

    const chatId = uuidv4();
    const messages: IMessage[] = [];

    // Add initial message if provided
    if (data.initialMessage) {
      if (!data.initialMessage.content || data.initialMessage.content.trim().length === 0) {
        throw createError.invalidRequest('Initial message content cannot be empty');
      }

      const messageId = uuidv4();
      messages.push({
        id: messageId,
        role: data.initialMessage.role,
        content: data.initialMessage.content,
        timestamp: new Date(),
      });
      console.log('Added initial message:', { messageId, role: data.initialMessage.role });
    }

    const chat = new Chat({
      id: chatId,
      userId: data.userId,
      title: data.title.trim(),
      messages,
    });

    try {
      const savedChat = await withRetry(async () => {
        return await chat.save();
      }, 2, 500);

      console.log('Chat created successfully:', { chatId, userId: data.userId, messageCount: messages.length });
      return savedChat;
    } catch (error) {
      console.error('Failed to save chat to database:', error);
      throw createError.internal('Failed to create chat', error as Error);
    }
  }

  /**
   * Get a chat by ID for a specific user
   */
  static async getChatById(chatId: string, userId: string): Promise<IChat | null> {
    await connectDB();
    
    return await Chat.findOne({ 
      id: chatId, 
      userId 
    }).exec();
  }

  /**
   * Get chat history for a user
   */
  static async getChatHistory(options: ChatListOptions): Promise<{
    chats: ChatSummary[];
    total: number;
    hasMore: boolean;
  }> {
    // Validate input
    if (!options.userId) {
      throw createError.missingFields(['userId']);
    }

    if (options.limit && (options.limit < 1 || options.limit > 200)) {
      throw createError.invalidRequest('Limit must be between 1 and 200');
    }

    try {
      await connectDB();
    } catch (error) {
      throw createError.databaseConnection(error as Error);
    }

    const { 
      userId, 
      limit = 50, 
      offset = 0, 
      includeArchived = false,
      searchQuery 
    } = options;

    try {
      // Optimized query building
      const baseQuery: any = { userId };
      
      if (!includeArchived) {
        baseQuery.isArchived = { $ne: true }; // Uses compound index: userId + isArchived
      }

      let query = baseQuery;
      let sortCriteria: any = { updatedAt: -1 };

      // Add text search if query provided
      if (searchQuery && searchQuery.trim()) {
        query = {
          ...baseQuery,
          $text: { $search: searchQuery.trim() }
        };
        // When using text search, sort by score first, then by updatedAt
        sortCriteria = { 
          score: { $meta: 'textScore' }, 
          updatedAt: -1 
        };
      }

      // Use Promise.all for parallel execution
      const [total, chats] = await Promise.all([
        Chat.countDocuments(query),
        Chat.find(query)
          .sort(sortCriteria)
          .skip(offset)
          .limit(limit)
          .select('id userId title createdAt updatedAt metadata tags isArchived') // Optimized projection
          .lean() // Use lean() for better performance when we don't need Mongoose documents
          .exec()
      ]);

      // Transform lean documents to ChatSummary objects
      const transformedChats: ChatSummary[] = chats.map((chat: any) => ({
        id: chat.id || chat._id.toString(),
        userId: chat.userId,
        title: chat.title,
        messages: [], // Not included in projection for performance
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        isArchived: chat.isArchived,
        tags: chat.tags,
        metadata: chat.metadata
      }));

      return {
        chats: transformedChats,
        total,
        hasMore: offset + chats.length < total,
      };
    } catch (error) {
      throw createError.internal('Failed to fetch chat history', error as Error);
    }
  }

  /**
   * Add a message to a chat
   */
  static async addMessage(data: AddMessageData): Promise<IChat | null> {
    await connectDB();

    const { chatId, role, content, metadata } = data;

    // Validate input
    if (!chatId || !role || content === undefined || content === null) {
      console.error('Invalid addMessage data:', { chatId, role, content, metadata });
      throw new Error('Invalid message data: chatId, role, and content are required');
    }

    if (!['user', 'assistant', 'system'].includes(role)) {
      console.error('Invalid role:', role);
      throw new Error('Invalid role: must be user, assistant, or system');
    }

    const message: IMessage = {
      id: uuidv4(),
      role,
      content: String(content), // Ensure content is a string
      timestamp: new Date(),
      attachments: metadata?.attachments || [],
      metadata,
    };

    console.log('Adding message to MongoDB:', {
      chatId,
      role,
      contentLength: content.length,
      messageId: message.id
    });

    const chat = await Chat.findOneAndUpdate(
      { id: chatId },
      { 
        $push: { messages: message },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    ).exec();

    if (!chat) {
      console.error('Chat not found for message addition:', chatId);
      throw new Error(`Chat with ID ${chatId} not found`);
    }

    console.log('Message added successfully to chat:', chatId);
    return chat;
  }

  /**
   * Update chat title
   */
  static async updateChatTitle(chatId: string, userId: string, title: string): Promise<IChat | null> {
    await connectDB();

    return await Chat.findOneAndUpdate(
      { id: chatId, userId },
      { 
        title: title.trim(),
        updatedAt: new Date()
      },
      { new: true }
    ).exec();
  }

  /**
   * Archive/unarchive a chat
   */
  static async toggleArchiveChat(chatId: string, userId: string, isArchived: boolean): Promise<IChat | null> {
    await connectDB();

    return await Chat.findOneAndUpdate(
      { id: chatId, userId },
      { 
        isArchived,
        updatedAt: new Date()
      },
      { new: true }
    ).exec();
  }

  /**
   * Delete a chat
   */
  static async deleteChat(chatId: string, userId: string): Promise<boolean> {
    await connectDB();

    const result = await Chat.deleteOne({ id: chatId, userId }).exec();
    return result.deletedCount > 0;
  }

  /**
   * Search chats by content
   */
  static async searchChats(userId: string, query: string, limit = 10): Promise<ChatSummary[]> {
    // Validate input
    if (!userId) {
      throw createError.missingFields(['userId']);
    }

    if (!query || !query.trim()) {
      return [];
    }

    if (limit < 1 || limit > 50) {
      throw createError.invalidRequest('Limit must be between 1 and 50');
    }

    try {
      await connectDB();
    } catch (error) {
      throw createError.databaseConnection(error as Error);
    }

    try {
      const searchResults = await withRetry(async () => {
        return Chat.find({
          userId,
          isArchived: { $ne: true },
          $text: { $search: query.trim() }
        })
        .sort({ 
          score: { $meta: 'textScore' },
          updatedAt: -1 // Secondary sort for consistent ordering
        })
        .limit(limit)
        .select('id userId title createdAt updatedAt metadata')
        .lean() // Use lean for better performance
        .exec();
      }, 2, 500);

      // Transform lean documents to ChatSummary objects
      const transformedResults: ChatSummary[] = searchResults.map((chat: any) => ({
        id: chat.id || chat._id.toString(),
        userId: chat.userId,
        title: chat.title,
        messages: [], // Not included in projection for performance
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        isArchived: chat.isArchived || false,
        tags: chat.tags,
        metadata: chat.metadata
      }));

      return transformedResults;
    } catch (error) {
      throw createError.internal('Chat search failed', error as Error);
    }
  }

  /**
   * Get chat statistics for a user
   */
  static async getChatStats(userId: string) {
    await connectDB();

    const stats = await Chat.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalChats: { $sum: 1 },
          archivedChats: {
            $sum: { $cond: [{ $eq: ['$isArchived', true] }, 1, 0] }
          },
          totalMessages: {
            $sum: { $size: '$messages' }
          },
          avgMessagesPerChat: {
            $avg: { $size: '$messages' }
          }
        }
      }
    ]);

    return stats[0] || {
      totalChats: 0,
      archivedChats: 0,
      totalMessages: 0,
      avgMessagesPerChat: 0
    };
  }

  /**
   * Generate a title from the first user message (helper function)
   */
  static generateChatTitle(firstMessage: string): string {
    const maxLength = 50;
    const cleaned = firstMessage.trim();
    
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    
    // Try to cut at a word boundary
    const truncated = cleaned.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.7) {
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }
}