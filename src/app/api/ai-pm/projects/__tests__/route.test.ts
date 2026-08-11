/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GET, POST } from '../route';
import { ApiError } from '@/lib/http';
import { AIpmErrorType } from '@/types/ai-pm';

jest.mock('@/lib/ai-pm/auth', () => ({
  getSupabase: jest.fn(),
  requireAuth: jest.fn(),
}));

import { getSupabase, requireAuth, type AuthContext } from '@/lib/ai-pm/auth';

const mockGetSupabase = getSupabase as jest.MockedFunction<typeof getSupabase>;
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;

const createAuth = (
  role: AuthContext['profile']['role'] = 'user',
  id = 'user-1',
  email = 'user@example.com',
  fullName = 'User',
): AuthContext => ({
  user: { id, email },
  profile: { id, email, full_name: fullName, role, created_at: '', updated_at: '' },
});
type RpcResult = { readonly data: unknown; readonly error: unknown };

const createSupabaseMock = (projects: ReadonlyArray<Record<string, unknown>> = []) => Object.assign(createClient('http://localhost:54321', 'test-key'), {
  rpc: jest.fn<Promise<RpcResult>, [string, Readonly<Record<string, unknown>>?]>(() => Promise.resolve({ data: projects, error: null })),
  from: jest.fn((table: string) => {
    if (table === 'projects' || table === 'projects_with_counts') {
      return {
        select: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: projects, error: null })),
          in: jest.fn(() => Promise.resolve({ data: projects, error: null })),
          single: jest.fn(() => Promise.resolve({ data: projects[0] ?? null, error: null })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: projects[0] ?? null, error: null })),
          })),
        })),
      };
    }

    if (table === 'project_members') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: [{ project_id: 'project-1', role: 'service_planning' }], error: null })),
        })),
        insert: jest.fn(() => Promise.resolve({ error: null })),
      };
    }

    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    };
  }),
});

describe('/api/ai-pm/projects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when auth fails', async () => {
    mockGetSupabase.mockResolvedValue(createSupabaseMock());
    mockRequireAuth.mockRejectedValueOnce(
      new ApiError(401, AIpmErrorType.UNAUTHORIZED, 'Authentication required'),
    );

    const request = new NextRequest('http://localhost:3000/api/ai-pm/projects');
    const response = await GET(request, undefined);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe(AIpmErrorType.UNAUTHORIZED);
  });

  it('reads administrator project counts from the filtered counts view', async () => {
    const project = { id: 'project-1', name: 'Demo', member_count: 2, official_document_count: 1 };
    const supabase = createSupabaseMock([project]);
    mockGetSupabase.mockResolvedValue(supabase);
    mockRequireAuth.mockResolvedValueOnce(createAuth('admin', 'admin-1', 'admin@example.com', 'Admin'));

    const response = await GET(new NextRequest('http://localhost:3000/api/ai-pm/projects'), undefined);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.projects[0].official_documents_count).toBe(1);
  });

  it('merges secured memberships with filtered project counts and activity', async () => {
    const supabase = createSupabaseMock([{ id: 'project-1', name: 'Demo', description: 'Description', created_by: 'admin-1', created_at: '2024-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', creator_email: 'admin@example.com', creator_name: 'Admin', member_count: 2, official_document_count: 1 }]);
    mockGetSupabase.mockResolvedValue(supabase);
    mockRequireAuth.mockResolvedValueOnce(createAuth());

    const response = await GET(new NextRequest('http://localhost:3000/api/ai-pm/projects'), undefined);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(supabase.from).toHaveBeenCalledWith('project_members');
    expect(supabase.from).toHaveBeenCalledWith('projects_with_counts');
    expect(data.projects[0]).toMatchObject({ user_role: 'service_planning', official_documents_count: 1, last_activity: '2025-01-01T00:00:00Z' });
  });

  it('keeps a member project when the invoker cannot read its creator profile', async () => {
    const supabase = createSupabaseMock([{ id: 'project-1', name: 'Member project', description: null, created_by: 'admin-1', created_at: '2024-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', creator_email: null, creator_name: null, member_count: 1, official_document_count: 0 }]);
    mockGetSupabase.mockResolvedValue(supabase);
    mockRequireAuth.mockResolvedValueOnce(createAuth());

    const response = await GET(new NextRequest('http://localhost:3000/api/ai-pm/projects'), undefined);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.projects).toHaveLength(1);
    expect(data.projects[0]).toMatchObject({ id: 'project-1', creator_email: null, user_role: 'service_planning' });
  });

  it('creates a project for admin', async () => {
    const mockProject = { id: 'project-1', name: 'Demo', created_at: new Date().toISOString() };
    mockGetSupabase.mockResolvedValue(createSupabaseMock([mockProject]));
    mockRequireAuth.mockResolvedValueOnce(createAuth('admin', 'admin-1', 'admin@example.com', 'Admin'));

    const request = new NextRequest('http://localhost:3000/api/ai-pm/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Demo' }),
    });

    const response = await POST(request, undefined);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.project).toBeDefined();
  });

  it('uses the atomic project-owner RPC', async () => {
    const mockProject = { id: 'project-1', name: 'Demo', created_at: new Date().toISOString() };
    const supabase = createSupabaseMock([mockProject]);
    mockGetSupabase.mockResolvedValue(supabase);
    mockRequireAuth.mockResolvedValueOnce(createAuth('admin', 'admin-1', 'admin@example.com', 'Admin'));

    const request = new NextRequest('http://localhost:3000/api/ai-pm/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Demo', description: 'Description' }),
    });

    const response = await POST(request, undefined);

    expect(response.status).toBe(201);
    expect(supabase.rpc).toHaveBeenCalledWith('create_project_with_owner', {
      p_name: 'Demo',
      p_description: 'Description',
    });
  });

  it('returns a database error when the atomic project-owner RPC fails', async () => {
    const supabase = createSupabaseMock();
    supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'membership insert failed' } });
    mockGetSupabase.mockResolvedValue(supabase);
    mockRequireAuth.mockResolvedValueOnce(createAuth('admin', 'admin-1', 'admin@example.com', 'Admin'));

    const request = new NextRequest('http://localhost:3000/api/ai-pm/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Demo' }),
    });

    const response = await POST(request, undefined);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe(AIpmErrorType.DATABASE_ERROR);
    expect(data.message).toContain('Failed to create project');
  });
});
