import mongoose, { Schema, Document } from 'mongoose';

// Interface for file attachments
export interface IAttachment {
  type: 'file';
  mediaType: string;
  url: string;
  name: string;
  size: number;
}

// Interface for individual messages within a chat
export interface IMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: IAttachment[];
  metadata?: {
    model?: string;
    tokens?: number;
    [key: string]: any;
  };
}

// Interface for the chat conversation document
export interface IChat extends Document {
  id: string;
  userId: string; // Clerk user ID
  title: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
  isArchived: boolean;
  tags?: string[];
  metadata?: {
    totalMessages?: number;
    lastActivity?: Date;
    [key: string]: any;
  };
}

// Attachment schema
const AttachmentSchema = new Schema({
  type: {
    type: String,
    enum: ['file'],
    required: true,
  },
  mediaType: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
});

// Message schema
const MessageSchema = new Schema<IMessage>({
  id: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  attachments: [AttachmentSchema],
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
});

// Chat schema
const ChatSchema = new Schema<IChat>({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: String,
    required: true,
    index: true, // Index for faster queries by user
  },
  title: {
    type: String,
    required: true,
    maxlength: 200,
  },
  messages: [MessageSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  isArchived: {
    type: Boolean,
    default: false,
  },
  tags: [{
    type: String,
    maxlength: 50,
  }],
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
});

// Indexes for better performance
ChatSchema.index({ userId: 1, createdAt: -1 }); // For user's chat history
ChatSchema.index({ userId: 1, updatedAt: -1 }); // For most recently active chats
ChatSchema.index({ userId: 1, isArchived: 1, updatedAt: -1 }); // For filtering archived chats with sorting
ChatSchema.index({ userId: 1, isArchived: 1, createdAt: -1 }); // For filtering archived chats by creation date
ChatSchema.index({ id: 1, userId: 1 }); // For unique chat lookups with user validation
ChatSchema.index({ 'messages.content': 'text', title: 'text' }); // For text search

// Compound indexes for common query patterns
ChatSchema.index({ 
  userId: 1, 
  isArchived: 1, 
  'metadata.lastActivity': -1 
}); // For recent activity filtering

// Sparse index for tags (only documents with tags)
ChatSchema.index({ userId: 1, tags: 1 }, { sparse: true }); // For tag-based filtering

// TTL index for automatic cleanup of very old chats (optional - uncomment if needed)
// ChatSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 }); // 1 year TTL

// Pre-save middleware to update the updatedAt field and metadata
ChatSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Update metadata
  if (this.messages) {
    this.metadata = {
      ...this.metadata,
      totalMessages: this.messages.length,
      lastActivity: this.updatedAt,
    };
  }
  
  next();
});

// Create model or use existing one
const Chat = mongoose.models.Chat || mongoose.model<IChat>('Chat', ChatSchema);

export default Chat;