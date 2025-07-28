import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  checkAuth,
  checkAuthWithMemberships,
  checkProjectAccess,
  getUserProjectRole,
  checkProjectManagementAccess,
  checkDocumentApprovalAccess,
  validateSessionSecurity,
  checkRateLimit,
  sanitizeInput,
  validateProjectData,
  isValidUUID,
  isValidProjectRole,
  isValidDocumentStatus,
  isValidWorkflowStep,
} from '../auth-middleware';
import { AIpmErrorType } from '@/types/ai-pm';

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
  })),
};

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAuth', () => {
    it('should return error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const result = await checkAuth(mockSupabase);

      expect(result).toEqual({
        error: AIpmErrorType.UNAUTHORIZED,
        message: '인증이 필요합니다.',
      });
    });

    it('should return error when profile is not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id', email: 'test@example.com' } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Profile not found'),
            }),
          })),
        })),
      });

      const result = await checkAuth(mockSupabase);

      expect(result).toEqual({
        error: AIpmErrorType.UNAUTHORIZED,
        message: '사용자 프로필을 찾을 수 없습니다.',
      });
    });

    it('should return error when admin is required but user is not admin', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'user-id', 
            email: 'test@example.com',
            last_sign_in_at: new Date().toISOString(),
          } 
        },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'user-id',
                email: 'test@example.com',
                role: 'user',
                full_name: 'Test User',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              error: null,
            }),
          })),
        })),
      });

      const result = await checkAuth(mockSupabase, true);

      expect(result).toEqual({
        error: AIpmErrorType.FORBIDDEN,
        message: '관리자 권한이 필요합니다.',
      });
    });

    it('should return success when user is authenticated and profile exists', async () => {
      const mockUser = { 
        id: 'user-id', 
        email: 'test@example.com',
        last_sign_in_at: new Date().toISOString(),
      };
      const mockProfile = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'user',
        full_name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          })),
        })),
      });

      const result = await checkAuth(mockSupabase);

      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
        },
        profile: mockProfile,
      });
    });
  });

  describe('checkProjectAccess', () => {
    it('should return true for admin users', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          })),
        })),
      });

      const result = await checkProjectAccess(mockSupabase, 'user-id', 'project-id');

      expect(result).toBe(true);
    });

    it('should return true for project members', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { role: 'user' },
                error: null,
              }),
            })),
          })),
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'membership-id' },
                  error: null,
                }),
              })),
            })),
          })),
        });

      const result = await checkProjectAccess(mockSupabase, 'user-id', 'project-id');

      expect(result).toBe(true);
    });

    it('should return false for non-members', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { role: 'user' },
                error: null,
              }),
            })),
          })),
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: new Error('Not found'),
                }),
              })),
            })),
          })),
        });

      const result = await checkProjectAccess(mockSupabase, 'user-id', 'project-id');

      expect(result).toBe(false);
    });
  });

  describe('Validation functions', () => {
    describe('isValidUUID', () => {
      it('should return true for valid UUIDs', () => {
        expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
        expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      });

      it('should return false for invalid UUIDs', () => {
        expect(isValidUUID('invalid-uuid')).toBe(false);
        expect(isValidUUID('123')).toBe(false);
        expect(isValidUUID('')).toBe(false);
      });
    });

    describe('isValidProjectRole', () => {
      it('should return true for valid project roles', () => {
        expect(isValidProjectRole('콘텐츠기획')).toBe(true);
        expect(isValidProjectRole('서비스기획')).toBe(true);
        expect(isValidProjectRole('UIUX기획')).toBe(true);
        expect(isValidProjectRole('개발자')).toBe(true);
      });

      it('should return false for invalid project roles', () => {
        expect(isValidProjectRole('invalid-role')).toBe(false);
        expect(isValidProjectRole('')).toBe(false);
        expect(isValidProjectRole('admin')).toBe(false);
      });
    });

    describe('isValidDocumentStatus', () => {
      it('should return true for valid document statuses', () => {
        expect(isValidDocumentStatus('private')).toBe(true);
        expect(isValidDocumentStatus('pending_approval')).toBe(true);
        expect(isValidDocumentStatus('official')).toBe(true);
      });

      it('should return false for invalid document statuses', () => {
        expect(isValidDocumentStatus('invalid-status')).toBe(false);
        expect(isValidDocumentStatus('')).toBe(false);
        expect(isValidDocumentStatus('draft')).toBe(false);
      });
    });

    describe('isValidWorkflowStep', () => {
      it('should return true for valid workflow steps', () => {
        expect(isValidWorkflowStep(1)).toBe(true);
        expect(isValidWorkflowStep(5)).toBe(true);
        expect(isValidWorkflowStep(9)).toBe(true);
      });

      it('should return false for invalid workflow steps', () => {
        expect(isValidWorkflowStep(0)).toBe(false);
        expect(isValidWorkflowStep(10)).toBe(false);
        expect(isValidWorkflowStep(-1)).toBe(false);
        expect(isValidWorkflowStep(1.5)).toBe(false);
      });
    });
  });

  describe('sanitizeInput', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('alert("xss")');
      expect(sanitizeInput('<div>content</div>')).toBe('content');
    });

    it('should remove javascript: protocol', () => {
      expect(sanitizeInput('javascript:alert("xss")')).toBe('alert("xss")');
      expect(sanitizeInput('JAVASCRIPT:alert("xss")')).toBe('alert("xss")');
    });

    it('should remove event handlers', () => {
      expect(sanitizeInput('onclick=alert("xss")')).toBe('');
      expect(sanitizeInput('onload=malicious()')).toBe('');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  content  ')).toBe('content');
    });

    it('should limit length', () => {
      const longString = 'a'.repeat(20000);
      const result = sanitizeInput(longString);
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
        description: 'A test project',
      };

      const result = validateProjectData(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject missing name', () => {
      const data = {
        description: 'A test project',
      };

      const result = validateProjectData(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('프로젝트 이름이 필요합니다.');
    });

    it('should reject empty name', () => {
      const data = {
        name: '',
        description: 'A test project',
      };

      const result = validateProjectData(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('프로젝트 이름이 필요합니다.');
    });

    it('should reject name that is too long', () => {
      const data = {
        name: 'a'.repeat(300),
        description: 'A test project',
      };

      const result = validateProjectData(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('프로젝트 이름은 255자를 초과할 수 없습니다.');
    });

    it('should reject description that is too long', () => {
      const data = {
        name: 'Test Project',
        description: 'a'.repeat(3000),
      };

      const result = validateProjectData(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('프로젝트 설명은 2000자를 초과할 수 없습니다.');
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', () => {
      const result = checkRateLimit('test-key', 10, 60000);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should block requests over limit', () => {
      const key = 'test-key-2';
      
      // Make requests up to the limit
      for (let i = 0; i < 5; i++) {
        checkRateLimit(key, 5, 60000);
      }
      
      // This should be blocked
      const result = checkRateLimit(key, 5, 60000);
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after window expires', () => {
      const key = 'test-key-3';
      
      // Make requests up to the limit
      for (let i = 0; i < 3; i++) {
        checkRateLimit(key, 3, 100); // 100ms window
      }
      
      // Wait for window to expire
      return new Promise((resolve) => {
        setTimeout(() => {
          const result = checkRateLimit(key, 3, 100);
          expect(result.allowed).toBe(true);
          resolve(undefined);
        }, 150);
      });
    });
  });
});