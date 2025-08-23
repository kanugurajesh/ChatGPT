import { GoogleGenAI, Modality } from "@google/genai";
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

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

    // Process the response parts
    for (const part of response.candidates[0].content.parts) {
      if (part.text) {
        generatedText += part.text;
      } else if (part.inlineData) {
        imageData = part.inlineData.data;
      }
    }

    if (!imageData) {
      return NextResponse.json({ 
        error: 'No image was generated', 
        text: generatedText 
      }, { status: 500 });
    }

    // Return the generated image data and any accompanying text
    return NextResponse.json({
      success: true,
      imageData: imageData, // Base64 encoded image
      text: generatedText,
      prompt: prompt.trim(),
      chatId: chatId,
      timestamp: new Date().toISOString()
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
    }

    return NextResponse.json({ 
      error: 'Failed to generate image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}