/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET as ProjectsGET, POST as ProjectsPOST } from '@/app/api/ai-pm/projects/route';
import { GET as ProjectGET, PUT as ProjectPUT, DELETE as ProjectDELETE } from '@/app/api/ai-pm/projects/[projectId]/route';
import { GET as MembersGET, POST as MembersPOST } from '@/app/api/ai-pm/projects/[projectId]/members/route';
import { PUT as MemberPUT, DELETE as MemberDELETE } from '@/app/api/ai-pm/projects/[projectId]/members/[memberId]/route';
import { GET as DocumentsGET, POST as DocumentsPOST } from '@/app/api/ai-pm/documents/route';
import { GET as DocumentGET, PUT as DocumentPUT, DELETE as DocumentDELETE } from '@/app/api/ai-pm/documents/[documentId]/route';
import { POST as RequestApprovalPOST } from '@/app/api/ai-pm/documents/[documentId]/request-approval/route';
import { POST as ApprovePOST } from '@/app/api/ai-pm/documents/[documentId]/approve/route';
import { AIpmErrorType } from '@/types/ai-pm';

// Mock database state
let mockDatabase = {
  projects: new Map(),
  project_members: new Map(),
  planning_documents: new Map(),
  user_profiles: new Map(),
};

// Test users with different roles
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

const mockUnauthorizedUser = {
  id: 'user-789',
  email: 'unauthorized@test.com',
  full_name: 'Unauthorized User',
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
                if (column.includes('eq')) return true;
                return item[column.split(' ')[0]] === value;
              }),
            error: null
          })
        }),
        order: (column: string) => ({
          data: Array.from(mockDatabase[table as keyof typeof mockDatabase].values()),
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
      }),
      delete: () => ({
        eq: (column: string, value: any) => ({
          data: null,
          error: null
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
  isValidUUID: (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || id.startsWith('test-') || id.startsWith('project-') || id.startsWith('doc-') || id.startsWith('member-'),
  isValidWorkflowStep: (step: number) => step >= 1 && step <= 9,
  ValidationErrors: {
    REQUIRED_FIELD: (field: string) => ({
      error: 'VALIDATION_ERROR',
      message: `${field}은(는) 필수입니다.`
    }),
    INVALID_UUID: (field: string) => ({
      error: 'VALIDATION_ERROR',
      message: `유효하지 않은 ${field} 형식입니다.`
    })
  }
}));

import { checkAuth, checkProjectAccess, checkAdminAccess } from '@/lib/ai-pm/auth-middleware';

const mockCheckAuth = checkAuth as jest.MockedFunction<typeof checkAuth>;
const mockCheckProjectAccess = checkProjectAccess as jest.MockedFunction<typeof checkProjectAccess>;
const mockCheckAdminAccess = checkAdminAccess as jest.MockedFunction<typeof checkAdminAccess>;

describe('AI PM Permissions Integration Tests', () => {
  beforeEach(() => {
    // Reset database state
    mockDatabase = {
      projects: new Map(),
      project_members: new Map(),
      planning_documents: new Map(),
      user_profiles: new Map(),
    };

    // Setup initial users
    mockDatabase.user_profiles.set(mockAdmin.id, mockAdmin);
    mockDatabase.user_profiles.set(mockUser1.id, mockUser1);
    mockDatabase.user_profiles.set(mockUser2.id, mockUser2);
    mockDatabase.user_profiles.set(mockUnauthorizedUser.id, mockUnauthorizedUser);

    // Setup test project
    const testProject = {
      id: 'project-permissions-test',
      name: 'Permissions Test Project',
      description: 'Testing permission system',
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

    // Setup test documents
    const privateDoc = {
      id: 'doc-private',
      project_id: testProject.id,
      workflow_step: 1,
      title: 'Private Document',
      content: 'This is a private document',
      status: 'private',
      version: 1,
      created_by: mockUser1.id,
      approved_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      approved_at: null
    };
    mockDatabase.planning_documents.set(privateDoc.id, privateDoc);

    const officialDoc = {
      id: 'doc-official',
      project_id: testProject.id,
      workflow_step: 2,
      title: 'Official Document',
      content: 'This is an official document',
      status: 'official',
      version: 1,
      created_by: mockUser1.id,
      approved_by: mockAdmin.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      approved_at: new Date().toISOString()
    };
    mockDatabase.planning_documents.set(officialDoc.id, officialDoc);

    jest.clearAllMocks();
  });

  describe('Admin Access Control', () => {
    it('should allow admin to access all projects', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: mockAdmin.id, email: mockAdmin.email },
        profile: mockAdmin
      });

      const request = new NextRequest('http://localhost:3000/api/ai-pm/projects');
      const response = await ProjectsGET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.projects).toHaveLength(1);
      expect(data.projects[0].name).toBe('Permissions Test Project');
    });

    it('should allow admin to create projects', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: mockAdmin.id, email: mockAdmin.email },
        profile: mockAdmin
      });

      const request = new NextRequest('http://localhost:3000/api/ai-pm/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Admin Created Project',
          description: 'Project created by admin'
        })
      });

      const response = await ProjectsPOST(request);
      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data.project.name).toBe('Admin Created Project');
      expect(data.project.created_by).toBe(mockAdmin.id);
    });

    it('should allow admin to manage project members', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: mockAdmin.id, email: mockAdmin.email },
        profile: mockAdmin
      });
      mockCheckProjectAccess.mockResolvedValue(true);

      // Add member
      const addMemberRequest = new NextRequest('http://localhost:3000/api/ai-pm/projects/project-permissions-test/members', {
        method: 'POST',
        body: JSON.stringify({
          user_id: mockUser2.id,
          role: '서비스기획'
        })
      });

      const addResponse = await MembersPOST(addMemberRequest, { params: { projectId: 'project-permissions-test' } });
      expect(addResponse.status).toBe(201);

      // Get members
      const getMembersRequest = new NextRequest('http://localhost:3000/api/ai-pm/projects/project-permissions-test/members');
      const getMembersResponse = await MembersGET(getMembersRequest, { params: { projectId: 'project-permissions-test' } });
      
      expect(getMembersResponse.status).toBe(200);
      const membersData = await getMembersResponse.json();
      expect(membersData.members).toHaveLength(2); // Original member + new member
    });

    it('should allow admin to approve documents', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: mockAdmin.id, email: mockAdmin.email },
        profile: mockAdmin
      });
      mockCheckProjectAccess.mockResolvedValue(true);

      const approveRequest = new NextRequest('http://localhost:3000/api/ai-pm/documents/doc-private/approve', {
        method: 'POST'
      });

      const response = await ApprovePOST(approveRequest, { params: { documentId: 'doc-private' } });
      expect(response.status).toBe(200);
    });
  });

  describe('Project Member Access Control', () => {
    it('should allow project members to view their projects', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser1.id, email: mockUser1.email },
        profile: mockUser1
      });

      const request = new NextRequest('http://localhost:3000/api/ai-pm/projects');
      const response = await ProjectsGET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.projects).toHaveLength(1);
      expect(data.projects[0].project_id).toBe('project-permissions-test');
    });

    it('should allow project members to view project details', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser1.id, email: mockUser1.email },
        profile: mockUser1
      });
      mockCheckProjectAccess.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/ai-pm/projects/project-permissions-test');
      const response = await ProjectGET(request, { params: { projectId: 'project-permissions-test' } });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.project.id).toBe('project-permissions-test');
      expect(data.members).toHaveLength(1);
    });

    it('should allow project members to create documents', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser1.id, email: mockUser1.email },
        profile: mockUser1
      });
      mockCheckProjectAccess.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/ai-pm/documents', {
        method: 'POST',
        body: JSON.stringify({
          project_id: 'project-permissions-test',
          workflow_step: 3,
          title: 'Member Created Document',
          content: 'Document created by project member'
        })
      });

      const response = await DocumentsPOST(request);
      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data.document.title).toBe('Member Created Document');
      expect(data.document.created_by).toBe(mockUser1.id);
      expect(data.document.status).toBe('private');
    });

    it('should allow project members to view official documents', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser1.id, email: mockUser1.email },
        profile: mockUser1
      });
      mockCheckProjectAccess.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/ai-pm/documents?projectId=project-permissions-test&workflowStep=2');
      const response = await DocumentsGET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.documents).toHaveLength(1);
      expect(data.documents[0].status).toBe('official');
    });

    it('should allow document creators to view their private documents', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser1.id, email: mockUser1.email },
        profile: mockUser1
      });
      mockCheckProjectAccess.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/ai-pm/documents?projectId=project-permissions-test&workflowStep=1');
      const response = await DocumentsGET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.documents).toHaveLength(1);
      expect(data.documents[0].status).toBe('private');
      expect(data.documents[0].created_by).toBe(mockUser1.id);
    });
  });

  describe('Access Denial for Unauthorized Users', () => {
    it('should deny access to non-project members', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: mockUnauthorizedUser.id, email: mockUnauthorizedUser.email },
        profile: mockUnauthorizedUser
      });
      mockCheckProjectAccess.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/ai-pm/projects/project-permissions-test');
      const response = await ProjectGET(request, { params: { projectId: 'project-permissions-test' } });
      
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe(AIpmErrorType.FORBIDDEN);
    });

    it('should deny document access to non-project members', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: mockUnauthorizedUser.id, email: mockUnauthorizedUser.email },
        profile: mockUnauthorizedUser
      });
      mockCheckProjectAccess.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/ai-pm/documents?projectId=project-permissions-test&workflowStep=1');
      const response = await DocumentsGET(request);
      
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe(AIpmErrorType.FORBIDDEN);
    });

    it('should deny project creation to regular users', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser1.id, email: mockUser1.email },
        profile: mockUser1
      });
      mockCheckAdminAccess.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/ai-pm/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Unauthorized Project',
          description: 'Should not be created'
        })
      });

      const response = await ProjectsPOST(request);
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe(AIpmErrorType.FORBIDDEN);
    });

    it('should deny member management to regular users', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser1.id, email: mockUser1.email },
        profile: mockUser1
      });
      mockCheckProjectAccess.mockResolvedValue(true);
      mockCheckAdminAccess.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/ai-pm/projects/project-permissions-test/members', {
        method: 'POST',
        body: JSON.stringify({
          user_id: mockUser2.id,
          role: '서비스기획'
        })
      });

      const response = await MembersPOST(request, { params: { projectId: 'project-permissions-test' } });
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe(AIpmErrorType.FORBIDDEN);
    });

    it('should deny document approval to regular users', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser1.id, email: mockUser1.email },
        profile: mockUser1
      });
      mockCheckProjectAccess.mockResolvedValue(true);
      mockCheckAdminAccess.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/ai-pm/documents/doc-private/approve', {
        method: 'POST'
      });

      const response = await ApprovePOST(request, { params: { documentId: 'doc-private' } });
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe(AIpmErrorType.FORBIDDEN);
    });
  });

  describe('Document Privacy and Access Control', () => {
    it('should hide private documents from other project members', async () => {
      // User2 is not a member, so add them first
      const member2 = {
        id: 'member-2',
        project_id: 'project-permissions-test',
        user_id: mockUser2.id,
        role: '서비스기획',
        added_by: mockAdmin.id,
        added_at: new Date().toISOString()
      };
      mockDatabase.project_members.set(member2.id, member2);

      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser2.id, email: mockUser2.email },
        profile: mockUser2
      });
      mockCheckProjectAccess.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/ai-pm/documents?projectId=project-permissions-test&workflowStep=1');
      const response = await DocumentsGET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      // Should not see User1's private document
      expect(data.documents).toHaveLength(0);
    });

    it('should allow document creators to edit their own documents', async () => {
      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser1.id, email: mockUser1.email },
        profile: mockUser1
      });
      mockCheckProjectAccess.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/ai-pm/documents/doc-private', {
        method: 'PUT',
        body: JSON.stringify({
          title: 'Updated Private Document',
          content: 'Updated content'
        })
      });

      const response = await DocumentPUT(request, { params: { documentId: 'doc-private' } });
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.document.title).toBe('Updated Private Document');
    });

    it('should deny editing other users private documents', async () => {
      // Add User2 as project member
      const member2 = {
        id: 'member-2',
        project_id: 'project-permissions-test',
        user_id: mockUser2.id,
        role: '서비스기획',
        added_by: mockAdmin.id,
        added_at: new Date().toISOString()
      };
      mockDatabase.project_members.set(member2.id, member2);

      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser2.id, email: mockUser2.email },
        profile: mockUser2
      });
      mockCheckProjectAccess.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/ai-pm/documents/doc-private', {
        method: 'PUT',
        body: JSON.stringify({
          title: 'Unauthorized Update',
          content: 'Should not be allowed'
        })
      });

      const response = await DocumentPUT(request, { params: { documentId: 'doc-private' } });
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe(AIpmErrorType.FORBIDDEN);
    });
  });

  describe('Session and Authentication Validation', () => {
    it('should reject requests without authentication', async () => {
      mockCheckAuth.mockResolvedValue({
        error: AIpmErrorType.UNAUTHORIZED,
        message: '인증이 필요합니다.'
      });

      const request = new NextRequest('http://localhost:3000/api/ai-pm/projects');
      const response = await ProjectsGET(request);
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe(AIpmErrorType.UNAUTHORIZED);
    });

    it('should handle expired sessions', async () => {
      mockCheckAuth.mockResolvedValue({
        error: AIpmErrorType.SESSION_EXPIRED,
        message: '세션이 만료되었습니다.'
      });

      const request = new NextRequest('http://localhost:3000/api/ai-pm/projects');
      const response = await ProjectsGET(request);
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe(AIpmErrorType.SESSION_EXPIRED);
    });

    it('should validate user profile exists', async () => {
      mockCheckAuth.mockResolvedValue({
        error: AIpmErrorType.USER_NOT_FOUND,
        message: '사용자 프로필을 찾을 수 없습니다.'
      });

      const request = new NextRequest('http://localhost:3000/api/ai-pm/projects');
      const response = await ProjectsGET(request);
      
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe(AIpmErrorType.USER_NOT_FOUND);
    });
  });

  describe('Role-based Access Control', () => {
    it('should enforce role-based document access', async () => {
      // Create role-specific document
      const uiuxDoc = {
        id: 'doc-uiux',
        project_id: 'project-permissions-test',
        workflow_step: 4,
        title: 'UIUX Design Document',
        content: 'UIUX specific content',
        status: 'private',
        version: 1,
        created_by: mockUser2.id,
        approved_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        approved_at: null
      };
      mockDatabase.planning_documents.set(uiuxDoc.id, uiuxDoc);

      // Add User2 as UIUX designer
      const uiuxMember = {
        id: 'member-uiux',
        project_id: 'project-permissions-test',
        user_id: mockUser2.id,
        role: 'UIUX기획',
        added_by: mockAdmin.id,
        added_at: new Date().toISOString()
      };
      mockDatabase.project_members.set(uiuxMember.id, uiuxMember);

      // User1 (콘텐츠기획) should not see User2's (UIUX기획) private document
      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser1.id, email: mockUser1.email },
        profile: mockUser1
      });
      mockCheckProjectAccess.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/ai-pm/documents?projectId=project-permissions-test&workflowStep=4');
      const response = await DocumentsGET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.documents).toHaveLength(0); // Should not see other role's private documents
    });

    it('should allow all roles to see official documents', async () => {
      // Add User2 as different role
      const member2 = {
        id: 'member-2',
        project_id: 'project-permissions-test',
        user_id: mockUser2.id,
        role: 'UIUX기획',
        added_by: mockAdmin.id,
        added_at: new Date().toISOString()
      };
      mockDatabase.project_members.set(member2.id, member2);

      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser2.id, email: mockUser2.email },
        profile: mockUser2
      });
      mockCheckProjectAccess.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/ai-pm/documents?projectId=project-permissions-test&workflowStep=2');
      const response = await DocumentsGET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.documents).toHaveLength(1);
      expect(data.documents[0].status).toBe('official');
    });
  });
});