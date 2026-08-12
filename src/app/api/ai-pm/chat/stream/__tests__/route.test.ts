/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { POST } from '../route';
import { getSupabase, requireAuth, requireProjectAccess, type AuthContext } from '@/lib/ai-pm/auth';
import { getConversationManager } from '@/lib/ai-pm/conversation-manager';
import { AIpmErrorType } from '@/types/ai-pm';

type PersistedConversation = { readonly messages: readonly { readonly id: string; readonly role: 'user' | 'assistant'; readonly content: string; readonly timestamp: string }[] };
type AppendMessages = (
  projectId: string,
  workflowStep: number,
  messages: readonly unknown[],
  options?: { readonly idempotencyKey?: string },
) => Promise<PersistedConversation>;
const mockAppendMessages = jest.fn<ReturnType<AppendMessages>, Parameters<AppendMessages>>(
  async (_projectId, _workflowStep, messages) => ({ messages: messages as PersistedConversation['messages'] }),
);
const mockGetCurrentMessages = jest.fn(async () => []);
type ReplayMessage = { readonly id: string; readonly role: 'assistant'; readonly content: string; readonly timestamp: string };
const mockGetIdempotentAssistantMessage = jest.fn<Promise<ReplayMessage | null>, []>(async () => null);
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
    getIdempotentAssistantMessage: mockGetIdempotentAssistantMessage,
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
    mockGetIdempotentAssistantMessage.mockClear();
    mockGenerateStreamingResponse.mockReset();
    mockGenerateStreamingResponse.mockImplementation(async function* () {
      yield { content: 'Reply', error: undefined };
    });
    mockGetSupabase.mockResolvedValue(createSupabaseMock());
    mockRequireAuth.mockResolvedValue(authContext);
    mockRequireProjectAccess.mockResolvedValue();
  });

  it('persists one user/assistant pair through one atomic RPC after streaming succeeds', async () => {
    const requestIdentity = {
      idempotency_key: '33333333-3333-4333-8333-333333333333',
      user_message_id: '44444444-4444-4444-8444-444444444444',
      assistant_message_id: '55555555-5555-4555-8555-555555555555',
    };
    const request = new NextRequest('http://localhost:3000/api/ai-pm/chat/stream?projectId=11111111-1111-4111-8111-111111111111', {
      method: 'POST',
      body: JSON.stringify({ message: 'Hello', workflow_step: 1, ...requestIdentity }),
    });

    const response = await POST(request, undefined);
    await response.text();

    expect(mockAppendMessages).toHaveBeenCalledTimes(1);
    expect(mockAppendMessages.mock.calls[0]?.[2]).toHaveLength(2);
    expect(mockAppendMessages.mock.calls[0]?.[2]?.[0]).toMatchObject({ id: requestIdentity.user_message_id });
    expect(mockAppendMessages.mock.calls[0]?.[2]?.[1]).toMatchObject({ id: requestIdentity.assistant_message_id });
    expect(mockAppendMessages.mock.calls[0]?.[3]).toEqual({ idempotencyKey: requestIdentity.idempotency_key });
  });

  it('reuses the same request and message identities when a response is replayed', async () => {
    const body = {
      message: 'Replay me',
      workflow_step: 1,
      idempotency_key: '66666666-6666-4666-8666-666666666666',
      user_message_id: '77777777-7777-4777-8777-777777777777',
      assistant_message_id: '88888888-8888-4888-8888-888888888888',
    };
    const request = () => new NextRequest('http://localhost:3000/api/ai-pm/chat/stream?projectId=11111111-1111-4111-8111-111111111111', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    mockGetIdempotentAssistantMessage
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: body.assistant_message_id,
        role: 'assistant',
        content: 'Reply',
        timestamp: '2026-08-04T00:00:00.000Z',
      });
    await (await POST(request(), undefined)).text();
    await (await POST(request(), undefined)).text();

    expect(mockAppendMessages).toHaveBeenCalledTimes(1);
    expect(mockGenerateStreamingResponse).toHaveBeenCalledTimes(1);
  });

  it('streams the persisted response on response-loss replay without regenerating', async () => {
    const body = {
      message: 'Replay me',
      workflow_step: 1,
      idempotency_key: '99999999-9999-4999-8999-999999999999',
      user_message_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      assistant_message_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    };
    mockGetIdempotentAssistantMessage.mockResolvedValueOnce({
      id: body.assistant_message_id,
      role: 'assistant',
      content: 'Persisted response A',
      timestamp: '2026-08-04T00:00:00.000Z',
    });

    const response = await POST(new NextRequest('http://localhost:3000/api/ai-pm/chat/stream?projectId=11111111-1111-4111-8111-111111111111', {
      method: 'POST',
      body: JSON.stringify(body),
    }), undefined);
    const output = await response.text();

    expect(output).toContain('Persisted response A');
    expect(output).not.toContain('Reply');
    expect(mockGenerateStreamingResponse).not.toHaveBeenCalled();
    expect(mockAppendMessages).not.toHaveBeenCalled();
  });

  it('emits the content returned by the atomic append when a concurrent request generated another reply', async () => {
    mockAppendMessages.mockResolvedValueOnce({
      messages: [
        { id: 'user-1', role: 'user', content: 'Hello', timestamp: '2026-08-04T00:00:00.000Z' },
        { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', role: 'assistant', content: 'Persisted response A', timestamp: '2026-08-04T00:00:01.000Z' },
      ],
    });
    mockGenerateStreamingResponse.mockImplementationOnce(async function* () {
      yield { content: 'Generated response B', error: undefined };
    });

    const response = await POST(new NextRequest('http://localhost:3000/api/ai-pm/chat/stream?projectId=11111111-1111-4111-8111-111111111111', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Hello',
        workflow_step: 1,
        idempotency_key: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        user_message_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        assistant_message_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      }),
    }), undefined);
    const output = await response.text();

    expect(output).toContain('Persisted response A');
    expect(output).not.toContain('Generated response B');
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
