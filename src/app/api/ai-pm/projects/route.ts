import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  checkAuth, 
  ValidationErrors,
  DatabaseErrors,
  checkRateLimit,
  getSecurityHeaders,
  sanitizeInput,
  validateProjectData
} from '@/lib/ai-pm/auth-middleware';
import { 
  CreateProjectRequest, 
  ProjectsResponse,
  AIpmErrorType 
} from '@/types/ai-pm';

export const dynamic = 'force-dynamic';

// GET /api/ai-pm/projects - Get all projects for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authResult = await checkAuth();
    if ('error' in authResult) {
      // 목록 조회는 UX를 위해 로그인 상태가 감지되면 빈 배열 반환으로 폴백
      if (authResult.error === AIpmErrorType.UNAUTHORIZED) {
        return NextResponse.json({ projects: [] } as ProjectsResponse, { headers: getSecurityHeaders() });
      }
      const status = authResult.error === AIpmErrorType.UNAUTHORIZED ? 401 : 403;
      return NextResponse.json(authResult, { status, headers: getSecurityHeaders() });
    }

    const { user } = authResult;

    // 1) 우선 RPC 함수 사용 (성능/집계 컬럼 포함)
    const { data: rpcProjects, error: rpcError } = await supabase
      .rpc('get_projects_for_user', { p_user_id: user.id });

    if (!rpcError && rpcProjects) {
      // 컬럼 명 정규화 (official_document_count -> official_documents_count)
      const normalized = (rpcProjects as any[]).map((p) => ({
        ...p,
        official_documents_count:
          p.official_documents_count ?? p.official_document_count ?? 0,
        member_count: p.member_count ?? 0,
      }));
      return NextResponse.json(
        { projects: normalized } as ProjectsResponse,
        { headers: getSecurityHeaders() }
      );
    }

    console.warn('RPC get_projects_for_user failed, falling back to basic query:', rpcError);

    // 2) Fallback: 기본 조합 쿼리로 최소 정보 반환
    // 2-1) 사용자 프로젝트 ID 목록 조회
    const { data: membershipIds, error: memberErr } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id);

    if (memberErr) {
      console.error('Membership fetch error:', memberErr);
      return NextResponse.json(DatabaseErrors.QUERY_ERROR('프로젝트 조회'),{ status: 500 });
    }

    const projectIds = (membershipIds || []).map((m: any) => m.project_id);

    if (projectIds.length === 0) {
      return NextResponse.json({ projects: [] } as ProjectsResponse, { headers: getSecurityHeaders() });
    }

    // 2-2) 프로젝트 기본 정보 조회
    const { data: basicProjects, error: basicErr } = await supabase
      .from('projects')
      .select('id, created_at, name, description, created_by')
      .in('id', projectIds)
      .order('created_at', { ascending: false });

    if (basicErr) {
      console.error('Basic projects fetch error:', basicErr);
      return NextResponse.json(DatabaseErrors.QUERY_ERROR('프로젝트 조회'),{ status: 500 });
    }

    // 2-3) 최소 필드 세팅 (집계는 0으로)
    const normalizedBasic = (basicProjects || []).map((p: any) => ({
      ...p,
      member_count: 0,
      official_documents_count: 0,
      creator_email: '',
      creator_name: null,
    }));

    return NextResponse.json(
      { projects: normalizedBasic } as ProjectsResponse,
      { headers: getSecurityHeaders() }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: AIpmErrorType.INTERNAL_ERROR, message: '서버 내부 오류가 발생했습니다.' },
      { 
        status: 500,
        headers: getSecurityHeaders()
      }
    );
  }
}

// POST /api/ai-pm/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authResult = await checkAuth();
    
    if ('error' in authResult) {
      const status = authResult.error === AIpmErrorType.UNAUTHORIZED ? 401 : 403;
      return NextResponse.json(authResult, { 
        status,
        headers: getSecurityHeaders()
      });
    }

    const { user } = authResult;

    const body: CreateProjectRequest = await request.json();

    // Sanitize and validate
    const sanitizedData = {
      name: sanitizeInput(body.name || ''),
      description: body.description ? sanitizeInput(body.description) : null,
    };
    const validation = validateProjectData(sanitizedData);
    if (!validation.valid) {
      return NextResponse.json(
        { error: AIpmErrorType.VALIDATION_ERROR, message: validation.errors.join(', ') },
        { status: 400, headers: getSecurityHeaders() }
      );
    }

    // Create project
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
          name: sanitizedData.name,
          description: sanitizedData.description,
          created_by: user.id,
        })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        DatabaseErrors.QUERY_ERROR('프로젝트 생성'),
        { status: 500, headers: getSecurityHeaders() }
      );
    }

    // Also add the creator as the first member of the project
    const { error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: project.id,
        user_id: user.id,
        role: '서비스기획', // Default role for creator
        added_by: user.id,
      });

    if (memberError) {
        console.error('Failed to add creator as project member:', memberError);
        // Not returning an error here as the project creation was successful
    }

    return NextResponse.json({ project }, { status: 201, headers: getSecurityHeaders() });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: AIpmErrorType.INTERNAL_ERROR, message: '서버 내부 오류가 발생했습니다.' },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}
