/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GET, POST } from '../route';
import { PUT as updateDocument } from '../[documentId]/route';
import { GET as pendingApprovals } from '../pending-approvals/route';
import { POST as requestApproval } from '../[documentId]/request-approval/route';
import { POST as approveDocument } from '../[documentId]/approve/route';
import { POST as withdrawApproval } from '../[documentId]/withdraw-approval/route';
import { DELETE as deleteDocument, GET as getDocument } from '../[documentId]/route';
import { ApiError, parseJson, toErrorResponse } from '@/lib/http';
import { AIpmErrorType, type PlanningDocumentWithUsers } from '@/types/ai-pm';

jest.mock('@/lib/ai-pm/auth', () => ({
  getSupabase: jest.fn(),
  requireAuth: jest.fn(),
  requireProjectAccess: jest.fn(),
  requireDocumentAccess: jest.fn(),
  requireDocumentApproval: jest.fn(),
  isSupabaseNoRows: (error: unknown) => typeof error === 'object' && error !== null && 'code' in error && error.code === 'PGRST116',
}));

import { getSupabase, requireAuth, requireDocumentAccess, requireProjectAccess, type AiPmSupabase, type AuthContext } from '@/lib/ai-pm/auth';

const actualRequireDocumentAccess = jest.requireActual<typeof import('@/lib/ai-pm/auth')>('@/lib/ai-pm/auth').requireDocumentAccess;

const mockGetSupabase = getSupabase as jest.MockedFunction<typeof getSupabase>;
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockRequireProjectAccess = requireProjectAccess as jest.MockedFunction<typeof requireProjectAccess>;
const mockRequireDocumentAccess = requireDocumentAccess as jest.MockedFunction<typeof requireDocumentAccess>;

const asSupabase = (value: AiPmSupabase): AiPmSupabase => value;
const asAuth = (value: AuthContext): AuthContext => value;
type RpcResult = {
  readonly data: ReadonlyArray<Record<string, unknown>> | null;
  readonly error: { readonly code: string; readonly message?: string } | null;
};

type SupabaseMockOptions = {
  readonly planningDocumentMissing?: boolean;
  readonly updateConflict?: boolean;
  readonly membershipData?: Readonly<Record<string, unknown>> | null;
  readonly versionInsert?: jest.Mock;
};

const createSupabaseMock = (
  documents: ReadonlyArray<Record<string, unknown>> = [],
  membershipError: unknown = null,
  options: SupabaseMockOptions = {},
) => Object.assign(createClient('http://localhost:54321', 'test-key'), {
  rpc: jest.fn(async (_functionName: string, _args: Record<string, string>): Promise<RpcResult> => ({ data: documents, error: null })),
  from: jest.fn((table: string) => {
    if (table === 'planning_documents' || table === 'planning_documents_with_users') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({ data: documents, error: null })),
            })),
            maybeSingle: jest.fn(() => Promise.resolve({ data: documents[0] ?? null, error: null })),
            single: jest.fn(() => Promise.resolve({
              data: options.planningDocumentMissing ? null : documents[0] ?? null,
              error: options.planningDocumentMissing ? { code: 'PGRST116' } : null,
            })),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: documents[0] ?? null, error: null })),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve(options.updateConflict
                  ? { data: null, error: { code: 'PGRST116' } }
                  : { data: { ...documents[0], content: 'Changed', version: 2 }, error: null })),
              })),
            })),
          })),
        })),
      };
    }

    if (table === 'document_versions') {
      return {
        insert: jest.fn((value: unknown) => {
          options.versionInsert?.(value);
          return { select: jest.fn(() => ({ single: jest.fn(() => Promise.resolve({ data: null, error: null })) })) };
        }),
      };
    }

    if (table === 'project_members') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn(() => Promise.resolve({ data: options.membershipData === undefined ? { role: 'developer' } : options.membershipData, error: membershipError })),
            })),
          })),
        })),
      };
    }

    if (table === 'pending_approval_documents') {
      return {
        select: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: documents, error: null })),
        })),
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

describe('/api/ai-pm/documents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockRequireDocumentAccess.mockReset();
  });

  it('returns 401 when auth fails', async () => {
    mockGetSupabase.mockResolvedValue(asSupabase(createSupabaseMock()));
    mockRequireAuth.mockRejectedValueOnce(
      new ApiError(401, AIpmErrorType.UNAUTHORIZED, 'Authentication required'),
    );

    const request = new NextRequest('http://localhost:3000/api/ai-pm/documents?projectId=abc&workflowStep=1');
    const response = await GET(request, undefined);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe(AIpmErrorType.UNAUTHORIZED);
  });

  it('creates a document', async () => {
    const mockDocument = {
      id: 'doc-1',
      title: 'Doc',
      content: 'Content',
      creator_email: 'creator@example.com',
      creator_name: 'Creator',
      approver_email: null,
      approver_name: null,
    };
    mockGetSupabase.mockResolvedValue(asSupabase(createSupabaseMock([mockDocument])));
    mockRequireAuth.mockResolvedValue(asAuth({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: { id: 'user-1', email: 'user@example.com', full_name: 'User', role: 'user', created_at: '', updated_at: '' },
    }));
    mockRequireProjectAccess.mockResolvedValueOnce();

    const request = new NextRequest('http://localhost:3000/api/ai-pm/documents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        project_id: '11111111-1111-1111-8111-111111111111',
        workflow_step: 1,
        title: 'Doc',
        content: 'Content',
      }),
    });

    const response = await POST(request, undefined);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.document).toMatchObject({ creator_email: 'creator@example.com', approver_name: null });
  });

  it('returns the canonical enriched row for document GET', async () => {
    const documentId = '11111111-1111-1111-8111-111111111111';
    const enrichedDocument = {
      id: documentId,
      project_id: '22222222-2222-2222-8222-222222222222',
      workflow_step: 1,
      title: 'Doc',
      content: 'Content',
      status: 'private',
      version: 1,
      created_by: 'user-1',
      approved_by: null,
      created_at: '',
      updated_at: '',
      approved_at: null,
      creator_email: 'creator@example.com',
      creator_name: 'Creator',
      approver_email: null,
      approver_name: null,
    } as const satisfies PlanningDocumentWithUsers;
    mockGetSupabase.mockResolvedValue(asSupabase(createSupabaseMock([enrichedDocument])));
    mockRequireAuth.mockResolvedValueOnce(asAuth({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: { id: 'user-1', email: 'user@example.com', full_name: 'User', role: 'user', created_at: '', updated_at: '' },
    }));
    mockRequireDocumentAccess.mockResolvedValueOnce({ document: enrichedDocument, canModify: true });

    const response = await getDocument(new NextRequest(`http://localhost/api/ai-pm/documents/${documentId}`), { params: Promise.resolve({ documentId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.document).toMatchObject({ creator_email: 'creator@example.com', approver_name: null });
  });

  it('does not expose another member\'s private document', async () => {
    const projectId = '11111111-1111-1111-8111-111111111111';
    const documents = [
      { id: 'private-other', project_id: projectId, workflow_step: 1, status: 'private', created_by: 'other-user' },
      { id: 'official', project_id: projectId, workflow_step: 1, status: 'official', created_by: 'other-user', creator_email: 'creator@example.com', creator_name: 'Creator', approver_email: 'approver@example.com', approver_name: 'Approver' },
      { id: 'private-own', project_id: projectId, workflow_step: 1, status: 'private', created_by: 'user-1' },
    ];
    mockGetSupabase.mockResolvedValue(asSupabase(createSupabaseMock(documents)));
    mockRequireAuth.mockResolvedValueOnce(asAuth({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: { id: 'user-1', email: 'user@example.com', full_name: 'User', role: 'user', created_at: '', updated_at: '' },
    }));
    mockRequireProjectAccess.mockResolvedValueOnce();

    const response = await GET(new NextRequest(`http://localhost:3000/api/ai-pm/documents?projectId=${projectId}&workflowStep=1`), undefined);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.documents.map((document: { id: string }) => document.id)).toEqual(['official', 'private-own']);
    expect(data.documents[0]).toMatchObject({ creator_email: 'creator@example.com', approver_name: 'Approver' });
  });

  it('returns a truthful database error when membership visibility cannot be checked', async () => {
    const projectId = '11111111-1111-1111-8111-111111111111';
    mockGetSupabase.mockResolvedValue(asSupabase(createSupabaseMock([], { message: 'membership query failed' })));
    mockRequireAuth.mockResolvedValueOnce(asAuth({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: { id: 'user-1', email: 'user@example.com', full_name: 'User', role: 'user', created_at: '', updated_at: '' },
    }));
    mockRequireProjectAccess.mockResolvedValueOnce();

    const response = await GET(new NextRequest(`http://localhost:3000/api/ai-pm/documents?projectId=${projectId}&workflowStep=1`), undefined);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe(AIpmErrorType.DATABASE_ERROR);
  });

  it('requests approval through the atomic RPC contract', async () => {
    const documentId = '11111111-1111-1111-8111-111111111111';
    const supabase = createSupabaseMock([{ id: documentId, status: 'pending_approval' }]);
    mockGetSupabase.mockResolvedValue(asSupabase(supabase));
    mockRequireAuth.mockResolvedValueOnce(asAuth({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: { id: 'user-1', email: 'user@example.com', full_name: 'User', role: 'user', created_at: '', updated_at: '' },
    }));
    mockRequireDocumentAccess.mockResolvedValueOnce({
      document: { id: documentId, created_by: 'user-1', project_id: 'project-1', status: 'private', workflow_step: 1, title: 'Draft', content: 'Content', version: 1, approved_by: null, created_at: '', updated_at: '', approved_at: null },
      canModify: true,
    });

    const response = await requestApproval(new NextRequest(`http://localhost/api/ai-pm/documents/${documentId}/request-approval`), { params: Promise.resolve({ documentId }) });

    expect(response.status).toBe(200);
    expect(supabase.rpc).toHaveBeenCalledWith('request_document_approval', { p_document_id: documentId, p_user_id: 'user-1' });
  });

  it('reports an approval race as a conflict when the RPC returns no row', async () => {
    const documentId = '11111111-1111-1111-8111-111111111111';
    const supabase = createSupabaseMock([]);
    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });
    mockGetSupabase.mockResolvedValue(asSupabase(supabase));
    mockRequireAuth.mockResolvedValueOnce(asAuth({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: { id: 'user-1', email: 'user@example.com', full_name: 'User', role: 'user', created_at: '', updated_at: '' },
    }));
    mockRequireDocumentAccess.mockResolvedValueOnce({
      document: { id: documentId, created_by: 'user-1', project_id: 'project-1', status: 'private', workflow_step: 1, title: 'Draft', content: 'Content', version: 1, approved_by: null, created_at: '', updated_at: '', approved_at: null },
      canModify: true,
    });

    const response = await requestApproval(new NextRequest(`http://localhost/api/ai-pm/documents/${documentId}/request-approval`), { params: Promise.resolve({ documentId }) });

    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe(AIpmErrorType.APPROVAL_REQUIRED);
  });

  it('keeps a no-row RPC error truthful as not found', async () => {
    const documentId = '11111111-1111-1111-8111-111111111111';
    const supabase = createSupabaseMock([]);
    supabase.rpc.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
    mockGetSupabase.mockResolvedValue(asSupabase(supabase));
    mockRequireAuth.mockResolvedValueOnce(asAuth({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: { id: 'user-1', email: 'user@example.com', full_name: 'User', role: 'user', created_at: '', updated_at: '' },
    }));
    mockRequireDocumentAccess.mockResolvedValueOnce({
      document: { id: documentId, created_by: 'user-1', project_id: 'project-1', status: 'private', workflow_step: 1, title: 'Draft', content: 'Content', version: 1, approved_by: null, created_at: '', updated_at: '', approved_at: null },
      canModify: true,
    });

    const response = await requestApproval(new NextRequest(`http://localhost/api/ai-pm/documents/${documentId}/request-approval`), { params: Promise.resolve({ documentId }) });

    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe(AIpmErrorType.DOCUMENT_NOT_FOUND);
  });

  it('rejects a generic PUT transition from private to pending approval', async () => {
    const documentId = '11111111-1111-1111-8111-111111111111';
    mockGetSupabase.mockResolvedValue(asSupabase(createSupabaseMock([{ id: documentId }])));
    mockRequireAuth.mockResolvedValueOnce(asAuth({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: { id: 'user-1', email: 'user@example.com', full_name: 'User', role: 'user', created_at: '', updated_at: '' },
    }));
    mockRequireDocumentAccess.mockResolvedValueOnce({
      document: { id: documentId, created_by: 'user-1', project_id: 'project-1', status: 'private', workflow_step: 1, title: 'Draft', content: 'Content', version: 1, approved_by: null, created_at: '', updated_at: '', approved_at: null },
      canModify: true,
    });

    const response = await updateDocument(new NextRequest(`http://localhost/api/ai-pm/documents/${documentId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'pending_approval', version: 1 }),
    }), { params: Promise.resolve({ documentId }) });

    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe(AIpmErrorType.APPROVAL_REQUIRED);
  });

  it('requires the withdrawal RPC for pending to private', async () => {
    const documentId = '11111111-1111-1111-8111-111111111111';
    const supabase = createSupabaseMock([{ id: documentId, status: 'private' }]);
    mockGetSupabase.mockResolvedValue(asSupabase(supabase));
    mockRequireAuth.mockResolvedValueOnce(asAuth({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: { id: 'user-1', email: 'user@example.com', full_name: 'User', role: 'user', created_at: '', updated_at: '' },
    }));
    mockRequireDocumentAccess.mockResolvedValueOnce({
      document: { id: documentId, created_by: 'user-1', project_id: 'project-1', status: 'pending_approval', workflow_step: 1, title: 'Draft', content: 'Content', version: 1, approved_by: null, created_at: '', updated_at: '', approved_at: null },
      canModify: true,
    });

    const response = await updateDocument(new NextRequest(`http://localhost/api/ai-pm/documents/${documentId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'private', version: 1 }),
    }), { params: Promise.resolve({ documentId }) });

    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe(AIpmErrorType.APPROVAL_REQUIRED);
  });

  it('does not let a non-admin official owner demote through generic PUT', async () => {
    const documentId = '11111111-1111-1111-8111-111111111111';
    mockGetSupabase.mockResolvedValue(asSupabase(createSupabaseMock([{ id: documentId, status: 'private' }])));
    mockRequireAuth.mockResolvedValueOnce(asAuth({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: { id: 'user-1', email: 'user@example.com', full_name: 'User', role: 'user', created_at: '', updated_at: '' },
    }));
    mockRequireDocumentAccess.mockResolvedValueOnce({
      document: { id: documentId, created_by: 'user-1', project_id: 'project-1', status: 'official', workflow_step: 1, title: 'Official', content: 'Content', version: 1, approved_by: 'admin-1', created_at: '', updated_at: '', approved_at: '' },
      canModify: true,
    });

    const response = await updateDocument(new NextRequest(`http://localhost/api/ai-pm/documents/${documentId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'private', version: 1 }),
    }), { params: Promise.resolve({ documentId }) });

    expect(response.status).toBe(403);
    expect((await response.json()).error).toBe(AIpmErrorType.FORBIDDEN);
  });

  it('allows an admin official demotion and returns the enriched row', async () => {
    const documentId = '11111111-1111-1111-8111-111111111111';
    const enrichedDocument = {
      id: documentId,
      project_id: '22222222-2222-2222-8222-222222222222',
      workflow_step: 1,
      title: 'Official',
      content: 'Content',
      status: 'private',
      version: 1,
      created_by: 'user-1',
      approved_by: null,
      created_at: '',
      updated_at: '',
      approved_at: null,
      creator_email: 'creator@example.com',
      creator_name: 'Creator',
      approver_email: null,
      approver_name: null,
    } as const satisfies PlanningDocumentWithUsers;
    mockGetSupabase.mockResolvedValue(asSupabase(createSupabaseMock([enrichedDocument])));
    mockRequireAuth.mockResolvedValueOnce(asAuth({
      user: { id: 'admin-1', email: 'admin@example.com' },
      profile: { id: 'admin-1', email: 'admin@example.com', full_name: 'Admin', role: 'admin', created_at: '', updated_at: '' },
    }));
    mockRequireDocumentAccess.mockResolvedValueOnce({
      document: { ...enrichedDocument, status: 'official', created_by: 'user-1' },
      canModify: true,
    });

    const response = await updateDocument(new NextRequest(`http://localhost/api/ai-pm/documents/${documentId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'private', version: 1 }),
    }), { params: Promise.resolve({ documentId }) });

    expect(response.status).toBe(200);
    expect((await response.json()).document).toMatchObject({ creator_email: 'creator@example.com' });
  });

  it('rejects a removed creator on GET and DELETE before enriched access', async () => {
    const documentId = '11111111-1111-1111-8111-111111111111';
    const document = { id: documentId, project_id: 'project-1', created_by: 'user-1', status: 'private', workflow_step: 1, title: 'Private', content: 'Content', version: 1, approved_by: null, created_at: '', updated_at: '', approved_at: null };
    const supabase = createSupabaseMock([document], null, { membershipData: null });
    mockGetSupabase.mockResolvedValue(supabase);
    mockRequireAuth.mockResolvedValueOnce(asAuth({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: { id: 'user-1', email: 'user@example.com', full_name: 'User', role: 'user', created_at: '', updated_at: '' },
    }));
    mockRequireDocumentAccess.mockImplementation(actualRequireDocumentAccess);

    const getResponse = await getDocument(new NextRequest(`http://localhost/api/ai-pm/documents/${documentId}`), { params: Promise.resolve({ documentId }) });
    const deleteResponse = await deleteDocument(new NextRequest(`http://localhost/api/ai-pm/documents/${documentId}`, { method: 'DELETE' }), { params: Promise.resolve({ documentId }) });

    expect(getResponse.status).toBe(403);
    expect(deleteResponse.status).toBe(403);
    expect(supabase.from).not.toHaveBeenCalledWith('planning_documents_with_users');
  });

  it('returns a detail-free 500 when creator membership lookup fails', async () => {
    const documentId = '11111111-1111-1111-8111-111111111111';
    const document = { id: documentId, project_id: 'project-1', created_by: 'user-1', status: 'private', workflow_step: 1, title: 'Private', content: 'Content', version: 1, approved_by: null, created_at: '', updated_at: '', approved_at: null };
    const supabase = createSupabaseMock([document], { message: 'membership secret' });
    mockGetSupabase.mockResolvedValue(supabase);
    mockRequireAuth.mockResolvedValue(asAuth({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: { id: 'user-1', email: 'user@example.com', full_name: 'User', role: 'user', created_at: '', updated_at: '' },
    }));
    mockRequireDocumentAccess.mockImplementation(actualRequireDocumentAccess);

    const response = await getDocument(new NextRequest(`http://localhost/api/ai-pm/documents/${documentId}`), { params: Promise.resolve({ documentId }) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe(AIpmErrorType.DATABASE_ERROR);
    expect(body).not.toHaveProperty('details');
    expect(JSON.stringify(body)).not.toContain('membership secret');
  });

  it('withdraws approval through the dedicated RPC and returns the enriched document', async () => {
    const documentId = '11111111-1111-1111-8111-111111111111';
    const enrichedDocument = { id: documentId, status: 'private', creator_email: 'creator@example.com', approver_name: null };
    const supabase = createSupabaseMock([enrichedDocument]);
    mockGetSupabase.mockResolvedValue(asSupabase(supabase));
    mockRequireAuth.mockResolvedValueOnce(asAuth({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: { id: 'user-1', email: 'user@example.com', full_name: 'User', role: 'user', created_at: '', updated_at: '' },
    }));
    mockRequireDocumentAccess.mockResolvedValueOnce({
      document: { id: documentId, created_by: 'user-1', project_id: 'project-1', status: 'pending_approval', workflow_step: 1, title: 'Draft', content: 'Content', version: 1, approved_by: null, created_at: '', updated_at: '', approved_at: null },
      canModify: true,
    });

    const response = await withdrawApproval(new NextRequest(`http://localhost/api/ai-pm/documents/${documentId}/withdraw-approval`), { params: Promise.resolve({ documentId }) });

    expect(response.status).toBe(200);
    expect(supabase.rpc).toHaveBeenCalledWith('withdraw_document_approval', { p_document_id: documentId, p_user_id: 'user-1' });
    expect((await response.json()).document).toMatchObject({ creator_email: 'creator@example.com' });
  });

  it('maps a withdrawal zero-row race to conflict', async () => {
    const documentId = '11111111-1111-1111-8111-111111111111';
    const supabase = createSupabaseMock([]);
    mockGetSupabase.mockResolvedValue(asSupabase(supabase));
    mockRequireAuth.mockResolvedValueOnce(asAuth({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: { id: 'user-1', email: 'user@example.com', full_name: 'User', role: 'user', created_at: '', updated_at: '' },
    }));
    mockRequireDocumentAccess.mockResolvedValueOnce({
      document: { id: documentId, created_by: 'user-1', project_id: 'project-1', status: 'pending_approval', workflow_step: 1, title: 'Draft', content: 'Content', version: 1, approved_by: null, created_at: '', updated_at: '', approved_at: null },
      canModify: true,
    });
    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

    const response = await withdrawApproval(new NextRequest(`http://localhost/api/ai-pm/documents/${documentId}/withdraw-approval`), { params: Promise.resolve({ documentId }) });

    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe(AIpmErrorType.APPROVAL_REQUIRED);
  });

  it('lets the database trigger own version history and version increments', async () => {
    const documentId = '11111111-1111-1111-8111-111111111111';
    const versionInsert = jest.fn();
    const supabase = createSupabaseMock(
      [{ id: documentId, content: 'Changed', version: 2 }],
      null,
      { versionInsert },
    );
    mockGetSupabase.mockResolvedValue(asSupabase(supabase));
    mockRequireAuth.mockResolvedValueOnce(asAuth({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: { id: 'user-1', email: 'user@example.com', full_name: 'User', role: 'user', created_at: '', updated_at: '' },
    }));
    mockRequireDocumentAccess.mockResolvedValueOnce({
      document: { id: documentId, created_by: 'user-1', project_id: 'project-1', status: 'private', workflow_step: 1, title: 'Draft', content: 'Original', version: 1, approved_by: null, created_at: '', updated_at: '', approved_at: null },
      canModify: true,
    });

    const response = await updateDocument(new NextRequest(`http://localhost/api/ai-pm/documents/${documentId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'Changed', version: 1 }),
    }), { params: Promise.resolve({ documentId }) });

    expect(response.status).toBe(200);
    expect(versionInsert).not.toHaveBeenCalled();
  });

  it('returns a conflict when the expected version was already consumed', async () => {
    const documentId = '11111111-1111-1111-8111-111111111111';
    const supabase = createSupabaseMock([{ id: documentId, content: 'Changed', version: 2 }], null, { updateConflict: true });
    mockGetSupabase.mockResolvedValue(asSupabase(supabase));
    mockRequireAuth.mockResolvedValueOnce(asAuth({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: { id: 'user-1', email: 'user@example.com', full_name: 'User', role: 'user', created_at: '', updated_at: '' },
    }));
    mockRequireDocumentAccess.mockResolvedValueOnce({
      document: { id: documentId, created_by: 'user-1', project_id: 'project-1', status: 'private', workflow_step: 1, title: 'Draft', content: 'Original', version: 1, approved_by: null, created_at: '', updated_at: '', approved_at: null },
      canModify: true,
    });

    const response = await updateDocument(new NextRequest(`http://localhost/api/ai-pm/documents/${documentId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'Changed again', version: 1 }),
    }), { params: Promise.resolve({ documentId }) });

    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe(AIpmErrorType.APPROVAL_REQUIRED);
  });

  it('returns a conflict when a stale writer submits a title-only update', async () => {
    const documentId = '11111111-1111-1111-8111-111111111111';
    const supabase = createSupabaseMock([{ id: documentId, title: 'Current title', content: 'Original', version: 2 }], null, { updateConflict: true });
    mockGetSupabase.mockResolvedValue(asSupabase(supabase));
    mockRequireAuth.mockResolvedValueOnce(asAuth({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: { id: 'user-1', email: 'user@example.com', full_name: 'User', role: 'user', created_at: '', updated_at: '' },
    }));
    mockRequireDocumentAccess.mockResolvedValueOnce({
      document: { id: documentId, created_by: 'user-1', project_id: 'project-1', status: 'private', workflow_step: 1, title: 'Draft', content: 'Original', version: 1, approved_by: null, created_at: '', updated_at: '', approved_at: null },
      canModify: true,
    });

    const response = await updateDocument(new NextRequest(`http://localhost/api/ai-pm/documents/${documentId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Stale title', version: 1 }),
    }), { params: Promise.resolve({ documentId }) });

    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe(AIpmErrorType.APPROVAL_REQUIRED);
  });

  it('requires an expected version for document updates', async () => {
    const documentId = '11111111-1111-1111-8111-111111111111';
    mockGetSupabase.mockResolvedValue(asSupabase(createSupabaseMock()));

    const response = await updateDocument(new NextRequest(`http://localhost/api/ai-pm/documents/${documentId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'Missing version' }),
    }), { params: Promise.resolve({ documentId }) });

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe(AIpmErrorType.VALIDATION_ERROR);
  });

  it('lists pending documents for authorized approvers without requiring admin', async () => {
    const pendingDocument = {
      id: '11111111-1111-1111-8111-111111111111',
      project_id: '22222222-2222-2222-8222-222222222222',
      workflow_step: 1,
      title: 'Pending',
      project_name: 'Project',
      creator_email: 'creator@example.com',
      creator_name: 'Creator',
      created_at: '',
      updated_at: '',
    };
    const supabase = createSupabaseMock([pendingDocument]);
    mockGetSupabase.mockResolvedValue(asSupabase(supabase));
    mockRequireAuth.mockResolvedValueOnce(asAuth({
      user: { id: 'approver-1', email: 'approver@example.com' },
      profile: { id: 'approver-1', email: 'approver@example.com', full_name: 'Approver', role: 'user', created_at: '', updated_at: '' },
    }));

    const response = await pendingApprovals(new NextRequest('http://localhost/api/ai-pm/documents/pending-approvals'), undefined);

    expect(response.status).toBe(200);
    expect((await response.json()).documents).toHaveLength(1);
    expect(mockRequireAuth).toHaveBeenCalledWith(expect.anything());
  });

  it('rejects JSON requests without the JSON media type', async () => {
    await expect(parseJson(new Request('http://localhost', { method: 'POST', body: '{}', headers: { 'content-type': 'text/plain' } }), { maxBytes: 10, requireContentType: true })).rejects.toMatchObject({ status: 415 });
  });

  it('bounds streamed JSON bodies without relying on Content-Length', async () => {
    const oversized = JSON.stringify({ content: 'x'.repeat(20) });
    await expect(parseJson(new Request('http://localhost', { method: 'POST', body: oversized, headers: { 'content-type': 'application/json' } }), { maxBytes: 10, requireContentType: true })).rejects.toMatchObject({ status: 413 });
  });

  it('does not expose server error details in 5xx responses', async () => {
    const response = toErrorResponse(new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Database request failed', { sentinel: 'secret' }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).not.toHaveProperty('details');
    expect(JSON.stringify(data)).not.toContain('secret');
  });

  it('returns 404 when approval targets a document that no longer exists', async () => {
    const supabase = createSupabaseMock([], null, { planningDocumentMissing: true });
    mockGetSupabase.mockResolvedValue(asSupabase(supabase));
    mockRequireAuth.mockResolvedValueOnce(asAuth({
      user: { id: 'admin-1', email: 'admin@example.com' },
      profile: { id: 'admin-1', email: 'admin@example.com', full_name: 'Admin', role: 'admin', created_at: '', updated_at: '' },
    }));

    const documentId = '11111111-1111-1111-8111-111111111111';
    const response = await approveDocument(new NextRequest(`http://localhost/api/ai-pm/documents/${documentId}/approve`), { params: Promise.resolve({ documentId }) });

    expect(response.status).toBe(404);
  });
});
