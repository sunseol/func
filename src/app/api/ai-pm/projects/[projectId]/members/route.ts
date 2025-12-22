import { NextRequest } from 'next/server';
import { ApiError, json, parseJson, withApi } from '@/lib/http';
import { getSupabase, requireAuth, requireProjectAccess, requireProjectManagement } from '@/lib/ai-pm/auth';
import { requireProjectRole, requireString, requireUuid } from '@/lib/ai-pm/validators';
import { AIpmErrorType } from '@/types/ai-pm';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ projectId: string }> };

export const GET = withApi(async (_request: NextRequest, { params }: Context) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);
  const { projectId } = await params;
  const safeProjectId = requireUuid(projectId, 'projectId');

  await requireProjectAccess(supabase, auth, safeProjectId);

  const { data: members, error } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', safeProjectId)
    .order('added_at', { ascending: true });

  if (error) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to fetch members', error);
  }

  return json({ members: members || [] });
});

export const POST = withApi(async (request: NextRequest, { params }: Context) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);
  const { projectId } = await params;
  const safeProjectId = requireUuid(projectId, 'projectId');

  await requireProjectManagement(supabase, auth, safeProjectId);

  const body = await parseJson<{ user_id?: string; role?: string }>(request);
  const userId = requireUuid(requireString(body.user_id, 'user_id'), 'user_id');
  const role = requireProjectRole(body.role, 'role');

  const { data: existing, error: existingError } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', safeProjectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingError) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to check member', existingError);
  }

  if (existing) {
    throw new ApiError(409, AIpmErrorType.MEMBER_ALREADY_EXISTS, 'Member already exists');
  }

  const { data: inserted, error: insertError } = await supabase
    .from('project_members')
    .insert({ project_id: safeProjectId, user_id: userId, role, added_by: auth.user.id })
    .select()
    .single();

  if (insertError || !inserted) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to add member', insertError);
  }

  return json({ member: inserted }, { status: 201 });
});

export const PUT = withApi(async (request: NextRequest, { params }: Context) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);
  const { projectId } = await params;
  const safeProjectId = requireUuid(projectId, 'projectId');

  await requireProjectManagement(supabase, auth, safeProjectId);

  const body = await parseJson<{ memberId?: string; role?: string }>(request);
  const memberId = requireUuid(requireString(body.memberId, 'memberId'), 'memberId');
  const role = requireProjectRole(body.role, 'role');

  const { data: updated, error } = await supabase
    .from('project_members')
    .update({ role })
    .eq('id', memberId)
    .eq('project_id', safeProjectId)
    .select()
    .single();

  if (error || !updated) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to update member', error);
  }

  return json({ member: updated });
});

export const DELETE = withApi(async (request: NextRequest, { params }: Context) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);
  const { projectId } = await params;
  const safeProjectId = requireUuid(projectId, 'projectId');

  await requireProjectManagement(supabase, auth, safeProjectId);

  const url = new URL(request.url);
  const memberId = requireUuid(requireString(url.searchParams.get('memberId'), 'memberId'), 'memberId');

  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('id', memberId)
    .eq('project_id', safeProjectId);

  if (error) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to delete member', error);
  }

  return json({ message: 'OK' });
});
