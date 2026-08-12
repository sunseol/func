import { NextRequest } from 'next/server';
import { ApiError, json, withApi } from '@/lib/http';
import { getSupabase, requireAuth, requireProjectAccess } from '@/lib/ai-pm/auth';
import { requireUuid } from '@/lib/ai-pm/validators';
import { AIpmErrorType } from '@/types/ai-pm';

type Context = { params: Promise<{ projectId: string }> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseIntegerParameter(value: string | null, field: string, fallback: number): number {
  if (value === null || value === '') return fallback;
  if (!/^[0-9]+$/.test(value)) {
    throw new ApiError(400, AIpmErrorType.VALIDATION_ERROR, `${field} must be a non-negative integer`);
  }
  return Number(value);
}

export const GET = withApi(async (request: NextRequest, { params }: Context) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);
  const { projectId } = await params;
  const safeProjectId = requireUuid(projectId, 'projectId');

  await requireProjectAccess(supabase, auth, safeProjectId);

  const url = new URL(request.url);
  const limit = Math.min(Math.max(parseIntegerParameter(url.searchParams.get('limit'), 'limit', 20), 1), 100);
  const offset = parseIntegerParameter(url.searchParams.get('offset'), 'offset', 0);
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
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('id, full_name, email')
    .in('id', userIds);
  if (profilesError) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to fetch activity profiles', profilesError);
  }

  const profilesById = new Map(
    (profiles || []).filter(isRecord).flatMap((profile) => {
      const id = profile.id;
      return typeof id === 'string' ? [[id, profile] as const] : [];
    }),
  );

  const normalizedActivities = (activities || []).filter(isRecord).map((activity) => {
    const userId = activity.user_id;
    const profile = typeof userId === 'string' ? profilesById.get(userId) : undefined;
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
    const { data: stats, error: statsError } = await supabase
    .from('project_collaboration_stats')
    .select('*')
    .eq('project_id', safeProjectId)
      .maybeSingle();
    if (statsError) {
      throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to fetch collaboration stats', statsError);
    }

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
    const { data: summaryProfiles, error: summaryProfilesError } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .in('id', summaryUserIds);
    if (summaryProfilesError) {
      throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to fetch member profiles', summaryProfilesError);
    }
    const { data: roles, error: rolesError } = await supabase
      .from('project_members')
      .select('user_id, role')
      .eq('project_id', safeProjectId);
    if (rolesError) {
      throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to fetch member roles', rolesError);
    }

    const profileMap = new Map(
      (summaryProfiles || []).filter(isRecord).flatMap((profile) => {
        const id = profile.id;
        return typeof id === 'string' ? [[id, profile] as const] : [];
      }),
    );
    const roleMap = new Map(
      (roles || []).filter(isRecord).flatMap((member) => {
        const userId = member.user_id;
        return typeof userId === 'string' ? [[userId, member.role] as const] : [];
      }),
    );

    response.memberSummary = (summaries || []).filter(isRecord).map((summary) => {
      const userId = summary.user_id;
      const profile = typeof userId === 'string' ? profileMap.get(userId) : undefined;
      return {
        ...summary,
        user_name: profile?.full_name ?? null,
        user_email: profile?.email ?? null,
        role: typeof userId === 'string' ? roleMap.get(userId) ?? null : null,
      };
    });
  }

  return json(response);
});

export const POST = withApi(async (request: NextRequest, { params }: Context) => {
  void request;
  void params;
  throw new ApiError(405, AIpmErrorType.VALIDATION_ERROR, 'Activity records are generated by server workflows');
});
