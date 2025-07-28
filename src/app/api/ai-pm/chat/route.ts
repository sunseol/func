import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAIService } from '@/lib/ai-pm/ai-service';
import { getConversationManager } from '@/lib/ai-pm/conversation-manager';
import { 
  SendMessageRequest, 
  ConversationResponse, 
  AIpmErrorType,
  isValidWorkflowStep 
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
    const body: SendMessageRequest = await request.json();
    const { message, workflow_step } = body;

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

    // Validate message
    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: AIpmErrorType.VALIDATION_ERROR, message: '메시지 내용이 필요합니다.' },
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

    // Add user message to conversation
    await conversationManager.addMessage(projectId, workflow_step, user.id, {
      role: 'user',
      content: message.trim()
    });

    // Get current conversation history
    const messages = await conversationManager.getCurrentMessages(projectId, workflow_step, user.id);

    // Get project context for AI
    const { data: project } = await supabase
      .from('projects')
      .select('name, description')
      .eq('id', projectId)
      .single();

    const projectContext = project 
      ? `프로젝트명: ${project.name}\n프로젝트 설명: ${project.description || '없음'}`
      : undefined;

    // Generate AI response
    const aiResponse = await aiService.generateResponse(messages, workflow_step, projectContext);

    // Add AI response to conversation
    await conversationManager.addMessage(projectId, workflow_step, user.id, {
      role: 'assistant',
      content: aiResponse
    });

    // Force save conversation
    await conversationManager.forceSave(projectId, workflow_step, user.id);

    // Load and return updated conversation
    const conversation = await conversationManager.loadConversation(projectId, workflow_step, user.id);

    if (!conversation) {
      return NextResponse.json(
        { error: AIpmErrorType.INTERNAL_ERROR, message: '대화를 저장하는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    const response: ConversationResponse = { conversation };
    return NextResponse.json(response);

  } catch (error) {
    console.error('Chat API Error:', error);
    
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

    // Get parameters from URL
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    const workflowStepParam = url.searchParams.get('workflowStep');

    if (!projectId) {
      return NextResponse.json(
        { error: AIpmErrorType.INVALID_PROJECT_ID, message: '프로젝트 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!workflowStepParam) {
      return NextResponse.json(
        { error: AIpmErrorType.INVALID_WORKFLOW_STEP, message: '워크플로우 단계가 필요합니다.' },
        { status: 400 }
      );
    }

    const workflowStep = parseInt(workflowStepParam);
    if (!isValidWorkflowStep(workflowStep)) {
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

    // Load conversation
    const conversationManager = getConversationManager();
    const conversation = await conversationManager.loadConversation(projectId, workflowStep, user.id);

    if (!conversation) {
      // Return empty conversation structure
      const emptyConversation = {
        id: '',
        project_id: projectId,
        workflow_step: workflowStep,
        user_id: user.id,
        messages: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const response: ConversationResponse = { conversation: emptyConversation };
      return NextResponse.json(response);
    }

    const response: ConversationResponse = { conversation };
    return NextResponse.json(response);

  } catch (error) {
    console.error('Get Chat API Error:', error);
    
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

export async function DELETE(request: NextRequest) {
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

    // Get parameters from URL
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    const workflowStepParam = url.searchParams.get('workflowStep');

    if (!projectId) {
      return NextResponse.json(
        { error: AIpmErrorType.INVALID_PROJECT_ID, message: '프로젝트 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!workflowStepParam) {
      return NextResponse.json(
        { error: AIpmErrorType.INVALID_WORKFLOW_STEP, message: '워크플로우 단계가 필요합니다.' },
        { status: 400 }
      );
    }

    const workflowStep = parseInt(workflowStepParam);
    if (!isValidWorkflowStep(workflowStep)) {
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

    // Clear conversation
    const conversationManager = getConversationManager();
    await conversationManager.clearConversation(projectId, workflowStep, user.id);

    return NextResponse.json({ message: '대화 기록이 삭제되었습니다.' });

  } catch (error) {
    console.error('Delete Chat API Error:', error);
    
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