import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DocumentsResponse,
  DocumentResponse,
  AIpmErrorType,
  isValidWorkflowStep,
  isValidDocumentStatus,
  getWorkflowStepName
} from '@/types/ai-pm';

// GET /api/ai-pm/documents - Get documents for a project
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

    // Get query parameters
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    const workflowStep = url.searchParams.get('workflowStep');
    const status = url.searchParams.get('status');

    if (!projectId) {
      return NextResponse.json(
        { error: AIpmErrorType.INVALID_PROJECT_ID, message: '프로젝트 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // Check project access
    const { data: projectMember, error: memberError } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !projectMember) {
      // Check if user is admin
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!userProfile || userProfile.role !== 'admin') {
        return NextResponse.json(
          { error: AIpmErrorType.FORBIDDEN, message: '프로젝트에 접근할 권한이 없습니다.' },
          { status: 403 }
        );
      }
    }

    // Build query
    let query = supabase
      .from('planning_documents')
      .select(`
        *,
        creator:user_profiles!created_by(email, full_name),
        approver:user_profiles!approved_by(email, full_name)
      `)
      .eq('project_id', projectId);

    // Add filters
    if (workflowStep && isValidWorkflowStep(parseInt(workflowStep))) {
      query = query.eq('workflow_step', parseInt(workflowStep));
    }

    if (status && isValidDocumentStatus(status)) {
      query = query.eq('status', status);
    }

    // Apply RLS - users can only see official documents and their own private documents
    if (userProfile?.role !== 'admin') {
      query = query.or(`status.eq.official,created_by.eq.${user.id}`);
    }

    query = query.order('created_at', { ascending: false });

    const { data: documents, error: queryError } = await query;

    if (queryError) {
      console.error('Error fetching documents:', queryError);
      return NextResponse.json(
        { error: AIpmErrorType.DATABASE_ERROR, message: '문서 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // Format response
    const documentsWithUsers = documents.map(doc => ({
      ...doc,
      creator_email: doc.creator?.email || '',
      creator_name: doc.creator?.full_name || null,
      approver_email: doc.approver?.email || null,
      approver_name: doc.approver?.full_name || null
    }));

    // Remove nested objects
    documentsWithUsers.forEach(doc => {
      delete doc.creator;
      delete doc.approver;
    });

    const response: DocumentsResponse = { documents: documentsWithUsers };
    return NextResponse.json(response);

  } catch (error) {
    console.error('Documents API Error:', error);
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

// POST /api/ai-pm/documents - Create a new document
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

    // Parse request body
    const body: CreateDocumentRequest & { project_id: string } = await request.json();
    const { project_id, workflow_step, title, content } = body;

    // Validate input
    if (!project_id || !title || !content) {
      return NextResponse.json(
        { error: AIpmErrorType.VALIDATION_ERROR, message: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    if (!isValidWorkflowStep(workflow_step)) {
      return NextResponse.json(
        { error: AIpmErrorType.INVALID_WORKFLOW_STEP, message: '유효하지 않은 워크플로우 단계입니다.' },
        { status: 400 }
      );
    }

    // Check project access
    const { data: projectMember, error: memberError } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !projectMember) {
      // Check if user is admin
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!userProfile || userProfile.role !== 'admin') {
        return NextResponse.json(
          { error: AIpmErrorType.FORBIDDEN, message: '프로젝트에 접근할 권한이 없습니다.' },
          { status: 403 }
        );
      }
    }

    // Create document
    const { data: document, error: createError } = await supabase
      .from('planning_documents')
      .insert([{
        project_id,
        workflow_step,
        title,
        content,
        status: 'private',
        version: 1,
        created_by: user.id
      }])
      .select(`
        *,
        creator:user_profiles!created_by(email, full_name),
        approver:user_profiles!approved_by(email, full_name)
      `)
      .single();

    if (createError) {
      console.error('Error creating document:', createError);
      return NextResponse.json(
        { error: AIpmErrorType.DATABASE_ERROR, message: '문서 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // Format response
    const documentWithUsers = {
      ...document,
      creator_email: document.creator?.email || '',
      creator_name: document.creator?.full_name || null,
      approver_email: document.approver?.email || null,
      approver_name: document.approver?.full_name || null
    };

    // Remove nested objects
    delete documentWithUsers.creator;
    delete documentWithUsers.approver;

    const response: DocumentResponse = { document: documentWithUsers };
    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Create Document API Error:', error);
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