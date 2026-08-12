import type { SupabaseClient } from '@supabase/supabase-js';
import type { PostgrestSingleResponse } from '@supabase/postgrest-js';
import { createClient } from '@supabase/supabase-js';
import { ConversationManager } from '../conversation-manager';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: jest.fn() },
    from: jest.fn(() => {
      const selectedQuery = {
        eq: jest.fn(),
        order: jest.fn(),
        limit: jest.fn(),
        maybeSingle: jest.fn(() => ({ then: jest.fn() })),
        single: jest.fn(),
      };
      selectedQuery.eq.mockReturnValue(selectedQuery);
      selectedQuery.order.mockReturnValue(selectedQuery);
      selectedQuery.limit.mockReturnValue(selectedQuery);
      const query = { select: jest.fn(() => selectedQuery) };
      return query;
    }),
    rpc: jest.fn(() => ({ then: jest.fn() })),
  })),
}));

const createSupabaseClient = (): SupabaseClient => createClient('http://localhost:54321', 'test-key');

const mockRpcResponse = (supabase: SupabaseClient, response: PostgrestSingleResponse<unknown>) => {
  const rpcBuilder = supabase.rpc('append_ai_conversation_messages', {});
  jest.spyOn(rpcBuilder, 'then').mockImplementation((onfulfilled) => {
    onfulfilled?.(response);
    return Promise.resolve(response);
  });
  jest.spyOn(supabase, 'rpc').mockReturnValue(rpcBuilder);
  const rpc = jest.spyOn(supabase, 'rpc');
  rpc.mockClear();
  return rpc;
};

const requestClaimOptions = {
  idempotencyKey: '33333333-3333-4333-8333-333333333333',
  userMessageId: '44444444-4444-4444-8444-444444444444',
  assistantMessageId: '55555555-5555-4555-8555-555555555555',
} as const;

const mockClaimRpcResponse = (supabase: SupabaseClient, data: unknown) => {
  const rpcBuilder = supabase.rpc('claim_ai_conversation_request', {});
  jest.spyOn(rpcBuilder, 'then').mockImplementation((onfulfilled) => {
    const response = { data, error: null, count: null, status: 200, statusText: 'OK' };
    onfulfilled?.(response);
    return Promise.resolve(response);
  });
  jest.spyOn(supabase, 'rpc').mockReturnValue(rpcBuilder);
  const rpc = jest.spyOn(supabase, 'rpc');
  rpc.mockClear();
  return rpc;
};

describe('ConversationManager atomic appends', () => {
  it('returns the persisted response for a completed request claim', async () => {
    const supabase = createSupabaseClient();
    const rpc = mockClaimRpcResponse(supabase, {
      status: 'completed',
      response_content: 'Persisted response',
    });
    const manager = new ConversationManager(supabase);

    await expect(manager.claimRequest('project-1', 1, requestClaimOptions)).resolves.toEqual({
      status: 'completed',
      responseContent: 'Persisted response',
    });
    expect(rpc).toHaveBeenCalledWith('claim_ai_conversation_request', expect.objectContaining({
      p_idempotency_key: requestClaimOptions.idempotencyKey,
      p_user_message_id: requestClaimOptions.userMessageId,
      p_assistant_message_id: requestClaimOptions.assistantMessageId,
    }));
  });

  it('rejects a completed claim without a persisted response', async () => {
    const supabase = createSupabaseClient();
    mockClaimRpcResponse(supabase, { status: 'completed' });
    const manager = new ConversationManager(supabase);

    await expect(manager.claimRequest('project-1', 1, requestClaimOptions)).rejects.toMatchObject({
      error: 'DATABASE_ERROR',
    });
  });

  it('appends each message through the authenticated RPC and returns the persisted row', async () => {
    const supabase = createSupabaseClient();
    const rpc = mockRpcResponse(supabase, {
      data: [
        {
          id: 'conversation-1',
          project_id: 'project-1',
          workflow_step: 1,
          user_id: 'user-1',
          messages: [
            {
              id: 'message-1',
              role: 'user',
              content: 'Hello',
              timestamp: '2026-08-04T00:00:00.000Z',
            },
            {
              id: 'message-2',
              role: 'assistant',
              content: 'Hi',
              timestamp: '2026-08-04T00:00:01.000Z',
            },
          ],
          created_at: '2026-08-04T00:00:00.000Z',
          updated_at: '2026-08-04T00:00:00.000Z',
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    });
    const manager = new ConversationManager(supabase);

    await manager.appendMessages('project-1', 1, [{
      id: 'message-1',
      role: 'user',
      content: 'Hello',
      timestamp: '2026-08-04T00:00:00.000Z',
    }, {
      id: 'message-2',
      role: 'assistant',
      content: 'Hi',
      timestamp: '2026-08-04T00:00:01.000Z',
    }], { idempotencyKey: '33333333-3333-4333-8333-333333333333' });

    expect(rpc).toHaveBeenCalledWith('append_ai_conversation_messages', {
      p_project_id: 'project-1',
      p_workflow_step: 1,
      p_messages: [
        {
          id: 'message-1',
          role: 'user',
          content: 'Hello',
          timestamp: '2026-08-04T00:00:00.000Z',
        },
        {
          id: 'message-2',
          role: 'assistant',
          content: 'Hi',
          timestamp: '2026-08-04T00:00:01.000Z',
        },
      ],
      p_idempotency_key: '33333333-3333-4333-8333-333333333333',
    });
  });

  it('does not issue a read-modify-write when appending messages', async () => {
    const supabase = createSupabaseClient();
    const rpc = mockRpcResponse(supabase, {
      data: [
        {
          id: 'conversation-1',
          project_id: 'project-1',
          workflow_step: 1,
          user_id: 'user-1',
          messages: [],
          created_at: '2026-08-04T00:00:00.000Z',
          updated_at: '2026-08-04T00:00:00.000Z',
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    });
    const from = jest.spyOn(supabase, 'from');
    const manager = new ConversationManager(supabase);

    await manager.appendMessages('project-1', 1, [{
      role: 'user',
      content: 'Hello',
    }, {
      role: 'assistant',
      content: 'Welcome',
    }]);

    expect(from).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('rejects an RPC row containing malformed history instead of dropping it', async () => {
    const supabase = createSupabaseClient();
    const rpc = mockRpcResponse(supabase, {
      data: [
        {
          id: 'conversation-1',
          project_id: 'project-1',
          workflow_step: 1,
          user_id: 'user-1',
          messages: [{ id: 'bad', role: 'unknown', content: 'bad', timestamp: '2026-08-04T00:00:00.000Z' }],
          created_at: '2026-08-04T00:00:00.000Z',
          updated_at: '2026-08-04T00:00:00.000Z',
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    });
    const manager = new ConversationManager(supabase);

    await expect(manager.appendMessages('project-1', 1, [{ role: 'user', content: 'Hello' }, { role: 'assistant', content: 'Hi' }])).rejects.toMatchObject({
      error: 'DATABASE_ERROR',
    });
  });

  it('rejects a non-null malformed row while loading history', async () => {
    const row = {
      id: 'conversation-1',
      project_id: 'project-1',
      workflow_step: 1,
      user_id: 'user-1',
      messages: [{ id: 'bad', role: 'unknown', content: 'bad', timestamp: '2026-08-04T00:00:00.000Z' }],
      created_at: '2026-08-04T00:00:00.000Z',
      updated_at: '2026-08-04T00:00:00.000Z',
    };
    const supabase = createSupabaseClient();
    const conversationQuery = supabase.from('ai_conversations');
    const selectedConversationQuery = conversationQuery.select('*');
    const maybeSingleQuery = selectedConversationQuery.maybeSingle();
    jest.spyOn(maybeSingleQuery, 'then').mockImplementation((onfulfilled) => {
      const response = { data: row, error: null, count: null, status: 200, statusText: 'OK' };
      onfulfilled?.(response);
      return Promise.resolve(response);
    });
    jest.spyOn(conversationQuery, 'select').mockReturnValue(selectedConversationQuery);
    jest.spyOn(selectedConversationQuery, 'maybeSingle').mockReturnValue(maybeSingleQuery);
    jest.spyOn(supabase, 'from').mockReturnValue(conversationQuery);
    const manager = new ConversationManager(supabase);

    await expect(manager.loadConversation('project-1', 1, 'user-1')).rejects.toMatchObject({
      error: 'DATABASE_ERROR',
    });
  });

  it('rejects a pair that is not ordered user then assistant before calling RPC', async () => {
    const supabase = createSupabaseClient();
    const rpc = jest.spyOn(supabase, 'rpc');
    const manager = new ConversationManager(supabase);
    const invalidPair = [
      { role: 'assistant', content: 'Hi' },
      { role: 'user', content: 'Hello' },
    ] as const;

    await expect(Reflect.apply(manager.appendMessages, manager, ['project-1', 1, invalidPair])).rejects.toMatchObject({
      error: 'DATABASE_ERROR',
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('returns the persisted assistant for an exact idempotency replay', async () => {
    const supabase = createSupabaseClient();
    const conversationQuery = supabase.from('ai_conversations');
    const selectedConversationQuery = conversationQuery.select('*');
    const maybeSingleQuery = selectedConversationQuery.maybeSingle();
    jest.spyOn(maybeSingleQuery, 'then').mockImplementation((onfulfilled) => {
      const response = {
        data: {
          id: 'conversation-1',
          project_id: 'project-1',
          workflow_step: 1,
          user_id: 'user-1',
          messages: [
            { id: 'user-1', role: 'user', content: 'Hello', timestamp: '2026-08-04T00:00:00.000Z', idempotency_key: '33333333-3333-4333-8333-333333333333' },
            { id: 'assistant-1', role: 'assistant', content: 'Persisted response A', timestamp: '2026-08-04T00:00:01.000Z', idempotency_key: '33333333-3333-4333-8333-333333333333' },
          ],
          created_at: '2026-08-04T00:00:00.000Z',
          updated_at: '2026-08-04T00:00:01.000Z',
        },
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      };
      onfulfilled?.(response);
      return Promise.resolve(response);
    });
    jest.spyOn(conversationQuery, 'select').mockReturnValue(selectedConversationQuery);
    jest.spyOn(selectedConversationQuery, 'maybeSingle').mockReturnValue(maybeSingleQuery);
    jest.spyOn(supabase, 'from').mockReturnValue(conversationQuery);
    const manager = new ConversationManager(supabase);

    await expect(manager.getIdempotentAssistantMessage('project-1', 1, 'user-1', {
      idempotencyKey: '33333333-3333-4333-8333-333333333333',
      userMessageId: 'user-1',
      assistantMessageId: 'assistant-1',
    })).resolves.toMatchObject({ content: 'Persisted response A' });
  });
});
