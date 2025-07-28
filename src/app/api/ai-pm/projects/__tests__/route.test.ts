/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// Mock Supabase
jest.mock('@/lib/ai-pm/auth-middleware', () => ({
  createSupabaseClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        })),
        order: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    })),
    rpc: jest.fn()
  })),
  checkAuth: jest.fn(),
  ValidationErrors: {
    REQUIRED_FIELD: (field: string) => ({
      error: 'VALIDATION_ERROR',
      message: `${field}은(는) 필수입니다.`
    }),
    MAX_LENGTH: (field: string, maxLength: number) => ({
      error: 'VALIDATION_ERROR',
      message: `${field}은(는) ${maxLength}자를 초과할 수 없습니다.`
    })
  },
  DatabaseErrors: {
    QUERY_ERROR: (operation: string) => ({
      error: 'DATABASE_ERROR',
      message: `${operation} 중 오류가 발생했습니다.`
    })
  }
}));

import { checkAuth } from '@/lib/ai-pm/auth-middleware';
import { AIpmErrorType } from '@/types/ai-pm';

const mockCheckAuth = checkAuth as jest.MockedFunction<typeof checkAuth>;

describe('/api/ai-pm/projects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockCheckAuth.mockResolvedValue({
        error: AIpmErrorType.UNAUTHORIZED,
        message: '인증이 필요합니다.'
      });

      const request = new NextRequest('http://localhost:3000/api/ai-pm/projects');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe(AIpmErrorType.UNAUTHORIZED);
    });

    it('should return projects for authenticated user', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        profile: { id: 'user-123', email: 'test@example.com', full_name: 'Test User', role: 'user' }
      });

      const request = new NextRequest('http://localhost:3000/api/ai-pm/projects');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockCheckAuth).toHaveBeenCalledWith(expect.anything());
    });
  });

  describe('POST', () => {
    it('should return 403 when user is not admin', async () => {
      mockCheckAuth.mockResolvedValue({
        error: AIpmErrorType.FORBIDDEN,
        message: '관리자 권한이 필요합니다.'
      });

      const request = new NextRequest('http://localhost:3000/api/ai-pm/projects', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Project' })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe(AIpmErrorType.FORBIDDEN);
    });

    it('should return 400 when project name is missing', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: 'admin-123', email: 'admin@example.com' },
        profile: { id: 'admin-123', email: 'admin@example.com', full_name: 'Admin User', role: 'admin' }
      });

      const request = new NextRequest('http://localhost:3000/api/ai-pm/projects', {
        method: 'POST',
        body: JSON.stringify({ name: '' })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });
  });
});