import { ProjectRole, WorkflowStep } from '@/types/ai-pm';

// Permission levels
export enum PermissionLevel {
  NONE = 0,
  READ = 1,
  WRITE = 2,
  ADMIN = 3
}

// Resource types
export enum ResourceType {
  PROJECT = 'project',
  DOCUMENT = 'document',
  MEMBER = 'member',
  CONVERSATION = 'conversation'
}

// Action types
export enum ActionType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  MANAGE = 'manage'
}

// Permission context
export interface PermissionContext {
  userId: string;
  userRole: 'user' | 'admin';
  projectId?: string;
  projectRole?: ProjectRole;
  isProjectCreator?: boolean;
  resourceOwnerId?: string;
  workflowStep?: WorkflowStep;
}

// Permission result
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  requiredRole?: string;
  requiredPermission?: string;
}

// Role-based permissions matrix
const ROLE_PERMISSIONS: Record<ProjectRole, Record<ResourceType, Record<ActionType, boolean>>> = {
  '콘텐츠기획': {
    [ResourceType.PROJECT]: {
      [ActionType.CREATE]: false,
      [ActionType.READ]: true,
      [ActionType.UPDATE]: false,
      [ActionType.DELETE]: false,
      [ActionType.APPROVE]: false,
      [ActionType.MANAGE]: false,
    },
    [ResourceType.DOCUMENT]: {
      [ActionType.CREATE]: true,
      [ActionType.READ]: true,
      [ActionType.UPDATE]: true, // Own documents only
      [ActionType.DELETE]: true, // Own documents only
      [ActionType.APPROVE]: true, // Content-related documents
      [ActionType.MANAGE]: false,
    },
    [ResourceType.MEMBER]: {
      [ActionType.CREATE]: false,
      [ActionType.READ]: true,
      [ActionType.UPDATE]: false,
      [ActionType.DELETE]: false,
      [ActionType.APPROVE]: false,
      [ActionType.MANAGE]: false,
    },
    [ResourceType.CONVERSATION]: {
      [ActionType.CREATE]: true,
      [ActionType.READ]: true,
      [ActionType.UPDATE]: true, // Own conversations only
      [ActionType.DELETE]: true, // Own conversations only
      [ActionType.APPROVE]: false,
      [ActionType.MANAGE]: false,
    },
  },
  '서비스기획': {
    [ResourceType.PROJECT]: {
      [ActionType.CREATE]: false,
      [ActionType.READ]: true,
      [ActionType.UPDATE]: false,
      [ActionType.DELETE]: false,
      [ActionType.APPROVE]: false,
      [ActionType.MANAGE]: false,
    },
    [ResourceType.DOCUMENT]: {
      [ActionType.CREATE]: true,
      [ActionType.READ]: true,
      [ActionType.UPDATE]: true,
      [ActionType.DELETE]: true,
      [ActionType.APPROVE]: true,
      [ActionType.MANAGE]: false,
    },
    [ResourceType.MEMBER]: {
      [ActionType.CREATE]: false,
      [ActionType.READ]: true,
      [ActionType.UPDATE]: false,
      [ActionType.DELETE]: false,
      [ActionType.APPROVE]: false,
      [ActionType.MANAGE]: false,
    },
    [ResourceType.CONVERSATION]: {
      [ActionType.CREATE]: true,
      [ActionType.READ]: true,
      [ActionType.UPDATE]: true,
      [ActionType.DELETE]: true,
      [ActionType.APPROVE]: false,
      [ActionType.MANAGE]: false,
    },
  },
  'UIUX기획': {
    [ResourceType.PROJECT]: {
      [ActionType.CREATE]: false,
      [ActionType.READ]: true,
      [ActionType.UPDATE]: false,
      [ActionType.DELETE]: false,
      [ActionType.APPROVE]: false,
      [ActionType.MANAGE]: false,
    },
    [ResourceType.DOCUMENT]: {
      [ActionType.CREATE]: true,
      [ActionType.READ]: true,
      [ActionType.UPDATE]: true,
      [ActionType.DELETE]: true,
      [ActionType.APPROVE]: true, // UX-related documents
      [ActionType.MANAGE]: false,
    },
    [ResourceType.MEMBER]: {
      [ActionType.CREATE]: false,
      [ActionType.READ]: true,
      [ActionType.UPDATE]: false,
      [ActionType.DELETE]: false,
      [ActionType.APPROVE]: false,
      [ActionType.MANAGE]: false,
    },
    [ResourceType.CONVERSATION]: {
      [ActionType.CREATE]: true,
      [ActionType.READ]: true,
      [ActionType.UPDATE]: true,
      [ActionType.DELETE]: true,
      [ActionType.APPROVE]: false,
      [ActionType.MANAGE]: false,
    },
  },
  '개발자': {
    [ResourceType.PROJECT]: {
      [ActionType.CREATE]: false,
      [ActionType.READ]: true,
      [ActionType.UPDATE]: false,
      [ActionType.DELETE]: false,
      [ActionType.APPROVE]: false,
      [ActionType.MANAGE]: false,
    },
    [ResourceType.DOCUMENT]: {
      [ActionType.CREATE]: true,
      [ActionType.READ]: true,
      [ActionType.UPDATE]: true,
      [ActionType.DELETE]: true,
      [ActionType.APPROVE]: true, // Technical documents
      [ActionType.MANAGE]: false,
    },
    [ResourceType.MEMBER]: {
      [ActionType.CREATE]: false,
      [ActionType.READ]: true,
      [ActionType.UPDATE]: false,
      [ActionType.DELETE]: false,
      [ActionType.APPROVE]: false,
      [ActionType.MANAGE]: false,
    },
    [ResourceType.CONVERSATION]: {
      [ActionType.CREATE]: true,
      [ActionType.READ]: true,
      [ActionType.UPDATE]: true,
      [ActionType.DELETE]: true,
      [ActionType.APPROVE]: false,
      [ActionType.MANAGE]: false,
    },
  },
};

// Workflow step permissions (which roles can approve which steps)
const WORKFLOW_STEP_APPROVERS: Record<WorkflowStep, ProjectRole[]> = {
  1: ['서비스기획'], // 서비스 개요 및 목표 설정
  2: ['서비스기획', '콘텐츠기획'], // 타겟 사용자 분석
  3: ['서비스기획'], // 핵심 기능 정의
  4: ['UIUX기획'], // 사용자 경험 설계
  5: ['개발자'], // 기술 스택 및 아키텍처
  6: ['서비스기획', '개발자'], // 개발 일정 및 마일스톤
  7: ['서비스기획', '개발자'], // 리스크 분석 및 대응 방안
  8: ['서비스기획'], // 성과 지표 및 측정 방법
  9: ['서비스기획', '콘텐츠기획'], // 런칭 및 마케팅 전략
};

// Main permission checker
export function checkPermission(
  context: PermissionContext,
  resource: ResourceType,
  action: ActionType,
  options: {
    workflowStep?: WorkflowStep;
    isOwner?: boolean;
    documentStatus?: 'private' | 'pending_approval' | 'official';
  } = {}
): PermissionResult {
  const { userId, userRole, projectRole, isProjectCreator, resourceOwnerId } = context;
  const { workflowStep, isOwner, documentStatus } = options;

  // Admin has all permissions
  if (userRole === 'admin') {
    return { allowed: true };
  }

  // Project creator has elevated permissions
  if (isProjectCreator) {
    if (resource === ResourceType.PROJECT && action !== ActionType.DELETE) {
      return { allowed: true };
    }
    if (resource === ResourceType.MEMBER) {
      return { allowed: true };
    }
    if (resource === ResourceType.DOCUMENT && action === ActionType.APPROVE) {
      return { allowed: true };
    }
  }

  // Check if user is project member
  if (!projectRole) {
    return { 
      allowed: false, 
      reason: '프로젝트 멤버가 아닙니다.',
      requiredPermission: 'project_member'
    };
  }

  // Resource ownership check
  if (isOwner === true || (resourceOwnerId && resourceOwnerId === userId)) {
    // Owners can perform most actions on their own resources
    if (action === ActionType.UPDATE || action === ActionType.DELETE) {
      return { allowed: true };
    }
  }

  // Document-specific permissions
  if (resource === ResourceType.DOCUMENT) {
    // Private documents can only be accessed by owner
    if (documentStatus === 'private' && resourceOwnerId !== userId) {
      if (action === ActionType.READ || action === ActionType.UPDATE) {
        return { 
          allowed: false, 
          reason: '개인 문서는 작성자만 접근할 수 있습니다.' 
        };
      }
    }

    // Workflow step approval permissions
    if (action === ActionType.APPROVE && workflowStep) {
      const allowedRoles = WORKFLOW_STEP_APPROVERS[workflowStep];
      if (!allowedRoles.includes(projectRole)) {
        return { 
          allowed: false, 
          reason: `${workflowStep}단계 문서는 ${allowedRoles.join(', ')} 역할만 승인할 수 있습니다.`,
          requiredRole: allowedRoles.join(' 또는 ')
        };
      }
    }
  }

  // Check role-based permissions
  const rolePermissions = ROLE_PERMISSIONS[projectRole];
  if (!rolePermissions || !rolePermissions[resource]) {
    return { 
      allowed: false, 
      reason: '해당 리소스에 대한 권한이 정의되지 않았습니다.' 
    };
  }

  const hasPermission = rolePermissions[resource][action];
  if (!hasPermission) {
    return { 
      allowed: false, 
      reason: `${projectRole} 역할은 ${resource}에 대한 ${action} 권한이 없습니다.`,
      requiredPermission: `${resource}:${action}`
    };
  }

  return { allowed: true };
}

// Convenience functions for common permission checks
export function canCreateProject(userRole: 'user' | 'admin'): boolean {
  return userRole === 'admin';
}

export function canManageMembers(
  userRole: 'user' | 'admin',
  isProjectCreator: boolean = false
): boolean {
  return userRole === 'admin' || isProjectCreator;
}

export function canAccessProject(
  userRole: 'user' | 'admin',
  projectRole?: ProjectRole,
  isProjectCreator: boolean = false
): boolean {
  return userRole === 'admin' || !!projectRole || isProjectCreator;
}

export function canApproveDocument(
  context: PermissionContext,
  workflowStep: WorkflowStep,
  documentStatus: 'private' | 'pending_approval' | 'official'
): PermissionResult {
  if (documentStatus === 'official') {
    return { 
      allowed: false, 
      reason: '이미 승인된 문서입니다.' 
    };
  }

  if (documentStatus === 'private') {
    return { 
      allowed: false, 
      reason: '개인 문서는 승인할 수 없습니다. 먼저 승인 요청을 해주세요.' 
    };
  }

  return checkPermission(
    context,
    ResourceType.DOCUMENT,
    ActionType.APPROVE,
    { workflowStep, documentStatus }
  );
}

export function canEditDocument(
  context: PermissionContext,
  isOwner: boolean,
  documentStatus: 'private' | 'pending_approval' | 'official'
): PermissionResult {
  // Official documents require special permission to edit
  if (documentStatus === 'official' && !isOwner && context.userRole !== 'admin') {
    return { 
      allowed: false, 
      reason: '공식 문서는 작성자나 관리자만 수정할 수 있습니다.' 
    };
  }

  return checkPermission(
    context,
    ResourceType.DOCUMENT,
    ActionType.UPDATE,
    { isOwner, documentStatus }
  );
}

// Get user's effective permissions for a project
export function getUserProjectPermissions(
  userRole: 'user' | 'admin',
  projectRole?: ProjectRole,
  isProjectCreator: boolean = false
): Record<string, boolean> {
  const context: PermissionContext = {
    userId: 'current-user',
    userRole,
    projectRole,
    isProjectCreator,
  };

  return {
    // Project permissions
    canCreateProject: canCreateProject(userRole),
    canReadProject: canAccessProject(userRole, projectRole, isProjectCreator),
    canUpdateProject: checkPermission(context, ResourceType.PROJECT, ActionType.UPDATE).allowed,
    canDeleteProject: checkPermission(context, ResourceType.PROJECT, ActionType.DELETE).allowed,
    
    // Member permissions
    canManageMembers: canManageMembers(userRole, isProjectCreator),
    canViewMembers: checkPermission(context, ResourceType.MEMBER, ActionType.READ).allowed,
    
    // Document permissions
    canCreateDocument: checkPermission(context, ResourceType.DOCUMENT, ActionType.CREATE).allowed,
    canReadDocuments: checkPermission(context, ResourceType.DOCUMENT, ActionType.READ).allowed,
    canApproveDocuments: checkPermission(context, ResourceType.DOCUMENT, ActionType.APPROVE).allowed,
    
    // Conversation permissions
    canCreateConversation: checkPermission(context, ResourceType.CONVERSATION, ActionType.CREATE).allowed,
    canReadConversations: checkPermission(context, ResourceType.CONVERSATION, ActionType.READ).allowed,
  };
}

// Permission error messages
export const PermissionErrors = {
  NOT_PROJECT_MEMBER: '프로젝트 멤버가 아닙니다.',
  INSUFFICIENT_ROLE: '권한이 부족합니다.',
  ADMIN_REQUIRED: '관리자 권한이 필요합니다.',
  OWNER_REQUIRED: '리소스 소유자만 접근할 수 있습니다.',
  DOCUMENT_PRIVATE: '개인 문서는 작성자만 접근할 수 있습니다.',
  DOCUMENT_OFFICIAL: '공식 문서는 특별한 권한이 필요합니다.',
  WORKFLOW_STEP_MISMATCH: '해당 워크플로우 단계에 대한 권한이 없습니다.',
};