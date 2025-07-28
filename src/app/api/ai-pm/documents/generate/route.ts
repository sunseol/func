import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAIService } from '@/lib/ai-pm/ai-service';
import { getConversationManager } from '@/lib/ai-pm/conversation-manager';
import { 
  CreateDocumentRequest,
  DocumentResponse,
  AIpmErrorType,
  isValidWorkflowStep,
  getWorkflowStepName
} from '@/types/ai-pm';

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
    const body: { workflow_step: number } = await request.json();
    const { workflow_step } = body;

    // Get project ID from URL
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: AIpmErrorType.INVALID_PROJECT_ID, message: '프로젝트 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // Validate workflow step
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

    // Get conversation manager and AI service
    const conversationManager = getConversationManager();
    const aiService = getAIService();

    // Get conversation history
    const messages = await conversationManager.getCurrentMessages(projectId, workflow_step, user.id);

    if (messages.length === 0) {
      return NextResponse.json(
        { error: AIpmErrorType.VALIDATION_ERROR, message: '문서를 생성하기 위한 대화 내용이 없습니다.' },
        { status: 400 }
      );
    }

    // Get project context for AI
    const { data: project } = await supabase
      .from('projects')
      .select('name, description')
      .eq('id', projectId)
      .single();

    const projectContext = project 
      ? `프로젝트명: ${project.name}\n프로젝트 설명: ${project.description || '없음'}`
      : undefined;

    // Generate document using AI
    const documentContent = await aiService.generateDocument(messages, workflow_step, projectContext);

    // Create document title
    const stepName = getWorkflowStepName(workflow_step);
    const documentTitle = `${stepName} - ${project?.name || '프로젝트'} 기획서`;

    // Save document to database
    const { data: document, error: saveError } = await supabase
      .from('planning_documents')
      .insert([{
        project_id: projectId,
        workflow_step: workflow_step,
        title: documentTitle,
        content: documentContent,
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

    if (saveError) {
      console.error('Error saving document:', saveError);
      return NextResponse.json(
        { error: AIpmErrorType.DATABASE_ERROR, message: '문서 저장 중 오류가 발생했습니다.' },
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
    return NextResponse.json(response);

  } catch (error) {
    console.error('Generate Document API Error:', error);
    
    if (error.error && error.message) {
      // This is an AIpmError
      const statusCode = error.error === AIpmErrorType.UNAUTHORIZED ? 401 :
                        error.error === AIpmErrorType.FORBIDDEN ? 403 :
                        error.error === AIpmErrorType.RATE_LIMITED ? 429 :
                        500;
      
      return NextResponse.json(error, { status: statusCode });
    }

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