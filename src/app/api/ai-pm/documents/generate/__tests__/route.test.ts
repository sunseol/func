/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { AIpmErrorType } from '@/types/ai-pm';

// Mock AI service
const mockAIService = {
  generateDocument: jest.fn(),
};

jest.mock('@/lib/ai-pm/ai-service', () => ({
  getAIService: () => mockAIService,
}));

// Mock Supabase and auth middleware
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          data: [],
          error: null
        })),
        single: jest.fn(() => ({
          data: null,
          error: null
        }))
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
    }
  }
}));

import { checkAuth, checkProjectAccess, isValidUUID, isValidWorkflowStep } from '@/lib/ai-pm/auth-middleware';

const mockCheckAuth = checkAuth as jest.MockedFunction<typeof checkAuth>;
const mockCheckProjectAccess = checkProjectAccess as jest.MockedFunction<typeof checkProjectAccess>;
const mockIsValidUUID = isValidUUID as jest.MockedFunction<typeof isValidUUID>;
const mockIsValidWorkflowStep = isValidWorkflowStep as jest.MockedFunction<typeof isValidWorkflowStep>;

describe('/api/ai-pm/documents/generate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockCheckAuth.mockResolvedValue({
        error: AIpmErrorType.UNAUTHORIZED,
        message: '인증이 필요합니다.'
      });

      const url = new URL('http://localhost:3000/api/ai-pm/documents/generate?projectId=test-project');
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({ workflow_step: 1 })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe(AIpmErrorType.UNAUTHORIZED);
    });

    it('should return 400 when projectId is missing', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        profile: { id: 'user-123', email: 'test@example.com', full_name: 'Test User', role: 'user' }
      });

      const url = new URL('http://localhost:3000/api/ai-pm/documents/generate');
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({ workflow_step: 1 })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when workflow_step is missing', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        profile: { id: 'user-123', email: 'test@example.com', full_name: 'Test User', role: 'user' }
      });

      const url = new URL('http://localhost:3000/api/ai-pm/documents/generate?projectId=test-project');
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({})
      });
      const response = await POST(request);
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

      const url = new URL('http://localhost:3000/api/ai-pm/documents/generate?projectId=invalid-uuid');
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({ workflow_step: 1 })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when workflow_step is invalid', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        profile: { id: 'user-123', email: 'test@example.com', full_name: 'Test User', role: 'user' }
      });
      mockIsValidUUID.mockReturnValue(true);
      mockIsValidWorkflowStep.mockReturnValue(false);

      const url = new URL('http://localhost:3000/api/ai-pm/documents/generate?projectId=test-project');
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({ workflow_step: 10 })
      });
      const response = await POST(request);
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

      const url = new URL('http://localhost:3000/api/ai-pm/documents/generate?projectId=test-project');
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({ workflow_step: 1 })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe(AIpmErrorType.FORBIDDEN);
    });

    it('should generate document successfully', async () => {
      const mockGeneratedDocument = {
        id: 'doc-1',
        title: 'AI Generated Document',
        content: '# AI Generated Document\n\nGenerated content',
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

      // Mock project data
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: {
                    id: 'test-project',
                    name: 'Test Project',
                    description: 'Test description'
                  },
                  error: null
                }))
              }))
            }))
          };
        } else if (table === 'ai_conversations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: {
                    id: 'conv-1',
                    messages: [
                      { id: '1', role: 'user', content: 'Generate document', timestamp: new Date() }
                    ]
                  },
                  error: null
                }))
              }))
            }))
          };
        } else if (table === 'planning_documents') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: mockGeneratedDocument,
                  error: null
                }))
              }))
            }))
          };
        }
        return mockSupabaseClient.from();
      });

      mockAIService.generateDocument.mockResolvedValue('# AI Generated Document\n\nGenerated content');

      const url = new URL('http://localhost:3000/api/ai-pm/documents/generate?projectId=test-project');
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({ workflow_step: 1 })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.document).toEqual(mockGeneratedDocument);
      expect(mockAIService.generateDocument).toHaveBeenCalledWith(
        expect.any(Array),
        1,
        expect.stringContaining('Test Project'),
        'user-123'
      );
    });

    it('should handle AI service errors', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        profile: { id: 'user-123', email: 'test@example.com', full_name: 'Test User', role: 'user' }
      });
      mockIsValidUUID.mockReturnValue(true);
      mockIsValidWorkflowStep.mockReturnValue(true);
      mockCheckProjectAccess.mockResolvedValue(true);

      // Mock project data
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { id: 'test-project', name: 'Test Project' },
                  error: null
                }))
              }))
            }))
          };
        } else if (table === 'ai_conversations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: null,
                  error: null
                }))
              }))
            }))
          };
        }
        return mockSupabaseClient.from();
      });

      mockAIService.generateDocument.mockRejectedValue({
        error: AIpmErrorType.AI_SERVICE_ERROR,
        message: 'AI service failed'
      });

      const url = new URL('http://localhost:3000/api/ai-pm/documents/generate?projectId=test-project');
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({ workflow_step: 1 })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe(AIpmErrorType.AI_SERVICE_ERROR);
    });

    it('should use conversation history when available', async () => {
      const mockConversation = {
        id: 'conv-1',
        messages: [
          { id: '1', role: 'user', content: 'Previous message', timestamp: new Date() },
          { id: '2', role: 'assistant', content: 'Previous response', timestamp: new Date() }
        ]
      };

      mockCheckAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        profile: { id: 'user-123', email: 'test@example.com', full_name: 'Test User', role: 'user' }
      });
      mockIsValidUUID.mockReturnValue(true);
      mockIsValidWorkflowStep.mockReturnValue(true);
      mockCheckProjectAccess.mockResolvedValue(true);

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { id: 'test-project', name: 'Test Project' },
                  error: null
                }))
              }))
            }))
          };
        } else if (table === 'ai_conversations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: mockConversation,
                  error: null
                }))
              }))
            }))
          };
        } else if (table === 'planning_documents') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { id: 'doc-1' },
                  error: null
                }))
              }))
            }))
          };
        }
        return mockSupabaseClient.from();
      });

      mockAIService.generateDocument.mockResolvedValue('Generated content');

      const url = new URL('http://localhost:3000/api/ai-pm/documents/generate?projectId=test-project');
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({ workflow_step: 1 })
      });
      await POST(request);

      expect(mockAIService.generateDocument).toHaveBeenCalledWith(
        mockConversation.messages,
        1,
        expect.any(String),
        'user-123'
      );
    });

    it('should handle database insertion errors', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        profile: { id: 'user-123', email: 'test@example.com', full_name: 'Test User', role: 'user' }
      });
      mockIsValidUUID.mockReturnValue(true);
      mockIsValidWorkflowStep.mockReturnValue(true);
      mockCheckProjectAccess.mockResolvedValue(true);

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { id: 'test-project', name: 'Test Project' },
                  error: null
                }))
              }))
            }))
          };
        } else if (table === 'ai_conversations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: null,
                  error: null
                }))
              }))
            }))
          };
        } else if (table === 'planning_documents') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: null,
                  error: { message: 'Database insertion failed' }
                }))
              }))
            }))
          };
        }
        return mockSupabaseClient.from();
      });

      mockAIService.generateDocument.mockResolvedValue('Generated content');

      const url = new URL('http://localhost:3000/api/ai-pm/documents/generate?projectId=test-project');
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({ workflow_step: 1 })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe(AIpmErrorType.DATABASE_ERROR);
    });

    it('should generate appropriate title based on workflow step', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        profile: { id: 'user-123', email: 'test@example.com', full_name: 'Test User', role: 'user' }
      });
      mockIsValidUUID.mockReturnValue(true);
      mockIsValidWorkflowStep.mockReturnValue(true);
      mockCheckProjectAccess.mockResolvedValue(true);

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { id: 'test-project', name: 'Test Project' },
                  error: null
                }))
              }))
            }))
          };
        } else if (table === 'ai_conversations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: null,
                  error: null
                }))
              }))
            }))
          };
        } else if (table === 'planning_documents') {
          return {
            insert: jest.fn((data) => ({
              select: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { id: 'doc-1', ...data },
                  error: null
                }))
              }))
            }))
          };
        }
        return mockSupabaseClient.from();
      });

      mockAIService.generateDocument.mockResolvedValue('Generated content');

      const url = new URL('http://localhost:3000/api/ai-pm/documents/generate?projectId=test-project');
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({ workflow_step: 2 })
      });
      await POST(request);

      // Check that the title includes the workflow step name
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('planning_documents');
      const insertCall = mockSupabaseClient.from.mock.results.find(
        result => result.value.insert
      );
      expect(insertCall.value.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('타겟 사용자 분석')
        })
      );
    });
  });
});