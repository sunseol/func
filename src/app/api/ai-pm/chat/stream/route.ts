import { NextRequest } from 'next/server';
import { ApiError, parseJson, withApi } from '@/lib/http';
import { getAIService } from '@/lib/ai-pm/ai-service';
import { getConversationManager } from '@/lib/ai-pm/conversation-manager';
import { getSupabase, requireAuth, requireProjectAccess } from '@/lib/ai-pm/auth';
import { requireMaxLength, requireString, requireUuid, requireWorkflowStep } from '@/lib/ai-pm/validators';
import { AIpmErrorType, SendMessageRequest } from '@/types/ai-pm';

export const POST = withApi(async (request: NextRequest) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);

  const body = await parseJson<SendMessageRequest>(request);
  const message = requireMaxLength(requireString(body.message, 'message'), 'message', 5000);
  const workflowStep = requireWorkflowStep(body.workflow_step, 'workflow_step');

  const url = new URL(request.url);
  const projectId = requireUuid(requireString(url.searchParams.get('projectId'), 'projectId'), 'projectId');

  await requireProjectAccess(supabase, auth, projectId);

  const conversationManager = getConversationManager(supabase);
  await conversationManager.addMessage(projectId, workflowStep, auth.user.id, {
    role: 'user',
    content: message,
  });

  const messages = await conversationManager.getCurrentMessages(projectId, workflowStep, auth.user.id);

  const { data: project } = await supabase
    .from('projects')
    .select('name, description')
    .eq('id', projectId)
    .single();

  const projectContext = project
    ? `Project: ${project.name}\nDescription: ${project.description || 'N/A'}`
    : undefined;

  const aiService = getAIService();

  const encoder = new TextEncoder();
  let accumulatedResponse = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let previous = '';
        for await (const chunk of aiService.generateStreamingResponse(messages, workflowStep, projectContext)) {
          if (chunk.error) {
            const errorData = {
              error: AIpmErrorType.AI_SERVICE_ERROR,
              message: chunk.error,
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
            break;
          }

          const delta = chunk.content.slice(previous.length);
          previous = chunk.content;
          if (!delta) continue;

          accumulatedResponse += delta;
          const data = { content: delta, timestamp: new Date().toISOString() };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }

        if (accumulatedResponse.trim()) {
          await conversationManager.addMessage(projectId, workflowStep, auth.user.id, {
            role: 'assistant',
            content: accumulatedResponse.trim(),
          });
          await conversationManager.forceSave(projectId, workflowStep, auth.user.id);
        }
      } catch (error) {
        console.error('Streaming error:', error);
        const errorData = {
          error: AIpmErrorType.INTERNAL_ERROR,
          message: 'Streaming failed',
          details: error instanceof Error ? error.message : String(error),
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
});
