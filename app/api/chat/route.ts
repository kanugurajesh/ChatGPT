import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';

const MAX_CONTEXT = 20;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const history = (Array.isArray(body?.messages) ? body.messages : []) as { role: string, content: string }[];
  const trimmedHistory = history.slice(-MAX_CONTEXT);

  const model = google('models/gemini-2.0-flash-exp');

  const { textStream } = await streamText({
    model,
    messages: trimmedHistory,
  });

  // Return streaming response
  return new Response(textStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}