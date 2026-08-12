import { NextRequest } from 'next/server';
import Groq from 'groq-sdk';
import { ApiError, json, withApi } from '@/lib/http';
import { requireEnv } from '@/lib/env';
import { getSupabase, requireAuth } from '@/lib/ai-pm/auth';
import { LOW_COST_MODEL } from '@/lib/report-generator/ai';

type GroqMessage = { role: 'system' | 'user' | 'assistant'; content: string };

const MAX_BODY_BYTES = 256 * 1024;
const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 32_000;
const MAX_MESSAGE_BYTES = 128 * 1024;
const MAX_OUTPUT_TOKENS = 1024;
const MAX_TEMPERATURE = 2;

type GroqRequestBody = {
  readonly messages: GroqMessage[];
  readonly model?: unknown;
  readonly temperature?: unknown;
  readonly maxTokens?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isGroqMessage(value: unknown): value is GroqMessage {
  if (typeof value !== 'object' || value === null) return false;
  if (!('role' in value) || !('content' in value)) return false;
  return (value.role === 'system' || value.role === 'user' || value.role === 'assistant') &&
    typeof value.content === 'string';
}

async function readJsonWithinLimit(request: Request, maxBytes: number): Promise<unknown> {
  const body = request.body;
  if (!body) {
    throw new ApiError(400, 'INVALID_JSON', 'Request body is required');
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      totalBytes += result.value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'request body exceeds the allowed limit');
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return parsed;
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'Invalid JSON body');
  }
}

function parseGroqRequest(value: unknown): GroqRequestBody {
  if (!isRecord(value) || !('messages' in value)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'messages is required');
  }

  const messages = value.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES ||
    !messages.every(isGroqMessage)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'messages must contain 1-40 valid messages');
  }

  const messageBytes = messages.reduce((total, message) => {
    if (message.content.length > MAX_MESSAGE_CHARS) {
      throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'message content exceeds the allowed limit');
    }
    return total + new TextEncoder().encode(message.content).byteLength;
  }, 0);
  if (messageBytes > MAX_MESSAGE_BYTES) {
    throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'message content exceeds the allowed limit');
  }

  const model = value.model;
  const maxTokens = value.maxTokens;
  const temperature = value.temperature;
  if (model !== undefined && model !== LOW_COST_MODEL) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'model is server-controlled');
  }
  if (maxTokens !== undefined &&
    (typeof maxTokens !== 'number' || !Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > MAX_OUTPUT_TOKENS)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'maxTokens exceeds the server limit');
  }
  if (temperature !== undefined &&
    (typeof temperature !== 'number' || !Number.isFinite(temperature) || temperature < 0 || temperature > MAX_TEMPERATURE)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'temperature must be between 0 and 2');
  }

  return {
    messages,
    model,
    temperature,
    maxTokens,
  };
}

export const POST = withApi(async (request: NextRequest) => {
  const supabase = await getSupabase();
  await requireAuth(supabase);

  const contentLength = request.headers.get('content-length');
  if (contentLength !== null && Number(contentLength) > MAX_BODY_BYTES) {
    throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'request body exceeds the allowed limit');
  }
  const rawBody = await readJsonWithinLimit(request, MAX_BODY_BYTES);
  if (new TextEncoder().encode(JSON.stringify(rawBody)).byteLength > MAX_BODY_BYTES) {
    throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'request body exceeds the allowed limit');
  }
  const body = parseGroqRequest(rawBody);

  const groq = new Groq({ apiKey: requireEnv('GROQ_API_KEY') });

  const chatCompletion = await groq.chat.completions.create({
    messages: body.messages,
    model: LOW_COST_MODEL,
    temperature: typeof body.temperature === 'number' ? body.temperature : 0.7,
    max_tokens: typeof body.maxTokens === 'number' ? body.maxTokens : MAX_OUTPUT_TOKENS,
    top_p: 1,
    stream: false,
  });

  const content = chatCompletion.choices[0]?.message?.content ?? '';
  return json({ content });
});

export const GET = withApi(async () => {
  return json({ message: 'GROQ API endpoint is working' }, { status: 200 });
});
