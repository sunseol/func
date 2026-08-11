/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { POST } from '../route';
import { getSupabase, requireAuth, requireProjectAccess, type AuthContext } from '@/lib/ai-pm/auth';
import { getConversationManager } from '@/lib/ai-pm/conversation-manager';
import { AIpmErrorType } from '@/types/ai-pm';

type AppendMessages = (projectId: string, workflowStep: number, messages: readonly unknown[]) => Promise<void>;
const mockAppendMessages = jest.fn<ReturnType<AppendMessages>, Parameters<AppendMessages>>(
  async (_projectId, _workflowStep, _messages) => {},
);
const mockGetCurrentMessages = jest.fn(async () => []);
const mockGenerateStreamingResponse = jest.fn(async function* () {
  yield { content: 'Reply', error: undefined };
});

jest.mock('@/lib/ai-pm/auth', () => ({
  getSupabase: jest.fn(),
  requireAuth: jest.fn(),
  requireProjectAccess: jest.fn(),
}));

jest.mock('@/lib/ai-pm/conversation-manager', () => ({
  getConversationManager: jest.fn(() => ({
    appendMessages: mockAppendMessages,
    getCurrentMessages: mockGetCurrentMessages,
  })),
}));

jest.mock('@/lib/ai-pm/ai-service', () => ({
  getAIService: jest.fn(() => ({ generateStreamingResponse: mockGenerateStreamingResponse })),
}));

const mockGetSupabase = getSupabase as jest.MockedFunction<typeof getSupabase>;
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockRequireProjectAccess = requireProjectAccess as jest.MockedFunction<typeof requireProjectAccess>;
const createSupabaseMock = () => {
  const supabase = createClient('http://localhost:54321', 'test-key');
  const projectsQuery = supabase.from('projects');
  const selectedProjectsQuery = projectsQuery.select('*');

  jest.spyOn(projectsQuery, 'select').mockReturnValue(selectedProjectsQuery);
  jest.spyOn(selectedProjectsQuery, 'single').mockResolvedValue({
    data: { name: 'Demo', description: '' },
    error: null,
    count: null,
    status: 200,
    statusText: 'OK',
  });
  jest.spyOn(supabase, 'from').mockReturnValue(projectsQuery);

  return supabase;
};

const authContext: AuthContext = {
  user: { id: 'user-1', email: 'user@example.com' },
  profile: { id: 'user-1', email: 'user@example.com', full_name: 'User', role: 'user', created_at: '', updated_at: '' },
};

describe('/api/ai-pm/chat/stream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAppendMessages.mockClear();
    mockGetCurrentMessages.mockClear();
    mockGenerateStreamingResponse.mockReset();
    mockGenerateStreamingResponse.mockImplementation(async function* () {
      yield { content: 'Reply', error: undefined };
    });
    mockGetSupabase.mockResolvedValue(createSupabaseMock());
    mockRequireAuth.mockResolvedValue(authContext);
    mockRequireProjectAccess.mockResolvedValue();
  });

  it('persists one user/assistant pair through one atomic RPC after streaming succeeds', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai-pm/chat/stream?projectId=11111111-1111-4111-8111-111111111111', {
      method: 'POST',
      body: JSON.stringify({ message: 'Hello', workflow_step: 1 }),
    });

    const response = await POST(request, undefined);
    await response.text();

    expect(mockAppendMessages).toHaveBeenCalledTimes(1);
    expect(mockAppendMessages.mock.calls[0]?.[2]).toHaveLength(2);
  });

  it('does not expose internal stream errors in SSE output', async () => {
    mockGenerateStreamingResponse.mockImplementationOnce(async function* () {
      throw new Error('stream-internal-sentinel');
    });

    const request = new NextRequest('http://localhost:3000/api/ai-pm/chat/stream?projectId=11111111-1111-4111-8111-111111111111', {
      method: 'POST',
      body: JSON.stringify({ message: 'Hello', workflow_step: 1 }),
    });

    const response = await POST(request, undefined);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain(AIpmErrorType.INTERNAL_ERROR);
    expect(body).toContain('Streaming failed');
    expect(body).not.toContain('stream-internal-sentinel');
  });
});
