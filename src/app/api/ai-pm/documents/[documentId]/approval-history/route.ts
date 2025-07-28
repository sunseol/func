import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  AIpmErrorType
} from '@/types/ai-pm';

// Define approval history types
export interface ApprovalHistoryEntry {
  id: string;
  document_id: string;
  user_id: string;
  action: 'requested' | 'approved' | 'rejected';
  previous_status: string;
  new_status: string;
  reason?: string;
  created_at: string;
  user_email: string;
  user_name: string | null;
}

export interface ApprovalHistoryResponse {
  history: ApprovalHistoryEntry[];
}

// GET /api/ai-pm/documents/[documentId]/approval-history - Get approval history for a document
export async function GET(
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

    // First, check if the document exists and if user has access to it
    const { data: document, error: docError } = await supabase
      .from('planning_documents')
      .select('id, project_id, status, created_by')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: AIpmErrorType.DOCUMENT_NOT_FOUND, message: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Check access permissions
    const canAccess = document.status === 'official' || document.created_by === user.id;
    
    if (!canAccess) {
      // Check if user is admin
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!userProfile || userProfile.role !== 'admin') {
        // Check if user is project member
        const { data: projectMember } = await supabase
          .from('project_members')
          .select('id')
          .eq('project_id', document.project_id)
          .eq('user_id', user.id)
          .single();

        if (!projectMember) {
          return NextResponse.json(
            { error: AIpmErrorType.FORBIDDEN, message: '승인 히스토리에 접근할 권한이 없습니다.' },
            { status: 403 }
          );
        }
      }
    }

    // Get approval history
    const { data: history, error: historyError } = await supabase
      .from('document_approval_history')
      .select(`
        id,
        document_id,
        user_id,
        action,
        previous_status,
        new_status,
        reason,
        created_at,
        user_profiles!user_id(email, full_name)
      `)
      .eq('document_id', documentId)
      .order('created_at', { ascending: true });

    if (historyError) {
      console.error('Error fetching approval history:', historyError);
      return NextResponse.json(
        { error: AIpmErrorType.DATABASE_ERROR, message: '승인 히스토리 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // Format response
    const formattedHistory: ApprovalHistoryEntry[] = (history || []).map(entry => ({
      id: entry.id,
      document_id: entry.document_id,
      user_id: entry.user_id,
      action: entry.action,
      previous_status: entry.previous_status,
      new_status: entry.new_status,
      reason: entry.reason,
      created_at: entry.created_at,
      user_email: entry.user_profiles?.email || '',
      user_name: entry.user_profiles?.full_name || null
    }));

    const response: ApprovalHistoryResponse = { history: formattedHistory };
    return NextResponse.json(response);

  } catch (error) {
    console.error('Get Approval History API Error:', error);
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