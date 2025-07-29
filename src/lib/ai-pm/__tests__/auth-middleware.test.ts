import {
  checkAuth,
  checkAuthWithMemberships,
  checkProjectAccess,
  getUserProjectRole,
  checkProjectManagementAccess,
  checkDocumentApprovalAccess,
  checkDocumentAccess,
  isValidUUID,
  isValidProjectRole,
  isValidDocumentStatus,
  isValidWorkflowStep,
  validateSessionSecurity,
  checkRateLimit,
  sanitizeInput,
  validateProjectData
} from '../auth-middleware';
import { AIpmErrorType } from '@/types/ai-pm';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => ({
          data: null,
          error: null
        }))
      }))
    }))
  }))
};

jest.mock('@/lib/ai-pm/auth-middleware', () => {
  const actual = jest.requireActual('@/lib/ai-pm/auth-middleware');
  return {
    ...actual,
    createSupabaseClient: () => mockSupabaseClient
  };
});

describe('auth-middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAuth', () => {
    it('should return error when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      });

      const result = await checkAuth(mockSupabaseClient);

      expect(result).toEqual({
        error: AIpmErrorType.UNAUTHORIZED,
        message: '인증이 필요합니다.'
      });
    });

    it('should return error when user profile is not found', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: { message: 'Profile not found' }
            }))
          }))
        }))
      });

      const result = await checkAuth(mockSupabaseClient);

      expect(result).toEqual({
        error: AIpmErrorType.UNAUTHORIZED,
        message: '사용자 프로필을 찾을 수 없습니다.'
      });
    });

    it('should return error when admin is required but user is not admin', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'user-123', 
            email: 'test@example.com',
            last_sign_in_at: new Date().toISOString()
          } 
        },
        error: null
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: {
                id: 'user-123',
                email: 'test@example.com',
                full_name: 'Test User',
                role: 'user'
              },
              error: null
            }))
          }))
        }))
      });

      const result = await checkAuth(mockSupabaseClient, true);

      expect(result).toEqual({
        error: AIpmErrorType.FORBIDDEN,
        message: '관리자 권한이 필요합니다.'
      });
    });

    it('should return success when user is authenticated and authorized', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        last_sign_in_at: new Date().toISOString()
      };

      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: mockProfile,
              error: null
            }))
          }))
        }))
      });

      const result = await checkAuth(mockSupabaseClient, true);

      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email
        },
        profile: mockProfile
      });
    });

    it('should return error when session is expired', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 30); // 30 days ago

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'user-123', 
            email: 'test@example.com',
            last_sign_in_at: oldDate.toISOString()
          } 
        },
        error: null
      });

      const result = await checkAuth(mockSupabaseClient);

      expect(result).toEqual({
        error: AIpmErrorType.UNAUTHORIZED,
        message: '세션이 만료되었습니다. 다시 로그인해주세요.'
      });
    });
  });

  describe('checkAuthWithMemberships', () => {
    it('should include project memberships in successful auth result', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        last_sign_in_at: new Date().toISOString()
      };

      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const mockMemberships = [
        {
          id: 'member-1',
          project_id: 'project-1',
          user_id: 'user-123',
          role: '콘텐츠기획',
          added_by: 'admin-123',
          added_at: new Date().toISOString()
        }
      ];

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: mockProfile,
                  error: null
                }))
              }))
            }))
          };
        } else if (table === 'project_members') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: mockMemberships,
                error: null
              }))
            }))
          };
        }
        return mockSupabaseClient.from();
      });

      const result = await checkAuthWithMemberships(mockSupabaseClient);

      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email
        },
        profile: mockProfile,
        projectMemberships: mockMemberships
      });
    });
  });

  describe('checkProjectAccess', () => {
    it('should return true for admin users', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { role: 'admin' },
              error: null
            }))
          }))
        }))
      });

      const result = await checkProjectAccess(mockSupabaseClient, 'user-123', 'project-123');

      expect(result).toBe(true);
    });

    it('should return true for project members', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { role: 'user' },
                  error: null
                }))
              }))
            }))
          };
        } else if (table === 'project_members') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { id: 'member-1' },
                  error: null
                }))
              }))
            }))
          };
        }
        return mockSupabaseClient.from();
      });

      const result = await checkProjectAccess(mockSupabaseClient, 'user-123', 'project-123');

      expect(result).toBe(true);
    });

    it('should return false for non-members', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { role: 'user' },
                  error: null
                }))
              }))
            }))
          };
        } else if (table === 'project_members') {
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

      const result = await checkProjectAccess(mockSupabaseClient, 'user-123', 'project-123');

      expect(result).toBe(false);
    });
  });

  describe('getUserProjectRole', () => {
    it('should return user role in project', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { role: '콘텐츠기획' },
              error: null
            }))
          }))
        }))
      });

      const result = await getUserProjectRole(mockSupabaseClient, 'user-123', 'project-123');

      expect(result).toBe('콘텐츠기획');
    });

    it('should return null when user is not a member', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: null
            }))
          }))
        }))
      });

      const result = await getUserProjectRole(mockSupabaseClient, 'user-123', 'project-123');

      expect(result).toBe(null);
    });
  });

  describe('checkDocumentAccess', () => {
    it('should allow access for document creator', async () => {
      const mockDocument = {
        id: 'doc-1',
        created_by: 'user-123',
        project_id: 'project-1',
        projects: {
          id: 'project-1',
          created_by: 'admin-123'
        }
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'planning_documents') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: mockDocument,
                  error: null
                }))
              }))
            }))
          };
        } else if (table === 'user_profiles') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { role: 'user' },
                  error: null
                }))
              }))
            }))
          };
        } else if (table === 'project_members') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { id: 'member-1' },
                  error: null
                }))
              }))
            }))
          };
        }
        return mockSupabaseClient.from();
      });

      const result = await checkDocumentAccess(mockSupabaseClient, 'user-123', 'doc-1');

      expect(result.canAccess).toBe(true);
      expect(result.canModify).toBe(true);
    });

    it('should deny access for non-project members', async () => {
      const mockDocument = {
        id: 'doc-1',
        created_by: 'other-user',
        project_id: 'project-1',
        projects: {
          id: 'project-1',
          created_by: 'admin-123'
        }
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'planning_documents') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: mockDocument,
                  error: null
                }))
              }))
            }))
          };
        } else if (table === 'user_profiles') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { role: 'user' },
                  error: null
                }))
              }))
            }))
          };
        } else if (table === 'project_members') {
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

      const result = await checkDocumentAccess(mockSupabaseClient, 'user-123', 'doc-1');

      expect(result.canAccess).toBe(false);
      expect(result.canModify).toBe(false);
    });
  });

  describe('validation functions', () => {
    describe('isValidUUID', () => {
      it('should validate correct UUIDs', () => {
        expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
        expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      });

      it('should reject invalid UUIDs', () => {
        expect(isValidUUID('invalid-uuid')).toBe(false);
        expect(isValidUUID('123')).toBe(false);
        expect(isValidUUID('')).toBe(false);
        expect(isValidUUID('123e4567-e89b-12d3-a456-42661417400')).toBe(false); // Too short
      });
    });

    describe('isValidProjectRole', () => {
      it('should validate correct project roles', () => {
        expect(isValidProjectRole('콘텐츠기획')).toBe(true);
        expect(isValidProjectRole('서비스기획')).toBe(true);
        expect(isValidProjectRole('UIUX기획')).toBe(true);
        expect(isValidProjectRole('개발자')).toBe(true);
      });

      it('should reject invalid project roles', () => {
        expect(isValidProjectRole('invalid-role')).toBe(false);
        expect(isValidProjectRole('')).toBe(false);
        expect(isValidProjectRole('admin')).toBe(false);
      });
    });

    describe('isValidDocumentStatus', () => {
      it('should validate correct document statuses', () => {
        expect(isValidDocumentStatus('private')).toBe(true);
        expect(isValidDocumentStatus('pending_approval')).toBe(true);
        expect(isValidDocumentStatus('official')).toBe(true);
      });

      it('should reject invalid document statuses', () => {
        expect(isValidDocumentStatus('invalid-status')).toBe(false);
        expect(isValidDocumentStatus('')).toBe(false);
        expect(isValidDocumentStatus('draft')).toBe(false);
      });
    });

    describe('isValidWorkflowStep', () => {
      it('should validate correct workflow steps', () => {
        for (let i = 1; i <= 9; i++) {
          expect(isValidWorkflowStep(i)).toBe(true);
        }
      });

      it('should reject invalid workflow steps', () => {
        expect(isValidWorkflowStep(0)).toBe(false);
        expect(isValidWorkflowStep(10)).toBe(false);
        expect(isValidWorkflowStep(-1)).toBe(false);
        expect(isValidWorkflowStep(1.5)).toBe(false);
      });
    });
  });

  describe('security functions', () => {
    describe('validateSessionSecurity', () => {
      it('should validate recent sessions', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              last_sign_in_at: new Date().toISOString()
            }
          },
          error: null
        });

        const result = await validateSessionSecurity(mockSupabaseClient, 'user-123');

        expect(result.valid).toBe(true);
      });

      it('should invalidate old sessions', async () => {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              last_sign_in_at: oldDate.toISOString()
            }
          },
          error: null
        });

        const result = await validateSessionSecurity(mockSupabaseClient, 'user-123');

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('재인증이 필요');
      });
    });

    describe('checkRateLimit', () => {
      it('should allow requests within limit', () => {
        const result = checkRateLimit('user-123', 10, 60000);

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(9);
      });

      it('should block requests exceeding limit', () => {
        // Make 10 requests
        for (let i = 0; i < 10; i++) {
          checkRateLimit('user-123', 10, 60000);
        }

        // 11th request should be blocked
        const result = checkRateLimit('user-123', 10, 60000);

        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
      });
    });

    describe('sanitizeInput', () => {
      it('should remove HTML tags', () => {
        const input = '<script>alert("xss")</script>Hello';
        const result = sanitizeInput(input);

        expect(result).toBe('scriptalert("xss")/scriptHello');
      });

      it('should remove javascript protocols', () => {
        const input = 'javascript:alert("xss")';
        const result = sanitizeInput(input);

        expect(result).toBe('alert("xss")');
      });

      it('should remove event handlers', () => {
        const input = 'onclick=alert("xss") Hello';
        const result = sanitizeInput(input);

        expect(result).toBe(' Hello');
      });

      it('should limit input length', () => {
        const input = 'a'.repeat(20000);
        const result = sanitizeInput(input);

        expect(result.length).toBe(10000);
      });

      it('should handle non-string input', () => {
        expect(sanitizeInput(null as any)).toBe('');
        expect(sanitizeInput(undefined as any)).toBe('');
        expect(sanitizeInput(123 as any)).toBe('');
      });
    });

    describe('validateProjectData', () => {
      it('should validate correct project data', () => {
        const data = {
          name: 'Test Project',
          description: 'Test description'
        };

        const result = validateProjectData(data);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject missing name', () => {
        const data = {
          description: 'Test description'
        };

        const result = validateProjectData(data);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('프로젝트 이름이 필요합니다.');
      });

      it('should reject name that is too long', () => {
        const data = {
          name: 'a'.repeat(256),
          description: 'Test description'
        };

        const result = validateProjectData(data);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('프로젝트 이름은 255자를 초과할 수 없습니다.');
      });

      it('should reject description that is too long', () => {
        const data = {
          name: 'Test Project',
          description: 'a'.repeat(2001)
        };

        const result = validateProjectData(data);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('프로젝트 설명은 2000자를 초과할 수 없습니다.');
      });
    });
  });
});