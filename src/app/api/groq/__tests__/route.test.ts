/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { ApiError } from '@/lib/http';
import { requireAuth, getSupabase } from '@/lib/ai-pm/auth';
import { POST } from '../route';

const mockGroqCreate = jest.fn();

jest.mock('@/lib/ai-pm/auth', () => ({
  getSupabase: jest.fn(),
  requireAuth: jest.fn(),
}));

jest.mock('groq-sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockGroqCreate } },
  })),
}));

const mockGetSupabase = getSupabase as jest.MockedFunction<typeof getSupabase>;
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;

const authenticatedUser = {
  user: { id: 'user-1', email: 'user@example.com' },
  profile: {
    id: 'user-1',
    email: 'user@example.com',
    full_name: 'User',
    role: 'user' as const,
    created_at: '',
    updated_at: '',
  },
};

describe('/api/groq', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSupabase.mockResolvedValue({} as Awaited<ReturnType<typeof getSupabase>>);
    mockGroqCreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });
  });

  it('rejects unauthenticated requests before contacting Groq', async () => {
    mockRequireAuth.mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));

    const response = await POST(new NextRequest('http://localhost/api/groq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
    }), undefined);

    expect(response.status).toBe(401);
    expect(mockGroqCreate).not.toHaveBeenCalled();
  });

  it('preserves the response contract for authenticated requests', async () => {
    mockRequireAuth.mockResolvedValueOnce(authenticatedUser);

    const response = await POST(new NextRequest('http://localhost/api/groq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
    }), undefined);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ content: 'ok' });
    expect(mockGroqCreate).toHaveBeenCalledWith(expect.objectContaining({
      model: 'openai/gpt-oss-20b',
      max_tokens: 1024,
    }));
  });

  it('respects a caller token request within the server cap', async () => {
    mockRequireAuth.mockResolvedValueOnce(authenticatedUser);

    const response = await POST(new NextRequest('http://localhost/api/groq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }], maxTokens: 128 }),
    }), undefined);

    expect(response.status).toBe(200);
    expect(mockGroqCreate).toHaveBeenCalledWith(expect.objectContaining({ max_tokens: 128 }));
  });

  it('rejects a request that exceeds the message aggregate limit', async () => {
    mockRequireAuth.mockResolvedValueOnce(authenticatedUser);
    const content = 'x'.repeat(128_001);

    const response = await POST(new NextRequest('http://localhost/api/groq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content }] }),
    }), undefined);

    expect(response.status).toBe(413);
    expect(mockGroqCreate).not.toHaveBeenCalled();
  });

  it('rejects an oversized body without a content-length header before parsing JSON', async () => {
    mockRequireAuth.mockResolvedValueOnce(authenticatedUser);
    const body = JSON.stringify({
      messages: [{ role: 'user', content: 'hello' }],
      padding: 'x'.repeat(256 * 1024),
    });

    const response = await POST(new NextRequest('http://localhost/api/groq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }), undefined);

    expect(response.status).toBe(413);
    expect(mockGroqCreate).not.toHaveBeenCalled();
  });

  it('does not allow caller-selected model or token expansion', async () => {
    mockRequireAuth.mockResolvedValueOnce(authenticatedUser);

    const response = await POST(new NextRequest('http://localhost/api/groq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'hello' }],
        model: 'expensive-model',
        maxTokens: 99_999,
      }),
    }), undefined);

    expect(response.status).toBe(400);
    expect(mockGroqCreate).not.toHaveBeenCalled();
  });
});
