import { NextRequest } from 'next/server';
import { ApiError, json, parseJson, withApi } from '@/lib/http';
import { getSupabase, requireAuth } from '@/lib/ai-pm/auth';
import { requireMaxLength, requireString, sanitizeText } from '@/lib/ai-pm/validators';
import { AIpmErrorType, CreateProjectRequest, isValidProjectRole, ProjectsResponse, type UserProject } from '@/types/ai-pm';

export const dynamic = 'force-dynamic';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export const GET = withApi(async (_request: NextRequest) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);

  if (auth.profile.role === 'admin') {
    const { data: projects, error } = await supabase
      .from('projects_with_counts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to fetch projects', error);
    }

    const normalizedProjects = (projects ?? []).map((project) => {
      return {
        ...project,
        member_count: Number(project.member_count ?? 0),
        official_documents_count: Number(project.official_document_count ?? 0),
      };
    });
    return json({ projects: normalizedProjects } satisfies ProjectsResponse);
  }

  const { data: memberships, error: membershipError } = await supabase
    .from('project_members')
    .select('project_id, role')
    .eq('user_id', auth.user.id);

  if (membershipError) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to fetch memberships', membershipError);
  }

  const membershipRows = (memberships || []).filter(isRecord).flatMap((membership: Record<string, unknown>) => {
    const projectId = membership.project_id;
    const role = membership.role;
    return typeof projectId === 'string' && typeof role === 'string' && isValidProjectRole(role)
      ? [{ projectId, role }]
      : [];
  });
  if (membershipRows.length === 0) return json({ projects: [] satisfies UserProject[] });

  const { data: projectRows, error: projectError } = await supabase
    .from('projects_with_counts')
    .select('*')
    .in('id', membershipRows.map((membership) => membership.projectId));
  if (projectError) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to fetch projects', projectError);
  }
  const projectById = new Map(
    (projectRows || []).filter(isRecord).flatMap((project: Record<string, unknown>) => {
      const id = project.id;
      return typeof id === 'string' ? [[id, project] as const] : [];
    }),
  );
  const projects: UserProject[] = membershipRows.flatMap(({ projectId, role }) => {
    const project = projectById.get(projectId);
    if (!project || typeof project.id !== 'string' || typeof project.name !== 'string' ||
      typeof project.created_by !== 'string' || typeof project.created_at !== 'string' ||
      typeof project.updated_at !== 'string') return [];
    return [{
      id: project.id,
      name: project.name,
      description: typeof project.description === 'string' ? project.description : null,
      created_by: project.created_by,
      created_at: project.created_at,
      updated_at: project.updated_at,
      creator_email: typeof project.creator_email === 'string' ? project.creator_email : null,
      creator_name: typeof project.creator_name === 'string' ? project.creator_name : null,
      user_role: role,
      member_count: Number(project.member_count ?? 0),
      official_documents_count: Number(project.official_document_count ?? 0),
      last_activity: typeof project.updated_at === 'string' ? project.updated_at : null,
    }];
  });

  return json({ projects } satisfies ProjectsResponse);
});

export const POST = withApi(async (request: NextRequest) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase, { requireAdmin: true });

  const body = await parseJson<CreateProjectRequest>(request, { maxBytes: 16_000, requireContentType: true });
  const name = requireMaxLength(requireString(body.name, 'name'), 'name', 255);
  const description = body.description
    ? requireMaxLength(sanitizeText(body.description), 'description', 2000)
    : null;

  const { data: projects, error: projectError } = await supabase.rpc('create_project_with_owner', {
    p_name: name,
    p_description: description,
  });

  const project = Array.isArray(projects) ? projects[0] : projects;
  if (projectError || !project) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to create project', projectError);
  }

  return json({ project }, { status: 201 });
});
