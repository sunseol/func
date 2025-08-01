import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  PendingApprovalsResponse,
  PendingApprovalDocument,
  AIpmErrorType
} from '@/types/ai-pm';

// GET /api/ai-pm/documents/pending-approvals - Get documents pending approval for current user
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

    // Use the database function to get pending approvals for the user
    const { data: pendingDocuments, error: queryError } = await supabase
      .rpc('get_pending_approvals_for_user', { user_uuid: user.id });

    if (queryError) {
      console.error('Error fetching pending approvals:', queryError);
      return NextResponse.json(
        { error: AIpmErrorType.DATABASE_ERROR, message: '승인 대기 문서 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // Format response
    const documents: PendingApprovalDocument[] = (pendingDocuments || []).map(doc => ({
      document_id: doc.document_id,
      project_id: doc.project_id,
      project_name: doc.project_name,
      workflow_step: doc.workflow_step,
      step_name: doc.step_name,
      title: doc.title,
      creator_name: doc.creator_name,
      creator_email: doc.creator_email,
      created_at: doc.created_at,
      updated_at: doc.updated_at
    }));

    const response: PendingApprovalsResponse = { documents };
    return NextResponse.json(response);

  } catch (error) {
    console.error('Get Pending Approvals API Error:', error);
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