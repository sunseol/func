import { createClient } from '@/lib/supabase/server';
import { ApiError } from '@/lib/http';
import { AIpmErrorType, canProjectRoleApprove, isValidProjectRole, type DocumentStatus, type WorkflowStep } from '@/types/ai-pm';
import type { SupabaseClient } from '@supabase/supabase-js';

export type AiPmSupabase = SupabaseClient;

export interface AuthContext {
  readonly user: {
    readonly id: string;
    readonly email?: string | null;
  };
  readonly profile: {
    readonly id: string;
    readonly email: string;
    readonly full_name: string | null;
    readonly role: 'user' | 'admin';
    readonly created_at: string;
    readonly updated_at: string;
  };
}

type Profile = AuthContext['profile'];

function isProfile(value: unknown): value is Profile {
  if (typeof value !== 'object' || value === null) return false;
  if (!('id' in value) || !('email' in value) || !('role' in value)) return false;
  return typeof value.id === 'string' && typeof value.email === 'string' &&
    (value.role === 'user' || value.role === 'admin');
}

export function isSupabaseNoRows(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'PGRST116';
}

export async function getSupabase(): Promise<AiPmSupabase> {
  return createClient();
}

export async function requireAuth(
  supabase: AiPmSupabase,
  options?: Readonly<{ requireAdmin?: boolean }>,
): Promise<AuthContext> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    throw new ApiError(401, AIpmErrorType.UNAUTHORIZED, 'Authentication required');
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError && !isSupabaseNoRows(profileError)) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to load user profile', profileError);
  }
  if (!isProfile(profile)) {
    throw new ApiError(401, AIpmErrorType.UNAUTHORIZED, 'User profile not found');
  }

  if (options?.requireAdmin && profile.role !== 'admin') {
    throw new ApiError(403, AIpmErrorType.FORBIDDEN, 'Admin role required');
  }

  return {
    user: { id: authData.user.id, email: authData.user.email },
    profile,
  } satisfies AuthContext;
}

export async function requireProjectAccess(
  supabase: AiPmSupabase,
  auth: AuthContext,
  projectId: string,
): Promise<void> {
  if (auth.profile.role === 'admin') {
    return;
  }

  const { data: member, error } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to check project access', error);
  }
  if (!member) {
    throw new ApiError(403, AIpmErrorType.FORBIDDEN, 'Project access denied');
  }
}

export async function requireProjectManagement(
  supabase: AiPmSupabase,
  auth: AuthContext,
  projectId: string,
): Promise<void> {
  if (auth.profile.role === 'admin') {
    return;
  }

  const { data: project, error } = await supabase
    .from('projects')
    .select('created_by')
    .eq('id', projectId)
    .single();

  if (error && !isSupabaseNoRows(error)) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to check project management access', error);
  }
  if (!project || project.created_by !== auth.user.id) {
    throw new ApiError(403, AIpmErrorType.FORBIDDEN, 'Project management access denied');
  }
}

type DocumentAccess = {
  readonly document: {
    readonly id: string;
    readonly created_by: string;
    readonly project_id: string;
    readonly status: DocumentStatus;
    readonly workflow_step: WorkflowStep;
    readonly title: string;
    readonly content: string;
    readonly version: number;
    readonly approved_by: string | null;
    readonly updated_at: string;
    readonly created_at: string;
    readonly approved_at: string | null;
    readonly [key: string]: unknown;
  };
  readonly canModify: boolean;
};

export function isApproverRole(role: unknown, workflowStep: WorkflowStep): boolean {
  return typeof role === 'string' && isValidProjectRole(role) && canProjectRoleApprove(role, workflowStep);
}

export async function requireDocumentAccess(
  supabase: AiPmSupabase,
  auth: AuthContext,
  documentId: string,
): Promise<DocumentAccess> {
  const { data: doc, error } = await supabase
    .from('planning_documents')
    .select('*, projects (created_by)')
    .eq('id', documentId)
    .single();

  if (error && !isSupabaseNoRows(error)) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to load document access', error);
  }
  if (!doc) {
    throw new ApiError(404, AIpmErrorType.DOCUMENT_NOT_FOUND, 'Document not found');
  }

  if (auth.profile.role === 'admin') {
    return { document: doc, canModify: true };
  }

  const { data: member, error: memberError } = await supabase
    .from('project_members')
    .select('id, role')
    .eq('project_id', doc.project_id)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (memberError) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to check document access', memberError);
  }
  if (!member) {
    throw new ApiError(403, AIpmErrorType.FORBIDDEN, 'Document access denied');
  }

  if (doc.created_by === auth.user.id) {
    return { document: doc, canModify: true };
  }

  const isOfficialMember = doc.status === 'official';
  const isPendingApprover = doc.status === 'pending_approval' &&
    isApproverRole(member.role, doc.workflow_step);

  if (!isOfficialMember && !isPendingApprover) {
    throw new ApiError(403, AIpmErrorType.FORBIDDEN, 'Document access denied');
  }

  return { document: doc, canModify: false };
}

export async function requireDocumentApproval(
  supabase: AiPmSupabase,
  auth: AuthContext,
  documentId: string,
): Promise<void> {
  if (auth.profile.role === 'admin') {
    return;
  }

  const { data: doc, error } = await supabase
    .from('planning_documents')
    .select('id, project_id, workflow_step, status')
    .eq('id', documentId)
    .single();

  if (error && !isSupabaseNoRows(error)) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to load approval document', error);
  }
  if (!doc) {
    throw new ApiError(404, AIpmErrorType.DOCUMENT_NOT_FOUND, 'Document not found');
  }

  if (doc.status !== 'pending_approval') {
    throw new ApiError(400, AIpmErrorType.APPROVAL_REQUIRED, 'Document is not pending approval');
  }

  const { data: member, error: memberError } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', doc.project_id)
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (memberError) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to check approval access', memberError);
  }
  if (!member || !isApproverRole(member.role, doc.workflow_step)) {
    throw new ApiError(403, AIpmErrorType.FORBIDDEN, 'Approval access denied');
  }
}
