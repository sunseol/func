/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GET, POST } from '../route';
import { ApiError } from '@/lib/http';
import { AIpmErrorType } from '@/types/ai-pm';
import { getSupabase, requireAuth, requireProjectAccess } from '@/lib/ai-pm/auth';

type AppendMessages = (projectId: string, workflowStep: number, messages: readonly unknown[]) => Promise<void>;
const mockAppendMessages = jest.fn<ReturnType<AppendMessages>, Parameters<AppendMessages>>(
  async (_projectId, _workflowStep, _messages) => {},
);
const mockGetCurrentMessages = jest.fn(async () => []);
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
