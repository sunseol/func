import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAIService } from '@/lib/ai-pm/ai-service';
import { getConversationManager } from '@/lib/ai-pm/conversation-manager';
import { 
  SendMessageRequest, 
  AIpmErrorType,
  isValidWorkflowStep 
} from '@/types/ai-pm';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: AIpmErrorType.UNAUTHORIZED, message: '인증이 필요합니다.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: SendMessageRequest = await request.json();
    const { message, workflow_step } = body;

    // Get project ID from URL
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: AIpmErrorType.INVALID_PROJECT_ID, message: '프로젝트 ID가 필요합니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate workflow step
    if (!isValidWorkflowStep(workflow_step)) {
      return new Response(
        JSON.stringify({ error: AIpmErrorType.INVALID_WORKFLOW_STEP, message: '유효하지 않은 워크플로우 단계입니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate message
    if (!message || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: AIpmErrorType.VALIDATION_ERROR, message: '메시지 내용이 필요합니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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
        return new Response(
          JSON.stringify({ error: AIpmErrorType.FORBIDDEN, message: '프로젝트에 접근할 권한이 없습니다.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
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

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = '';
          
          // Generate streaming AI response
          for await (const chunk of aiService.generateStreamingResponse(messages, workflow_step, projectContext)) {
            if (chunk.error) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'error', 
                error: chunk.error 
              })}\n\n`));
              break;
            }

            // Send incremental content
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'content', 
              content: chunk.content,
              isComplete: chunk.isComplete
            })}\n\n`));

            if (chunk.isComplete) {
              fullResponse = chunk.content;
              break;
            }
          }

          // Add AI response to conversation if we got a complete response
          if (fullResponse) {
            await conversationManager.addMessage(projectId, workflow_step, user.id, {
              role: 'assistant',
              content: fullResponse
            });

            // Force save conversation
            await conversationManager.forceSave(projectId, workflow_step, user.id);

            // Send completion signal
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'complete',
              messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            })}\n\n`));
          }

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            error: error.message || 'AI 서비스 오류가 발생했습니다.' 
          })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Stream Chat API Error:', error);
    
    const errorResponse = {
      error: AIpmErrorType.INTERNAL_ERROR,
      message: '서버 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    };

    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}