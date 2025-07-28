import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authMiddleware } from '@/lib/ai-pm/auth-middleware';
import { AIpmErrorType } from '@/types/ai-pm';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; memberId: string } }
) {
  try {
    // Authenticate user
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error, message: authResult.message },
        { status: authResult.status }
      );
    }

    const { user, userProfile } = authResult;
    const { projectId, memberId } = params;

    // Validate project ID format
    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: AIpmErrorType.INVALID_PROJECT_ID, message: '유효하지 않은 프로젝트 ID입니다.' },
        { status: 400 }
      );
    }

    // Check if user is admin or project creator
    if (userProfile.role !== 'admin') {
      // Check if user is project creator
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('created_by')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        return NextResponse.json(
          { error: AIpmErrorType.PROJECT_NOT_FOUND, message: '프로젝트를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      if (project.created_by !== user.id) {
        return NextResponse.json(
          { error: AIpmErrorType.FORBIDDEN, message: '멤버를 제거할 권한이 없습니다.' },
          { status: 403 }
        );
      }
    }

    // Check if member exists
    const { data: member, error: memberError } = await supabase
      .from('project_members')
      .select('*')
      .eq('id', memberId)
      .eq('project_id', projectId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: AIpmErrorType.MEMBER_NOT_FOUND, message: '멤버를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Delete member
    const { error: deleteError } = await supabase
      .from('project_members')
      .delete()
      .eq('id', memberId);

    if (deleteError) {
      console.error('Member deletion error:', deleteError);
      return NextResponse.json(
        { error: AIpmErrorType.DATABASE_ERROR, message: '멤버 제거에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: '멤버가 성공적으로 제거되었습니다.' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Delete member error:', error);
    return NextResponse.json(
      { error: AIpmErrorType.INTERNAL_ERROR, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}