import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  DocumentResponse,
  AIpmErrorType
} from '@/types/ai-pm';

// POST /api/ai-pm/documents/[documentId]/request-approval - Request approval for a document
export async function POST(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
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

    const { documentId } = params;

    // Get document
    const { data: document, error: queryError } = await supabase
      .from('planning_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (queryError || !document) {
      return NextResponse.json(
        { error: AIpmErrorType.DOCUMENT_NOT_FOUND, message: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Check if user is the document creator
    if (document.created_by !== user.id) {
      // Check if user is admin
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!userProfile || userProfile.role !== 'admin') {
        return NextResponse.json(
          { error: AIpmErrorType.FORBIDDEN, message: '문서 작성자만 승인을 요청할 수 있습니다.' },
          { status: 403 }
        );
      }
    }

    // Check if document is in private status
    if (document.status !== 'private') {
      return NextResponse.json(
        { 
          error: AIpmErrorType.VALIDATION_ERROR, 
          message: '개인 작업 중인 문서만 승인을 요청할 수 있습니다.' 
        },
        { status: 400 }
      );
    }

    // Validate document content (basic validation)
    if (!document.title.trim() || !document.content.trim()) {
      return NextResponse.json(
        { 
          error: AIpmErrorType.VALIDATION_ERROR, 
          message: '제목과 내용이 모두 입력되어야 승인을 요청할 수 있습니다.' 
        },
        { status: 400 }
      );
    }

    // Check if there are available approvers for this workflow step
    const hasApprovers = await checkAvailableApprovers(supabase, document.project_id, document.workflow_step);
    
    if (!hasApprovers) {
      return NextResponse.json(
        { 
          error: AIpmErrorType.VALIDATION_ERROR, 
          message: '이 워크플로우 단계를 승인할 수 있는 담당자가 프로젝트에 없습니다.' 
        },
        { status: 400 }
      );
    }

    // Update document status to pending_approval
    const { data: updatedDocument, error: updateError } = await supabase
      .from('planning_documents')
      .update({
        status: 'pending_approval',
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select(`
        *,
        creator:user_profiles!created_by(email, full_name),
        approver:user_profiles!approved_by(email, full_name)
      `)
      .single();

    if (updateError) {
      console.error('Error requesting approval:', updateError);
      return NextResponse.json(
        { error: AIpmErrorType.DATABASE_ERROR, message: '승인 요청 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // The approval history will be automatically created by the database trigger

    // Format response
    const documentWithUsers = {
      ...updatedDocument,
      creator_email: updatedDocument.creator?.email || '',
      creator_name: updatedDocument.creator?.full_name || null,
      approver_email: updatedDocument.approver?.email || null,
      approver_name: updatedDocument.approver?.full_name || null
    };

    // Remove nested objects
    delete documentWithUsers.creator;
    delete documentWithUsers.approver;

    const response: DocumentResponse = { document: documentWithUsers };
    return NextResponse.json(response);

  } catch (error) {
    console.error('Request Approval API Error:', error);
    return NextResponse.json(
      { 
        error: AIpmErrorType.INTERNAL_ERROR, 
        message: '서버 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// Helper function to check if there are available approvers for a workflow step
async function checkAvailableApprovers(
  supabase: any, 
  projectId: string, 
  workflowStep: number
): Promise<boolean> {
  // Define which roles can approve which workflow steps
  const approvalMatrix: Record<number, string[]> = {
    1: ['서비스기획'], // 서비스 개요 및 목표 설정
    2: ['서비스기획'], // 타겟 사용자 분석
    3: ['서비스기획'], // 핵심 기능 정의
    4: ['UIUX기획'], // 사용자 경험 설계
    5: ['개발자'], // 기술 스택 및 아키텍처
    6: ['서비스기획'], // 개발 일정 및 마일스톤
    7: ['서비스기획'], // 리스크 분석 및 대응 방안
    8: ['서비스기획'], // 성과 지표 및 측정 방법
    9: ['콘텐츠기획', '서비스기획'] // 런칭 및 마케팅 전략
  };

  const requiredRoles = approvalMatrix[workflowStep] || [];
  
  if (requiredRoles.length === 0) {
    return false;
  }

  // Check if there are project members with the required roles
  const { data: members, error } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .in('role', requiredRoles);

  if (error) {
    console.error('Error checking approvers:', error);
    return false;
  }

  return members && members.length > 0;
}