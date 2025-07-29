/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { AIpmErrorType } from '@/types/ai-pm';

// Mock AI service
const mockAIService = {
  generateResponse: jest.fn(),
  generateStreamingResponse: jest.fn(),
};

jest.mock('@/lib/ai-pm/ai-service', () => ({
  getAIService: () => mockAIService,
}));

// Mock auth middleware
jest.mock('@/lib/ai-pm/auth-middleware', () => ({
  createSupabaseClient: () => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
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
      })),
      upsert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: null
          }))
        }))
      }))
    }))
  }),
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

describe('/api/ai-pm/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockCheckAuth.mockResolvedValue({
        error: AIpmErrorType.UNAUTHORIZED,
        message: '인증이 필요합니다.'
      });

      const request = new NextRequest('http://localhost:3000/api/ai-pm/chat', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'test-project',
          workflowStep: 1,
          message: 'Test message'
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

      const request = new NextRequest('http://localhost:3000/api/ai-pm/chat', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'test-project',
          workflowStep: 1,
          // message missing
        })
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

      const request = new NextRequest('http://localhost:3000/api/ai-pm/chat', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'invalid-uuid',
          workflowStep: 1,
          message: 'Test message'
        })
      });
      const response = await POST(request);
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

      const request = new NextRequest('http://localhost:3000/api/ai-pm/chat', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'test-project',
          workflowStep: 10,
          message: 'Test message'
        })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when message is too long', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        profile: { id: 'user-123', email: 'test@example.com', full_name: 'Test User', role: 'user' }
      });
      mockIsValidUUID.mockReturnValue(true);
      mockIsValidWorkflowStep.mockReturnValue(true);

      const request = new NextRequest('http://localhost:3000/api/ai-pm/chat', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'test-project',
          workflowStep: 1,
          message: 'a'.repeat(5001) // Too long
        })
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

      const request = new NextRequest('http://localhost:3000/api/ai-pm/chat', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'test-project',
          workflowStep: 1,
          message: 'Test message'
        })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe(AIpmErrorType.FORBIDDEN);
    });

    it('should generate AI response when request is valid', async () => {
      const mockAIResponse = 'AI generated response';

      mockCheckAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        profile: { id: 'user-123', email: 'test@example.com', full_name: 'Test User', role: 'user' }
      });
      mockIsValidUUID.mockReturnValue(true);
      mockIsValidWorkflowStep.mockReturnValue(true);
      mockCheckProjectAccess.mockResolvedValue(true);
      mockAIService.generateResponse.mockResolvedValue(mockAIResponse);

      const request = new NextRequest('http://localhost:3000/api/ai-pm/chat', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'test-project',
          workflowStep: 1,
          message: 'Test message'
        })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response).toBe(mockAIResponse);
      expect(mockAIService.generateResponse).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: 'Test message'
          })
        ]),
        1,
        undefined
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
      mockAIService.generateResponse.mockRejectedValue({
        error: AIpmErrorType.AI_SERVICE_ERROR,
        message: 'AI service error'
      });

      const request = new NextRequest('http://localhost:3000/api/ai-pm/chat', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'test-project',
          workflowStep: 1,
          message: 'Test message'
        })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe(AIpmErrorType.AI_SERVICE_ERROR);
    });

    it('should save conversation to database', async () => {
      const mockSupabaseClient = require('@/lib/ai-pm/auth-middleware').createSupabaseClient();
      const mockAIResponse = 'AI generated response';

      mockCheckAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        profile: { id: 'user-123', email: 'test@example.com', full_name: 'Test User', role: 'user' }
      });
      mockIsValidUUID.mockReturnValue(true);
      mockIsValidWorkflowStep.mockReturnValue(true);
      mockCheckProjectAccess.mockResolvedValue(true);
      mockAIService.generateResponse.mockResolvedValue(mockAIResponse);

      // Mock existing conversation
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: {
                id: 'conv-1',
                messages: [
                  { id: '1', role: 'user', content: 'Previous message', timestamp: new Date() }
                ]
              },
              error: null
            }))
          }))
        })),
        upsert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { id: 'conv-1' },
              error: null
            }))
          }))
        }))
      });

      const request = new NextRequest('http://localhost:3000/api/ai-pm/chat', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'test-project',
          workflowStep: 1,
          message: 'Test message'
        })
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('ai_conversations');
    });

    it('should handle JSON parsing errors', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        profile: { id: 'user-123', email: 'test@example.com', full_name: 'Test User', role: 'user' }
      });

      const request = new NextRequest('http://localhost:3000/api/ai-pm/chat', {
        method: 'POST',
        body: 'invalid json'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('should include project context in AI request when available', async () => {
      const mockSupabaseClient = require('@/lib/ai-pm/auth-middleware').createSupabaseClient();
      const mockProject = {
        name: 'Test Project',
        description: 'Test project description'
      };

      mockCheckAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        profile: { id: 'user-123', email: 'test@example.com', full_name: 'Test User', role: 'user' }
      });
      mockIsValidUUID.mockReturnValue(true);
      mockIsValidWorkflowStep.mockReturnValue(true);
      mockCheckProjectAccess.mockResolvedValue(true);
      mockAIService.generateResponse.mockResolvedValue('AI response');

      // Mock project data
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: mockProject,
                  error: null
                }))
              }))
            }))
          };
        }
        // Default for ai_conversations
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({
                data: null,
                error: null
              }))
            }))
          })),
          upsert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => ({
                data: { id: 'conv-1' },
                error: null
              }))
            }))
          }))
        };
      });

      const request = new NextRequest('http://localhost:3000/api/ai-pm/chat', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'test-project',
          workflowStep: 1,
          message: 'Test message'
        })
      });
      await POST(request);

      expect(mockAIService.generateResponse).toHaveBeenCalledWith(
        expect.any(Array),
        1,
        expect.stringContaining('Test Project')
      );
    });
  });
});