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
  messageId?: string; // Optional: if provided, use this ID instead of generating new one
}

export interface UpdateMessageData {
  chatId: string;
  messageId: string;
  content: string;
}

export interface UpdateMessageAndRegenerateData {
  chatId: string;
  messageId: string;
  content: string;
  userId: string;
}

export interface UpdateMessageAndRegenerateResult {
  chat: IChat;
  removedMessages: IMessage[];
  assistantMessageToReplace: IMessage | null;
  contextMessages: IMessage[];
}

export interface UpdateAssistantMessageData {
  chatId: string;
  messageId: string;
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

      return savedChat;
    } catch (error) {
      throw createError.internal('Failed to create chat', error as Error);
    }
  }

  /**
   * Get a chat by ID for a specific user
   */
  static async getChatById(chatId: string, userId: string): Promise<IChat | null> {
    await connectDB();
    
    // Find the chat first
    const chat = await Chat.findOne({ 
      id: chatId, 
      userId 
    }).exec();
    
    if (!chat) {
      return null;
    }
    
    // Sort messages by timestamp manually to ensure compatibility
    if (chat.messages && chat.messages.length > 0) {
      chat.messages.sort((a: any, b: any) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeA - timeB;
      });
    }
    
    return chat;
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

    const { chatId, role, content, metadata, messageId } = data;

    // Validate input
    if (!chatId || !role || content === undefined || content === null) {
      throw new Error('Invalid message data: chatId, role, and content are required');
    }

    if (!['user', 'assistant', 'system'].includes(role)) {
      throw new Error('Invalid role: must be user, assistant, or system');
    }

    const message: IMessage = {
      id: messageId || uuidv4(), // Use provided ID or generate new one
      role,
      content: String(content), // Ensure content is a string
      timestamp: new Date(),
      attachments: metadata?.attachments || [],
      metadata,
    };


    const chat = await Chat.findOneAndUpdate(
      { id: chatId },
      { 
        $push: { messages: message },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    ).exec();

    if (!chat) {
      throw new Error(`Chat with ID ${chatId} not found`);
    }

    return chat;
  }

  /**
   * Update a message in a chat (simple edit that preserves all subsequent messages)
   */
  static async updateMessage(data: UpdateMessageData): Promise<IChat | null> {
    await connectDB();

    const { chatId, messageId, content } = data;

    // Validate input
    if (!chatId || !messageId || content === undefined || content === null) {
      throw new Error('Invalid message data: chatId, messageId, and content are required');
    }

    try {
      // First, get the current message content for edit history
      const existingChat = await Chat.findOne({ id: chatId }).exec();
      
      if (!existingChat) {
        throw new Error(`Chat with ID ${chatId} not found`);
      }

      const existingMessage = existingChat.messages.find((msg: any) => msg.id === messageId);
      
      if (!existingMessage) {
        throw new Error(`Message with ID ${messageId} not found in chat ${chatId}`);
      }

      const previousContent = existingMessage.content;

      // Update the message with edit history
      const existingEditHistory = existingMessage?.metadata?.editHistory || [];
      const newEditHistory = previousContent ? [
        ...existingEditHistory,
        {
          content: previousContent,
          timestamp: new Date()
        }
      ] : existingEditHistory;

      const chat = await Chat.findOneAndUpdate(
        { 
          id: chatId,
          'messages.id': messageId
        },
        { 
          $set: { 
            'messages.$.content': String(content),
            'messages.$.metadata.editHistory': newEditHistory,
            updatedAt: new Date()
          }
        },
        { new: true }
      ).exec();

      return chat;
    } catch (error) {
      throw createError.internal('Failed to update message', error as Error);
    }
  }

  /**
   * Update a message in a chat with user ownership validation (simple edit that preserves all subsequent messages)
   */
  static async updateMessageOnly(data: UpdateMessageAndRegenerateData): Promise<IChat | null> {
    await connectDB();

    const { chatId, messageId, content, userId } = data;

    // Validate input
    if (!chatId || !messageId || content === undefined || content === null || !userId) {
      throw new Error('Invalid message data: chatId, messageId, content, and userId are required');
    }

    try {
      // First, get the existing chat and validate ownership
      const existingChat = await Chat.findOne({ id: chatId, userId }).exec();
      
      if (!existingChat) {
        throw new Error(`Chat with ID ${chatId} not found for user ${userId}`);
      }

      const existingMessage = existingChat.messages.find((msg: any) => msg.id === messageId);
      
      if (!existingMessage) {
        throw new Error(`Message with ID ${messageId} not found in chat ${chatId}`);
      }

      // Only allow updating user messages
      if (existingMessage.role !== 'user') {
        throw new Error('Only user messages can be edited');
      }

      const previousContent = existingMessage.content;

      // Update the message with edit history
      const existingEditHistory = existingMessage?.metadata?.editHistory || [];
      const newEditHistory = previousContent ? [
        ...existingEditHistory,
        {
          content: previousContent,
          timestamp: new Date()
        }
      ] : existingEditHistory;

      const chat = await Chat.findOneAndUpdate(
        { 
          id: chatId,
          userId,
          'messages.id': messageId
        },
        { 
          $set: { 
            'messages.$.content': String(content),
            'messages.$.metadata.editHistory': newEditHistory,
            updatedAt: new Date()
          }
        },
        { new: true }
      ).exec();

      return chat;
    } catch (error) {
      throw createError.internal('Failed to update message', error as Error);
    }
  }

  /**
   * Update a user message and remove all subsequent messages for regeneration
   */
  static async updateMessageAndRegenerateImmediate(data: UpdateMessageAndRegenerateData): Promise<UpdateMessageAndRegenerateResult> {
    await connectDB();

    const { chatId, messageId, content, userId } = data;

    // Validate input
    if (!chatId || !messageId || content === undefined || content === null || !userId) {
      throw new Error('Invalid message data: chatId, messageId, content, and userId are required');
    }

    try {
      const existingChat = await Chat.findOne({ id: chatId, userId }).exec();
      
      if (!existingChat) {
        throw new Error(`Chat with ID ${chatId} not found for user ${userId}`);
      }

      const messageIndex = existingChat.messages.findIndex((msg: any) => msg.id === messageId);
      
      if (messageIndex === -1) {
        throw new Error(`Message with ID ${messageId} not found in chat ${chatId}`);
      }

      const existingMessage = existingChat.messages[messageIndex];
      
      // Only allow updating user messages
      if (existingMessage.role !== 'user') {
        throw new Error('Only user messages can be edited');
      }

      const previousContent = existingMessage.content;

      // Capture ALL messages that will be removed (all messages after the edited user message)
      const removedMessages = existingChat.messages.slice(messageIndex + 1);
      const assistantMessageToReplace = removedMessages.find((msg: any) => msg.role === 'assistant') || null;

      // Update the message with edit history
      const existingEditHistory = existingMessage?.metadata?.editHistory || [];
      const newEditHistory = previousContent ? [
        ...existingEditHistory,
        {
          content: previousContent,
          timestamp: new Date()
        }
      ] : existingEditHistory;

      // Create updated messages array - keep only messages up to and including the edited message
      const updatedMessages = existingChat.messages.slice(0, messageIndex + 1);
      
      // Update the user message
      updatedMessages[messageIndex] = {
        id: existingMessage.id,
        role: existingMessage.role,
        content: String(content),
        timestamp: existingMessage.timestamp,
        attachments: existingMessage.attachments || [],
        metadata: {
          ...existingMessage.metadata,
          editHistory: newEditHistory
        }
      };

      // Update the chat with the truncated messages array
      const chat = await Chat.findOneAndUpdate(
        { id: chatId, userId },
        { 
          messages: updatedMessages,
          updatedAt: new Date()
        },
        { new: true }
      ).exec();

      if (!chat) {
        throw new Error(`Failed to update chat ${chatId}`);
      }

      // Return result - ALL subsequent messages are removed
      return {
        chat,
        removedMessages,
        assistantMessageToReplace,
        contextMessages: updatedMessages // All messages up to and including the edited one
      };
    } catch (error) {
      throw createError.internal('Failed to update message and regenerate immediate response', error as Error);
    }
  }

  /**
   * Update a user message and remove subsequent assistant messages for regeneration (original method)
   */
  static async updateMessageAndPrepareRegenerate(data: UpdateMessageAndRegenerateData): Promise<UpdateMessageAndRegenerateResult> {
    await connectDB();

    const { chatId, messageId, content, userId } = data;

    // Validate input
    if (!chatId || !messageId || content === undefined || content === null || !userId) {
      throw new Error('Invalid message data: chatId, messageId, content, and userId are required');
    }

    try {
      const existingChat = await Chat.findOne({ id: chatId, userId }).exec();
      
      if (!existingChat) {
        throw new Error(`Chat with ID ${chatId} not found for user ${userId}`);
      }


      console.log(`Searching for message ID: ${messageId}`);
      console.log(`Available message IDs in chat:`, existingChat.messages.map((m: any) => ({ id: m.id, role: m.role })));
      
      const messageIndex = existingChat.messages.findIndex((msg: any) => msg.id === messageId);
      console.log(`Message found at index: ${messageIndex}`);
      
      if (messageIndex === -1) {
        throw new Error(`Message with ID ${messageId} not found in chat ${chatId}. Available IDs: ${existingChat.messages.map((m: any) => m.id).join(', ')}`);
      }

      const existingMessage = existingChat.messages[messageIndex];
      
      // Only allow updating user messages
      if (existingMessage.role !== 'user') {
        throw new Error('Only user messages can be edited');
      }

      const previousContent = existingMessage.content;
      console.log(`Updating message - Previous content: "${previousContent}"`);
      console.log(`Updating message - New content: "${content}"`);

      // Capture messages that will be removed (for returning to frontend)
      const removedMessages = existingChat.messages.slice(messageIndex + 1);
      const assistantMessageToReplace = removedMessages.find((msg: any) => msg.role === 'assistant') || null;
      console.log(`Found ${removedMessages.length} messages to remove`);
      if (assistantMessageToReplace) {
        console.log(`Assistant message to replace: ${assistantMessageToReplace.id}`);
      }

      // Update the message with edit history
      const existingEditHistory = existingMessage?.metadata?.editHistory || [];
      const newEditHistory = previousContent ? [
        ...existingEditHistory,
        {
          content: previousContent,
          timestamp: new Date()
        }
      ] : existingEditHistory;

      // Create updated messages array - keep messages up to and including the edited message
      // Remove all messages after the edited user message (they will be regenerated)
      const updatedMessages = existingChat.messages.slice(0, messageIndex + 1);
      
      // Update the user message content and edit history
      updatedMessages[messageIndex] = {
        id: existingMessage.id,
        role: existingMessage.role,
        content: String(content),
        timestamp: existingMessage.timestamp,
        attachments: existingMessage.attachments || [],
        metadata: {
          ...existingMessage.metadata,
          editHistory: newEditHistory
        }
      };

      console.log(`About to save message with content: "${updatedMessages[messageIndex].content}"`);
      console.log(`Updated messages array:`, updatedMessages.map((m: IMessage) => ({ id: m.id, role: m.role, content: m.content })));

      // Update the entire chat with the truncated messages array
      const chat = await Chat.findOneAndUpdate(
        { id: chatId, userId },
        { 
          messages: updatedMessages,
          updatedAt: new Date()
        },
        { new: true }
      ).exec();

      console.log(`After update - returned chat messages:`, chat?.messages.map((m: IMessage) => ({ id: m.id, role: m.role, content: m.content })));

      if (!chat) {
        throw new Error(`Failed to update chat ${chatId}`);
      }

      // Return comprehensive result including context for regeneration
      return {
        chat,
        removedMessages,
        assistantMessageToReplace,
        contextMessages: chat.messages
      };
    } catch (error) {
      throw createError.internal('Failed to update message and prepare regenerate', error as Error);
    }
  }

  /**
   * Update or create an assistant message (for regenerated responses)
   */
  static async updateOrCreateAssistantMessage(data: UpdateAssistantMessageData): Promise<IChat | null> {
    await connectDB();

    const { chatId, messageId, content, metadata } = data;

    // Validate input
    if (!chatId || !messageId || content === undefined || content === null) {
      throw new Error('Invalid message data: chatId, messageId, and content are required');
    }

    try {
      const existingChat = await Chat.findOne({ id: chatId }).exec();
      
      if (!existingChat) {
        throw new Error(`Chat with ID ${chatId} not found`);
      }

      const messageIndex = existingChat.messages.findIndex((msg: IMessage) => msg.id === messageId);
      
      if (messageIndex !== -1) {
        // Update existing assistant message
        const chat = await Chat.findOneAndUpdate(
          { 
            id: chatId,
            'messages.id': messageId
          },
          { 
            $set: { 
              'messages.$.content': String(content),
              'messages.$.metadata': {
                ...existingChat.messages[messageIndex].metadata,
                ...metadata
              },
              updatedAt: new Date()
            }
          },
          { new: true }
        ).exec();

        return chat;
      } else {
        // Create new assistant message
        const newMessage: IMessage = {
          id: messageId,
          role: 'assistant',
          content: String(content),
          timestamp: new Date(),
          attachments: [],
          metadata
        };

        const chat = await Chat.findOneAndUpdate(
          { id: chatId },
          { 
            $push: { messages: newMessage },
            $set: { updatedAt: new Date() }
          },
          { new: true }
        ).exec();

        return chat;
      }
    } catch (error) {
      throw createError.internal('Failed to update or create assistant message', error as Error);
    }
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