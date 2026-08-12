/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GET, POST } from '../route';
import { ApiError } from '@/lib/http';
import { AIpmErrorType } from '@/types/ai-pm';
import { getSupabase, requireAuth, requireProjectAccess } from '@/lib/ai-pm/auth';

type PersistedConversation = { readonly messages: readonly { readonly id: string; readonly role: 'user' | 'assistant'; readonly content: string; readonly timestamp: string }[] };
type AppendMessages = (projectId: string, workflowStep: number, messages: readonly unknown[]) => Promise<PersistedConversation>;
const mockAppendMessages = jest.fn<ReturnType<AppendMessages>, Parameters<AppendMessages>>(
  async (_projectId, _workflowStep, messages) => ({ messages: messages as PersistedConversation['messages'] }),
);
const mockGetCurrentMessages = jest.fn(async () => []);
type ReplayMessage = { readonly id: string; readonly role: 'assistant'; readonly content: string; readonly timestamp: string };
const mockGetIdempotentAssistantMessage = jest.fn<Promise<ReplayMessage | null>, []>(async () => null);
const mockGenerateResponse = jest.fn(async () => 'AI response');

jest.mock('@/lib/ai-pm/auth', () => ({
  getSupabase: jest.fn(),
  requireAuth: jest.fn(),
  requireProjectAccess: jest.fn(),
}));

jest.mock('@/lib/ai-pm/conversation-manager', () => ({
  getConversationManager: () => ({
    appendMessages: mockAppendMessages,
    getCurrentMessages: mockGetCurrentMessages,
    getIdempotentAssistantMessage: mockGetIdempotentAssistantMessage,
    loadConversation: jest.fn(async () => null),
    clearConversation: jest.fn(async () => {}),
  }),
}));

jest.mock('@/lib/ai-pm/ai-service', () => ({
  getAIService: () => ({
    generateResponse: mockGenerateResponse,
  }),
}));

const mockGetSupabase = getSupabase as jest.MockedFunction<typeof getSupabase>;
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockRequireProjectAccess = requireProjectAccess as jest.MockedFunction<typeof requireProjectAccess>;
type AuthResult = Awaited<ReturnType<typeof requireAuth>>;

const createSupabaseMock = () => Object.assign(createClient('http://localhost:54321', 'test-key'), {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: { name: 'Demo', description: '' }, error: null })),
      })),
    })),
  })),
});

const createAuth = (): AuthResult => ({
  user: { id: 'user-1', email: 'user@example.com' },
  profile: {
    id: 'user-1',
    email: 'user@example.com',
    full_name: 'User',
    role: 'user',
    created_at: '',
    updated_at: '',
  },
});

describe('/api/ai-pm/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAppendMessages.mockClear();
    mockGetCurrentMessages.mockClear();
    mockGetIdempotentAssistantMessage.mockClear();
    mockGenerateResponse.mockReset();
    mockGenerateResponse.mockResolvedValue('AI response');
  });

  it('returns 401 when auth fails', async () => {
    mockGetSupabase.mockResolvedValue(createSupabaseMock());
    mockRequireAuth.mockRejectedValueOnce(
      new ApiError(401, AIpmErrorType.UNAUTHORIZED, 'Authentication required'),
    );

    const request = new NextRequest('http://localhost:3000/api/ai-pm/chat?projectId=abc&workflowStep=1');
    const response = await GET(request, undefined);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe(AIpmErrorType.UNAUTHORIZED);
  });

  it('returns AI response for valid POST', async () => {
    mockGetSupabase.mockResolvedValue(createSupabaseMock());
    mockRequireAuth.mockResolvedValueOnce(createAuth());
    mockRequireProjectAccess.mockResolvedValueOnce();

    const request = new NextRequest('http://localhost:3000/api/ai-pm/chat?projectId=11111111-1111-4111-8111-111111111111', {
      method: 'POST',
      body: JSON.stringify({ message: 'Hello', workflow_step: 1 }),
    });

    const response = await POST(request, undefined);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.response).toBe('AI response');
    expect(mockAppendMessages).toHaveBeenCalledTimes(1);
    expect(mockAppendMessages.mock.calls[0]?.[2]).toHaveLength(2);
  });

  it('returns a persisted replay without calling the provider or append', async () => {
    mockGetSupabase.mockResolvedValue(createSupabaseMock());
    mockRequireAuth.mockResolvedValueOnce(createAuth());
    mockRequireProjectAccess.mockResolvedValueOnce();
    mockGetIdempotentAssistantMessage.mockResolvedValueOnce({
      id: 'assistant-1',
      role: 'assistant',
      content: 'Persisted response',
      timestamp: '2026-08-04T00:00:00.000Z',
    });

    const request = new NextRequest('http://localhost:3000/api/ai-pm/chat?projectId=11111111-1111-4111-8111-111111111111', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Hello',
        workflow_step: 1,
        idempotency_key: '33333333-3333-4333-8333-333333333333',
        user_message_id: '44444444-4444-4444-8444-444444444444',
        assistant_message_id: '55555555-5555-4555-8555-555555555555',
      }),
    });

    const response = await POST(request, undefined);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.response).toBe('Persisted response');
    expect(mockGenerateResponse).not.toHaveBeenCalled();
    expect(mockAppendMessages).not.toHaveBeenCalled();
  });

  it('returns the content selected by the atomic append when another request won the race', async () => {
    mockGetSupabase.mockResolvedValue(createSupabaseMock());
    mockRequireAuth.mockResolvedValueOnce(createAuth());
    mockRequireProjectAccess.mockResolvedValueOnce();
    mockAppendMessages.mockResolvedValueOnce({
      messages: [
        { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', role: 'user', content: 'Hello', timestamp: '2026-08-04T00:00:00.000Z' },
        { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', role: 'assistant', content: 'Persisted response A', timestamp: '2026-08-04T00:00:01.000Z' },
      ],
    });
    mockGenerateResponse.mockResolvedValueOnce('Generated response B');

    const response = await POST(new NextRequest('http://localhost:3000/api/ai-pm/chat?projectId=11111111-1111-4111-8111-111111111111', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Hello',
        workflow_step: 1,
        idempotency_key: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        user_message_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        assistant_message_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      }),
    }), undefined);
    const data = await response.json();

    expect(data.response).toBe('Persisted response A');
    expect(data.response).not.toBe('Generated response B');
  });

  it('returns a truthful validation error for malformed message input', async () => {
    mockGetSupabase.mockResolvedValue(createSupabaseMock());
    mockRequireAuth.mockResolvedValueOnce(createAuth());

    const request = new NextRequest('http://localhost:3000/api/ai-pm/chat?projectId=11111111-1111-4111-8111-111111111111', {
      method: 'POST',
      body: JSON.stringify({ message: 42, workflow_step: 1 }),
    });

    const response = await POST(request, undefined);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe(AIpmErrorType.VALIDATION_ERROR);
  });

  it('does not expose provider details in AI failure responses', async () => {
    mockGetSupabase.mockResolvedValue(createSupabaseMock());
    mockRequireAuth.mockResolvedValueOnce(createAuth());
    mockRequireProjectAccess.mockResolvedValueOnce();
    mockGenerateResponse.mockRejectedValueOnce({
      error: AIpmErrorType.AI_SERVICE_ERROR,
      message: 'provider-secret-message',
      details: 'provider-secret-details',
    });

    const request = new NextRequest('http://localhost:3000/api/ai-pm/chat?projectId=11111111-1111-4111-8111-111111111111', {
      method: 'POST',
      body: JSON.stringify({ message: 'Hello', workflow_step: 1 }),
    });

    const response = await POST(request, undefined);
    const data = await response.json();
    const serialized = JSON.stringify(data);

    expect(response.status).toBe(500);
    expect(data.error).toBe(AIpmErrorType.AI_SERVICE_ERROR);
    expect(serialized).not.toContain('provider-secret-message');
    expect(serialized).not.toContain('provider-secret-details');
  });
});
