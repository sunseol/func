import { NextRequest } from 'next/server';
import { ApiError, json, parseJson, withApi } from '@/lib/http';
import { getSupabase, requireAuth } from '@/lib/ai-pm/auth';
import { requireMaxLength, requireString, sanitizeText } from '@/lib/ai-pm/validators';
import { AIpmErrorType, CreateProjectRequest, ProjectsResponse } from '@/types/ai-pm';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (_request: NextRequest) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);

  if (auth.profile.role === 'admin') {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to fetch projects', error);
    }

    return json({ projects: projects || [] } as ProjectsResponse);
  }

  const { data: memberships, error: membershipError } = await supabase
    .from('project_members')
    .select('role, projects (id, name, description)')
    .eq('user_id', auth.user.id);

  if (membershipError) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to fetch memberships', membershipError);
  }

  const projects = (memberships || [])
    .map((membership: any) => {
      const project = membership.projects;
      if (!project) return null;
      return {
        project_id: project.id,
        project_name: project.name,
        project_description: project.description,
        user_role: membership.role,
        member_count: 0,
        official_documents_count: 0,
        last_activity: null,
      };
    })
    .filter(Boolean);

  return json({ projects } as ProjectsResponse);
});

export const POST = withApi(async (request: NextRequest) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase, { requireAdmin: true });

  const body = await parseJson<CreateProjectRequest>(request);
  const name = requireMaxLength(requireString(body.name, 'name'), 'name', 255);
  const description = body.description
    ? requireMaxLength(sanitizeText(body.description), 'description', 2000)
    : null;

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      name,
      description,
      created_by: auth.user.id,
    })
    .select('*')
    .single();

  if (projectError || !project) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to create project', projectError);
  }

  const { error: memberError } = await supabase.from('project_members').insert({
    project_id: project.id,
    user_id: auth.user.id,
    role: 'service_planning',
    added_by: auth.user.id,
    added_at: new Date().toISOString(),
  });

  if (memberError) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to create project membership', memberError);
  }

  return json({ project }, { status: 201 });
});
