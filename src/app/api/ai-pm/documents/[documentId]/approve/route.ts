import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  DocumentResponse,
  AIpmErrorType,
  ProjectRole
} from '@/types/ai-pm';

// POST /api/ai-pm/documents/[documentId]/approve - Approve a document
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

    // Get document with project info
    const { data: document, error: queryError } = await supabase
      .from('planning_documents')
      .select(`
        *,
        project:projects(id, name)
      `)
      .eq('id', documentId)
      .single();

    if (queryError || !document) {
      return NextResponse.json(
        { error: AIpmErrorType.DOCUMENT_NOT_FOUND, message: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Check if document is in pending_approval status
    if (document.status !== 'pending_approval') {
      return NextResponse.json(
        { 
          error: AIpmErrorType.VALIDATION_ERROR, 
          message: '승인 대기 중인 문서만 승인할 수 있습니다.' 
        },
        { status: 400 }
      );
    }

    // Check approval permissions
    const canApprove = await checkApprovalPermissions(supabase, user.id, document.project_id, document.workflow_step);
    
    if (!canApprove) {
      return NextResponse.json(
        { error: AIpmErrorType.FORBIDDEN, message: '문서를 승인할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // Update document status to official
    const { data: updatedDocument, error: updateError } = await supabase
      .from('planning_documents')
      .update({
        status: 'official',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
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
      console.error('Error approving document:', updateError);
      return NextResponse.json(
        { error: AIpmErrorType.DATABASE_ERROR, message: '문서 승인 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // Create approval history record
    await createApprovalHistory(supabase, {
      documentId,
      userId: user.id,
      action: 'approved',
      previousStatus: 'pending_approval',
      newStatus: 'official'
    });

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
    console.error('Approve Document API Error:', error);
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

// POST /api/ai-pm/documents/[documentId]/reject - Reject a document
export async function PUT(
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
    const body = await request.json();
    const { reason } = body;

    // Get document with project info
    const { data: document, error: queryError } = await supabase
      .from('planning_documents')
      .select(`
        *,
        project:projects(id, name)
      `)
      .eq('id', documentId)
      .single();

    if (queryError || !document) {
      return NextResponse.json(
        { error: AIpmErrorType.DOCUMENT_NOT_FOUND, message: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Check if document is in pending_approval status
    if (document.status !== 'pending_approval') {
      return NextResponse.json(
        { 
          error: AIpmErrorType.VALIDATION_ERROR, 
          message: '승인 대기 중인 문서만 반려할 수 있습니다.' 
        },
        { status: 400 }
      );
    }

    // Check approval permissions
    const canApprove = await checkApprovalPermissions(supabase, user.id, document.project_id, document.workflow_step);
    
    if (!canApprove) {
      return NextResponse.json(
        { error: AIpmErrorType.FORBIDDEN, message: '문서를 반려할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // Update document status back to private
    const { data: updatedDocument, error: updateError } = await supabase
      .from('planning_documents')
      .update({
        status: 'private',
        approved_by: null,
        approved_at: null,
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
      console.error('Error rejecting document:', updateError);
      return NextResponse.json(
        { error: AIpmErrorType.DATABASE_ERROR, message: '문서 반려 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // Create approval history record
    await createApprovalHistory(supabase, {
      documentId,
      userId: user.id,
      action: 'rejected',
      previousStatus: 'pending_approval',
      newStatus: 'private',
      reason
    });

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
    console.error('Reject Document API Error:', error);
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

// Helper function to check approval permissions
async function checkApprovalPermissions(
  supabase: any, 
  userId: string, 
  projectId: string, 
  workflowStep: number
): Promise<boolean> {
  // Check if user is admin
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (userProfile?.role === 'admin') {
    return true;
  }

  // Check if user is project member with appropriate role for the workflow step
  const { data: projectMember } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();

  if (!projectMember) {
    return false;
  }

  // Define which roles can approve which workflow steps
  const approvalMatrix: Record<number, ProjectRole[]> = {
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

  const allowedRoles = approvalMatrix[workflowStep] || [];
  return allowedRoles.includes(projectMember.role);
}

// Helper function to create approval history record
async function createApprovalHistory(
  supabase: any,
  data: {
    documentId: string;
    userId: string;
    action: 'approved' | 'rejected' | 'requested';
    previousStatus: string;
    newStatus: string;
    reason?: string;
  }
) {
  await supabase
    .from('document_approval_history')
    .insert([{
      document_id: data.documentId,
      user_id: data.userId,
      action: data.action,
      previous_status: data.previousStatus,
      new_status: data.newStatus,
      reason: data.reason,
      created_at: new Date().toISOString()
    }]);
}