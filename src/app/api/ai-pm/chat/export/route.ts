import { NextRequest, NextResponse } from 'next/server';
import { ApiError, withApi } from '@/lib/http';
import { getSupabase, requireAuth, requireProjectAccess } from '@/lib/ai-pm/auth';
import { requireString, requireUuid, requireWorkflowStep } from '@/lib/ai-pm/validators';
import { getConversationManager } from '@/lib/ai-pm/conversation-manager';
import { AIChatMessage, AIpmErrorType, WORKFLOW_STEPS, WorkflowStep } from '@/types/ai-pm';
import { format } from 'date-fns';

const generateTextContent = (project: any, step: WorkflowStep, messages: AIChatMessage[]): string => {
  let text = `AI conversation export\n\n`;
  text += `========================================\n`;
  text += `Project: ${project?.name || 'N/A'}\n`;
  text += `Step: ${step} - ${WORKFLOW_STEPS[step]}\n`;
  text += `Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}\n`;
  text += `Messages: ${messages.length}\n`;
  text += `========================================\n\n`;

  messages.forEach((message, index) => {
    const role = message.role === 'user' ? 'User' : 'Assistant';
    const timestamp = format(new Date(message.timestamp), 'yyyy-MM-dd HH:mm:ss');

    text += `[${index + 1}] ${role} (${timestamp})\n`;
    text += `----------------------------------------\n`;
    text += `${message.content}\n\n`;
  });

  return text;
};

const generateHtmlContent = (project: any, step: WorkflowStep, messages: AIChatMessage[]): string => {
  let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>AI Conversation Export</title>
      <style>
        body { font-family: sans-serif; line-height: 1.6; padding: 20px; }
        .header { text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 20px; }
        .message { margin-bottom: 20px; padding: 10px; border-radius: 5px; }
        .user { background-color: #e1f5fe; border-left: 5px solid #03a9f4; }
        .assistant { background-color: #f1f8e9; border-left: 5px solid #8bc34a; }
        .role { font-weight: bold; }
        .timestamp { font-size: 0.8em; color: #555; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>AI Conversation Export</h1>
        <p><strong>Project:</strong> ${project?.name || 'N/A'} | <strong>Step:</strong> ${step} - ${WORKFLOW_STEPS[step]}</p>
      </div>
  `;

  messages.forEach((message) => {
    const role = message.role === 'user' ? 'User' : 'Assistant';
    const timestamp = format(new Date(message.timestamp), 'yyyy-MM-dd HH:mm:ss');
    html += `
      <div class="message ${message.role}">
        <p><span class="role">${role}</span> <span class="timestamp">- ${timestamp}</span></p>
        <div>${message.content.replace(/\n/g, '<br>')}</div>
      </div>
    `;
  });

  html += `</body></html>`;
  return html;
};

export const GET = withApi(async (request: NextRequest) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);

  const url = new URL(request.url);
  const projectId = requireUuid(requireString(url.searchParams.get('projectId'), 'projectId'), 'projectId');
  const workflowStep = requireWorkflowStep(
    Number(requireString(url.searchParams.get('workflowStep'), 'workflowStep')),
    'workflowStep',
  );
  const exportFormat = url.searchParams.get('format') || 'text';

  if (!['text', 'html'].includes(exportFormat)) {
    throw new ApiError(400, AIpmErrorType.VALIDATION_ERROR, 'Unsupported export format');
  }

  await requireProjectAccess(supabase, auth, projectId);

  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single();

  const conversationManager = getConversationManager(supabase);
  const conversation = await conversationManager.loadConversation(projectId, workflowStep, auth.user.id);

  if (!conversation || conversation.messages.length === 0) {
    throw new ApiError(404, AIpmErrorType.DOCUMENT_NOT_FOUND, 'Conversation not found');
  }

  let content = '';
  let contentType = '';
  let fileExtension = '';

  if (exportFormat === 'text') {
    content = generateTextContent(project, workflowStep, conversation.messages);
    contentType = 'text/plain; charset=utf-8';
    fileExtension = 'txt';
  } else {
    content = generateHtmlContent(project, workflowStep, conversation.messages);
    contentType = 'text/html; charset=utf-8';
    fileExtension = 'html';
  }

  return new NextResponse(content, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="conversation-step-${workflowStep}-${new Date().toISOString().slice(0, 10)}.${fileExtension}"`,
    },
  });
});
