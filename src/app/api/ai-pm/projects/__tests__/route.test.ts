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
}));

import { getSupabase, requireAuth } from '@/lib/ai-pm/auth';

const mockGetSupabase = getSupabase as jest.MockedFunction<typeof getSupabase>;
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;

const createSupabaseMock = (projects: any[] = []) => ({
  from: jest.fn((table: string) => {
    if (table === 'projects') {
      return {
        select: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: projects, error: null })),
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
          eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
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
    mockGetSupabase.mockResolvedValue(createSupabaseMock() as any);
    mockRequireAuth.mockRejectedValueOnce(
      new ApiError(401, AIpmErrorType.UNAUTHORIZED, 'Authentication required'),
    );

    const request = new NextRequest('http://localhost:3000/api/ai-pm/projects');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe(AIpmErrorType.UNAUTHORIZED);
  });

  it('creates a project for admin', async () => {
    const mockProject = { id: 'project-1', name: 'Demo', created_at: new Date().toISOString() };
    mockGetSupabase.mockResolvedValue(createSupabaseMock([mockProject]) as any);
    mockRequireAuth.mockResolvedValueOnce({
      user: { id: 'admin-1', email: 'admin@example.com' },
      profile: { id: 'admin-1', email: 'admin@example.com', full_name: 'Admin', role: 'admin', created_at: '', updated_at: '' },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/ai-pm/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'Demo' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.project).toBeDefined();
  });
});
