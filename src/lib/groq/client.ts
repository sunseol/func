export type GroqChatRole = 'system' | 'user' | 'assistant';

export interface GroqChatMessage {
  role: GroqChatRole;
  content: string;
}

export interface GroqChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function groqChat(
  messages: GroqChatMessage[],
  options: GroqChatOptions = {},
): Promise<string> {
  const response = await fetch('/api/groq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, ...options }),
  });

  const body = (await response.json().catch(() => null)) as null | { content?: string; error?: string };
  if (!response.ok) {
    const suffix = body?.error ? `: ${body.error}` : '';
    throw new Error(`Groq request failed (${response.status})${suffix}`);
  }

  return body?.content ?? '';
}

