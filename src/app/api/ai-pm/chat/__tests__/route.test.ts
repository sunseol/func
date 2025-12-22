/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { ApiError } from '@/lib/http';
import { AIpmErrorType } from '@/types/ai-pm';

jest.mock('@/lib/ai-pm/auth', () => ({
  getSupabase: jest.fn(),
  requireAuth: jest.fn(),
  requireProjectAccess: jest.fn(),
}));

jest.mock('@/lib/ai-pm/conversation-manager', () => ({
  getConversationManager: () => ({
    addMessage: jest.fn(async () => {}),
    getCurrentMessages: jest.fn(async () => []),
    forceSave: jest.fn(async () => {}),
    loadConversation: jest.fn(async () => null),
    updateConversationMessages: jest.fn(async () => {}),
    clearConversation: jest.fn(async () => {}),
  }),
}));

jest.mock('@/lib/ai-pm/ai-service', () => ({
  getAIService: () => ({
    generateResponse: jest.fn(async () => 'AI response'),
  }),
}));

import { getSupabase, requireAuth, requireProjectAccess } from '@/lib/ai-pm/auth';

const mockGetSupabase = getSupabase as jest.MockedFunction<typeof getSupabase>;
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockRequireProjectAccess = requireProjectAccess as jest.MockedFunction<typeof requireProjectAccess>;

const createSupabaseMock = () => ({
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: { name: 'Demo', description: '' }, error: null })),
      })),
    })),
  })),
});

describe('/api/ai-pm/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when auth fails', async () => {
    mockGetSupabase.mockResolvedValue(createSupabaseMock() as any);
    mockRequireAuth.mockRejectedValueOnce(
      new ApiError(401, AIpmErrorType.UNAUTHORIZED, 'Authentication required'),
    );

    const request = new NextRequest('http://localhost:3000/api/ai-pm/chat?projectId=abc&workflowStep=1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe(AIpmErrorType.UNAUTHORIZED);
  });

  it('returns AI response for valid POST', async () => {
    mockGetSupabase.mockResolvedValue(createSupabaseMock() as any);
    mockRequireAuth.mockResolvedValueOnce({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: { id: 'user-1', email: 'user@example.com', full_name: 'User', role: 'user', created_at: '', updated_at: '' },
    } as any);
    mockRequireProjectAccess.mockResolvedValueOnce();

    const request = new NextRequest('http://localhost:3000/api/ai-pm/chat?projectId=11111111-1111-1111-1111-111111111111', {
      method: 'POST',
      body: JSON.stringify({ message: 'Hello', workflow_step: 1 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.response).toBe('AI response');
  });
});
