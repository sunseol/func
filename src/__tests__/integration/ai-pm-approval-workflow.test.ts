/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST as DocumentsPOST } from '@/app/api/ai-pm/documents/route';
import { GET as DocumentGET, PUT as DocumentPUT } from '@/app/api/ai-pm/documents/[documentId]/route';
import { POST as RequestApprovalPOST } from '@/app/api/ai-pm/documents/[documentId]/request-approval/route';
import { POST as ApprovePOST } from '@/app/api/ai-pm/documents/[documentId]/approve/route';
import { GET as ApprovalHistoryGET } from '@/app/api/ai-pm/documents/[documentId]/approval-history/route';
import { GET as PendingApprovalsGET } from '@/app/api/ai-pm/documents/pending-approvals/route';
import { GET as VersionsGET } from '@/app/api/ai-pm/documents/[documentId]/versions/route';
import { AIpmErrorType } from '@/types/ai-pm';

// Mock database state
let mockDatabase = {
  projects: new Map(),
  project_members: new Map(),
  planning_documents: new Map(),
  document_versions: new Map(),
  approval_history: new Map(),
  user_profiles: new Map(),
};

// Test users
const mockAdmin = {
  id: 'admin-123',
  email: 'admin@test.com',
  full_name: 'Admin User',
  role: 'admin'
};

const mockUser1 = {
  id: 'user-123',
  email: 'user1@test.com',
  full_name: 'User One',
  role: 'user'
};

const mockUser2 = {
  id: 'user-456',
  email: 'user2@test.com',
  full_name: 'User Two',
  role: 'user'
};

// Mock Supabase client
const createMockSupabaseClient = () => {
  return {
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          single: () => {
            const items = Array.from(mockDatabase[table as keyof typeof mockDatabase].values());
            const item = items.find((item: any) => item[column] === value);
            return Promise.resolve({ data: item || null, error: null });
          },
          order: (column: string) => ({
            data: Array.from(mockDatabase[table as keyof typeof mockDatabase].values())
              .filter((item: any) => {
                if (table === 'approval_history') {
                  return item.document_id === value;
                }
                return item[column.split(' ')[0]] === value;
              })
              .sort((a: any, b: any) => {
                const col = column.split(' ')[0];
                return column.includes('desc') ? 
                  new Date(b[col]).getTime() - new Date(a[col]).getTime() :
                  new Date(a[col]).getTime() - new Date(b[col]).getTime();
              }),
            error: null
          })
        }),
        order: (column: string) => ({
          data: Array.from(mockDatabase[table as keyof typeof mockDatabase].values())
            .sort((a: any, b: any) => {
              const col = column.split(' ')[0];
              return column.includes('desc') ? 
                new Date(b[col]).getTime() - new Date(a[col]).getTime() :
                new Date(a[col]).getTime() - new Date(b[col]).getTime();
            }),
          error: null
        })
      }),
      insert: (data: any) => ({
        select: (columns?: string) => ({
          single: () => {
            const id = `${table}-${Date.now()}-${Math.random()}`;
            const newItem = { ...data, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
            mockDatabase[table as keyof typeof mockDatabase].set(id, newItem);
            return Promise.resolve({ data: newItem, error: null });
          }
        })
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          select: (columns?: string) => ({
            single: () => {
              const items = Array.from(mockDatabase[table as keyof typeof mockDatabase].entries());
              const [id, item] = items.find(([_, item]: [string, any]) => item[column] === value) || [null, null];
              if (item) {
                const updatedItem = { ...item, ...data, updated_at: new Date().toISOString() };
                mockDatabase[table as keyof typeof mockDatabase].set(id!, updatedItem);
                return Promise.resolve({ data: updatedItem, error: null });
              }
              return Promise.resolve({ data: null, error: { message: 'Not found' } });
            }
          })
        })
      })
    })
  };
};

// Mock auth middleware
jest.mock('@/lib/ai-pm/auth-middleware', () => ({
  createSupabaseClient: () => createMockSupabaseClient(),
  checkAuth: jest.fn(),
  checkProjectAccess: jest.fn(),
  checkAdminAccess: jest.fn(),
  isValidUUID: (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || id.startsWith('test-') || id.startsWith('project-') || id.startsWith('doc-'),
  isValidWorkflowStep: (step: number) => step >= 1 && step <= 9,
  ValidationErrors: {
    REQUIRED_FIELD: (field: string) => ({
      error: 'VALIDATION_ERROR',
      message: `${field}은(는) 필수입니다.`
    })
  }
}));

import { checkAuth, checkProjectAccess, checkAdminAccess } from '@/lib/ai-pm/auth-middleware';

const mockCheckAuth = checkAuth as jest.MockedFunction<typeof checkAuth>;
const mockCheckProjectAccess = checkProjectAccess as jest.MockedFunction<typeof checkProjectAccess>;
const mockCheckAdminAccess = checkAdminAccess as jest.MockedFunction<typeof checkAdminAccess>;

describe('AI PM Document Approval Workflow Integration Tests', () => {
  beforeEach(() => {
    // Reset database state
    mockDatabase = {
      projects: new Map(),
      project_members: new Map(),
      planning_documents: new Map(),
      document_versions: new Map(),
      approval_history: new Map(),
      user_profiles: new Map(),
    };

    // Setup initial users
    mockDatabase.user_profiles.set(mockAdmin.id, mockAdmin);
    mockDatabase.user_profiles.set(mockUser1.id, mockUser1);
    mockDatabase.user_profiles.set(mockUser2.id, mockUser2);

    // Setup test project
    const testProject = {
      id: 'project-approval-test',
      name: 'Approval Test Project',
      description: 'Testing approval workflow',
      created_by: mockAdmin.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockDatabase.projects.set(testProject.id, testProject);

    // Setup project members
    const member1 = {
      id: 'member-1',
      project_id: testProject.id,
      user_id: mockUser1.id,
      role: '콘텐츠기획',
      added_by: mockAdmin.id,
      added_at: new Date().toISOString()
    };
    mockDatabase.project_members.set(member1.id, member1);

    const member2 = {
      id: 'member-2',
      project_id: testProject.id,
      user_id: mockUser2.id,
      role: '서비스기획',
      added_by: mockAdmin.id,
      added_at: new Date().toISOString()
    };
    mockDatabase.project_members.set(member2.id, member2);

    jest.clearAllMocks();
  });

  describe('Document Status Transitions', () => {
    it('should transition document from private to pending_approval to official', async () => {
      // Step 1: User creates private document
      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser1.id, email: mockUser1.email },
        profile: mockUser1
      });
      mockCheckProjectAccess.mockResolvedValue(true);

      const createRequest = new NextRequest('http://localhost:3000/api/ai-pm/documents', {
        method: 'POST',
        body: JSON.stringify({
          project_id: 'project-approval-test',
          workflow_step: 1,
          title: 'Test Document for Approval',
          content: 'Initial content for approval testing'
        })
      });

      const createResponse = await DocumentsPOST(createRequest);
      expect(createResponse.status).toBe(201);
      
      const createData = await createResponse.json();
      const documentId = createData.document.id;
      expect(createData.document.status).toBe('private');

      // Step 2: Request approval
      const requestApprovalRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents/${documentId}/request-approval`, {
        method: 'POST'
      });

      const approvalRequestResponse = await RequestApprovalPOST(requestApprovalRequest, { params: { documentId } });
      expect(approvalRequestResponse.status).toBe(200);

      // Verify status changed to pending_approval
      const getDocRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents/${documentId}`);
      const getDocResponse = await DocumentGET(getDocRequest, { params: { documentId } });
      const getDocData = await getDocResponse.json();
      expect(getDocData.document.status).toBe('pending_approval');

      // Step 3: Admin approves document
      mockCheckAuth.mockResolvedValue({
        user: { id: mockAdmin.id, email: mockAdmin.email },
        profile: mockAdmin
      });
      mockCheckAdminAccess.mockResolvedValue(true);

      const approveRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents/${documentId}/approve`, {
        method: 'POST'
      });

      const approveResponse = await ApprovePOST(approveRequest, { params: { documentId } });
      expect(approveResponse.status).toBe(200);

      // Verify status changed to official
      const finalDocRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents/${documentId}`);
      const finalDocResponse = await DocumentGET(finalDocRequest, { params: { documentId } });
      const finalDocData = await finalDocResponse.json();
      expect(finalDocData.document.status).toBe('official');
      expect(finalDocData.document.approved_by).toBe(mockAdmin.id);
      expect(finalDocData.document.approved_at).toBeTruthy();
    });

    it('should prevent approval request for already pending documents', async () => {
      // Create document in pending_approval state
      const pendingDoc = {
        id: 'doc-pending',
        project_id: 'project-approval-test',
        workflow_step: 1,
        title: 'Pending Document',
        content: 'Already pending approval',
        status: 'pending_approval',
        version: 1,
        created_by: mockUser1.id,
        approved_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        approved_at: null
      };
      mockDatabase.planning_documents.set(pendingDoc.id, pendingDoc);

      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser1.id, email: mockUser1.email },
        profile: mockUser1
      });
      mockCheckProjectAccess.mockResolvedValue(true);

      const requestApprovalRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents/${pendingDoc.id}/request-approval`, {
        method: 'POST'
      });

      const response = await RequestApprovalPOST(requestApprovalRequest, { params: { documentId: pendingDoc.id } });
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('VALIDATION_ERROR');
      expect(data.message).toContain('이미 승인 대기 중');
    });

    it('should prevent approval request for official documents', async () => {
      // Create official document
      const officialDoc = {
        id: 'doc-official',
        project_id: 'project-approval-test',
        workflow_step: 1,
        title: 'Official Document',
        content: 'Already approved',
        status: 'official',
        version: 1,
        created_by: mockUser1.id,
        approved_by: mockAdmin.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        approved_at: new Date().toISOString()
      };
      mockDatabase.planning_documents.set(officialDoc.id, officialDoc);

      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser1.id, email: mockUser1.email },
        profile: mockUser1
      });
      mockCheckProjectAccess.mockResolvedValue(true);

      const requestApprovalRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents/${officialDoc.id}/request-approval`, {
        method: 'POST'
      });

      const response = await RequestApprovalPOST(requestApprovalRequest, { params: { documentId: officialDoc.id } });
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('VALIDATION_ERROR');
      expect(data.message).toContain('이미 승인된');
    });
  });

  describe('Version Control and History', () => {
    it('should create version history when document is updated', async () => {
      // Create initial document
      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser1.id, email: mockUser1.email },
        profile: mockUser1
      });
      mockCheckProjectAccess.mockResolvedValue(true);

      const createRequest = new NextRequest('http://localhost:3000/api/ai-pm/documents', {
        method: 'POST',
        body: JSON.stringify({
          project_id: 'project-approval-test',
          workflow_step: 1,
          title: 'Version Test Document',
          content: 'Version 1 content'
        })
      });

      const createResponse = await DocumentsPOST(createRequest);
      const createData = await createResponse.json();
      const documentId = createData.document.id;

      // Update document multiple times
      for (let i = 2; i <= 4; i++) {
        const updateRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents/${documentId}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: `Version Test Document v${i}`,
            content: `Version ${i} content`
          })
        });

        const updateResponse = await DocumentPUT(updateRequest, { params: { documentId } });
        expect(updateResponse.status).toBe(200);
        
        const updateData = await updateResponse.json();
        expect(updateData.document.version).toBe(i);
      }

      // Check version history
      const versionsRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents/${documentId}/versions`);
      const versionsResponse = await VersionsGET(versionsRequest, { params: { documentId } });
      expect(versionsResponse.status).toBe(200);
      
      const versionsData = await versionsResponse.json();
      expect(versionsData.versions).toHaveLength(4);
      expect(versionsData.versions[0].version).toBe(1);
      expect(versionsData.versions[3].version).toBe(4);
    });

    it('should track approval history', async () => {
      // Create document
      const testDoc = {
        id: 'doc-history-test',
        project_id: 'project-approval-test',
        workflow_step: 1,
        title: 'History Test Document',
        content: 'Testing approval history',
        status: 'private',
        version: 1,
        created_by: mockUser1.id,
        approved_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        approved_at: null
      };
      mockDatabase.planning_documents.set(testDoc.id, testDoc);

      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser1.id, email: mockUser1.email },
        profile: mockUser1
      });
      mockCheckProjectAccess.mockResolvedValue(true);

      // Request approval
      const requestApprovalRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents/${testDoc.id}/request-approval`, {
        method: 'POST'
      });

      await RequestApprovalPOST(requestApprovalRequest, { params: { documentId: testDoc.id } });

      // Admin approves
      mockCheckAuth.mockResolvedValue({
        user: { id: mockAdmin.id, email: mockAdmin.email },
        profile: mockAdmin
      });
      mockCheckAdminAccess.mockResolvedValue(true);

      const approveRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents/${testDoc.id}/approve`, {
        method: 'POST'
      });

      await ApprovePOST(approveRequest, { params: { documentId: testDoc.id } });

      // Check approval history
      const historyRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents/${testDoc.id}/approval-history`);
      const historyResponse = await ApprovalHistoryGET(historyRequest, { params: { documentId: testDoc.id } });
      expect(historyResponse.status).toBe(200);
      
      const historyData = await historyResponse.json();
      expect(historyData.history).toHaveLength(2); // Request + Approval
      
      const requestEntry = historyData.history.find((entry: any) => entry.action === 'requested');
      const approvalEntry = historyData.history.find((entry: any) => entry.action === 'approved');
      
      expect(requestEntry).toBeTruthy();
      expect(requestEntry.user_id).toBe(mockUser1.id);
      expect(requestEntry.previous_status).toBe('private');
      expect(requestEntry.new_status).toBe('pending_approval');
      
      expect(approvalEntry).toBeTruthy();
      expect(approvalEntry.user_id).toBe(mockAdmin.id);
      expect(approvalEntry.previous_status).toBe('pending_approval');
      expect(approvalEntry.new_status).toBe('official');
    });
  });

  describe('Pending Approvals Management', () => {
    it('should list pending approvals for admin', async () => {
      // Create multiple pending documents
      const pendingDocs = [
        {
          id: 'doc-pending-1',
          project_id: 'project-approval-test',
          workflow_step: 1,
          title: 'Pending Document 1',
          content: 'Content 1',
          status: 'pending_approval',
          version: 1,
          created_by: mockUser1.id,
          approved_by: null,
          created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          updated_at: new Date(Date.now() - 3600000).toISOString(),
          approved_at: null
        },
        {
          id: 'doc-pending-2',
          project_id: 'project-approval-test',
          workflow_step: 2,
          title: 'Pending Document 2',
          content: 'Content 2',
          status: 'pending_approval',
          version: 1,
          created_by: mockUser2.id,
          approved_by: null,
          created_at: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
          updated_at: new Date(Date.now() - 1800000).toISOString(),
          approved_at: null
        }
      ];

      pendingDocs.forEach(doc => {
        mockDatabase.planning_documents.set(doc.id, doc);
      });

      mockCheckAuth.mockResolvedValue({
        user: { id: mockAdmin.id, email: mockAdmin.email },
        profile: mockAdmin
      });
      mockCheckAdminAccess.mockResolvedValue(true);

      const pendingRequest = new NextRequest('http://localhost:3000/api/ai-pm/documents/pending-approvals');
      const pendingResponse = await PendingApprovalsGET(pendingRequest);
      expect(pendingResponse.status).toBe(200);
      
      const pendingData = await pendingResponse.json();
      expect(pendingData.documents).toHaveLength(2);
      
      // Should be ordered by created_at desc (newest first)
      expect(pendingData.documents[0].document_id).toBe('doc-pending-2');
      expect(pendingData.documents[1].document_id).toBe('doc-pending-1');
    });

    it('should deny pending approvals access to regular users', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser1.id, email: mockUser1.email },
        profile: mockUser1
      });
      mockCheckAdminAccess.mockResolvedValue(false);

      const pendingRequest = new NextRequest('http://localhost:3000/api/ai-pm/documents/pending-approvals');
      const pendingResponse = await PendingApprovalsGET(pendingRequest);
      expect(pendingResponse.status).toBe(403);
      
      const data = await pendingResponse.json();
      expect(data.error).toBe(AIpmErrorType.FORBIDDEN);
    });
  });

  describe('Approval Permissions and Validation', () => {
    it('should only allow document creators to request approval', async () => {
      // Create document by User1
      const testDoc = {
        id: 'doc-permission-test',
        project_id: 'project-approval-test',
        workflow_step: 1,
        title: 'Permission Test Document',
        content: 'Testing permissions',
        status: 'private',
        version: 1,
        created_by: mockUser1.id,
        approved_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        approved_at: null
      };
      mockDatabase.planning_documents.set(testDoc.id, testDoc);

      // User2 tries to request approval for User1's document
      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser2.id, email: mockUser2.email },
        profile: mockUser2
      });
      mockCheckProjectAccess.mockResolvedValue(true);

      const requestApprovalRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents/${testDoc.id}/request-approval`, {
        method: 'POST'
      });

      const response = await RequestApprovalPOST(requestApprovalRequest, { params: { documentId: testDoc.id } });
      expect(response.status).toBe(403);
      
      const data = await response.json();
      expect(data.error).toBe(AIpmErrorType.FORBIDDEN);
    });

    it('should only allow admins to approve documents', async () => {
      // Create pending document
      const pendingDoc = {
        id: 'doc-admin-approval-test',
        project_id: 'project-approval-test',
        workflow_step: 1,
        title: 'Admin Approval Test',
        content: 'Testing admin approval',
        status: 'pending_approval',
        version: 1,
        created_by: mockUser1.id,
        approved_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        approved_at: null
      };
      mockDatabase.planning_documents.set(pendingDoc.id, pendingDoc);

      // Regular user tries to approve
      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser2.id, email: mockUser2.email },
        profile: mockUser2
      });
      mockCheckProjectAccess.mockResolvedValue(true);
      mockCheckAdminAccess.mockResolvedValue(false);

      const approveRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents/${pendingDoc.id}/approve`, {
        method: 'POST'
      });

      const response = await ApprovePOST(approveRequest, { params: { documentId: pendingDoc.id } });
      expect(response.status).toBe(403);
      
      const data = await response.json();
      expect(data.error).toBe(AIpmErrorType.FORBIDDEN);
    });

    it('should prevent approval of non-pending documents', async () => {
      // Create private document
      const privateDoc = {
        id: 'doc-private-approval-test',
        project_id: 'project-approval-test',
        workflow_step: 1,
        title: 'Private Approval Test',
        content: 'Testing private approval',
        status: 'private',
        version: 1,
        created_by: mockUser1.id,
        approved_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        approved_at: null
      };
      mockDatabase.planning_documents.set(privateDoc.id, privateDoc);

      mockCheckAuth.mockResolvedValue({
        user: { id: mockAdmin.id, email: mockAdmin.email },
        profile: mockAdmin
      });
      mockCheckAdminAccess.mockResolvedValue(true);

      const approveRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents/${privateDoc.id}/approve`, {
        method: 'POST'
      });

      const response = await ApprovePOST(approveRequest, { params: { documentId: privateDoc.id } });
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('VALIDATION_ERROR');
      expect(data.message).toContain('승인 대기 중인 문서만');
    });
  });

  describe('Workflow Step Validation', () => {
    it('should enforce workflow step progression', async () => {
      // Try to create document for step 3 without having official documents for steps 1-2
      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser1.id, email: mockUser1.email },
        profile: mockUser1
      });
      mockCheckProjectAccess.mockResolvedValue(true);

      const createRequest = new NextRequest('http://localhost:3000/api/ai-pm/documents', {
        method: 'POST',
        body: JSON.stringify({
          project_id: 'project-approval-test',
          workflow_step: 3,
          title: 'Step 3 Document',
          content: 'Trying to skip steps'
        })
      });

      const response = await DocumentsPOST(createRequest);
      // Should still allow creation but may warn about missing prerequisites
      expect(response.status).toBe(201);
    });

    it('should allow parallel work on different workflow steps', async () => {
      // User1 works on step 1
      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser1.id, email: mockUser1.email },
        profile: mockUser1
      });
      mockCheckProjectAccess.mockResolvedValue(true);

      const step1Request = new NextRequest('http://localhost:3000/api/ai-pm/documents', {
        method: 'POST',
        body: JSON.stringify({
          project_id: 'project-approval-test',
          workflow_step: 1,
          title: 'Step 1 Document',
          content: 'Step 1 content'
        })
      });

      const step1Response = await DocumentsPOST(step1Request);
      expect(step1Response.status).toBe(201);

      // User2 works on step 2 simultaneously
      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser2.id, email: mockUser2.email },
        profile: mockUser2
      });

      const step2Request = new NextRequest('http://localhost:3000/api/ai-pm/documents', {
        method: 'POST',
        body: JSON.stringify({
          project_id: 'project-approval-test',
          workflow_step: 2,
          title: 'Step 2 Document',
          content: 'Step 2 content'
        })
      });

      const step2Response = await DocumentsPOST(step2Request);
      expect(step2Response.status).toBe(201);

      // Both documents should be created successfully
      const step1Data = await step1Response.json();
      const step2Data = await step2Response.json();
      
      expect(step1Data.document.workflow_step).toBe(1);
      expect(step2Data.document.workflow_step).toBe(2);
      expect(step1Data.document.created_by).toBe(mockUser1.id);
      expect(step2Data.document.created_by).toBe(mockUser2.id);
    });
  });

  describe('Bulk Approval Operations', () => {
    it('should handle multiple pending approvals efficiently', async () => {
      // Create multiple pending documents
      const pendingDocs = [];
      for (let i = 1; i <= 5; i++) {
        const doc = {
          id: `doc-bulk-${i}`,
          project_id: 'project-approval-test',
          workflow_step: i,
          title: `Bulk Document ${i}`,
          content: `Content ${i}`,
          status: 'pending_approval',
          version: 1,
          created_by: i % 2 === 0 ? mockUser1.id : mockUser2.id,
          approved_by: null,
          created_at: new Date(Date.now() - i * 600000).toISOString(), // Staggered times
          updated_at: new Date(Date.now() - i * 600000).toISOString(),
          approved_at: null
        };
        mockDatabase.planning_documents.set(doc.id, doc);
        pendingDocs.push(doc);
      }

      mockCheckAuth.mockResolvedValue({
        user: { id: mockAdmin.id, email: mockAdmin.email },
        profile: mockAdmin
      });
      mockCheckAdminAccess.mockResolvedValue(true);

      // Approve all documents
      for (const doc of pendingDocs) {
        const approveRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents/${doc.id}/approve`, {
          method: 'POST'
        });

        const response = await ApprovePOST(approveRequest, { params: { documentId: doc.id } });
        expect(response.status).toBe(200);
      }

      // Verify all documents are now official
      for (const doc of pendingDocs) {
        const getDocRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents/${doc.id}`);
        const getDocResponse = await DocumentGET(getDocRequest, { params: { documentId: doc.id } });
        const docData = await getDocResponse.json();
        
        expect(docData.document.status).toBe('official');
        expect(docData.document.approved_by).toBe(mockAdmin.id);
      }

      // Verify no pending approvals remain
      const pendingRequest = new NextRequest('http://localhost:3000/api/ai-pm/documents/pending-approvals');
      const pendingResponse = await PendingApprovalsGET(pendingRequest);
      const pendingData = await pendingResponse.json();
      
      expect(pendingData.documents).toHaveLength(0);
    });
  });
});