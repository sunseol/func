import { NextRequest } from 'next/server';
import Groq from 'groq-sdk';
import { ApiError, json, parseJson, withApi } from '@/lib/http';
import { requireEnv } from '@/lib/env';

type GroqMessage = { role: 'system' | 'user' | 'assistant'; content: string };

interface GroqRequestBody {
  messages: GroqMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export const POST = withApi(async (request: NextRequest) => {
  const body = await parseJson<GroqRequestBody>(request);

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'messages is required');
  }

  const groq = new Groq({ apiKey: requireEnv('GROQ_API_KEY') });

  const chatCompletion = await groq.chat.completions.create({
    messages: body.messages,
    model: body.model ?? 'llama3-8b-8192',
    temperature: body.temperature ?? 0.7,
    max_tokens: body.maxTokens ?? 1024,
    top_p: 1,
    stream: false,
  });

  const content = chatCompletion.choices[0]?.message?.content ?? '';
  return json({ content });
});

export const GET = withApi(async () => {
  return json({ message: 'GROQ API endpoint is working' }, { status: 200 });
});
