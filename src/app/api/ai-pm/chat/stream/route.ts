import { NextRequest } from 'next/server';
import { parseJson, withApi } from '@/lib/http';
import { getAIService } from '@/lib/ai-pm/ai-service';
import { getConversationManager } from '@/lib/ai-pm/conversation-manager';
import { getSupabase, requireAuth, requireProjectAccess } from '@/lib/ai-pm/auth';
import { requireString, requireUuid } from '@/lib/ai-pm/validators';
import { parseSendMessageRequest } from '../input';
import { AIpmErrorType } from '@/types/ai-pm';

export const POST = withApi(async (request: NextRequest) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);

  const body = parseSendMessageRequest(await parseJson<unknown>(request, { maxBytes: 8192 }));
  const { message, workflow_step: workflowStep } = body;

  const url = new URL(request.url);
  const projectId = requireUuid(requireString(url.searchParams.get('projectId'), 'projectId'), 'projectId');

  await requireProjectAccess(supabase, auth, projectId);

  const conversationManager = getConversationManager(supabase);
  const idempotencyKey = body.idempotency_key ?? crypto.randomUUID();
  const userMessageId = body.user_message_id ?? crypto.randomUUID();
  const assistantMessageId = body.assistant_message_id ?? crypto.randomUUID();
  const userMessage = {
    id: userMessageId,
    role: 'user',
    content: message,
    timestamp: new Date().toISOString(),
  } as const;

  const messages = await conversationManager.getCurrentMessages(projectId, workflowStep, auth.user.id);
  const contextMessages = [...messages, userMessage];

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
  let streamFailed = false;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let previous = '';
        for await (const chunk of aiService.generateStreamingResponse(contextMessages, workflowStep, projectContext)) {
          if (chunk.error) {
            streamFailed = true;
            const errorData = {
              error: AIpmErrorType.AI_SERVICE_ERROR,
              message: 'Unable to generate AI response',
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

        if (!streamFailed && accumulatedResponse.trim()) {
          await conversationManager.appendMessages(projectId, workflowStep, [userMessage, {
            id: assistantMessageId,
            role: 'assistant',
            content: accumulatedResponse.trim(),
          }], { idempotencyKey });
        }
      } catch (error) {
        console.error('Streaming error', {
          errorType: error instanceof Error ? 'Error' : 'UNKNOWN',
        });
        const errorData = {
          error: AIpmErrorType.INTERNAL_ERROR,
          message: 'Streaming failed',
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
