/**
 * AI PM Feature Integration Tests
 * 
 * 이 테스트는 AI PM 기능의 전체 워크플로우를 통합적으로 테스트합니다.
 * - 워크플로우 전체 흐름 테스트
 * - 권한 시스템 통합 테스트  
 * - 문서 승인 프로세스 테스트
 * - AI 대화 및 문서 생성 통합 테스트
 */

import { createClient } from '@supabase/supabase-js';
import { getAIService } from '@/lib/ai-pm/ai-service';
import { checkAuth, checkProjectAccess } from '@/lib/ai-pm/auth-middleware';
import { AIpmErrorType, WorkflowStep, DocumentStatus, ProjectRole } from '@/types/ai-pm';

// Mock 데이터베이스 상태
interface MockDatabase {
  projects: Map<string, any>;
  project_members: Map<string, any>;
  planning_documents: Map<string, any>;
  document_versions: Map<string, any>;
  ai_conversations: Map<string, any>;
  user_profiles: Map<string, any>;
  approval_history: Map<string, any>;
}

let mockDatabase: MockDatabase = {
  projects: new Map(),
  project_members: new Map(),
  planning_documents: new Map(),
  document_versions: new Map(),
  ai_conversations: new Map(),
  user_profiles: new Map(),
  approval_history: new Map(),
};

// 테스트 사용자들
const testUsers = {
  admin: {
    id: 'admin-123',
    email: 'admin@test.com',
    full_name: 'Admin User',
    role: 'admin'
  },
  contentPlanner: {
    id: 'user-content',
    email: 'content@test.com',
    full_name: 'Content Planner',
    role: 'user'
  },
  servicePlanner: {
    id: 'user-service',
    email: 'service@test.com',
    full_name: 'Service Planner',
    role: 'user'
  },
  uiuxDesigner: {
    id: 'user-uiux',
    email: 'uiux@test.com',
    full_name: 'UIUX Designer',
    role: 'user'
  },
  developer: {
    id: 'user-dev',
    email: 'dev@test.com',
    full_name: 'Developer',
    role: 'user'
  }
};

// Mock 서비스 클래스
class MockAIPMService {
  private currentUser: any = null;
  private database: MockDatabase;

  constructor(database: MockDatabase) {
    this.database = database;
  }

  setCurrentUser(user: any) {
    this.currentUser = user;
  }

  // 프로젝트 관리
  async createProject(name: string, description?: string) {
    if (!this.currentUser || this.currentUser.role !== 'admin') {
      throw { error: AIpmErrorType.FORBIDDEN, message: '관리자만 프로젝트를 생성할 수 있습니다.' };
    }

    const project = {
      id: `project-${Date.now()}`,
      name,
      description: description || null,
      created_by: this.currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.database.projects.set(project.id, project);
    return project;
  }

  async addProjectMember(projectId: string, userId: string, role: ProjectRole) {
    if (!this.currentUser || this.currentUser.role !== 'admin') {
      throw { error: AIpmErrorType.FORBIDDEN, message: '관리자만 멤버를 추가할 수 있습니다.' };
    }

    const project = this.database.projects.get(projectId);
    if (!project) {
      throw { error: AIpmErrorType.PROJECT_NOT_FOUND, message: '프로젝트를 찾을 수 없습니다.' };
    }

    const member = {
      id: `member-${Date.now()}`,
      project_id: projectId,
      user_id: userId,
      role,
      added_by: this.currentUser.id,
      added_at: new Date().toISOString()
    };

    this.database.project_members.set(member.id, member);
    return member;
  }

  async checkProjectAccess(projectId: string): Promise<boolean> {
    if (!this.currentUser) return false;
    if (this.currentUser.role === 'admin') return true;

    const members = Array.from(this.database.project_members.values());
    return members.some(member => 
      member.project_id === projectId && member.user_id === this.currentUser.id
    );
  }

  // 문서 관리
  async createDocument(projectId: string, workflowStep: WorkflowStep, title: string, content: string) {
    if (!this.currentUser) {
      throw { error: AIpmErrorType.UNAUTHORIZED, message: '인증이 필요합니다.' };
    }

    if (!await this.checkProjectAccess(projectId)) {
      throw { error: AIpmErrorType.FORBIDDEN, message: '프로젝트 접근 권한이 없습니다.' };
    }

    const document = {
      id: `doc-${Date.now()}`,
      project_id: projectId,
      workflow_step: workflowStep,
      title,
      content,
      status: 'private' as DocumentStatus,
      version: 1,
      created_by: this.currentUser.id,
      approved_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      approved_at: null
    };

    this.database.planning_documents.set(document.id, document);
    return document;
  }

  async updateDocument(documentId: string, updates: { title?: string; content?: string }) {
    const document = this.database.planning_documents.get(documentId);
    if (!document) {
      throw { error: AIpmErrorType.DOCUMENT_NOT_FOUND, message: '문서를 찾을 수 없습니다.' };
    }

    if (!this.currentUser || document.created_by !== this.currentUser.id) {
      throw { error: AIpmErrorType.FORBIDDEN, message: '문서 수정 권한이 없습니다.' };
    }

    // 버전 히스토리 저장
    const version = {
      id: `version-${Date.now()}-${Math.random()}`,
      document_id: documentId,
      version: document.version,
      content: document.content,
      created_by: document.created_by,
      created_at: document.updated_at
    };
    this.database.document_versions.set(version.id, version);

    // 문서 업데이트
    const updatedDocument = {
      ...document,
      ...updates,
      version: document.version + 1,
      updated_at: new Date().toISOString()
    };

    this.database.planning_documents.set(documentId, updatedDocument);
    return updatedDocument;
  }

  async requestApproval(documentId: string) {
    const document = this.database.planning_documents.get(documentId);
    if (!document) {
      throw { error: AIpmErrorType.DOCUMENT_NOT_FOUND, message: '문서를 찾을 수 없습니다.' };
    }

    if (!this.currentUser || document.created_by !== this.currentUser.id) {
      throw { error: AIpmErrorType.FORBIDDEN, message: '승인 요청 권한이 없습니다.' };
    }

    if (document.status !== 'private') {
      throw { error: 'VALIDATION_ERROR', message: '개인 문서만 승인 요청할 수 있습니다.' };
    }

    // 문서 상태 변경
    const updatedDocument = {
      ...document,
      status: 'pending_approval' as DocumentStatus,
      updated_at: new Date().toISOString()
    };
    this.database.planning_documents.set(documentId, updatedDocument);

    // 승인 히스토리 추가
    const historyEntry = {
      id: `history-${Date.now()}-req`,
      document_id: documentId,
      user_id: this.currentUser.id,
      action: 'requested',
      previous_status: 'private',
      new_status: 'pending_approval',
      created_at: new Date().toISOString()
    };
    this.database.approval_history.set(historyEntry.id, historyEntry);

    return updatedDocument;
  }

  async approveDocument(documentId: string) {
    if (!this.currentUser || this.currentUser.role !== 'admin') {
      throw { error: AIpmErrorType.FORBIDDEN, message: '관리자만 문서를 승인할 수 있습니다.' };
    }

    const document = this.database.planning_documents.get(documentId);
    if (!document) {
      throw { error: AIpmErrorType.DOCUMENT_NOT_FOUND, message: '문서를 찾을 수 없습니다.' };
    }

    if (document.status !== 'pending_approval') {
      throw { error: 'VALIDATION_ERROR', message: '승인 대기 중인 문서만 승인할 수 있습니다.' };
    }

    // 문서 상태 변경
    const updatedDocument = {
      ...document,
      status: 'official' as DocumentStatus,
      approved_by: this.currentUser.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.database.planning_documents.set(documentId, updatedDocument);

    // 승인 히스토리 추가
    const historyEntry = {
      id: `history-${Date.now()}-app`,
      document_id: documentId,
      user_id: this.currentUser.id,
      action: 'approved',
      previous_status: 'pending_approval',
      new_status: 'official',
      created_at: new Date().toISOString()
    };
    this.database.approval_history.set(historyEntry.id, historyEntry);

    return updatedDocument;
  }

  async getDocuments(projectId: string, workflowStep?: WorkflowStep) {
    if (!await this.checkProjectAccess(projectId)) {
      throw { error: AIpmErrorType.FORBIDDEN, message: '프로젝트 접근 권한이 없습니다.' };
    }

    const documents = Array.from(this.database.planning_documents.values())
      .filter(doc => {
        if (doc.project_id !== projectId) return false;
        if (workflowStep && doc.workflow_step !== workflowStep) return false;
        
        // 개인 문서는 작성자만 볼 수 있음
        if (doc.status === 'private' && doc.created_by !== this.currentUser?.id) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return documents;
  }

  async getPendingApprovals() {
    if (!this.currentUser || this.currentUser.role !== 'admin') {
      throw { error: AIpmErrorType.FORBIDDEN, message: '관리자만 승인 대기 목록을 볼 수 있습니다.' };
    }

    const documents = Array.from(this.database.planning_documents.values())
      .filter(doc => doc.status === 'pending_approval')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return documents;
  }

  // AI 대화 및 문서 생성
  async sendMessage(projectId: string, workflowStep: WorkflowStep, message: string) {
    if (!await this.checkProjectAccess(projectId)) {
      throw { error: AIpmErrorType.FORBIDDEN, message: '프로젝트 접근 권한이 없습니다.' };
    }

    // 기존 대화 찾기 또는 새로 생성
    let conversation = Array.from(this.database.ai_conversations.values())
      .find(conv => 
        conv.project_id === projectId && 
        conv.workflow_step === workflowStep && 
        conv.user_id === this.currentUser.id
      );

    if (!conversation) {
      conversation = {
        id: `conv-${Date.now()}`,
        project_id: projectId,
        workflow_step: workflowStep,
        user_id: this.currentUser.id,
        messages: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    // 사용자 메시지 추가
    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    conversation.messages.push(userMessage);

    // AI 응답 생성 (모킹)
    const aiResponse = this.generateAIResponse(message, workflowStep);
    const assistantMessage = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    };
    conversation.messages.push(assistantMessage);

    conversation.updated_at = new Date().toISOString();
    this.database.ai_conversations.set(conversation.id, conversation);

    return aiResponse;
  }

  async generateDocument(projectId: string, workflowStep: WorkflowStep) {
    if (!await this.checkProjectAccess(projectId)) {
      throw { error: AIpmErrorType.FORBIDDEN, message: '프로젝트 접근 권한이 없습니다.' };
    }

    // 대화 히스토리 가져오기
    const conversation = Array.from(this.database.ai_conversations.values())
      .find(conv => 
        conv.project_id === projectId && 
        conv.workflow_step === workflowStep && 
        conv.user_id === this.currentUser.id
      );

    const project = this.database.projects.get(projectId);
    const { title, content } = this.generateDocumentContent(workflowStep, conversation, project);

    return await this.createDocument(projectId, workflowStep, title, content);
  }

  private generateAIResponse(message: string, workflowStep: WorkflowStep): string {
    const responses = {
      1: '서비스 개요에 대해 도움을 드리겠습니다. 어떤 종류의 서비스를 기획하고 계신가요?',
      2: '타겟 사용자 분석을 도와드리겠습니다. 주요 사용자층은 누구인가요?',
      3: '핵심 기능 정의를 함께 해보겠습니다. 가장 중요한 기능은 무엇인가요?',
      4: '사용자 경험 설계에 대해 논의해보겠습니다. 사용자 여정은 어떻게 구성하시겠어요?',
      5: '기술 스택 선정을 도와드리겠습니다. 어떤 기술을 고려하고 계신가요?',
      6: '개발 일정 계획을 세워보겠습니다. 예상 개발 기간은 얼마나 되나요?',
      7: '리스크 분석을 함께 해보겠습니다. 예상되는 위험 요소는 무엇인가요?',
      8: '성과 지표 설정을 도와드리겠습니다. 어떤 지표로 성공을 측정하시겠어요?',
      9: '런칭 전략을 논의해보겠습니다. 어떤 방식으로 출시하실 계획인가요?'
    };

    return responses[workflowStep] || 'AI가 도움을 드리겠습니다.';
  }

  private generateDocumentContent(workflowStep: WorkflowStep, conversation: any, project: any) {
    const stepNames = {
      1: '서비스 개요 및 목표 설정',
      2: '타겟 사용자 분석',
      3: '핵심 기능 정의',
      4: '사용자 경험 설계',
      5: '기술 스택 및 아키텍처',
      6: '개발 일정 및 마일스톤',
      7: '리스크 분석 및 대응 방안',
      8: '성과 지표 및 측정 방법',
      9: '런칭 및 마케팅 전략'
    };

    const title = stepNames[workflowStep];
    const content = `# ${title}

## 프로젝트: ${project?.name || '프로젝트'}

${conversation ? '## 대화 요약\n' + conversation.messages
  .filter((msg: any) => msg.role === 'user')
  .map((msg: any) => `- ${msg.content}`)
  .join('\n') + '\n' : ''}

## 주요 내용

이 문서는 ${title}에 대한 내용을 담고 있습니다.

### 세부 사항

- 항목 1: 상세 내용
- 항목 2: 상세 내용
- 항목 3: 상세 내용

## 결론

${title} 단계가 완료되었습니다.`;

    return { title, content };
  }
}

describe('AI PM Feature Integration Tests', () => {
  let service: MockAIPMService;

  beforeEach(() => {
    // 데이터베이스 초기화
    mockDatabase = {
      projects: new Map(),
      project_members: new Map(),
      planning_documents: new Map(),
      document_versions: new Map(),
      ai_conversations: new Map(),
      user_profiles: new Map(),
      approval_history: new Map(),
    };

    // 사용자 프로필 설정
    Object.values(testUsers).forEach(user => {
      mockDatabase.user_profiles.set(user.id, user);
    });

    service = new MockAIPMService(mockDatabase);
  });

  describe('완전한 워크플로우 테스트', () => {
    it('프로젝트 생성부터 문서 승인까지 전체 플로우가 정상 작동해야 함', async () => {
      // 1. 관리자가 프로젝트 생성
      service.setCurrentUser(testUsers.admin);
      const project = await service.createProject('전자책 플랫폼', '디지털 도서 플랫폼 개발');
      
      expect(project.name).toBe('전자책 플랫폼');
      expect(project.created_by).toBe(testUsers.admin.id);

      // 2. 프로젝트에 멤버 추가
      const member = await service.addProjectMember(project.id, testUsers.contentPlanner.id, '콘텐츠기획');
      expect(member.role).toBe('콘텐츠기획');

      // 3. 멤버가 AI와 대화
      service.setCurrentUser(testUsers.contentPlanner);
      const aiResponse = await service.sendMessage(
        project.id, 
        1, 
        '전자책 플랫폼의 서비스 개요를 작성하고 싶습니다.'
      );
      
      expect(aiResponse).toContain('서비스 개요');

      // 4. AI 대화를 바탕으로 문서 생성
      const document = await service.generateDocument(project.id, 1);
      expect(document.title).toBe('서비스 개요 및 목표 설정');
      expect(document.status).toBe('private');
      expect(document.workflow_step).toBe(1);

      // 5. 문서 수정
      const updatedDocument = await service.updateDocument(document.id, {
        content: document.content + '\n\n## 추가 목표\n- 모바일 최적화'
      });
      expect(updatedDocument.version).toBe(2);

      // 6. 승인 요청
      const pendingDocument = await service.requestApproval(document.id);
      expect(pendingDocument.status).toBe('pending_approval');

      // 7. 관리자가 승인
      service.setCurrentUser(testUsers.admin);
      const approvedDocument = await service.approveDocument(document.id);
      expect(approvedDocument.status).toBe('official');
      expect(approvedDocument.approved_by).toBe(testUsers.admin.id);

      // 8. 승인된 문서를 다른 멤버도 볼 수 있는지 확인
      service.setCurrentUser(testUsers.admin);
      await service.addProjectMember(project.id, testUsers.servicePlanner.id, '서비스기획');
      
      service.setCurrentUser(testUsers.servicePlanner);
      const documents = await service.getDocuments(project.id, 1);
      expect(documents).toHaveLength(1);
      expect(documents[0].status).toBe('official');
    });

    it('여러 워크플로우 단계에서 병렬 작업이 가능해야 함', async () => {
      // 프로젝트 및 멤버 설정
      service.setCurrentUser(testUsers.admin);
      const project = await service.createProject('병렬 작업 테스트');
      
      await service.addProjectMember(project.id, testUsers.contentPlanner.id, '콘텐츠기획');
      await service.addProjectMember(project.id, testUsers.servicePlanner.id, '서비스기획');
      await service.addProjectMember(project.id, testUsers.uiuxDesigner.id, 'UIUX기획');

      // 각 멤버가 다른 단계에서 동시 작업
      const documents = [];

      // 콘텐츠 기획자 - 1단계
      service.setCurrentUser(testUsers.contentPlanner);
      documents.push(await service.generateDocument(project.id, 1));

      // 서비스 기획자 - 2단계  
      service.setCurrentUser(testUsers.servicePlanner);
      documents.push(await service.generateDocument(project.id, 2));

      // UIUX 기획자 - 4단계
      service.setCurrentUser(testUsers.uiuxDesigner);
      documents.push(await service.generateDocument(project.id, 4));

      // 모든 문서가 생성되었는지 확인
      expect(documents).toHaveLength(3);
      expect(documents[0].workflow_step).toBe(1);
      expect(documents[1].workflow_step).toBe(2);
      expect(documents[2].workflow_step).toBe(4);

      // 각 문서의 작성자가 올바른지 확인
      expect(documents[0].created_by).toBe(testUsers.contentPlanner.id);
      expect(documents[1].created_by).toBe(testUsers.servicePlanner.id);
      expect(documents[2].created_by).toBe(testUsers.uiuxDesigner.id);
    });
  });

  describe('권한 시스템 테스트', () => {
    let project: any;

    beforeEach(async () => {
      service.setCurrentUser(testUsers.admin);
      project = await service.createProject('권한 테스트 프로젝트');
      await service.addProjectMember(project.id, testUsers.contentPlanner.id, '콘텐츠기획');
    });

    it('프로젝트 멤버만 프로젝트에 접근할 수 있어야 함', async () => {
      // 멤버는 접근 가능
      service.setCurrentUser(testUsers.contentPlanner);
      expect(await service.checkProjectAccess(project.id)).toBe(true);

      // 비멤버는 접근 불가
      service.setCurrentUser(testUsers.servicePlanner);
      expect(await service.checkProjectAccess(project.id)).toBe(false);

      // 관리자는 모든 프로젝트 접근 가능
      service.setCurrentUser(testUsers.admin);
      expect(await service.checkProjectAccess(project.id)).toBe(true);
    });

    it('개인 문서는 작성자만 볼 수 있어야 함', async () => {
      // 사용자2를 프로젝트에 추가
      service.setCurrentUser(testUsers.admin);
      await service.addProjectMember(project.id, testUsers.servicePlanner.id, '서비스기획');

      // 사용자1이 문서 작성
      service.setCurrentUser(testUsers.contentPlanner);
      const document = await service.createDocument(project.id, 1, '개인 문서', '개인 내용');

      // 사용자1은 자신의 문서를 볼 수 있음
      const user1Documents = await service.getDocuments(project.id, 1);
      expect(user1Documents).toHaveLength(1);

      // 사용자2는 다른 사용자의 개인 문서를 볼 수 없음
      service.setCurrentUser(testUsers.servicePlanner);
      const user2Documents = await service.getDocuments(project.id, 1);
      expect(user2Documents).toHaveLength(0);
    });

    it('공식 문서는 모든 프로젝트 멤버가 볼 수 있어야 함', async () => {
      // 문서 생성 및 승인
      service.setCurrentUser(testUsers.contentPlanner);
      const document = await service.createDocument(project.id, 1, '공식 문서', '공식 내용');
      await service.requestApproval(document.id);

      service.setCurrentUser(testUsers.admin);
      await service.approveDocument(document.id);

      // 다른 멤버 추가
      await service.addProjectMember(project.id, testUsers.servicePlanner.id, '서비스기획');

      // 모든 멤버가 공식 문서를 볼 수 있음
      service.setCurrentUser(testUsers.servicePlanner);
      const documents = await service.getDocuments(project.id, 1);
      expect(documents).toHaveLength(1);
      expect(documents[0].status).toBe('official');
    });

    it('관리자만 문서를 승인할 수 있어야 함', async () => {
      service.setCurrentUser(testUsers.contentPlanner);
      const document = await service.createDocument(project.id, 1, '테스트 문서', '테스트 내용');
      await service.requestApproval(document.id);

      // 일반 사용자는 승인 불가
      try {
        await service.approveDocument(document.id);
        fail('일반 사용자가 문서를 승인할 수 없어야 함');
      } catch (error: any) {
        expect(error.error).toBe(AIpmErrorType.FORBIDDEN);
      }

      // 관리자는 승인 가능
      service.setCurrentUser(testUsers.admin);
      const approvedDocument = await service.approveDocument(document.id);
      expect(approvedDocument.status).toBe('official');
    });
  });

  describe('문서 승인 프로세스 테스트', () => {
    let project: any;

    beforeEach(async () => {
      service.setCurrentUser(testUsers.admin);
      project = await service.createProject('승인 테스트 프로젝트');
      await service.addProjectMember(project.id, testUsers.contentPlanner.id, '콘텐츠기획');
    });

    it('문서 상태가 올바르게 전환되어야 함', async () => {
      service.setCurrentUser(testUsers.contentPlanner);
      
      // 1. 개인 문서 생성
      const document = await service.createDocument(project.id, 1, '상태 테스트', '내용');
      expect(document.status).toBe('private');

      // 2. 승인 요청
      const pendingDocument = await service.requestApproval(document.id);
      expect(pendingDocument.status).toBe('pending_approval');

      // 3. 관리자 승인
      service.setCurrentUser(testUsers.admin);
      const approvedDocument = await service.approveDocument(document.id);
      expect(approvedDocument.status).toBe('official');
      expect(approvedDocument.approved_by).toBe(testUsers.admin.id);
      expect(approvedDocument.approved_at).toBeTruthy();
    });

    it('승인 히스토리가 올바르게 기록되어야 함', async () => {
      service.setCurrentUser(testUsers.contentPlanner);
      const document = await service.createDocument(project.id, 1, '히스토리 테스트', '내용');
      
      await service.requestApproval(document.id);
      
      service.setCurrentUser(testUsers.admin);
      await service.approveDocument(document.id);

      // 승인 히스토리 확인
      const history = Array.from(mockDatabase.approval_history.values())
        .filter(entry => entry.document_id === document.id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      expect(history).toHaveLength(2);
      
      // 승인 요청 기록
      expect(history[0].action).toBe('requested');
      expect(history[0].user_id).toBe(testUsers.contentPlanner.id);
      expect(history[0].previous_status).toBe('private');
      expect(history[0].new_status).toBe('pending_approval');

      // 승인 기록
      expect(history[1].action).toBe('approved');
      expect(history[1].user_id).toBe(testUsers.admin.id);
      expect(history[1].previous_status).toBe('pending_approval');
      expect(history[1].new_status).toBe('official');
    });

    it('문서 버전 관리가 올바르게 작동해야 함', async () => {
      service.setCurrentUser(testUsers.contentPlanner);
      const document = await service.createDocument(project.id, 1, '버전 테스트', '초기 내용');
      
      // 여러 번 수정
      await service.updateDocument(document.id, { content: '수정된 내용 1' });
      await service.updateDocument(document.id, { content: '수정된 내용 2' });
      const finalDocument = await service.updateDocument(document.id, { content: '최종 내용' });

      expect(finalDocument.version).toBe(4);

      // 버전 히스토리 확인
      const versions = Array.from(mockDatabase.document_versions.values())
        .filter(version => version.document_id === document.id)
        .sort((a, b) => a.version - b.version);

      expect(versions).toHaveLength(3); // 초기 버전 제외하고 3개의 이전 버전
      expect(versions[0].content).toBe('초기 내용');
      expect(versions[1].content).toBe('수정된 내용 1');
      expect(versions[2].content).toBe('수정된 내용 2');
    });

    it('승인 대기 목록을 올바르게 관리해야 함', async () => {
      // 여러 문서 생성 및 승인 요청
      service.setCurrentUser(testUsers.contentPlanner);
      const doc1 = await service.createDocument(project.id, 1, '문서 1', '내용 1');
      const doc2 = await service.createDocument(project.id, 2, '문서 2', '내용 2');
      const doc3 = await service.createDocument(project.id, 3, '문서 3', '내용 3');

      await service.requestApproval(doc1.id);
      await service.requestApproval(doc2.id);
      await service.requestApproval(doc3.id);

      // 관리자가 승인 대기 목록 확인
      service.setCurrentUser(testUsers.admin);
      const pendingDocs = await service.getPendingApprovals();
      expect(pendingDocs).toHaveLength(3);

      // 하나 승인 후 목록 확인
      await service.approveDocument(doc1.id);
      const remainingPendingDocs = await service.getPendingApprovals();
      expect(remainingPendingDocs).toHaveLength(2);
    });
  });

  describe('AI 대화 및 문서 생성 테스트', () => {
    let project: any;

    beforeEach(async () => {
      service.setCurrentUser(testUsers.admin);
      project = await service.createProject('AI 테스트 프로젝트');
      await service.addProjectMember(project.id, testUsers.contentPlanner.id, '콘텐츠기획');
    });

    it('AI 대화가 올바르게 저장되고 관리되어야 함', async () => {
      service.setCurrentUser(testUsers.contentPlanner);

      // 여러 메시지 전송
      await service.sendMessage(project.id, 1, '웹툰 플랫폼을 만들고 싶습니다.');
      await service.sendMessage(project.id, 1, '무료와 유료 콘텐츠를 모두 제공하고 싶습니다.');
      await service.sendMessage(project.id, 1, '모바일 우선으로 개발하려고 합니다.');

      // 대화 히스토리 확인
      const conversation = Array.from(mockDatabase.ai_conversations.values())
        .find(conv => 
          conv.project_id === project.id && 
          conv.workflow_step === 1 && 
          conv.user_id === testUsers.contentPlanner.id
        );

      expect(conversation).toBeTruthy();
      expect(conversation.messages).toHaveLength(6); // 3개 사용자 메시지 + 3개 AI 응답

      // 사용자 메시지 확인
      const userMessages = conversation.messages.filter((msg: any) => msg.role === 'user');
      expect(userMessages).toHaveLength(3);
      expect(userMessages[0].content).toContain('웹툰 플랫폼');
      expect(userMessages[1].content).toContain('무료와 유료');
      expect(userMessages[2].content).toContain('모바일 우선');
    });

    it('대화 컨텍스트를 바탕으로 문서가 생성되어야 함', async () => {
      service.setCurrentUser(testUsers.contentPlanner);

      // AI와 대화
      await service.sendMessage(project.id, 1, '웹툰 플랫폼을 개발하려고 합니다.');
      await service.sendMessage(project.id, 1, '주요 타겟은 10-30대입니다.');

      // 대화를 바탕으로 문서 생성
      const document = await service.generateDocument(project.id, 1);

      expect(document.title).toBe('서비스 개요 및 목표 설정');
      expect(document.content).toContain('웹툰 플랫폼');
      expect(document.content).toContain('10-30대');
      expect(document.content).toContain('대화 요약');
    });

    it('각 워크플로우 단계별로 적절한 AI 응답이 생성되어야 함', async () => {
      service.setCurrentUser(testUsers.contentPlanner);

      const responses = [];
      for (let step = 1; step <= 9; step++) {
        const response = await service.sendMessage(project.id, step as WorkflowStep, `${step}단계 도움이 필요합니다.`);
        responses.push(response);
      }

      // 각 단계별로 다른 응답이 생성되는지 확인
      expect(responses[0]).toContain('서비스 개요');
      expect(responses[1]).toContain('타겟 사용자');
      expect(responses[2]).toContain('핵심 기능');
      expect(responses[3]).toContain('사용자 경험');
      expect(responses[4]).toContain('기술 스택');
      expect(responses[5]).toContain('개발 일정');
      expect(responses[6]).toContain('리스크');
      expect(responses[7]).toContain('성과 지표');
      expect(responses[8]).toContain('런칭');
    });

    it('여러 사용자의 대화가 독립적으로 관리되어야 함', async () => {
      // 두 번째 멤버 추가
      service.setCurrentUser(testUsers.admin);
      await service.addProjectMember(project.id, testUsers.servicePlanner.id, '서비스기획');

      // 각 사용자가 같은 단계에서 대화
      service.setCurrentUser(testUsers.contentPlanner);
      await service.sendMessage(project.id, 1, '콘텐츠 기획자의 메시지');

      service.setCurrentUser(testUsers.servicePlanner);
      await service.sendMessage(project.id, 1, '서비스 기획자의 메시지');

      // 각 사용자의 대화가 독립적으로 저장되는지 확인
      const conversations = Array.from(mockDatabase.ai_conversations.values())
        .filter(conv => conv.project_id === project.id && conv.workflow_step === 1);

      expect(conversations).toHaveLength(2);
      
      const contentPlannerConv = conversations.find(conv => conv.user_id === testUsers.contentPlanner.id);
      const servicePlannerConv = conversations.find(conv => conv.user_id === testUsers.servicePlanner.id);

      expect(contentPlannerConv?.messages.some((msg: any) => msg.content.includes('콘텐츠 기획자'))).toBe(true);
      expect(servicePlannerConv?.messages.some((msg: any) => msg.content.includes('서비스 기획자'))).toBe(true);
    });
  });

  describe('에러 처리 및 예외 상황 테스트', () => {
    it('인증되지 않은 사용자의 요청을 거부해야 함', async () => {
      service.setCurrentUser(null);

      try {
        await service.createProject('무권한 프로젝트');
        fail('인증되지 않은 사용자가 프로젝트를 생성할 수 없어야 함');
      } catch (error: any) {
        expect(error.error).toBe(AIpmErrorType.FORBIDDEN);
      }
    });

    it('존재하지 않는 리소스에 대한 요청을 처리해야 함', async () => {
      service.setCurrentUser(testUsers.admin);

      try {
        await service.updateDocument('non-existent-doc', { title: '새 제목' });
        fail('존재하지 않는 문서를 수정할 수 없어야 함');
      } catch (error: any) {
        expect(error.error).toBe(AIpmErrorType.DOCUMENT_NOT_FOUND);
      }
    });

    it('잘못된 상태 전환을 방지해야 함', async () => {
      service.setCurrentUser(testUsers.admin);
      const project = await service.createProject('상태 테스트');
      await service.addProjectMember(project.id, testUsers.contentPlanner.id, '콘텐츠기획');

      service.setCurrentUser(testUsers.contentPlanner);
      const document = await service.createDocument(project.id, 1, '테스트', '내용');

      // 이미 승인 요청된 문서에 다시 승인 요청
      await service.requestApproval(document.id);
      
      try {
        await service.requestApproval(document.id);
        fail('이미 승인 요청된 문서에 다시 승인 요청할 수 없어야 함');
      } catch (error: any) {
        expect(error.error).toBe('VALIDATION_ERROR');
      }
    });
  });
});