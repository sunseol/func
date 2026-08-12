import { NextRequest } from 'next/server';
import { ApiError, json, parseJson, withApi } from '@/lib/http';
import { getAIService } from '@/lib/ai-pm/ai-service';
import { getConversationManager } from '@/lib/ai-pm/conversation-manager';
import { getSupabase, requireAuth, requireProjectAccess } from '@/lib/ai-pm/auth';
import { requireString, requireUuid, requireWorkflowStep } from '@/lib/ai-pm/validators';
import { parseSendMessageRequest } from './input';
import type { AIChatMessage } from '@/types/ai-pm';
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
  const aiService = getAIService();

  const idempotencyKey = body.idempotency_key ?? crypto.randomUUID();
  const userMessageId = body.user_message_id ?? crypto.randomUUID();
  const assistantMessageId = body.assistant_message_id ?? crypto.randomUUID();

  const userMessage = {
    id: userMessageId,
    role: 'user',
    content: message,
    timestamp: new Date().toISOString(),
  } as const;

  const requestClaim = await conversationManager.claimRequest(projectId, workflowStep, {
    idempotencyKey,
    userMessageId,
    assistantMessageId,
  });
  if (requestClaim.status === 'completed' && requestClaim.responseContent !== undefined) {
    return json({ response: requestClaim.responseContent });
  }
  if (requestClaim.status !== 'owner' || requestClaim.ownerToken === undefined) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Unable to claim conversation request');
  }

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

  let aiResponse: string;
  try {
    aiResponse = await aiService.generateResponse(contextMessages, workflowStep, projectContext);
  } catch (error) {
    try {
      await conversationManager.failRequest(projectId, workflowStep, {
        idempotencyKey,
        userMessageId,
        assistantMessageId,
      }, requestClaim.ownerToken);
    } catch (cleanupError) {
      console.error('Conversation request release failed', cleanupError instanceof Error ? cleanupError.message : 'unknown error');
    }
    const isKnownAiError =
      typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      error.error === AIpmErrorType.AI_SERVICE_ERROR;
    console.error('AI service request failed', {
      errorType: isKnownAiError ? AIpmErrorType.AI_SERVICE_ERROR : 'UNKNOWN',
    });
    throw new ApiError(500, AIpmErrorType.AI_SERVICE_ERROR, 'Unable to generate AI response');
  }

  const persistedConversation = await conversationManager.completeRequest(projectId, workflowStep, {
    idempotencyKey,
    userMessageId,
    assistantMessageId,
  }, requestClaim.ownerToken, [userMessage, {
    id: assistantMessageId,
    role: 'assistant',
    content: aiResponse,
  }]);
  const persistedAssistant = persistedConversation.messages.find(
    (item) => item.id === assistantMessageId && item.role === 'assistant',
  );
  if (!persistedAssistant) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Persisted conversation is missing the assistant response');
  }
  return json({ response: persistedAssistant.content });
});

export const GET = withApi(async (request: NextRequest) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);

  const url = new URL(request.url);
  const projectId = requireUuid(requireString(url.searchParams.get('projectId'), 'projectId'), 'projectId');
  const workflowStep = requireWorkflowStep(
    Number(requireString(url.searchParams.get('workflowStep'), 'workflowStep')),
    'workflowStep',
  );

  await requireProjectAccess(supabase, auth, projectId);

  const conversationManager = getConversationManager(supabase);
  const conversation = await conversationManager.loadConversation(projectId, workflowStep, auth.user.id);

  if (!conversation) {
    const emptyConversation = {
      id: '',
      project_id: projectId,
      workflow_step: workflowStep,
      user_id: auth.user.id,
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return json({ conversation: emptyConversation });
  }

  return json({ conversation });
});

export const PUT = withApi(async (_request: NextRequest) => {
  throw new ApiError(405, AIpmErrorType.VALIDATION_ERROR, 'Manual conversation updates are not supported');
});

export const DELETE = withApi(async (request: NextRequest) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);

  const url = new URL(request.url);
  const projectId = requireUuid(requireString(url.searchParams.get('projectId'), 'projectId'), 'projectId');
  const workflowStep = requireWorkflowStep(
    Number(requireString(url.searchParams.get('workflowStep'), 'workflowStep')),
    'workflowStep',
  );

  await requireProjectAccess(supabase, auth, projectId);

  const conversationManager = getConversationManager(supabase);
  await conversationManager.clearConversation(projectId, workflowStep, auth.user.id);

  return json({ message: 'OK' });
});
