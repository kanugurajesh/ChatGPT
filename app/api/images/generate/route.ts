import { GoogleGenAI, Modality } from "@google/genai";
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadBase64Image } from '@/lib/cloudinary-server';
import { GeneratedImage } from '@/lib/models/Image';
import { connectToMongoDB } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { prompt, chatId } = body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Initialize Google GenAI with API key
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.error('Google Generative AI API key not found');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Generate image using the new Google GenAI native image generation
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
      contents: prompt.trim(),
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    let generatedText = '';
    let imageData = null;

    // Process the response parts with proper null checks
    if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          generatedText += part.text;
        } else if (part.inlineData) {
          imageData = part.inlineData.data;
        }
      }
    } else {
      console.error('Unexpected response structure:', JSON.stringify(response, null, 2));
      return NextResponse.json({ 
        error: 'Unexpected API response structure' 
      }, { status: 500 });
    }

    if (!imageData) {
      return NextResponse.json({ 
        error: 'No image was generated', 
        text: generatedText 
      }, { status: 500 });
    }

    // Upload to Cloudinary
    const cloudinaryResult = await uploadBase64Image(imageData, {
      folder: 'ai-generated',
      tags: ['ai-generated', 'chat-image', userId],
    });

    // Connect to MongoDB and save image metadata
    await connectToMongoDB();
    
    const generatedImage = new GeneratedImage({
      id: new Date().getTime().toString() + '-' + Math.random().toString(36).substr(2, 9),
      userId: userId,
      prompt: prompt.trim(),
      cloudinaryUrl: cloudinaryResult.secure_url,
      cloudinaryPublicId: cloudinaryResult.public_id,
      chatId: chatId,
      generatedAt: new Date(),
      generationSettings: {
        model: 'gemini-2.0-flash-preview-image-generation',
        timestamp: new Date().toISOString(),
      },
      metadata: {
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        format: cloudinaryResult.format,
        fileSize: cloudinaryResult.bytes,
      },
    });

    await generatedImage.save();

    // Return the Cloudinary URL and metadata
    return NextResponse.json({
      success: true,
      imageUrl: cloudinaryResult.secure_url,
      cloudinaryPublicId: cloudinaryResult.public_id,
      imageId: generatedImage.id,
      text: generatedText,
      prompt: prompt.trim(),
      chatId: chatId,
      timestamp: new Date().toISOString(),
      metadata: {
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        format: cloudinaryResult.format,
        fileSize: cloudinaryResult.bytes,
      }
    });

  } catch (error) {
    console.error('Error generating image:', error);
    
    // Handle specific API errors
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
      }
      if (error.message.includes('quota')) {
        return NextResponse.json({ error: 'API quota exceeded' }, { status: 429 });
      }
      if (error.message.includes('content policy')) {
        return NextResponse.json({ error: 'Content violates policy' }, { status: 400 });
      }
      if (error.message.includes('Cloudinary')) {
        return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
      }
      if (error.message.includes('MongoDB') || error.message.includes('database')) {
        return NextResponse.json({ error: 'Failed to save image metadata' }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      error: 'Failed to generate image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}