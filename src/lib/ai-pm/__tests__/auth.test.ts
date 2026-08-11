import { createClient } from '@supabase/supabase-js';
import { requireAuth, requireDocumentAccess, requireProjectAccess, type AiPmSupabase, type AuthContext } from '@/lib/ai-pm/auth';
import { AIpmErrorType, canProjectRoleApprove } from '@/types/ai-pm';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: jest.fn() },
    from: jest.fn(() => {
      const selectedQuery = {
        eq: jest.fn(),
        maybeSingle: jest.fn(),
        single: jest.fn(),
      };
      selectedQuery.eq.mockReturnValue(selectedQuery);
      const query = { select: jest.fn(() => selectedQuery) };
      return query;
    }),
    rpc: jest.fn(),
  })),
}));

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));
jest.mock('next/server', () => ({ NextResponse: { json: jest.fn() } }));

const auth: AuthContext = {
  user: { id: 'user-1', email: 'user@example.com' },
  profile: { id: 'user-1', email: 'user@example.com', full_name: null, role: 'user', created_at: '', updated_at: '' },
};

const createSupabase = (): AiPmSupabase => createClient('http://localhost:54321', 'test-key');

const okResponse = (data: unknown) => ({
  data,
  error: null,
  count: null,
  status: 200,
  statusText: 'OK',
});

const databaseError = Object.assign(new Error('db down'), { details: '', hint: '', code: 'XX000' });

const errorResponse = () => ({
  data: null,
  error: databaseError,
  count: null,
  status: 500,
  statusText: 'Internal Server Error',
});

const configureUser = (supabase: AiPmSupabase): void => {
  jest.spyOn(supabase.auth, 'getUser').mockResolvedValue({
    data: {
      user: {
        id: 'user-1',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '',
        email: 'user@example.com',
        updated_at: '',
      },
    },
    error: null,
  });
};

const configureQuery = (supabase: AiPmSupabase, relation: string) => {
  const query = supabase.from(relation);
  const selectedQuery = query.select('*');
  jest.spyOn(query, 'select').mockReturnValue(selectedQuery);
  return { query, selectedQuery };
};

describe('AI PM authorization error semantics', () => {
  it('reports profile query failures as database errors', async () => {
    const supabase = createSupabase();
    configureUser(supabase);
    const { query, selectedQuery } = configureQuery(supabase, 'user_profiles');
    jest.spyOn(selectedQuery, 'single').mockResolvedValue(errorResponse());
    jest.spyOn(supabase, 'from').mockReturnValue(query);

    await expect(requireAuth(supabase)).rejects.toMatchObject({ status: 500, code: AIpmErrorType.DATABASE_ERROR });
  });

  it('distinguishes project membership query failures from missing membership', async () => {
    const supabase = createSupabase();
    const { query, selectedQuery } = configureQuery(supabase, 'project_members');
    jest.spyOn(selectedQuery, 'maybeSingle').mockResolvedValue(errorResponse());
    jest.spyOn(supabase, 'from').mockReturnValue(query);

    await expect(requireProjectAccess(supabase, auth, 'project-1')).rejects.toMatchObject({ status: 500, code: AIpmErrorType.DATABASE_ERROR });
  });

  it('reports document query failures as database errors', async () => {
    const supabase = createSupabase();
    const { query, selectedQuery } = configureQuery(supabase, 'planning_documents');
    jest.spyOn(selectedQuery, 'single').mockResolvedValue(errorResponse());
    jest.spyOn(supabase, 'from').mockReturnValue(query);

    await expect(requireDocumentAccess(supabase, auth, 'document-1')).rejects.toMatchObject({ status: 500, code: AIpmErrorType.DATABASE_ERROR });
  });

  it('denies a creator who is no longer a current project member', async () => {
    const supabase = createSupabase();
    const document = configureQuery(supabase, 'planning_documents');
    jest.spyOn(document.selectedQuery, 'single').mockResolvedValue(okResponse({ id: 'document-1', project_id: 'project-1', created_by: 'user-1', status: 'private', workflow_step: 1 }));
    const membership = configureQuery(supabase, 'project_members');
    jest.spyOn(membership.selectedQuery, 'maybeSingle').mockResolvedValue(okResponse(null));
    jest.spyOn(supabase, 'from').mockImplementation((table) => table === 'planning_documents' ? document.query : membership.query);

    await expect(requireDocumentAccess(supabase, auth, 'document-1')).rejects.toMatchObject({ status: 403, code: AIpmErrorType.FORBIDDEN });
  });

  it('preserves membership query failures for a creator as database errors', async () => {
    const supabase = createSupabase();
    const document = configureQuery(supabase, 'planning_documents');
    jest.spyOn(document.selectedQuery, 'single').mockResolvedValue(okResponse({ id: 'document-1', project_id: 'project-1', created_by: 'user-1', status: 'private', workflow_step: 1 }));
    const membership = configureQuery(supabase, 'project_members');
    jest.spyOn(membership.selectedQuery, 'maybeSingle').mockResolvedValue(errorResponse());
    jest.spyOn(supabase, 'from').mockImplementation((table) => table === 'planning_documents' ? document.query : membership.query);

    await expect(requireDocumentAccess(supabase, auth, 'document-1')).rejects.toMatchObject({ status: 500, code: AIpmErrorType.DATABASE_ERROR });
  });

  it('matches the canonical workflow approver matrix', () => {
    expect(canProjectRoleApprove('service_planning', 1)).toBe(true);
    expect(canProjectRoleApprove('ux_planning', 4)).toBe(true);
    expect(canProjectRoleApprove('developer', 5)).toBe(true);
    expect(canProjectRoleApprove('content_planning', 9)).toBe(true);
    expect(canProjectRoleApprove('developer', 1)).toBe(false);
    expect(canProjectRoleApprove('ux_planning', 9)).toBe(false);
  });
});
