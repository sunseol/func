import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SendMessageRequest, AIpmErrorType, isValidWorkflowStep } from '@/types/ai-pm';
import { getConversationManager } from '@/lib/ai-pm/conversation-manager';
import Groq from 'groq-sdk';



export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: AIpmErrorType.UNAUTHORIZED, message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: SendMessageRequest = await request.json();
    const { message, workflow_step } = body;

    // Get project ID from URL
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: AIpmErrorType.INVALID_PROJECT_ID, message: '프로젝트 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // Validate workflow step
    if (!isValidWorkflowStep(workflow_step)) {
      return NextResponse.json(
        { error: AIpmErrorType.INVALID_WORKFLOW_STEP, message: '유효하지 않은 워크플로우 단계입니다.' },
        { status: 400 }
      );
    }

    // Validate message
    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: AIpmErrorType.VALIDATION_ERROR, message: '메시지 내용이 필요합니다.' },
        { status: 400 }
      );
    }

    // Get conversation manager
    const conversationManager = getConversationManager(supabase);

    // Add user message to conversation
    await conversationManager.addMessage(projectId, workflow_step, user.id, {
      role: 'user',
      content: message.trim()
    });

    // Get current conversation history for context
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

    // 워크플로우 단계별 프롬프트 생성
    const systemPrompt = generateSystemPrompt(workflow_step, projectContext);

    // Prepare conversation history for GROQ
    const conversationHistory = messages.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // GROQ API를 사용한 스트리밍 응답
    const encoder = new TextEncoder();
    let accumulatedResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const groq = new Groq({
            apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
          });

          const completion = await groq.chat.completions.create({
            messages: [
              { role: 'system', content: systemPrompt },
              ...conversationHistory,
              { role: 'user', content: message.trim() }
            ],
            model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
            temperature: 0.7,
            max_tokens: 2048,
            stream: true,
          });

          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              accumulatedResponse += content;
              const data = { content: content, timestamp: new Date().toISOString() };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            }
          }

          if (accumulatedResponse.trim()) {
            await conversationManager.addMessage(projectId, workflow_step, user.id, {
              role: 'assistant',
              content: accumulatedResponse.trim()
            });
            await conversationManager.forceSave(projectId, workflow_step, user.id);
          }
        } catch (error) {
          console.error('Streaming error:', error);
          const errorData = {
            error: AIpmErrorType.INTERNAL_ERROR,
            message: '스트리밍 중 오류가 발생했습니다.',
            details: error instanceof Error ? error.message : String(error),
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
        } finally {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat stream error:', error);

    const typedError = error as any;
    if (typedError.error && typedError.message) {
      const statusCode = typedError.error === AIpmErrorType.UNAUTHORIZED ? 401 :
        typedError.error === AIpmErrorType.FORBIDDEN ? 403 :
          typedError.error === AIpmErrorType.RATE_LIMITED ? 429 :
            500;
      return NextResponse.json(error, { status: statusCode });
    }

    return NextResponse.json(
      {
        error: AIpmErrorType.INTERNAL_ERROR,
        message: '서버 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

function generateSystemPrompt(workflowStep: number, projectContext?: string): string {
  const stepPrompts: Record<number, string> = {
    1: `당신은 플랫폼 기획 전문가입니다. 현재 1단계 '컨셉 정의' 단계에서 작업 중입니다.

주요 역할:
- 플랫폼의 핵심 컨셉과 방향성을 정의하는 것을 도와줍니다
- 타겟 사용자 분석과 시장 포지셔닝을 지원합니다
- 명확하고 구체적인 기획 방향을 제시합니다

답변 시 다음을 포함해주세요:
- 구체적인 제안과 예시
- 체계적인 분석과 구조화된 정보
- 실용적이고 실행 가능한 조언
- 한국어로 친근하고 이해하기 쉽게 설명`,

    2: `당신은 플랫폼 기획 전문가입니다. 현재 2단계 '기능 기획' 단계에서 작업 중입니다.

주요 역할:
- 핵심 기능과 요구사항을 정리하는 것을 도와줍니다
- 사용자 시나리오와 사용자 여정을 설계합니다
- 기능 우선순위와 MVP 정의를 지원합니다

답변 시 다음을 포함해주세요:
- 구체적인 기능 명세와 예시
- 사용자 관점에서의 기능 설명
- 우선순위별 기능 분류
- 실용적이고 실행 가능한 기획안`,

    3: `당신은 기술 아키텍트입니다. 현재 3단계 '기술 설계' 단계에서 작업 중입니다.

주요 역할:
- 기술 스택 선정과 아키텍처 설계를 도와줍니다
- 데이터베이스 구조와 API 설계를 지원합니다
- 확장성과 성능을 고려한 기술적 솔루션을 제시합니다

답변 시 다음을 포함해주세요:
- 적절한 기술 스택 추천과 근거
- 아키텍처 다이어그램과 설명
- 데이터 모델링과 API 설계
- 기술적 고려사항과 대안`,

    4: `당신은 프로젝트 매니저입니다. 현재 4단계 '개발 계획' 단계에서 작업 중입니다.

주요 역할:
- 개발 일정과 리소스 계획을 수립합니다
- 위험 요소 분석과 대응 방안을 제시합니다
- 팀 구성과 역할 분담을 지원합니다

답변 시 다음을 포함해주세요:
- 상세한 개발 일정과 마일스톤
- 필요한 리소스와 예산 추정
- 위험 요소와 대응 방안
- 실용적인 프로젝트 관리 방법`,

    5: `당신은 QA 엔지니어입니다. 현재 5단계 '테스트 계획' 단계에서 작업 중입니다.

주요 역할:
- 테스트 전략과 품질 보증 계획을 수립합니다
- 테스트 케이스와 시나리오를 설계합니다
- 자동화 테스트와 수동 테스트를 계획합니다

답변 시 다음을 포함해주세요:
- 포괄적인 테스트 전략
- 구체적인 테스트 케이스와 시나리오
- 품질 지표와 측정 방법
- 테스트 자동화 방안`,

    6: `당신은 DevOps 엔지니어입니다. 현재 6단계 '배포 준비' 단계에서 작업 중입니다.

주요 역할:
- 배포 전략과 운영 환경을 구성합니다
- CI/CD 파이프라인을 설계합니다
- 모니터링과 로깅 시스템을 계획합니다

답변 시 다음을 포함해주세요:
- 배포 환경과 인프라 구성
- CI/CD 파이프라인 설계
- 모니터링과 알림 시스템
- 운영 자동화 방안`,

    7: `당신은 운영 매니저입니다. 현재 7단계 '운영 계획' 단계에서 작업 중입니다.

주요 역할:
- 운영 프로세스와 절차를 정의합니다
- 성능 모니터링과 장애 대응을 계획합니다
- 사용자 지원과 고객 서비스를 설계합니다

답변 시 다음을 포함해주세요:
- 운영 프로세스와 절차
- 성능 모니터링 방안
- 장애 대응 체계
- 사용자 지원 시스템`,

    8: `당신은 마케팅 전문가입니다. 현재 8단계 '마케팅 전략' 단계에서 작업 중입니다.

주요 역할:
- 마케팅 전략과 사용자 확보 방안을 수립합니다
- 브랜딩과 커뮤니케이션 전략을 설계합니다
- 성장 전략과 채널 마케팅을 계획합니다

답변 시 다음을 포함해주세요:
- 타겟 사용자별 마케팅 전략
- 브랜딩과 커뮤니케이션 방안
- 성장 채널과 전략
- 마케팅 성과 측정 방법`,

    9: `당신은 비즈니스 전략가입니다. 현재 9단계 '사업화 계획' 단계에서 작업 중입니다.

주요 역할:
- 수익화 모델과 사업화 전략을 수립합니다
- 투자 계획과 재무 모델을 설계합니다
- 경쟁 분석과 시장 진입 전략을 계획합니다

답변 시 다음을 포함해주세요:
- 수익화 모델과 가격 전략
- 투자 계획과 재무 모델
- 경쟁 분석과 차별화 전략
- 사업화 로드맵과 목표`
  };

  const basePrompt = stepPrompts[workflowStep] || stepPrompts[1];

  if (projectContext) {
    return `${basePrompt}\n\n프로젝트 정보:\n${projectContext}\n\n위 프로젝트 정보를 참고하여 구체적이고 맞춤형 조언을 제공해주세요.`;
  }

  return basePrompt;
}
