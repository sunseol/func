/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST as ChatPOST } from '@/app/api/ai-pm/chat/route';
import { GET as DocumentsGET, POST as DocumentsPOST } from '@/app/api/ai-pm/documents/route';
import { POST as GenerateDocumentPOST } from '@/app/api/ai-pm/documents/generate/route';
import { POST as RequestApprovalPOST } from '@/app/api/ai-pm/documents/[documentId]/request-approval/route';
import { POST as ApprovePOST } from '@/app/api/ai-pm/documents/[documentId]/approve/route';
import { GET as ProjectsGET, POST as ProjectsPOST } from '@/app/api/ai-pm/projects/route';
import { GET as ProjectGET } from '@/app/api/ai-pm/projects/[projectId]/route';
import { POST as MembersPOST } from '@/app/api/ai-pm/projects/[projectId]/members/route';

// Mock database state
let mockDatabase = {
  projects: new Map(),
  project_members: new Map(),
  planning_documents: new Map(),
  document_versions: new Map(),
  ai_conversations: new Map(),
  user_profiles: new Map(),
  approval_history: new Map(),
};

// Mock users
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

// Mock Supabase client with in-memory database
const createMockSupabaseClient = (currentUser: any) => {
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
              .filter((item: any) => item[column.split(' ')[0]] === value)
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
      }),
      upsert: (data: any) => ({
        select: (columns?: string) => ({
          single: () => {
            const id = data.id || `${table}-${Date.now()}-${Math.random()}`;
            const newItem = { ...data, id, updated_at: new Date().toISOString() };
            if (!data.id) {
              newItem.created_at = new Date().toISOString();
            }
            mockDatabase[table as keyof typeof mockDatabase].set(id, newItem);
            return Promise.resolve({ data: newItem, error: null });
          }
        })
      })
    })
  };
};

// Mock auth middleware
jest.mock('@/lib/ai-pm/auth-middleware', () => ({
  createSupabaseClient: () => createMockSupabaseClient(mockAdmin),
  checkAuth: jest.fn(),
  checkProjectAccess: jest.fn(),
  isValidUUID: (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || id.startsWith('test-') || id.startsWith('project-') || id.startsWith('doc-'),
  isValidWorkflowStep: (step: number) => step >= 1 && step <= 9,
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

// Mock AI service
const mockAIService = {
  generateResponse: jest.fn(),
  generateDocument: jest.fn(),
  analyzeConflicts: jest.fn(),
};

jest.mock('@/lib/ai-pm/ai-service', () => ({
  getAIService: () => mockAIService,
}));

import { checkAuth, checkProjectAccess } from '@/lib/ai-pm/auth-middleware';

const mockCheckAuth = checkAuth as jest.MockedFunction<typeof checkAuth>;
const mockCheckProjectAccess = checkProjectAccess as jest.MockedFunction<typeof checkProjectAccess>;

describe('AI PM Workflow Integration Tests', () => {
  beforeEach(() => {
    // Reset database state
    mockDatabase = {
      projects: new Map(),
      project_members: new Map(),
      planning_documents: new Map(),
      document_versions: new Map(),
      ai_conversations: new Map(),
      user_profiles: new Map(),
      approval_history: new Map(),
    };

    // Setup initial users
    mockDatabase.user_profiles.set(mockAdmin.id, mockAdmin);
    mockDatabase.user_profiles.set(mockUser1.id, mockUser1);
    mockDatabase.user_profiles.set(mockUser2.id, mockUser2);

    jest.clearAllMocks();
  });

  describe('Complete Workflow: Project Creation to Document Approval', () => {
    it('should complete full workflow from project creation to document approval', async () => {
      // Step 1: Admin creates project
      mockCheckAuth.mockResolvedValue({
        user: { id: mockAdmin.id, email: mockAdmin.email },
        profile: mockAdmin
      });

      const createProjectRequest = new NextRequest('http://localhost:3000/api/ai-pm/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test E-book Platform',
          description: 'A platform for digital books'
        })
      });

      const createProjectResponse = await ProjectsPOST(createProjectRequest);
      expect(createProjectResponse.status).toBe(201);
      
      const projectData = await createProjectResponse.json();
      const projectId = projectData.project.id;
      expect(projectData.project.name).toBe('Test E-book Platform');

      // Step 2: Admin adds members to project
      mockCheckProjectAccess.mockResolvedValue(true);

      const addMemberRequest = new NextRequest(`http://localhost:3000/api/ai-pm/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: mockUser1.id,
          role: '콘텐츠기획'
        })
      });

      const addMemberResponse = await MembersPOST(addMemberRequest, { params: { projectId } });
      expect(addMemberResponse.status).toBe(201);

      // Step 3: User starts AI conversation for workflow step 1
      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser1.id, email: mockUser1.email },
        profile: mockUser1
      });

      mockAIService.generateResponse.mockResolvedValue('AI가 서비스 개요에 대해 도움을 드리겠습니다. 전자책 플랫폼의 목표는 무엇인가요?');

      const chatRequest = new NextRequest('http://localhost:3000/api/ai-pm/chat', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          workflowStep: 1,
          message: '전자책 플랫폼을 기획하고 있습니다. 서비스 개요를 작성해주세요.'
        })
      });

      const chatResponse = await ChatPOST(chatRequest);
      expect(chatResponse.status).toBe(200);
      
      const chatData = await chatResponse.json();
      expect(chatData.response).toContain('AI가 서비스 개요에 대해');

      // Step 4: Generate document from AI conversation
      mockAIService.generateDocument.mockResolvedValue({
        title: '서비스 개요 및 목표 설정',
        content: '# 전자책 플랫폼 서비스 개요\n\n## 목표\n- 사용자 친화적인 전자책 플랫폼 구축\n- 다양한 장르의 전자책 제공\n\n## 핵심 가치\n- 편리한 독서 경험\n- 저렴한 가격\n- 풍부한 콘텐츠'
      });

      const generateRequest = new NextRequest('http://localhost:3000/api/ai-pm/documents/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          workflowStep: 1
        })
      });

      const generateResponse = await GenerateDocumentPOST(generateRequest);
      expect(generateResponse.status).toBe(201);
      
      const documentData = await generateResponse.json();
      const documentId = documentData.document.id;
      expect(documentData.document.title).toBe('서비스 개요 및 목표 설정');
      expect(documentData.document.status).toBe('private');

      // Step 5: User edits and saves document
      const updateDocumentRequest = new NextRequest('http://localhost:3000/api/ai-pm/documents', {
        method: 'POST',
        body: JSON.stringify({
          project_id: projectId,
          workflow_step: 1,
          title: '서비스 개요 및 목표 설정 (수정됨)',
          content: documentData.document.content + '\n\n## 추가 목표\n- 모바일 최적화'
        })
      });

      const updateResponse = await DocumentsPOST(updateDocumentRequest);
      expect(updateResponse.status).toBe(201);

      // Step 6: Request approval for document
      const requestApprovalRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents/${documentId}/request-approval`, {
        method: 'POST'
      });

      const approvalRequestResponse = await RequestApprovalPOST(requestApprovalRequest, { params: { documentId } });
      expect(approvalRequestResponse.status).toBe(200);

      // Verify document status changed to pending_approval
      const documentsRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents?projectId=${projectId}&workflowStep=1`);
      const documentsResponse = await DocumentsGET(documentsRequest);
      const documentsData = await documentsResponse.json();
      
      const pendingDocument = documentsData.documents.find((doc: any) => doc.id === documentId);
      expect(pendingDocument?.status).toBe('pending_approval');

      // Step 7: Admin approves document
      mockCheckAuth.mockResolvedValue({
        user: { id: mockAdmin.id, email: mockAdmin.email },
        profile: mockAdmin
      });

      const approveRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents/${documentId}/approve`, {
        method: 'POST'
      });

      const approveResponse = await ApprovePOST(approveRequest, { params: { documentId } });
      expect(approveResponse.status).toBe(200);

      // Step 8: Verify document is now official
      const finalDocumentsRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents?projectId=${projectId}&workflowStep=1`);
      const finalDocumentsResponse = await DocumentsGET(finalDocumentsRequest);
      const finalDocumentsData = await finalDocumentsResponse.json();
      
      const officialDocument = finalDocumentsData.documents.find((doc: any) => doc.id === documentId);
      expect(officialDocument?.status).toBe('official');
      expect(officialDocument?.approved_by).toBe(mockAdmin.id);

      // Step 9: Verify project progress
      const projectRequest = new NextRequest(`http://localhost:3000/api/ai-pm/projects/${projectId}`);
      const projectResponse = await ProjectGET(projectRequest, { params: { projectId } });
      const finalProjectData = await projectResponse.json();
      
      expect(finalProjectData.project.id).toBe(projectId);
      expect(finalProjectData.members).toHaveLength(1);
      expect(finalProjectData.members[0].role).toBe('콘텐츠기획');
    });

    it('should handle workflow step progression', async () => {
      // Setup project and member
      mockCheckAuth.mockResolvedValue({
        user: { id: mockAdmin.id, email: mockAdmin.email },
        profile: mockAdmin
      });

      const project = {
        id: 'project-workflow-test',
        name: 'Workflow Test Project',
        description: 'Testing workflow progression',
        created_by: mockAdmin.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockDatabase.projects.set(project.id, project);

      const member = {
        id: 'member-1',
        project_id: project.id,
        user_id: mockUser1.id,
        role: '서비스기획',
        added_by: mockAdmin.id,
        added_at: new Date().toISOString()
      };
      mockDatabase.project_members.set(member.id, member);

      mockCheckProjectAccess.mockResolvedValue(true);
      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser1.id, email: mockUser1.email },
        profile: mockUser1
      });

      // Create and approve documents for steps 1-3
      for (let step = 1; step <= 3; step++) {
        // Generate document
        mockAIService.generateDocument.mockResolvedValue({
          title: `워크플로우 단계 ${step}`,
          content: `# 단계 ${step} 문서\n\n이것은 단계 ${step}의 내용입니다.`
        });

        const generateRequest = new NextRequest('http://localhost:3000/api/ai-pm/documents/generate', {
          method: 'POST',
          body: JSON.stringify({
            projectId: project.id,
            workflowStep: step
          })
        });

        const generateResponse = await GenerateDocumentPOST(generateRequest);
        expect(generateResponse.status).toBe(201);
        
        const documentData = await generateResponse.json();
        const documentId = documentData.document.id;

        // Request approval
        const requestApprovalRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents/${documentId}/request-approval`, {
          method: 'POST'
        });

        await RequestApprovalPOST(requestApprovalRequest, { params: { documentId } });

        // Admin approves
        mockCheckAuth.mockResolvedValue({
          user: { id: mockAdmin.id, email: mockAdmin.email },
          profile: mockAdmin
        });

        const approveRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents/${documentId}/approve`, {
          method: 'POST'
        });

        const approveResponse = await ApprovePOST(approveRequest, { params: { documentId } });
        expect(approveResponse.status).toBe(200);

        // Switch back to user
        mockCheckAuth.mockResolvedValue({
          user: { id: mockUser1.id, email: mockUser1.email },
          profile: mockUser1
        });
      }

      // Verify all documents are official
      for (let step = 1; step <= 3; step++) {
        const documentsRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents?projectId=${project.id}&workflowStep=${step}`);
        const documentsResponse = await DocumentsGET(documentsRequest);
        const documentsData = await documentsResponse.json();
        
        expect(documentsData.documents).toHaveLength(1);
        expect(documentsData.documents[0].status).toBe('official');
        expect(documentsData.documents[0].workflow_step).toBe(step);
      }
    });
  });

  describe('Multi-user Collaboration Workflow', () => {
    it('should handle multiple users working on different workflow steps', async () => {
      // Setup project with multiple members
      mockCheckAuth.mockResolvedValue({
        user: { id: mockAdmin.id, email: mockAdmin.email },
        profile: mockAdmin
      });

      const project = {
        id: 'project-multi-user',
        name: 'Multi-user Project',
        description: 'Testing multi-user collaboration',
        created_by: mockAdmin.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockDatabase.projects.set(project.id, project);

      // Add multiple members with different roles
      const members = [
        {
          id: 'member-content',
          project_id: project.id,
          user_id: mockUser1.id,
          role: '콘텐츠기획',
          added_by: mockAdmin.id,
          added_at: new Date().toISOString()
        },
        {
          id: 'member-service',
          project_id: project.id,
          user_id: mockUser2.id,
          role: '서비스기획',
          added_by: mockAdmin.id,
          added_at: new Date().toISOString()
        }
      ];

      members.forEach(member => {
        mockDatabase.project_members.set(member.id, member);
      });

      mockCheckProjectAccess.mockResolvedValue(true);

      // User 1 works on step 1
      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser1.id, email: mockUser1.email },
        profile: mockUser1
      });

      mockAIService.generateDocument.mockResolvedValue({
        title: '콘텐츠 기획 문서',
        content: '# 콘텐츠 전략\n\n콘텐츠 기획자가 작성한 문서입니다.'
      });

      const user1GenerateRequest = new NextRequest('http://localhost:3000/api/ai-pm/documents/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: project.id,
          workflowStep: 1
        })
      });

      const user1GenerateResponse = await GenerateDocumentPOST(user1GenerateRequest);
      expect(user1GenerateResponse.status).toBe(201);
      const user1DocumentData = await user1GenerateResponse.json();

      // User 2 works on step 2
      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser2.id, email: mockUser2.email },
        profile: mockUser2
      });

      mockAIService.generateDocument.mockResolvedValue({
        title: '서비스 기획 문서',
        content: '# 서비스 전략\n\n서비스 기획자가 작성한 문서입니다.'
      });

      const user2GenerateRequest = new NextRequest('http://localhost:3000/api/ai-pm/documents/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: project.id,
          workflowStep: 2
        })
      });

      const user2GenerateResponse = await GenerateDocumentPOST(user2GenerateRequest);
      expect(user2GenerateResponse.status).toBe(201);
      const user2DocumentData = await user2GenerateResponse.json();

      // Both users request approval
      const user1ApprovalRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents/${user1DocumentData.document.id}/request-approval`, {
        method: 'POST'
      });

      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser1.id, email: mockUser1.email },
        profile: mockUser1
      });

      await RequestApprovalPOST(user1ApprovalRequest, { params: { documentId: user1DocumentData.document.id } });

      const user2ApprovalRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents/${user2DocumentData.document.id}/request-approval`, {
        method: 'POST'
      });

      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser2.id, email: mockUser2.email },
        profile: mockUser2
      });

      await RequestApprovalPOST(user2ApprovalRequest, { params: { documentId: user2DocumentData.document.id } });

      // Admin approves both documents
      mockCheckAuth.mockResolvedValue({
        user: { id: mockAdmin.id, email: mockAdmin.email },
        profile: mockAdmin
      });

      const approve1Request = new NextRequest(`http://localhost:3000/api/ai-pm/documents/${user1DocumentData.document.id}/approve`, {
        method: 'POST'
      });

      const approve1Response = await ApprovePOST(approve1Request, { params: { documentId: user1DocumentData.document.id } });
      expect(approve1Response.status).toBe(200);

      const approve2Request = new NextRequest(`http://localhost:3000/api/ai-pm/documents/${user2DocumentData.document.id}/approve`, {
        method: 'POST'
      });

      const approve2Response = await ApprovePOST(approve2Request, { params: { documentId: user2DocumentData.document.id } });
      expect(approve2Response.status).toBe(200);

      // Verify both documents are official
      const step1DocsRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents?projectId=${project.id}&workflowStep=1`);
      const step1DocsResponse = await DocumentsGET(step1DocsRequest);
      const step1DocsData = await step1DocsResponse.json();
      
      expect(step1DocsData.documents[0].status).toBe('official');
      expect(step1DocsData.documents[0].created_by).toBe(mockUser1.id);

      const step2DocsRequest = new NextRequest(`http://localhost:3000/api/ai-pm/documents?projectId=${project.id}&workflowStep=2`);
      const step2DocsResponse = await DocumentsGET(step2DocsRequest);
      const step2DocsData = await step2DocsResponse.json();
      
      expect(step2DocsData.documents[0].status).toBe('official');
      expect(step2DocsData.documents[0].created_by).toBe(mockUser2.id);
    });
  });

  describe('AI Conversation Context and Document Generation', () => {
    it('should maintain conversation context and generate coherent documents', async () => {
      // Setup project
      const project = {
        id: 'project-ai-context',
        name: 'AI Context Test',
        description: 'Testing AI conversation context',
        created_by: mockAdmin.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockDatabase.projects.set(project.id, project);

      const member = {
        id: 'member-ai-test',
        project_id: project.id,
        user_id: mockUser1.id,
        role: '서비스기획',
        added_by: mockAdmin.id,
        added_at: new Date().toISOString()
      };
      mockDatabase.project_members.set(member.id, member);

      mockCheckAuth.mockResolvedValue({
        user: { id: mockUser1.id, email: mockUser1.email },
        profile: mockUser1
      });
      mockCheckProjectAccess.mockResolvedValue(true);

      // First AI conversation
      mockAIService.generateResponse.mockResolvedValueOnce('네, 웹툰 플랫폼에 대해 알려주세요. 어떤 특징을 가진 플랫폼인가요?');

      const chat1Request = new NextRequest('http://localhost:3000/api/ai-pm/chat', {
        method: 'POST',
        body: JSON.stringify({
          projectId: project.id,
          workflowStep: 1,
          message: '웹툰 플랫폼을 만들고 싶습니다.'
        })
      });

      const chat1Response = await ChatPOST(chat1Request);
      expect(chat1Response.status).toBe(200);

      // Second AI conversation with context
      mockAIService.generateResponse.mockResolvedValueOnce('무료 웹툰과 유료 웹툰을 모두 제공하는 하이브리드 모델이 좋겠네요. 타겟 사용자는 어떻게 설정하시겠어요?');

      const chat2Request = new NextRequest('http://localhost:3000/api/ai-pm/chat', {
        method: 'POST',
        body: JSON.stringify({
          projectId: project.id,
          workflowStep: 1,
          message: '무료와 유료 콘텐츠를 모두 제공하고 싶습니다.'
        })
      });

      const chat2Response = await ChatPOST(chat2Request);
      expect(chat2Response.status).toBe(200);

      // Generate document based on conversation
      mockAIService.generateDocument.mockResolvedValue({
        title: '웹툰 플랫폼 서비스 개요',
        content: `# 웹툰 플랫폼 서비스 개요

## 서비스 목표
- 무료 및 유료 웹툰을 제공하는 하이브리드 플랫폼 구축
- 다양한 장르의 웹툰 콘텐츠 제공
- 사용자 친화적인 독서 환경 제공

## 핵심 특징
- 프리미엄 구독 모델
- 무료 웹툰 광고 기반 수익화
- 작가 지원 프로그램

## 타겟 사용자
- 10-30대 웹툰 독자
- 모바일 우선 사용자
- 다양한 장르 선호 사용자`
      });

      const generateRequest = new NextRequest('http://localhost:3000/api/ai-pm/documents/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: project.id,
          workflowStep: 1
        })
      });

      const generateResponse = await GenerateDocumentPOST(generateRequest);
      expect(generateResponse.status).toBe(201);
      
      const documentData = await generateResponse.json();
      expect(documentData.document.content).toContain('하이브리드 플랫폼');
      expect(documentData.document.content).toContain('무료 및 유료');
      expect(documentData.document.title).toBe('웹툰 플랫폼 서비스 개요');

      // Verify AI service was called with conversation context
      expect(mockAIService.generateDocument).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: '웹툰 플랫폼을 만들고 싶습니다.'
          }),
          expect.objectContaining({
            role: 'user',
            content: '무료와 유료 콘텐츠를 모두 제공하고 싶습니다.'
          })
        ]),
        1,
        expect.stringContaining('AI Context Test')
      );
    });
  });
});