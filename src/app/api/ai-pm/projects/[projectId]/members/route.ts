import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface AddMemberRequest {
  user_id: string;
  role: '콘텐츠기획' | '서비스기획' | 'UIUX기획' | '개발자';
}

interface UpdateMemberRequest {
  role: '콘텐츠기획' | '서비스기획' | 'UIUX기획' | '개발자';
}

// Middleware to check authentication and admin permissions
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

// Validate role
function isValidRole(role: string): role is '콘텐츠기획' | '서비스기획' | 'UIUX기획' | '개발자' {
  return ['콘텐츠기획', '서비스기획', 'UIUX기획', '개발자'].includes(role);
}

// GET /api/ai-pm/projects/[projectId]/members - Get project members
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

    // Get project members with user profiles
    const { data: members, error } = await supabase
      .from('project_members_with_profiles')
      .select('*')
      .eq('project_id', projectId)
      .order('added_at', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: '멤버 조회 중 오류가 발생했습니다.', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST /api/ai-pm/projects/[projectId]/members - Add project member (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createSupabaseClient();
    const authResult = await checkAuth(supabase, true); // Require admin
    
    if ('error' in authResult) {
      return NextResponse.json(authResult, { 
        status: authResult.error === 'UNAUTHORIZED' ? 401 : 403 
      });
    }

    const { user } = authResult;
    const { projectId } = params;
    const body: AddMemberRequest = await request.json();

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return NextResponse.json(
        { error: 'INVALID_PROJECT_ID', message: '유효하지 않은 프로젝트 ID입니다.' },
        { status: 400 }
      );
    }

    // Validate request body
    if (!body.user_id || !uuidRegex.test(body.user_id)) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: '유효한 사용자 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!body.role || !isValidRole(body.role)) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: '유효한 역할이 필요합니다. (콘텐츠기획, 서비스기획, UIUX기획, 개발자)' },
        { status: 400 }
      );
    }

    // Check if project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
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
        { error: 'DATABASE_ERROR', message: '프로젝트 확인 중 오류가 발생했습니다.', details: projectError },
        { status: 500 }
      );
    }

    // Check if user exists
    const { data: targetUser, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('id', body.user_id)
      .single();

    if (userError) {
      if (userError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'USER_NOT_FOUND', message: '사용자를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      console.error('Database error:', userError);
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: '사용자 확인 중 오류가 발생했습니다.', details: userError },
        { status: 500 }
      );
    }

    // Check if user is already a member
    const { data: existingMember, error: memberCheckError } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', body.user_id)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: 'MEMBER_ALREADY_EXISTS', message: '사용자가 이미 프로젝트 멤버입니다.' },
        { status: 409 }
      );
    }

    // Add member to project
    const { data: newMember, error: addError } = await supabase
      .from('project_members')
      .insert([
        {
          project_id: projectId,
          user_id: body.user_id,
          role: body.role,
          added_by: user.id,
        }
      ])
      .select()
      .single();

    if (addError) {
      console.error('Database error:', addError);
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: '멤버 추가 중 오류가 발생했습니다.', details: addError },
        { status: 500 }
      );
    }

    // Get the complete member info with profile
    const { data: memberWithProfile, error: profileError } = await supabase
      .from('project_members_with_profiles')
      .select('*')
      .eq('id', newMember.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      // Return basic member info if profile fetch fails
      return NextResponse.json({ member: newMember }, { status: 201 });
    }

    return NextResponse.json({ member: memberWithProfile }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PUT /api/ai-pm/projects/[projectId]/members?userId=xxx - Update member role (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createSupabaseClient();
    const authResult = await checkAuth(supabase, true); // Require admin
    
    if ('error' in authResult) {
      return NextResponse.json(authResult, { 
        status: authResult.error === 'UNAUTHORIZED' ? 401 : 403 
      });
    }

    const { user } = authResult;
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const body: UpdateMemberRequest = await request.json();

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return NextResponse.json(
        { error: 'INVALID_PROJECT_ID', message: '유효하지 않은 프로젝트 ID입니다.' },
        { status: 400 }
      );
    }

    if (!userId || !uuidRegex.test(userId)) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: '유효한 사용자 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // Validate request body
    if (!body.role || !isValidRole(body.role)) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: '유효한 역할이 필요합니다. (콘텐츠기획, 서비스기획, UIUX기획, 개발자)' },
        { status: 400 }
      );
    }

    // Check if member exists
    const { data: existingMember, error: memberError } = await supabase
      .from('project_members')
      .select('id, role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (memberError) {
      if (memberError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'MEMBER_NOT_FOUND', message: '프로젝트 멤버를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      console.error('Database error:', memberError);
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: '멤버 확인 중 오류가 발생했습니다.', details: memberError },
        { status: 500 }
      );
    }

    // Update member role
    const { data: updatedMember, error: updateError } = await supabase
      .from('project_members')
      .update({ role: body.role })
      .eq('id', existingMember.id)
      .select()
      .single();

    if (updateError) {
      console.error('Database error:', updateError);
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: '멤버 역할 수정 중 오류가 발생했습니다.', details: updateError },
        { status: 500 }
      );
    }

    // Get the complete member info with profile
    const { data: memberWithProfile, error: profileError } = await supabase
      .from('project_members_with_profiles')
      .select('*')
      .eq('id', updatedMember.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      // Return basic member info if profile fetch fails
      return NextResponse.json({ member: updatedMember });
    }

    return NextResponse.json({ member: memberWithProfile });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE /api/ai-pm/projects/[projectId]/members?userId=xxx - Remove member (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createSupabaseClient();
    const authResult = await checkAuth(supabase, true); // Require admin
    
    if ('error' in authResult) {
      return NextResponse.json(authResult, { 
        status: authResult.error === 'UNAUTHORIZED' ? 401 : 403 
      });
    }

    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return NextResponse.json(
        { error: 'INVALID_PROJECT_ID', message: '유효하지 않은 프로젝트 ID입니다.' },
        { status: 400 }
      );
    }

    if (!userId || !uuidRegex.test(userId)) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: '유효한 사용자 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // Check if member exists and get their info
    const { data: existingMember, error: memberError } = await supabase
      .from('project_members_with_profiles')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (memberError) {
      if (memberError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'MEMBER_NOT_FOUND', message: '프로젝트 멤버를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      console.error('Database error:', memberError);
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: '멤버 확인 중 오류가 발생했습니다.', details: memberError },
        { status: 500 }
      );
    }

    // Remove member from project
    const { error: deleteError } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Database error:', deleteError);
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: '멤버 제거 중 오류가 발생했습니다.', details: deleteError },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: '멤버가 성공적으로 제거되었습니다.',
      removedMember: existingMember
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}