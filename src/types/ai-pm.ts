// AI-PM domain types

export const PROJECT_ROLES = ['content_planning', 'service_planning', 'ux_planning', 'developer'] as const;

export type ProjectRole = (typeof PROJECT_ROLES)[number];
export type DocumentStatus = 'private' | 'pending_approval' | 'official';
export type WorkflowStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// Project types
export interface Project {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly created_by: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface ProjectWithCreator extends Project {
  readonly creator_email: string;
  readonly creator_name: string | null;
  readonly member_count: number;
  readonly official_documents_count: number;
  readonly progress?: readonly ProjectProgress[];
}

export interface ProjectMember {
  readonly id: string;
  readonly project_id: string;
  readonly user_id: string;
  readonly role: ProjectRole;
  readonly added_by: string;
  readonly added_at: string;
}

export interface ProjectMemberWithProfile extends ProjectMember {
  readonly email: string;
  readonly full_name: string | null;
  readonly user_role: 'user' | 'admin';
}

export interface ProjectProgress {
  readonly workflow_step: WorkflowStep;
  readonly step_name: string;
  readonly has_official_document: boolean;
  readonly document_count: number;
  readonly last_updated: string | null;
}

export interface UserProject extends ProjectWithCreator {
  readonly user_role: ProjectRole;
  readonly last_activity: string | null;
}

// Document types
export interface PlanningDocument {
  readonly id: string;
  readonly project_id: string;
  readonly workflow_step: WorkflowStep;
  readonly title: string;
  readonly content: string;
  readonly status: DocumentStatus;
  readonly version: number;
  readonly created_by: string;
  readonly approved_by: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly approved_at: string | null;
}

export interface PlanningDocumentWithUsers extends PlanningDocument {
  readonly creator_email: string;
  readonly creator_name: string | null;
  readonly approver_email: string | null;
  readonly approver_name: string | null;
}

export interface DocumentVersion {
  readonly id: string;
  readonly document_id: string;
  readonly version: number;
  readonly content: string;
  readonly created_by: string;
  readonly created_at: string;
}

export interface ApprovalHistoryEntry {
  readonly id: string;
  readonly document_id: string;
  readonly user_id: string;
  readonly action: 'requested' | 'approved' | 'rejected';
  readonly previous_status: DocumentStatus;
  readonly new_status: DocumentStatus;
  readonly reason?: string;
  readonly created_at: string;
  readonly user_email: string;
  readonly user_name: string | null;
}

// AI Conversation types
export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string | Date;
}

export interface AIConversation {
  id: string;
  project_id: string;
  workflow_step: WorkflowStep;
  user_id: string;
  messages: AIChatMessage[];
  created_at: string;
  updated_at: string;
}

// API Request types
export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

export interface AddMemberRequest {
  user_id: string;
  role: ProjectRole;
}

export interface UpdateMemberRequest {
  role: ProjectRole;
}

export interface CreateDocumentRequest {
  readonly project_id: string;
  readonly workflow_step: WorkflowStep;
  readonly title: string;
  readonly content: string;
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  status?: DocumentStatus;
}

export type RequestApprovalRequest = Record<string, never>;
export type ApproveDocumentRequest = Record<string, never>;

export interface RejectDocumentRequest {
  reason?: string;
}

export interface SendMessageRequest {
  message: string;
  workflow_step: WorkflowStep;
}

// API Response types
export interface ApiResponse<T> {
  readonly data?: T;
  readonly error?: string;
  readonly message?: string;
  readonly details?: unknown;
}

export interface ProjectsResponse {
  projects: ProjectWithCreator[] | UserProject[];
}

export interface ProjectResponse {
  project: ProjectWithCreator;
  members: ProjectMemberWithProfile[];
  progress: ProjectProgress[];
}

export interface MembersResponse {
  members: ProjectMemberWithProfile[];
}

export interface MemberResponse {
  member: ProjectMemberWithProfile;
}

export interface DocumentsResponse {
  readonly documents: PlanningDocumentWithUsers[];
}

export interface DocumentResponse {
  readonly document: PlanningDocumentWithUsers;
  readonly versions?: readonly DocumentVersion[];
}

export interface ApprovalHistoryResponse {
  history: ApprovalHistoryEntry[];
}

export interface PendingApprovalsResponse {
  documents: PendingApprovalDocument[];
}

export interface PendingApprovalDocument {
  document_id: string;
  project_id: string;
  project_name: string;
  workflow_step: WorkflowStep;
  step_name: string;
  title: string;
  creator_name: string | null;
  creator_email: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationResponse {
  conversation: AIConversation;
}

// Error types
export const AIpmErrorType = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  MEMBER_NOT_FOUND: 'MEMBER_NOT_FOUND',
  DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  MEMBER_ALREADY_EXISTS: 'MEMBER_ALREADY_EXISTS',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_PROJECT_ID: 'INVALID_PROJECT_ID',
  INVALID_WORKFLOW_STEP: 'INVALID_WORKFLOW_STEP',
  APPROVAL_REQUIRED: 'APPROVAL_REQUIRED',
  RATE_LIMITED: 'RATE_LIMITED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  REAUTH_REQUIRED: 'REAUTH_REQUIRED',
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
} as const;

export type AIpmErrorType = (typeof AIpmErrorType)[keyof typeof AIpmErrorType];

export interface AIpmError {
  readonly error: AIpmErrorType;
  readonly message: string;
  readonly details?: unknown;
}

// Workflow step labels
export const WORKFLOW_STEPS: Record<WorkflowStep, string> = {
  1: 'Discovery',
  2: 'Research',
  3: 'Requirements',
  4: 'Information architecture',
  5: 'Interaction design',
  6: 'Visual design',
  7: 'Implementation plan',
  8: 'Review',
  9: 'Delivery',
};

export const ROLE_LABELS: Record<ProjectRole, string> = {
  content_planning: 'Content planning',
  service_planning: 'Service planning',
  ux_planning: 'UX planning',
  developer: 'Developer',
};

export const ROLE_DESCRIPTIONS: Record<ProjectRole, string> = {
  content_planning: 'Owns content strategy and planning.',
  service_planning: 'Owns service planning and business logic.',
  ux_planning: 'Owns UX flows and UI planning.',
  developer: 'Owns implementation and engineering delivery.',
};

const PROJECT_ROLE_SET: ReadonlySet<string> = new Set(PROJECT_ROLES);

export const STATUS_DESCRIPTIONS: Record<DocumentStatus, string> = {
  private: 'Draft',
  pending_approval: 'Pending approval',
  official: 'Official',
};

export function isValidProjectRole(role: string): role is ProjectRole {
  return PROJECT_ROLE_SET.has(role);
}

export function canProjectRoleApprove(role: ProjectRole, workflowStep: WorkflowStep): boolean {
  if ([1, 2, 3, 6, 7, 8].includes(workflowStep)) return role === 'service_planning';
  if (workflowStep === 4) return role === 'ux_planning';
  if (workflowStep === 5) return role === 'developer';
  return role === 'content_planning' || role === 'service_planning';
}

export function isValidDocumentStatus(status: string): status is DocumentStatus {
  return status === 'private' || status === 'pending_approval' || status === 'official';
}

export function isValidWorkflowStep(step: number): step is WorkflowStep {
  return Number.isInteger(step) && step >= 1 && step <= 9;
}

export function getWorkflowStepName(step: WorkflowStep): string {
  return WORKFLOW_STEPS[step];
}

export function getRoleDescription(role: ProjectRole): string {
  return ROLE_DESCRIPTIONS[role];
}

export function getStatusDescription(status: DocumentStatus): string {
  return STATUS_DESCRIPTIONS[status];
}
