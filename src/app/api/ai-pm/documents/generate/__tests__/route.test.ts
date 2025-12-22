/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { ApiError } from '@/lib/http';
import { AIpmErrorType } from '@/types/ai-pm';

jest.mock('@/lib/ai-pm/auth', () => ({
  getSupabase: jest.fn(),
  requireAuth: jest.fn(),
  requireProjectAccess: jest.fn(),
}));

jest.mock('@/lib/ai-pm/ai-service', () => ({
  getAIService: () => ({
    generateDocument: jest.fn(async () => 'Generated document'),
  }),
}));

jest.mock('@/lib/ai-pm/conversation-manager', () => ({
  getConversationManager: () => ({
    getCurrentMessages: jest.fn(async () => []),
  }),
}));

import { getSupabase, requireAuth, requireProjectAccess } from '@/lib/ai-pm/auth';

const mockGetSupabase = getSupabase as jest.MockedFunction<typeof getSupabase>;
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockRequireProjectAccess = requireProjectAccess as jest.MockedFunction<typeof requireProjectAccess>;

const createSupabaseMock = (document: any = {}) => ({
  from: jest.fn((table: string) => {
    if (table === 'projects') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: { name: 'Demo', description: '' }, error: null })),
          })),
        })),
      };
    }

    if (table === 'planning_documents') {
      return {
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: document, error: null })),
          })),
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

describe('/api/ai-pm/documents/generate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when auth fails', async () => {
    mockGetSupabase.mockResolvedValue(createSupabaseMock() as any);
    mockRequireAuth.mockRejectedValueOnce(
      new ApiError(401, AIpmErrorType.UNAUTHORIZED, 'Authentication required'),
    );

    const request = new NextRequest('http://localhost:3000/api/ai-pm/documents/generate?projectId=abc', {
      method: 'POST',
      body: JSON.stringify({ workflow_step: 1 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe(AIpmErrorType.UNAUTHORIZED);
  });

  it('generates a document', async () => {
    mockGetSupabase.mockResolvedValue(createSupabaseMock({ id: 'doc-1' }) as any);
    mockRequireAuth.mockResolvedValueOnce({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: { id: 'user-1', email: 'user@example.com', full_name: 'User', role: 'user', created_at: '', updated_at: '' },
    } as any);
    mockRequireProjectAccess.mockResolvedValueOnce();

    const request = new NextRequest('http://localhost:3000/api/ai-pm/documents/generate?projectId=11111111-1111-1111-1111-111111111111', {
      method: 'POST',
      body: JSON.stringify({ workflow_step: 1 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.document).toBeDefined();
  });
});
