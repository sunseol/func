import { NextRequest } from 'next/server';
import { ApiError, json, parseJson, withApi } from '@/lib/http';
import { getAIService } from '@/lib/ai-pm/ai-service';
import { getConversationManager } from '@/lib/ai-pm/conversation-manager';
import { getSupabase, requireAuth, requireProjectAccess } from '@/lib/ai-pm/auth';
import { requireMaxLength, requireString, requireUuid, requireWorkflowStep } from '@/lib/ai-pm/validators';
import { AIChatMessage, AIpmErrorType, ConversationResponse, SendMessageRequest } from '@/types/ai-pm';

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
  const aiService = getAIService();

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

  let aiResponse: string;
  try {
    aiResponse = await aiService.generateResponse(messages, workflowStep, projectContext);
  } catch (error) {
    const typedError = error as any;
    if (typedError?.error === AIpmErrorType.AI_SERVICE_ERROR) {
      throw new ApiError(500, typedError.error, typedError.message, typedError.details);
    }
    throw new ApiError(500, AIpmErrorType.AI_SERVICE_ERROR, 'Failed to generate AI response');
  }

  await conversationManager.addMessage(projectId, workflowStep, auth.user.id, {
    role: 'assistant',
    content: aiResponse,
  });

  await conversationManager.forceSave(projectId, workflowStep, auth.user.id);
  return json({ response: aiResponse });
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
    return json({ conversation: emptyConversation } as ConversationResponse);
  }

  return json({ conversation } as ConversationResponse);
});

export const PUT = withApi(async (request: NextRequest) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);

  const body = await parseJson<{ messages?: AIChatMessage[]; workflow_step?: number; projectId?: string }>(request);
  const projectId = requireUuid(requireString(body.projectId, 'projectId'), 'projectId');
  const workflowStep = requireWorkflowStep(body.workflow_step, 'workflow_step');

  if (!Array.isArray(body.messages)) {
    throw new ApiError(400, AIpmErrorType.VALIDATION_ERROR, 'messages must be an array');
  }

  await requireProjectAccess(supabase, auth, projectId);

  const conversationManager = getConversationManager(supabase);
  await conversationManager.updateConversationMessages(projectId, workflowStep, auth.user.id, body.messages);

  return json({ message: 'Conversation updated' });
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
