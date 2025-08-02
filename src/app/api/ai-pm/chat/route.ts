import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAIService } from '@/lib/ai-pm/ai-service';
import { getConversationManager } from '@/lib/ai-pm/conversation-manager';
import { 
  SendMessageRequest, 
  ConversationResponse, 
  AIpmErrorType,
  isValidWorkflowStep,
  AIChatMessage
} from '@/types/ai-pm';
import { checkAuth } from '@/lib/ai-pm/auth-middleware';


// This file handles non-streaming chat interactions

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authResult = await checkAuth();
    if ('error' in authResult) {
      return NextResponse.json(authResult, { status: 401 });
    }
    const { user } = authResult;

    const body: SendMessageRequest = await request.json();
    const { message, workflow_step } = body;

    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: AIpmErrorType.INVALID_PROJECT_ID, message: '프로젝트 ID가 필요합니다.' }, { status: 400 });
    }
    if (!isValidWorkflowStep(workflow_step)) {
      return NextResponse.json({ error: AIpmErrorType.INVALID_WORKFLOW_STEP, message: '유효하지 않은 워크플로우 단계입니다.' }, { status: 400 });
    }
    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: AIpmErrorType.VALIDATION_ERROR, message: '메시지 내용이 필요합니다.' }, { status: 400 });
    }

    const conversationManager = getConversationManager(supabase);
    const aiService = getAIService();

    await conversationManager.addMessage(projectId, workflow_step, user.id, {
      role: 'user',
      content: message.trim()
    });

    const messages = await conversationManager.getCurrentMessages(projectId, workflow_step, user.id);

    const { data: project } = await supabase
      .from('projects')
      .select('name, description')
      .eq('id', projectId)
      .single();

    const projectContext = project 
      ? `프로젝트명: ${project.name}\n프로젝트 설명: ${project.description || '없음'}`
      : undefined;

    const aiResponse = await aiService.generateResponse(messages, workflow_step, projectContext);

    await conversationManager.addMessage(projectId, workflow_step, user.id, {
      role: 'assistant',
      content: aiResponse
    });

    await conversationManager.forceSave(projectId, workflow_step, user.id);
    const conversation = await conversationManager.loadConversation(projectId, workflow_step, user.id);

    if (!conversation) {
      return NextResponse.json({ error: AIpmErrorType.INTERNAL_ERROR, message: '대화를 저장하는 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ conversation } as ConversationResponse);

  } catch (error) {
    console.error('Chat API Error:', error);
    const typedError = error as any;
    if (typedError.error && typedError.message) {
      const statusCode = typedError.error === AIpmErrorType.UNAUTHORIZED ? 401 : 500;
      return NextResponse.json(error, { status: statusCode });
    }
    return NextResponse.json({ error: AIpmErrorType.INTERNAL_ERROR, message: '서버 오류가 발생했습니다.'}, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authResult = await checkAuth();
    if ('error' in authResult) {
        return NextResponse.json(authResult, { status: 401 });
    }
    const { user } = authResult;
    
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    const workflowStepParam = url.searchParams.get('workflowStep');

    if (!projectId || !workflowStepParam) {
      return NextResponse.json({ error: AIpmErrorType.VALIDATION_ERROR, message: '프로젝트 ID와 워크플로우 단계가 필요합니다.' }, { status: 400 });
    }

    const workflowStep = parseInt(workflowStepParam);
    if (!isValidWorkflowStep(workflowStep)) {
      return NextResponse.json({ error: AIpmErrorType.INVALID_WORKFLOW_STEP, message: '유효하지 않은 워크플로우 단계입니다.' }, { status: 400 });
    }

    const conversationManager = getConversationManager(supabase);
    const conversation = await conversationManager.loadConversation(projectId, workflowStep, user.id);

    if (!conversation) {
        const emptyConversation = {
            id: '', project_id: projectId, workflow_step: workflowStep, user_id: user.id,
            messages: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString()
        };
        return NextResponse.json({ conversation: emptyConversation } as ConversationResponse);
    }
    
    return NextResponse.json({ conversation } as ConversationResponse);

  } catch (error) {
    console.error('Get Conversation API Error:', error);
    return NextResponse.json({ error: AIpmErrorType.INTERNAL_ERROR, message: '대화 내용을 불러오는 중 오류가 발생했습니다.'}, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
    try {
      const supabase = await createClient();
      const authResult = await checkAuth();
      if ('error' in authResult) {
        return NextResponse.json(authResult, { status: 401 });
      }
      const { user } = authResult;
  
      const { messages, workflow_step, projectId } = await request.json();
  
      if (!projectId || !workflow_step || !Array.isArray(messages)) {
        return NextResponse.json({ error: AIpmErrorType.VALIDATION_ERROR, message: '잘못된 요청입니다.' }, { status: 400 });
      }
  
      const conversationManager = getConversationManager(supabase);
      await conversationManager.updateConversationMessages(projectId, workflow_step, user.id, messages as AIChatMessage[]);
      
      return NextResponse.json({ message: '대화가 성공적으로 저장되었습니다.' });
  
    } catch (error) {
      console.error('Update Conversation API Error:', error);
      return NextResponse.json({ error: AIpmErrorType.INTERNAL_ERROR, message: '대화 저장 중 오류가 발생했습니다.'}, { status: 500 });
    }
}
