import { createClient } from '@/lib/supabase/server';
import { ApiError } from '@/lib/http';
import { AIpmErrorType } from '@/types/ai-pm';

export interface AuthContext {
  user: {
    id: string;
    email?: string | null;
  };
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    role: 'user' | 'admin';
    created_at: string;
    updated_at: string;
  };
}

export async function getSupabase() {
  return createClient();
}

export async function requireAuth(supabase: any, options?: { requireAdmin?: boolean }) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    throw new ApiError(401, AIpmErrorType.UNAUTHORIZED, 'Authentication required');
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile) {
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

export async function requireProjectAccess(supabase: any, auth: AuthContext, projectId: string) {
  if (auth.profile.role === 'admin') {
    return;
  }

  const { data: member, error } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (error || !member) {
    throw new ApiError(403, AIpmErrorType.FORBIDDEN, 'Project access denied');
  }
}

export async function requireProjectManagement(supabase: any, auth: AuthContext, projectId: string) {
  if (auth.profile.role === 'admin') {
    return;
  }

  const { data: project, error } = await supabase
    .from('projects')
    .select('created_by')
    .eq('id', projectId)
    .single();

  if (error || !project || project.created_by !== auth.user.id) {
    throw new ApiError(403, AIpmErrorType.FORBIDDEN, 'Project management access denied');
  }
}

export async function requireDocumentAccess(supabase: any, auth: AuthContext, documentId: string) {
  const { data: doc, error } = await supabase
    .from('planning_documents')
    .select('id, created_by, project_id, status, projects (created_by)')
    .eq('id', documentId)
    .single();

  if (error || !doc) {
    throw new ApiError(404, AIpmErrorType.DOCUMENT_NOT_FOUND, 'Document not found');
  }

  if (auth.profile.role === 'admin') {
    return { document: doc, canModify: true };
  }

  if (doc.created_by === auth.user.id || doc.projects?.created_by === auth.user.id) {
    return { document: doc, canModify: true };
  }

  const { data: member } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', doc.project_id)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (!member) {
    throw new ApiError(403, AIpmErrorType.FORBIDDEN, 'Document access denied');
  }

  return { document: doc, canModify: false };
}

export async function requireDocumentApproval(supabase: any, auth: AuthContext, documentId: string) {
  if (auth.profile.role === 'admin') {
    return;
  }

  const { data: doc, error } = await supabase
    .from('planning_documents')
    .select('id, project_id, projects (created_by)')
    .eq('id', documentId)
    .single();

  if (error || !doc || doc.projects?.created_by !== auth.user.id) {
    throw new ApiError(403, AIpmErrorType.FORBIDDEN, 'Approval access denied');
  }
}
