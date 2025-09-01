import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadFileBuffer } from '@/lib/cloudinary-server';
import { UserUploadedImage } from '@/lib/models/Image';
import { connectToMongoDB } from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    // Check required environment variables
    if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 
        !process.env.CLOUDINARY_API_KEY || 
        !process.env.CLOUDINARY_API_SECRET) {
      console.error('Missing Cloudinary configuration');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const chatId = formData.get('chatId') as string;
    const messageId = formData.get('messageId') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File size too large. Maximum size is 10MB.' 
      }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'File type not supported. Supported types: images, PDF, text files, Word documents.' 
      }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique public_id to avoid duplicates
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const uniquePublicId = `${file.name.split('.')[0]}_${timestamp}_${randomSuffix}`;

    // Upload to Cloudinary
    const cloudinaryResult = await uploadFileBuffer(
      buffer,
      file.name,
      file.type,
      {
        folder: 'chat-uploads',
        public_id: uniquePublicId,
        tags: ['user-upload', 'chat-file', userId],
      }
    );

    // Connect to MongoDB and save file metadata
    await connectToMongoDB();
    
    const userUploadedImage = new UserUploadedImage({
      id: new mongoose.Types.ObjectId().toString(),
      userId: userId,
      fileName: file.name,
      originalName: file.name,
      cloudinaryUrl: cloudinaryResult.secure_url,
      cloudinaryPublicId: cloudinaryResult.public_id,
      chatId: chatId || undefined,
      messageId: messageId || undefined,
      uploadedAt: new Date(),
      fileSize: file.size,
      mimeType: file.type,
      metadata: {
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        format: cloudinaryResult.format,
      },
    });

    await userUploadedImage.save();

    return NextResponse.json({ 
      success: true,
      url: cloudinaryResult.secure_url,
      public_id: cloudinaryResult.public_id,
      fileId: userUploadedImage.id,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        format: cloudinaryResult.format,
        uploadedAt: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Upload API Error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Cloudinary')) {
        console.error('Cloudinary upload failed:', error.message);
        return NextResponse.json({ error: 'Failed to upload file to cloud storage' }, { status: 500 });
      }
      if (error.message.includes('MongoDB') || error.message.includes('database')) {
        console.error('Database save failed:', error.message);
        return NextResponse.json({ error: 'Failed to save file metadata' }, { status: 500 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Upload failed',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : 'Internal server error'
    }, { status: 500 });
  }
}