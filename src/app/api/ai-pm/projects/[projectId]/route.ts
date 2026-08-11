import { NextRequest } from 'next/server';
import { ApiError, json, parseJson, withApi } from '@/lib/http';
import { getSupabase, isSupabaseNoRows, requireAuth, requireProjectAccess, requireProjectManagement } from '@/lib/ai-pm/auth';
import { requireMaxLength, requireString, requireUuid, sanitizeText } from '@/lib/ai-pm/validators';
import { AIpmErrorType } from '@/types/ai-pm';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ projectId: string }> };

export const GET = withApi(async (_request: NextRequest, { params }: Context) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);
  const { projectId } = await params;
  const safeProjectId = requireUuid(projectId, 'projectId');

  await requireProjectAccess(supabase, auth, safeProjectId);

  const { data: project, error: projectError } = await supabase
    .from('projects_with_creator')
    .select('*')
    .eq('id', safeProjectId)
    .single();

  if (projectError && !isSupabaseNoRows(projectError)) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to fetch project', projectError);
  }
  if (!project) {
    throw new ApiError(404, AIpmErrorType.PROJECT_NOT_FOUND, 'Project not found', projectError);
  }

  const { data: members, error: membersError } = await supabase
    .from('project_members_with_profiles')
    .select('*')
    .eq('project_id', safeProjectId)
    .order('added_at', { ascending: true });

  if (membersError) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to fetch project members', membersError);
  }

  const { data: progress, error: progressError } = await supabase.rpc('get_project_progress', {
    project_uuid: safeProjectId,
  });

  if (progressError) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to fetch project progress', progressError);
  }

  const normalizedProgress = Array.isArray(progress) ? progress : [];
  return json({
    project: {
      ...project,
      member_count: (members || []).length,
      official_documents_count: normalizedProgress.filter((step) => step.has_official_document).length,
      progress: normalizedProgress,
    },
    members: members || [],
    progress: normalizedProgress,
  });
});

export const PUT = withApi(async (request: NextRequest, { params }: Context) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);
  const { projectId } = await params;
  const safeProjectId = requireUuid(projectId, 'projectId');

  await requireProjectManagement(supabase, auth, safeProjectId);

  const body = await parseJson<{ name?: string; description?: string }>(request, { maxBytes: 16_000, requireContentType: true });
  const updateData: { name?: string; description?: string | null; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };

  if (body.name !== undefined) {
    updateData.name = requireMaxLength(requireString(body.name, 'name'), 'name', 255);
  }

  if (body.description !== undefined) {
    const description = sanitizeText(body.description);
    updateData.description = description ? requireMaxLength(description, 'description', 2000) : null;
  }

  const { data: updatedProject, error: updateError } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', safeProjectId)
    .select('*')
    .single();

  if (updateError || !updatedProject) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to update project', updateError);
  }

  return json({ project: updatedProject });
});

export const DELETE = withApi(async (_request: NextRequest, { params }: Context) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);
  const { projectId } = await params;
  const safeProjectId = requireUuid(projectId, 'projectId');

  await requireProjectManagement(supabase, auth, safeProjectId);

  const { data: existingProject, error: existingError } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', safeProjectId)
    .single();

  if (existingError && !isSupabaseNoRows(existingError)) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to load project', existingError);
  }
  if (!existingProject) {
    throw new ApiError(404, AIpmErrorType.PROJECT_NOT_FOUND, 'Project not found', existingError);
  }

  const { error: deleteError } = await supabase.from('projects').delete().eq('id', safeProjectId);
  if (deleteError) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to delete project', deleteError);
  }

  return json({ message: 'OK', deletedProject: existingProject });
});
