import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAuth } from '@/lib/ai-pm/auth-middleware';
import { getConversationManager } from '@/lib/ai-pm/conversation-manager';
import { 
  AIpmErrorType,
  WorkflowStep,
  isValidWorkflowStep,
  WORKFLOW_STEPS,
  AIChatMessage
} from '@/types/ai-pm';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const generateTextContent = (project: any, step: WorkflowStep, messages: AIChatMessage[]): string => {
  let text = `AI 대화 기록\n\n`;
  text += `========================================\n`;
  text += `프로젝트: ${project?.name || '알 수 없음'}\n`;
  text += `단계: ${step}단계 - ${WORKFLOW_STEPS[step]}\n`;
  text += `생성일: ${format(new Date(), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}\n`;
  text += `총 메시지: ${messages.length}개\n`;
  text += `========================================\n\n`;

  messages.forEach((message, index) => {
    const role = message.role === 'user' ? '👤 사용자' : '🤖 AI 어시스턴트';
    const timestamp = format(new Date(message.timestamp), 'yyyy-MM-dd HH:mm:ss', { locale: ko });
    
    text += `[${index + 1}] ${role} (${timestamp})\n`;
    text += `----------------------------------------\n`;
    text += `${message.content}\n\n`;
  });
  return text;
};

const generateHtmlContent = (project: any, step: WorkflowStep, messages: AIChatMessage[]): string => {
  let html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <title>AI 대화 기록</title>
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
        <h1>AI 대화 기록</h1>
        <p><strong>프로젝트:</strong> ${project?.name || '알 수 없음'} | <strong>단계:</strong> ${step}단계 - ${WORKFLOW_STEPS[step]}</p>
      </div>
  `;

  messages.forEach(message => {
    const role = message.role === 'user' ? '👤 사용자' : '🤖 AI 어시스턴트';
    const timestamp = format(new Date(message.timestamp), 'yyyy-MM-dd HH:mm:ss', { locale: ko });
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
    const exportFormat = url.searchParams.get('format') || 'text';

    if (!projectId || !workflowStepParam) {
      return NextResponse.json({ error: AIpmErrorType.VALIDATION_ERROR, message: '프로젝트 ID와 워크플로우 단계가 필요합니다.' }, { status: 400 });
    }

    const workflowStep = parseInt(workflowStepParam);
    if (!isValidWorkflowStep(workflowStep)) {
      return NextResponse.json({ error: AIpmErrorType.INVALID_WORKFLOW_STEP, message: '유효하지 않은 워크플로우 단계입니다.' }, { status: 400 });
    }

    if (!['text', 'html'].includes(exportFormat)) {
      return NextResponse.json({ error: AIpmErrorType.VALIDATION_ERROR, message: '지원하지 않는 내보내기 형식입니다.' }, { status: 400 });
    }
    
    const { data: project } = await supabase.from('projects').select('name').eq('id', projectId).single();
    const conversationManager = getConversationManager(supabase);
    const conversation = await conversationManager.loadConversation(projectId, workflowStep, user.id);

    if (!conversation || conversation.messages.length === 0) {
      return NextResponse.json({ error: AIpmErrorType.DOCUMENT_NOT_FOUND, message: '내보낼 대화 기록이 없습니다.' }, { status: 404 });
    }

    let content = '';
    let contentType = '';
    let fileExtension = '';

    if (exportFormat === 'text') {
      content = generateTextContent(project, workflowStep, conversation.messages);
      contentType = 'text/plain; charset=utf-8';
      fileExtension = 'txt';
    } else { // html
      content = generateHtmlContent(project, workflowStep, conversation.messages);
      contentType = 'text/html; charset=utf-8';
      fileExtension = 'html';
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="conversation-step-${workflowStep}-${new Date().toISOString().slice(0,10)}.${fileExtension}"`
      }
    });

  } catch (error) {
    console.error('Export Conversation API Error:', error);
    return NextResponse.json({ error: AIpmErrorType.INTERNAL_ERROR, message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
