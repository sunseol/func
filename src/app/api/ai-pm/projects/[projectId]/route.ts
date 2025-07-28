import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

// Middleware to check authentication and permissions
async function checkAuth(supabase: any, requireAdmin = false) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: 'UNAUTHORIZED', message: '인증이 필요합니다.' };
  }

  if (requireAdmin) {
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return { error: 'FORBIDDEN', message: '관리자 권한이 필요합니다.' };
    }
  }

  return { user };
}

// Check if user has access to project (member or admin)
async function checkProjectAccess(supabase: any, userId: string, projectId: string) {
  // Check if user is admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profile?.role === 'admin') {
    return true;
  }

  // Check if user is project member
  const { data: membership } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();

  return !!membership;
}

// GET /api/ai-pm/projects/[projectId] - Get specific project details
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createClient();
    const authResult = await checkAuth(supabase);
    
    if ('error' in authResult) {
      return NextResponse.json(authResult, { status: 401 });
    }

    const { user } = authResult;
    const { projectId } = params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return NextResponse.json(
        { error: 'INVALID_PROJECT_ID', message: '유효하지 않은 프로젝트 ID입니다.' },
        { status: 400 }
      );
    }

    // Check project access
    const hasAccess = await checkProjectAccess(supabase, user.id, projectId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: '프로젝트에 접근할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // Get project details with creator info
    const { data: project, error: projectError } = await supabase
      .from('projects_with_creator')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'PROJECT_NOT_FOUND', message: '프로젝트를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      console.error('Database error:', projectError);
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: '프로젝트 조회 중 오류가 발생했습니다.', details: projectError },
        { status: 500 }
      );
    }

    // Get project members
    const { data: members, error: membersError } = await supabase
      .from('project_members_with_profiles')
      .select('*')
      .eq('project_id', projectId)
      .order('added_at', { ascending: true });

    if (membersError) {
      console.error('Members query error:', membersError);
    }

    // Get project progress
    const { data: progress, error: progressError } = await supabase
      .rpc('get_project_progress', { project_uuid: projectId });

    if (progressError) {
      console.error('Progress query error:', progressError);
    }

    return NextResponse.json({
      project,
      members: members || [],
      progress: progress || []
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PUT /api/ai-pm/projects/[projectId] - Update project (creator or admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createClient();
    const authResult = await checkAuth(supabase);
    
    if ('error' in authResult) {
      return NextResponse.json(authResult, { status: 401 });
    }

    const { user } = authResult;
    const { projectId } = params;
    const body: UpdateProjectRequest = await request.json();

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return NextResponse.json(
        { error: 'INVALID_PROJECT_ID', message: '유효하지 않은 프로젝트 ID입니다.' },
        { status: 400 }
      );
    }

    // Validate request body
    if (body.name !== undefined) {
      if (!body.name || body.name.trim().length === 0) {
        return NextResponse.json(
          { error: 'VALIDATION_ERROR', message: '프로젝트 이름은 필수입니다.' },
          { status: 400 }
        );
      }
      if (body.name.length > 255) {
        return NextResponse.json(
          { error: 'VALIDATION_ERROR', message: '프로젝트 이름은 255자를 초과할 수 없습니다.' },
          { status: 400 }
        );
      }
    }

    // Check if project exists and user has permission to update
    const { data: existingProject, error: checkError } = await supabase
      .from('projects')
      .select('id, created_by')
      .eq('id', projectId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'PROJECT_NOT_FOUND', message: '프로젝트를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      console.error('Database error:', checkError);
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: '프로젝트 확인 중 오류가 발생했습니다.', details: checkError },
        { status: 500 }
      );
    }

    // Check if user is creator or admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';
    const isCreator = existingProject.created_by === user.id;

    if (!isAdmin && !isCreator) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: '프로젝트를 수정할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (body.name !== undefined) {
      updateData.name = body.name.trim();
    }
    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null;
    }

    // Update project
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
      console.error('Database error:', updateError);
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: '프로젝트 수정 중 오류가 발생했습니다.', details: updateError },
        { status: 500 }
      );
    }

    return NextResponse.json({ project: updatedProject });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE /api/ai-pm/projects/[projectId] - Delete project (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createClient();
    const authResult = await checkAuth(supabase, true); // Require admin
    
    if ('error' in authResult) {
      return NextResponse.json(authResult, { 
        status: authResult.error === 'UNAUTHORIZED' ? 401 : 403 
      });
    }

    const { projectId } = params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return NextResponse.json(
        { error: 'INVALID_PROJECT_ID', message: '유효하지 않은 프로젝트 ID입니다.' },
        { status: 400 }
      );
    }

    // Check if project exists
    const { data: existingProject, error: checkError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'PROJECT_NOT_FOUND', message: '프로젝트를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      console.error('Database error:', checkError);
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: '프로젝트 확인 중 오류가 발생했습니다.', details: checkError },
        { status: 500 }
      );
    }

    // Delete project (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (deleteError) {
      console.error('Database error:', deleteError);
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: '프로젝트 삭제 중 오류가 발생했습니다.', details: deleteError },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: '프로젝트가 성공적으로 삭제되었습니다.',
      deletedProject: existingProject
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}