import connectDB from '@/lib/mongodb';
import Chat, { IChat, IMessage } from '@/lib/models/Chat';
import { v4 as uuidv4 } from 'uuid';

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

export class ChatService {
  /**
   * Create a new chat conversation
   */
  static async createChat(data: CreateChatData): Promise<IChat> {
    await connectDB();

    console.log('Creating new chat:', {
      userId: data.userId,
      title: data.title,
      hasInitialMessage: !!data.initialMessage
    });

    const chatId = uuidv4();
    const messages: IMessage[] = [];

    // Add initial message if provided
    if (data.initialMessage) {
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
      title: data.title,
      messages,
    });

    await chat.save();
    console.log('Chat created successfully:', { chatId, userId: data.userId, messageCount: messages.length });
    return chat;
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
    chats: IChat[];
    total: number;
    hasMore: boolean;
  }> {
    await connectDB();

    const { 
      userId, 
      limit = 50, 
      offset = 0, 
      includeArchived = false,
      searchQuery 
    } = options;

    // Build query
    const query: any = { userId };
    
    if (!includeArchived) {
      query.isArchived = { $ne: true };
    }

    // Add text search if query provided
    if (searchQuery && searchQuery.trim()) {
      query.$text = { $search: searchQuery.trim() };
    }

    // Get total count
    const total = await Chat.countDocuments(query);

    // Get chats with pagination
    const chats = await Chat.find(query)
      .sort({ updatedAt: -1 }) // Most recently updated first
      .skip(offset)
      .limit(limit)
      .select('id userId title createdAt updatedAt metadata tags') // Exclude messages for list view
      .exec();

    return {
      chats,
      total,
      hasMore: offset + chats.length < total,
    };
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
  static async searchChats(userId: string, query: string, limit = 10): Promise<IChat[]> {
    await connectDB();

    if (!query.trim()) {
      return [];
    }

    return await Chat.find({
      userId,
      isArchived: { $ne: true },
      $text: { $search: query.trim() }
    })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .select('id userId title createdAt updatedAt metadata')
    .exec();
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