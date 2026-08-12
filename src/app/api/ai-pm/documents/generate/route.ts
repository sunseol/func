import { NextRequest } from 'next/server';
import { ApiError, json, parseJson, withApi } from '@/lib/http';
import { getAIService } from '@/lib/ai-pm/ai-service';
import { getConversationManager } from '@/lib/ai-pm/conversation-manager';
import { getSupabase, requireAuth, requireProjectAccess } from '@/lib/ai-pm/auth';
import { requireString, requireUuid, requireWorkflowStep } from '@/lib/ai-pm/validators';
import { AIpmErrorType, type DocumentResponse, getWorkflowStepName } from '@/types/ai-pm';
import { fetchDocumentWithUsers } from '../document-response';

export const dynamic = 'force-dynamic';

export const POST = withApi(async (request: NextRequest) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);

  const url = new URL(request.url);
  const projectId = requireUuid(requireString(url.searchParams.get('projectId'), 'projectId'), 'projectId');

  const body = await parseJson<{ workflow_step?: number }>(request, { maxBytes: 8_192, requireContentType: true });
  const workflowStep = requireWorkflowStep(body.workflow_step, 'workflow_step');

  await requireProjectAccess(supabase, auth, projectId);

  const conversationManager = getConversationManager(supabase);
  const aiService = getAIService();

  const messages = await conversationManager.getCurrentMessages(projectId, workflowStep, auth.user.id);

  const { data: project } = await supabase
    .from('projects')
    .select('name, description')
    .eq('id', projectId)
    .single();

  const projectContext = project
    ? `Project: ${project.name}\nDescription: ${project.description || 'N/A'}`
    : undefined;

  const documentContent = await aiService.generateDocument(messages, workflowStep, projectContext, auth.user.id);

  const stepName = getWorkflowStepName(workflowStep);
  const documentTitle = `${stepName} - ${project?.name || 'Project plan'}`;

  const { data: savedDocument, error: saveError } = await supabase
    .from('planning_documents')
    .insert({
      project_id: projectId,
      workflow_step: workflowStep,
      title: documentTitle,
      content: documentContent,
      status: 'private',
      version: 1,
      created_by: auth.user.id,
    })
    .select('*')
    .single();

  if (saveError || !savedDocument) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to save document', saveError);
  }

  const enrichedDocument = await fetchDocumentWithUsers(supabase, savedDocument.id);
  const response: DocumentResponse = { document: enrichedDocument };
  return json(response, { status: 201 });
});
