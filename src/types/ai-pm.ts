// AI-PM domain types

export const PROJECT_ROLES = ['content_planning', 'service_planning', 'ux_planning', 'developer'] as const;

export type ProjectRole = (typeof PROJECT_ROLES)[number];
export type DocumentStatus = 'private' | 'pending_approval' | 'official';
export type WorkflowStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// Project types
export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithCreator extends Project {
  creator_email: string;
  creator_name: string | null;
  member_count: number;
  official_documents_count: number;
  progress?: ProjectProgress[];
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  added_by: string;
  added_at: string;
}

export interface ProjectMemberWithProfile extends ProjectMember {
  email: string;
  full_name: string | null;
  user_role: 'user' | 'admin';
}

export interface ProjectProgress {
  workflow_step: WorkflowStep;
  step_name: string;
  has_official_document: boolean;
  document_count: number;
  last_updated: string | null;
}

export interface UserProject {
  project_id: string;
  project_name: string;
  project_description: string | null;
  user_role: ProjectRole;
  member_count: number;
  official_documents_count: number;
  last_activity: string | null;
}

// Document types
export interface PlanningDocument {
  id: string;
  project_id: string;
  workflow_step: WorkflowStep;
  title: string;
  content: string;
  status: DocumentStatus;
  version: number;
  created_by: string;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
}

export interface PlanningDocumentWithUsers extends PlanningDocument {
  creator_email: string;
  creator_name: string | null;
  approver_email: string | null;
  approver_name: string | null;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version: number;
  content: string;
  created_by: string;
  created_at: string;
}

export interface ApprovalHistoryEntry {
  id: string;
  document_id: string;
  user_id: string;
  action: 'requested' | 'approved' | 'rejected';
  previous_status: DocumentStatus;
  new_status: DocumentStatus;
  reason?: string;
  created_at: string;
  user_email: string;
  user_name: string | null;
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
  workflow_step: WorkflowStep;
  title: string;
  content: string;
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
  data?: T;
  error?: string;
  message?: string;
  details?: any;
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
  documents: PlanningDocumentWithUsers[];
}

export interface DocumentResponse {
  document: PlanningDocumentWithUsers;
  versions?: DocumentVersion[];
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
export enum AIpmErrorType {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  MEMBER_NOT_FOUND = 'MEMBER_NOT_FOUND',
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  MEMBER_ALREADY_EXISTS = 'MEMBER_ALREADY_EXISTS',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  INVALID_PROJECT_ID = 'INVALID_PROJECT_ID',
  INVALID_WORKFLOW_STEP = 'INVALID_WORKFLOW_STEP',
  APPROVAL_REQUIRED = 'APPROVAL_REQUIRED',
  RATE_LIMITED = 'RATE_LIMITED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  REAUTH_REQUIRED = 'REAUTH_REQUIRED',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
}

export interface AIpmError {
  error: AIpmErrorType;
  message: string;
  details?: any;
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

export const STATUS_DESCRIPTIONS: Record<DocumentStatus, string> = {
  private: 'Draft',
  pending_approval: 'Pending approval',
  official: 'Official',
};

export function isValidProjectRole(role: string): role is ProjectRole {
  return (PROJECT_ROLES as readonly string[]).includes(role);
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
