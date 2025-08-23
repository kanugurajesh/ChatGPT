import mongoose, { Schema, Document } from 'mongoose';

// Interface for user uploaded images (during chat interactions)
export interface IUserUploadedImage extends Document {
  id: string;
  userId: string; // Clerk user ID
  fileName: string;
  originalName: string;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  chatId?: string; // Optional - which chat this was uploaded in
  messageId?: string; // Optional - which message this was attached to
  uploadedAt: Date;
  fileSize: number;
  mimeType: string;
  metadata?: {
    width?: number;
    height?: number;
    format?: string;
    [key: string]: any;
  };
}

// Interface for AI generated images
export interface IGeneratedImage extends Document {
  id: string;
  userId: string; // Clerk user ID
  prompt: string;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  chatId?: string; // Optional - which chat this was generated in
  messageId?: string; // Optional - which message this belongs to
  generatedAt: Date;
  generationSettings?: {
    model?: string;
    style?: string;
    dimensions?: string;
    quality?: string;
    [key: string]: any;
  };
  metadata?: {
    width?: number;
    height?: number;
    format?: string;
    fileSize?: number;
    [key: string]: any;
  };
}

// Schema for user uploaded images
const UserUploadedImageSchema = new Schema<IUserUploadedImage>({
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
  fileName: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  cloudinaryUrl: {
    type: String,
    required: true,
  },
  cloudinaryPublicId: {
    type: String,
    required: true,
    unique: true, // Each Cloudinary upload has unique public_id
  },
  chatId: {
    type: String,
    index: true, // Index for finding images by chat
  },
  messageId: {
    type: String,
    index: true, // Index for finding images by message
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
    index: true, // Index for sorting by date
  },
  fileSize: {
    type: Number,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
});

// Schema for AI generated images
const GeneratedImageSchema = new Schema<IGeneratedImage>({
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
  prompt: {
    type: String,
    required: true,
    maxlength: 2000, // Reasonable limit for prompts
  },
  cloudinaryUrl: {
    type: String,
    required: true,
  },
  cloudinaryPublicId: {
    type: String,
    required: true,
    unique: true, // Each Cloudinary upload has unique public_id
  },
  chatId: {
    type: String,
    index: true, // Index for finding images by chat
  },
  messageId: {
    type: String,
    index: true, // Index for finding images by message
  },
  generatedAt: {
    type: Date,
    default: Date.now,
    index: true, // Index for sorting by date
  },
  generationSettings: {
    type: Schema.Types.Mixed,
    default: {},
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
});

// Compound indexes for better query performance
UserUploadedImageSchema.index({ userId: 1, uploadedAt: -1 }); // User's images sorted by date
UserUploadedImageSchema.index({ userId: 1, chatId: 1, uploadedAt: -1 }); // Images in specific chat
UserUploadedImageSchema.index({ userId: 1, mimeType: 1, uploadedAt: -1 }); // Filter by file type

GeneratedImageSchema.index({ userId: 1, generatedAt: -1 }); // User's generated images sorted by date
GeneratedImageSchema.index({ userId: 1, chatId: 1, generatedAt: -1 }); // Generated images in specific chat
GeneratedImageSchema.index({ userId: 1, 'generationSettings.model': 1 }); // Filter by model used

// Text index for searching prompts
GeneratedImageSchema.index({ prompt: 'text' });

// TTL indexes for cleanup (optional - uncomment if needed)
// UserUploadedImageSchema.index({ uploadedAt: 1 }, { expireAfterSeconds: 31536000 }); // 1 year TTL
// GeneratedImageSchema.index({ generatedAt: 1 }, { expireAfterSeconds: 31536000 }); // 1 year TTL

// Pre-save middleware for UserUploadedImage
UserUploadedImageSchema.pre('save', function(next) {
  if (!this.id) {
    this.id = new mongoose.Types.ObjectId().toString();
  }
  next();
});

// Pre-save middleware for GeneratedImage
GeneratedImageSchema.pre('save', function(next) {
  if (!this.id) {
    this.id = new mongoose.Types.ObjectId().toString();
  }
  next();
});

// Static methods for UserUploadedImage
UserUploadedImageSchema.statics.findByUserId = function(userId: string, limit: number = 50, skip: number = 0) {
  return this.find({ userId })
    .sort({ uploadedAt: -1 })
    .limit(limit)
    .skip(skip);
};

UserUploadedImageSchema.statics.findByChatId = function(chatId: string, userId: string) {
  return this.find({ chatId, userId }).sort({ uploadedAt: -1 });
};

UserUploadedImageSchema.statics.findByMimeType = function(userId: string, mimeType: string, limit: number = 50) {
  return this.find({ userId, mimeType: new RegExp(mimeType, 'i') })
    .sort({ uploadedAt: -1 })
    .limit(limit);
};

// Static methods for GeneratedImage
GeneratedImageSchema.statics.findByUserId = function(userId: string, limit: number = 50, skip: number = 0) {
  return this.find({ userId })
    .sort({ generatedAt: -1 })
    .limit(limit)
    .skip(skip);
};

GeneratedImageSchema.statics.findByChatId = function(chatId: string, userId: string) {
  return this.find({ chatId, userId }).sort({ generatedAt: -1 });
};

GeneratedImageSchema.statics.searchByPrompt = function(userId: string, searchTerm: string, limit: number = 50) {
  return this.find({ 
    userId,
    $text: { $search: searchTerm }
  })
  .sort({ score: { $meta: 'textScore' }, generatedAt: -1 })
  .limit(limit);
};

GeneratedImageSchema.statics.findByModel = function(userId: string, model: string, limit: number = 50) {
  return this.find({ 
    userId,
    'generationSettings.model': model 
  })
  .sort({ generatedAt: -1 })
  .limit(limit);
};

// Create models or use existing ones
const UserUploadedImage = mongoose.models.UserUploadedImage || 
  mongoose.model<IUserUploadedImage>('UserUploadedImage', UserUploadedImageSchema);

const GeneratedImage = mongoose.models.GeneratedImage || 
  mongoose.model<IGeneratedImage>('GeneratedImage', GeneratedImageSchema);

export { UserUploadedImage, GeneratedImage };
export default { UserUploadedImage, GeneratedImage };