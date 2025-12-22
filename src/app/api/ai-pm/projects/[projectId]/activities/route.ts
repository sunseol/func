import { NextRequest } from 'next/server';
import { ApiError, json, parseJson, withApi } from '@/lib/http';
import { getSupabase, requireAuth, requireProjectAccess } from '@/lib/ai-pm/auth';
import { requireString, requireUuid, sanitizeText } from '@/lib/ai-pm/validators';
import { AIpmErrorType } from '@/types/ai-pm';

type Context = { params: Promise<{ projectId: string }> };

export const GET = withApi(async (request: NextRequest, { params }: Context) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);
  const { projectId } = await params;
  const safeProjectId = requireUuid(projectId, 'projectId');

  await requireProjectAccess(supabase, auth, safeProjectId);

  const url = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20', 10), 1), 100);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);
  const includeStats = url.searchParams.get('includeStats') === 'true';
  const includeMemberSummary = url.searchParams.get('includeMemberSummary') === 'true';

  const { data: activities, error: activitiesError } = await supabase
    .from('project_activities')
    .select('id, project_id, user_id, activity_type, target_type, target_id, metadata, description, created_at')
    .eq('project_id', safeProjectId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (activitiesError) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to fetch activities', activitiesError);
  }

  const userIds = Array.from(new Set((activities || []).map((activity) => activity.user_id).filter(Boolean)));
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name, email')
    .in('id', userIds);

  const profilesById = new Map((profiles || []).map((profile: any) => [profile.id, profile]));

  const normalizedActivities = (activities || []).map((activity: any) => {
    const profile = activity.user_id ? profilesById.get(activity.user_id) : null;
    return {
      ...activity,
      user_name: profile?.full_name ?? null,
      user_email: profile?.email ?? null,
    };
  });

  const response: Record<string, unknown> = {
    activities: normalizedActivities,
    pagination: {
      limit,
      offset,
      hasMore: (activities || []).length === limit,
    },
  };

  if (includeStats) {
    const { data: stats } = await supabase
    .from('project_collaboration_stats')
    .select('*')
    .eq('project_id', safeProjectId)
      .maybeSingle();

    response.collaborationStats =
      stats ||
      {
        total_documents: 0,
        official_documents: 0,
        pending_documents: 0,
        total_members: 0,
        total_activities: 0,
        last_activity_at: null,
      };
  }

  if (includeMemberSummary) {
    const { data: summaries, error: summaryError } = await supabase
      .from('member_activity_summary')
      .select('*')
      .eq('project_id', safeProjectId)
      .order('last_activity_at', { ascending: false });

    if (summaryError) {
      throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to fetch member summary', summaryError);
    }

    const summaryUserIds = Array.from(new Set((summaries || []).map((summary) => summary.user_id)));
    const { data: summaryProfiles } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .in('id', summaryUserIds);
    const { data: roles } = await supabase
      .from('project_members')
      .select('user_id, role')
      .eq('project_id', safeProjectId);

    const profileMap = new Map((summaryProfiles || []).map((profile: any) => [profile.id, profile]));
    const roleMap = new Map((roles || []).map((member: any) => [member.user_id, member.role]));

    response.memberSummary = (summaries || []).map((summary: any) => {
      const profile = profileMap.get(summary.user_id);
      return {
        ...summary,
        user_name: profile?.full_name ?? null,
        user_email: profile?.email ?? null,
        role: roleMap.get(summary.user_id) ?? null,
      };
    });
  }

  return json(response);
});

export const POST = withApi(async (request: NextRequest, { params }: Context) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);
  const { projectId } = await params;
  const safeProjectId = requireUuid(projectId, 'projectId');

  await requireProjectAccess(supabase, auth, safeProjectId);

  const body = await parseJson<{
    activity_type?: string;
    target_type?: string | null;
    target_id?: string | null;
    metadata?: Record<string, unknown>;
    description?: string;
  }>(request);

  const activityType = requireString(body.activity_type, 'activity_type');
  const description = requireString(body.description, 'description');

  const { data: result, error } = await supabase.rpc('log_project_activity', {
    p_project_id: safeProjectId,
    p_user_id: auth.user.id,
    p_activity_type: activityType,
    p_target_type: body.target_type ?? null,
    p_target_id: body.target_id ?? null,
    p_metadata: body.metadata ?? {},
    p_description: sanitizeText(description),
  });

  if (error) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to log activity', error);
  }

  return json({ success: true, activity_id: result });
});
