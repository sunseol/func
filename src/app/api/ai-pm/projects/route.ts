import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  CreateProjectRequest, 
  ProjectsResponse,
  AIpmErrorType 
} from '@/types/ai-pm';

// GET /api/ai-pm/projects - Get all projects for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: AIpmErrorType.UNAUTHORIZED, message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    console.log('Authenticated user:', user.email);

    // Check if user is admin (hardcoded for now)
    const isAdmin = user.email === 'jakeseol99@keduall.com';
    
    console.log('Is admin:', isAdmin);

    let projects = [];

    if (isAdmin) {
      // Admin can see all projects
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json(
          { error: AIpmErrorType.DATABASE_ERROR, message: '프로젝트 조회 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }

      // Get creator information separately
      const projectsWithCreators = await Promise.all(
        (projectsData || []).map(async (project: any) => {
          if (project.created_by) {
            const { data: creator } = await supabase
              .from('user_profiles')
              .select('email, full_name')
              .eq('id', project.created_by)
              .single();
            
            return {
              ...project,
              creator_email: creator?.email || '',
              creator_name: creator?.full_name || null
            };
          }
          return {
            ...project,
            creator_email: '',
            creator_name: null
          };
        })
      );

      projects = projectsWithCreators;
    } else {
      // Regular users can see projects they created or are members of (thanks to RLS)
      const { data: userProjects, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json(
          { error: AIpmErrorType.DATABASE_ERROR, message: '프로젝트 조회 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }

      // For regular users, get their role in each project
      const userProjectsWithRoles = await Promise.all(
        (userProjects || []).map(async (project: any) => {
          // Get user's role in this project
          const { data: membership } = await supabase
            .from('project_members')
            .select('role')
            .eq('project_id', project.id)
            .eq('user_id', user.id)
            .single();

          return {
            project_id: project.id,
            project_name: project.name,
            project_description: project.description,
            user_role: membership?.role || null,
            member_count: 1, // We'll calculate this later if needed
            official_documents_count: 0, // We'll calculate this later if needed
            last_activity: project.updated_at
          };
        })
      );

      projects = userProjectsWithRoles;
    }

    console.log('Found projects:', projects.length);

    return NextResponse.json({ projects } as ProjectsResponse);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: AIpmErrorType.INTERNAL_ERROR, message: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST /api/ai-pm/projects - Create a new project (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: AIpmErrorType.UNAUTHORIZED, message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // Check if user is admin (hardcoded for now)
    const isAdmin = user.email === 'jakeseol99@keduall.com';
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: AIpmErrorType.FORBIDDEN, message: '프로젝트 생성 권한이 없습니다.' },
        { status: 403 }
      );
    }

    const body: CreateProjectRequest = await request.json();

    // Validate input
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: AIpmErrorType.VALIDATION_ERROR, message: '프로젝트 이름은 필수입니다.' },
        { status: 400 }
      );
    }

    // Create project
    const { data: project, error } = await supabase
      .from('projects')
      .insert([
        {
          name: body.name.trim(),
          description: body.description?.trim() || null,
          created_by: user.id,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: AIpmErrorType.DATABASE_ERROR, message: '프로젝트 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: AIpmErrorType.INTERNAL_ERROR, message: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}