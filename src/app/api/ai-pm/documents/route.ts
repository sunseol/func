import { NextRequest } from 'next/server';
import { ApiError, json, parseJson, withApi } from '@/lib/http';
import { getSupabase, isApproverRole, requireAuth, requireProjectAccess } from '@/lib/ai-pm/auth';
import { requireMaxLength, requireString, requireUuid, requireWorkflowStep, sanitizeText } from '@/lib/ai-pm/validators';
import { AIpmErrorType, type CreateDocumentRequest, type DocumentResponse, type DocumentsResponse } from '@/types/ai-pm';
import { fetchDocumentWithUsers } from './document-response';

export const dynamic = 'force-dynamic';

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

  const { data: membership, error: membershipError } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (membershipError) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to check document visibility', membershipError);
  }

  const { data: documents, error } = await supabase
    .from('planning_documents_with_users')
    .select('*')
    .eq('project_id', projectId)
    .eq('workflow_step', workflowStep)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to fetch documents', error);
  }

  const visibleDocuments = (documents ?? []).filter((document) => (
    auth.profile.role === 'admin' || document.status === 'official' || document.created_by === auth.user.id ||
    (document.status === 'pending_approval' && isApproverRole(membership?.role, document.workflow_step))
  ));

  return json({ documents: visibleDocuments } satisfies DocumentsResponse);
});

export const POST = withApi(async (request: NextRequest) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);

  const body = await parseJson<CreateDocumentRequest>(request, { maxBytes: 256_000, requireContentType: true });
  const projectId = requireUuid(requireString(body.project_id, 'project_id'), 'project_id');
  const workflowStep = requireWorkflowStep(body.workflow_step, 'workflow_step');
  const title = requireMaxLength(requireString(body.title, 'title'), 'title', 255);
  const content = requireMaxLength(requireString(body.content, 'content'), 'content', 200_000);

  await requireProjectAccess(supabase, auth, projectId);

  const { data: document, error } = await supabase
    .from('planning_documents')
    .insert({
      project_id: projectId,
      workflow_step: workflowStep,
      title: sanitizeText(title),
      content,
      status: 'private',
      version: 1,
      created_by: auth.user.id,
    })
    .select('*')
    .single();

  if (error || !document) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to create document', error);
  }

  const enrichedDocument = await fetchDocumentWithUsers(supabase, document.id);
  return json({ document: enrichedDocument } satisfies DocumentResponse, { status: 201 });
});
