/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { AIpmErrorType } from '@/types/ai-pm';

// Mock Supabase and auth middleware
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          data: [],
          error: null
        }))
      })),
      single: jest.fn(() => ({
        data: null,
        error: null
      }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => ({
          data: null,
          error: null
        }))
      }))
    }))
  }))
};

jest.mock('@/lib/ai-pm/auth-middleware', () => ({
  createSupabaseClient: () => mockSupabaseClient,
  checkAuth: jest.fn(),
  checkProjectAccess: jest.fn(),
  isValidUUID: jest.fn(),
  isValidWorkflowStep: jest.fn(),
  ValidationErrors: {
    REQUIRED_FIELD: (field: string) => ({
      error: 'VALIDATION_ERROR',
      message: `${field}은(는) 필수입니다.`
    }),
    INVALID_UUID: (field: string) => ({
      error: 'VALIDATION_ERROR',
      message: `유효하지 않은 ${field} 형식입니다.`
    }),
    INVALID_WORKFLOW_STEP: {
      error: 'VALIDATION_ERROR',
      message: '유효한 워크플로우 단계가 필요합니다. (1-9)'
    },
    MAX_LENGTH: (field: string, maxLength: number) => ({
      error: 'VALIDATION_ERROR',
      message: `${field}은(는) ${maxLength}자를 초과할 수 없습니다.`
    })
  }
}));

import { checkAuth, checkProjectAccess, isValidUUID, isValidWorkflowStep } from '@/lib/ai-pm/auth-middleware';

const mockCheckAuth = checkAuth as jest.MockedFunction<typeof checkAuth>;
const mockCheckProjectAccess = checkProjectAccess as jest.MockedFunction<typeof checkProjectAccess>;
const mockIsValidUUID = isValidUUID as jest.MockedFunction<typeof isValidUUID>;
const mockIsValidWorkflowStep = isValidWorkflowStep as jest.MockedFunction<typeof isValidWorkflowStep>;

describe('/api/ai-pm/documents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockCheckAuth.mockResolvedValue({
        error: AIpmErrorType.UNAUTHORIZED,
        message: '인증이 필요합니다.'
      });

      const url = new URL('http://localhost:3000/api/ai-pm/documents?projectId=test-project&workflowStep=1');
      const request = new NextRequest(url);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe(AIpmErrorType.UNAUTHORIZED);
    });

    it('should return 400 when projectId is missing', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        profile: { id: 'user-123', email: 'test@example.com', full_name: 'Test User', role: 'user' }
      });

      const url = new URL('http://localhost:3000/api/ai-pm/documents?workflowStep=1');
      const request = new NextRequest(url);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when projectId is invalid UUID', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        profile: { id: 'user-123', email: 'test@example.com', full_name: 'Test User', role: 'user' }
      });
      mockIsValidUUID.mockReturnValue(false);

      const url = new URL('http://localhost:3000/api/ai-pm/documents?projectId=invalid-uuid&workflowStep=1');
      const request = new NextRequest(url);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when workflowStep is invalid', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        profile: { id: 'user-123', email: 'test@example.com', full_name: 'Test User', role: 'user' }
      });
      mockIsValidUUID.mockReturnValue(true);
      mockIsValidWorkflowStep.mockReturnValue(false);

      const url = new URL('http://localhost:3000/api/ai-pm/documents?projectId=test-project&workflowStep=10');
      const request = new NextRequest(url);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('should return 403 when user has no project access', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        profile: { id: 'user-123', email: 'test@example.com', full_name: 'Test User', role: 'user' }
      });
      mockIsValidUUID.mockReturnValue(true);
      mockIsValidWorkflowStep.mockReturnValue(true);
      mockCheckProjectAccess.mockResolvedValue(false);

      const url = new URL('http://localhost:3000/api/ai-pm/documents?projectId=test-project&workflowStep=1');
      const request = new NextRequest(url);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe(AIpmErrorType.FORBIDDEN);
    });

    it('should return documents when request is valid', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          title: 'Test Document',
          content: 'Test content',
          status: 'official',
          workflow_step: 1,
          created_by: 'user-123',
          creator_email: 'test@example.com',
          creator_name: 'Test User'
        }
      ];

      mockCheckAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        profile: { id: 'user-123', email: 'test@example.com', full_name: 'Test User', role: 'user' }
      });
      mockIsValidUUID.mockReturnValue(true);
      mockIsValidWorkflowStep.mockReturnValue(true);
      mockCheckProjectAccess.mockResolvedValue(true);

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              data: mockDocuments,
              error: null
            }))
          }))
        }))
      });

      const url = new URL('http://localhost:3000/api/ai-pm/documents?projectId=test-project&workflowStep=1');
      const request = new NextRequest(url);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.documents).toEqual(mockDocuments);
    });

    it('should handle database errors', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        profile: { id: 'user-123', email: 'test@example.com', full_name: 'Test User', role: 'user' }
      });
      mockIsValidUUID.mockReturnValue(true);
      mockIsValidWorkflowStep.mockReturnValue(true);
      mockCheckProjectAccess.mockResolvedValue(true);

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              data: null,
              error: { message: 'Database error' }
            }))
          }))
        }))
      });

      const url = new URL('http://localhost:3000/api/ai-pm/documents?projectId=test-project&workflowStep=1');
      const request = new NextRequest(url);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe(AIpmErrorType.DATABASE_ERROR);
    });
  });

  describe('POST', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockCheckAuth.mockResolvedValue({
        error: AIpmErrorType.UNAUTHORIZED,
        message: '인증이 필요합니다.'
      });

      const request = new NextRequest('http://localhost:3000/api/ai-pm/documents', {
        method: 'POST',
        body: JSON.stringify({
          project_id: 'test-project',
          workflow_step: 1,
          title: 'Test Document',
          content: 'Test content'
        })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe(AIpmErrorType.UNAUTHORIZED);
    });

    it('should return 400 when required fields are missing', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        profile: { id: 'user-123', email: 'test@example.com', full_name: 'Test User', role: 'user' }
      });

      const request = new NextRequest('http://localhost:3000/api/ai-pm/documents', {
        method: 'POST',
        body: JSON.stringify({
          project_id: 'test-project',
          workflow_step: 1,
          // title missing
          content: 'Test content'
        })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when title is too long', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        profile: { id: 'user-123', email: 'test@example.com', full_name: 'Test User', role: 'user' }
      });

      const request = new NextRequest('http://localhost:3000/api/ai-pm/documents', {
        method: 'POST',
        body: JSON.stringify({
          project_id: 'test-project',
          workflow_step: 1,
          title: 'a'.repeat(256), // Too long
          content: 'Test content'
        })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('should create document when request is valid', async () => {
      const mockDocument = {
        id: 'doc-1',
        title: 'Test Document',
        content: 'Test content',
        status: 'private',
        workflow_step: 1,
        created_by: 'user-123',
        creator_email: 'test@example.com',
        creator_name: 'Test User'
      };

      mockCheckAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        profile: { id: 'user-123', email: 'test@example.com', full_name: 'Test User', role: 'user' }
      });
      mockIsValidUUID.mockReturnValue(true);
      mockIsValidWorkflowStep.mockReturnValue(true);
      mockCheckProjectAccess.mockResolvedValue(true);

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: mockDocument,
              error: null
            }))
          }))
        }))
      });

      const request = new NextRequest('http://localhost:3000/api/ai-pm/documents', {
        method: 'POST',
        body: JSON.stringify({
          project_id: 'test-project',
          workflow_step: 1,
          title: 'Test Document',
          content: 'Test content'
        })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.document).toEqual(mockDocument);
    });

    it('should handle JSON parsing errors', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        profile: { id: 'user-123', email: 'test@example.com', full_name: 'Test User', role: 'user' }
      });

      const request = new NextRequest('http://localhost:3000/api/ai-pm/documents', {
        method: 'POST',
        body: 'invalid json'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('should handle database insertion errors', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        profile: { id: 'user-123', email: 'test@example.com', full_name: 'Test User', role: 'user' }
      });
      mockIsValidUUID.mockReturnValue(true);
      mockIsValidWorkflowStep.mockReturnValue(true);
      mockCheckProjectAccess.mockResolvedValue(true);

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: { message: 'Database error' }
            }))
          }))
        }))
      });

      const request = new NextRequest('http://localhost:3000/api/ai-pm/documents', {
        method: 'POST',
        body: JSON.stringify({
          project_id: 'test-project',
          workflow_step: 1,
          title: 'Test Document',
          content: 'Test content'
        })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe(AIpmErrorType.DATABASE_ERROR);
    });
  });
});