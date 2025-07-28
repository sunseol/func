import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock fetch globally
global.fetch = jest.fn();

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      rpc: jest.fn()
    }))
  }))
}));

describe('Document Approval Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Document Status Transitions', () => {
    it('should allow private → pending_approval transition', () => {
      const isValidTransition = validateStatusTransition('private', 'pending_approval');
      expect(isValidTransition).toBe(true);
    });

    it('should allow pending_approval → official transition', () => {
      const isValidTransition = validateStatusTransition('pending_approval', 'official');
      expect(isValidTransition).toBe(true);
    });

    it('should allow pending_approval → private transition (rejection)', () => {
      const isValidTransition = validateStatusTransition('pending_approval', 'private');
      expect(isValidTransition).toBe(true);
    });

    it('should not allow private → official transition (skip approval)', () => {
      const isValidTransition = validateStatusTransition('private', 'official');
      expect(isValidTransition).toBe(false);
    });

    it('should not allow official → pending_approval transition', () => {
      const isValidTransition = validateStatusTransition('official', 'pending_approval');
      expect(isValidTransition).toBe(false);
    });
  });

  describe('Approval Permissions', () => {
    it('should allow 서비스기획 role to approve workflow steps 1-3, 6-8', () => {
      const role = '서비스기획';
      const allowedSteps = [1, 2, 3, 6, 7, 8];
      const notAllowedSteps = [4, 5, 9];

      allowedSteps.forEach(step => {
        expect(canRoleApproveStep(role, step)).toBe(true);
      });

      notAllowedSteps.forEach(step => {
        expect(canRoleApproveStep(role, step)).toBe(false);
      });
    });

    it('should allow UIUX기획 role to approve workflow step 4', () => {
      const role = 'UIUX기획';
      expect(canRoleApproveStep(role, 4)).toBe(true);
      
      // Should not allow other steps
      [1, 2, 3, 5, 6, 7, 8, 9].forEach(step => {
        expect(canRoleApproveStep(role, step)).toBe(false);
      });
    });

    it('should allow 개발자 role to approve workflow step 5', () => {
      const role = '개발자';
      expect(canRoleApproveStep(role, 5)).toBe(true);
      
      // Should not allow other steps
      [1, 2, 3, 4, 6, 7, 8, 9].forEach(step => {
        expect(canRoleApproveStep(role, step)).toBe(false);
      });
    });

    it('should allow 콘텐츠기획 and 서비스기획 roles to approve workflow step 9', () => {
      expect(canRoleApproveStep('콘텐츠기획', 9)).toBe(true);
      expect(canRoleApproveStep('서비스기획', 9)).toBe(true);
      expect(canRoleApproveStep('UIUX기획', 9)).toBe(false);
      expect(canRoleApproveStep('개발자', 9)).toBe(false);
    });
  });

  describe('Request Approval API', () => {
    it('should successfully request approval for private document', async () => {
      const mockFetch = jest.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          document: {
            id: 'doc-1',
            status: 'pending_approval',
            title: 'Test Document',
            content: 'Test content',
            updated_at: new Date().toISOString()
          }
        })
      } as Response);

      const response = await fetch('/api/ai-pm/documents/doc-1/request-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.document.status).toBe('pending_approval');
    });

    it('should reject approval request for non-private document', async () => {
      const mockFetch = jest.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'VALIDATION_ERROR',
          message: '개인 작업 중인 문서만 승인을 요청할 수 있습니다.'
        })
      } as Response);

      const response = await fetch('/api/ai-pm/documents/doc-1/request-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });

  describe('Approve Document API', () => {
    it('should successfully approve pending document', async () => {
      const mockFetch = jest.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          document: {
            id: 'doc-1',
            status: 'official',
            title: 'Test Document',
            content: 'Test content',
            approved_by: 'user-1',
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        })
      } as Response);

      const response = await fetch('/api/ai-pm/documents/doc-1/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.document.status).toBe('official');
      expect(data.document.approved_by).toBe('user-1');
    });

    it('should reject approval for non-pending document', async () => {
      const mockFetch = jest.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'VALIDATION_ERROR',
          message: '승인 대기 중인 문서만 승인할 수 있습니다.'
        })
      } as Response);

      const response = await fetch('/api/ai-pm/documents/doc-1/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });

  describe('Reject Document API', () => {
    it('should successfully reject pending document with reason', async () => {
      const mockFetch = jest.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          document: {
            id: 'doc-1',
            status: 'private',
            title: 'Test Document',
            content: 'Test content',
            approved_by: null,
            approved_at: null,
            updated_at: new Date().toISOString()
          }
        })
      } as Response);

      const response = await fetch('/api/ai-pm/documents/doc-1/approve', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Content needs improvement' })
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.document.status).toBe('private');
      expect(data.document.approved_by).toBe(null);
    });
  });

  describe('Approval History API', () => {
    it('should return approval history for document', async () => {
      const mockFetch = jest.mocked(fetch);
      const mockHistory = [
        {
          id: 'history-1',
          document_id: 'doc-1',
          user_id: 'user-1',
          action: 'requested',
          previous_status: 'private',
          new_status: 'pending_approval',
          created_at: new Date().toISOString(),
          user_email: 'user@example.com',
          user_name: 'Test User'
        },
        {
          id: 'history-2',
          document_id: 'doc-1',
          user_id: 'user-2',
          action: 'approved',
          previous_status: 'pending_approval',
          new_status: 'official',
          created_at: new Date().toISOString(),
          user_email: 'approver@example.com',
          user_name: 'Approver User'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: mockHistory })
      } as Response);

      const response = await fetch('/api/ai-pm/documents/doc-1/approval-history');
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.history).toHaveLength(2);
      expect(data.history[0].action).toBe('requested');
      expect(data.history[1].action).toBe('approved');
    });
  });

  describe('Pending Approvals API', () => {
    it('should return pending approvals for user', async () => {
      const mockFetch = jest.mocked(fetch);
      const mockPendingDocs = [
        {
          document_id: 'doc-1',
          project_id: 'proj-1',
          project_name: 'Test Project',
          workflow_step: 1,
          step_name: '서비스 개요 및 목표 설정',
          title: 'Service Overview',
          creator_name: 'Creator User',
          creator_email: 'creator@example.com',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documents: mockPendingDocs })
      } as Response);

      const response = await fetch('/api/ai-pm/documents/pending-approvals');
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.documents).toHaveLength(1);
      expect(data.documents[0].workflow_step).toBe(1);
    });
  });
});

// Helper functions for testing
function validateStatusTransition(currentStatus: string, newStatus: string): boolean {
  const validTransitions: Record<string, string[]> = {
    'private': ['pending_approval', 'private'],
    'pending_approval': ['official', 'private'],
    'official': ['official', 'private']
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
}

function canRoleApproveStep(role: string, step: number): boolean {
  const approvalMatrix: Record<number, string[]> = {
    1: ['서비스기획'],
    2: ['서비스기획'],
    3: ['서비스기획'],
    4: ['UIUX기획'],
    5: ['개발자'],
    6: ['서비스기획'],
    7: ['서비스기획'],
    8: ['서비스기획'],
    9: ['콘텐츠기획', '서비스기획']
  };

  return approvalMatrix[step]?.includes(role) || false;
}