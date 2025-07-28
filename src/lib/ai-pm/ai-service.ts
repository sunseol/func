import Groq from 'groq-sdk';
import { AIChatMessage, WorkflowStep, AIpmError, AIpmErrorType } from '@/types/ai-pm';
import { validateAiPmPrompt, logSecurityEvent, securePromptTemplate, PromptSecurityResult } from '@/lib/security/promptInjection';
import { DataSanitizer } from '@/lib/security/secretsManager';

// AIPM workflow prompts based on AIPM.md
const WORKFLOW_PROMPTS: Record<WorkflowStep, string> = {
  1: `당신은 xAI의 Grok으로, 플랫폼 기획 워크플로우의 1단계(컨셉 정의 및 기획)를 처리합니다. 사용자가 제공한 초기 아이디어를 바탕으로 플랫폼의 전체 컨셉과 방향성을 정의하세요. 출력은 다음과 같은 구조의 문서로 하세요:

- **플랫폼 개요**: 플랫폼의 이름, 미션, 비전.
- **타겟 사용자**: 세부 프로필.
- **핵심 기능**: 주요 기능 목록.
- **방향성 및 전략**: 시장 포지셔닝, 차별화 포인트, SWOT 분석.
- **다음 단계 제안**: 워크플로우의 2단계로 이어질 페이지 아이디어.

사용자의 입력이 모호하거나 불충분하다면, 즉시 추가 질문을 통해 증강하세요. 모든 응답은 한국어로 하며, 친근하고 논리적으로 유지하세요.`,

  2: `당신은 xAI의 Grok으로, 플랫폼 기획 워크플로우의 2단계(페이지를 정의 및 기획)를 처리합니다. 제공된 1단계 컨셉을 바탕으로 플랫폼의 주요 페이지를 나열하고 기획하세요. 출력은 다음과 같은 구조의 문서로 하세요:

- **사이트맵 개요**: 전체 페이지 구조와 흐름 다이어그램 (텍스트 기반).
- **주요 페이지 목록**: 각 페이지의 이름, 목적, 핵심 요소.
- **페이지 간 연결성**: 페이지 간 이동 경로와 로직.
- **기획 세부 사항**: 각 페이지의 초기 기획 아이디어.
- **다음 단계 제안**: 워크플로우의 3단계로 이어질 파트별 문서 아이디어.

모든 응답은 한국어로 하며, 친근하고 논리적으로 유지하세요. 만약 충돌이 감지되면, 대안을 제안하며 확인하세요.`,

  3: `당신은 xAI의 Grok으로, 플랫폼 기획 워크플로우의 3단계(각 페이지에 대하여 각 파트에서의 꼼꼼한 문서 제작)를 처리합니다. 제공된 1단계 컨셉과 2단계 페이지 기획을 바탕으로, 지정된 페이지의 각 파트(운영, 콘텐츠, 마케팅, 서비스, UX/UI 디자인)에 대한 문서를 제작하세요. 각 문서는 다음 공통 양식을 따르세요:

- **개요**: 페이지와 파트의 목적과 배경.
- **세부 기능 및 계획**: 구체적인 요소와 구현 계획.
- **잠재 리스크 및 대응**: 문제 예측과 해결 방안.
- **측정 지표 및 평가**: KPI 정의.
- **연계 및 통합 고려사항**: 다른 파트/페이지와의 연결.

모든 응답은 한국어로 하며, 친근하고 논리적으로 유지하세요.`,

  4: `당신은 xAI의 Grok으로, 플랫폼 기획 워크플로우의 4단계(문서의 공통 양식과 독립성 유지)를 처리합니다. 제공된 3단계 문서를 검토하여, 공통 양식을 따르는지 확인하고 수정하세요. 각 문서는 파트의 전문적 독립성을 유지하되, 플랫폼 전체 컨셉과 연계되도록 합니다.

출력은 각 문서의 수정 버전으로 하며, 변경 사항 요약을 추가하세요. 모든 문서가 양식에 맞고 독립적이 되도록 조정합니다.

모든 응답은 한국어로 하며, 친근하고 논리적으로 유지하세요.`,

  5: `당신은 xAI의Grok으로, 플랫폼 기획 워크플로우의 5단계(각 페이지 및 각 파트로 나뉜 문서를 통합하여 각 파트에 대한 거대한 정의를 마련)를 처리합니다. 제공된 3-4단계 문서들을 바탕으로, 각 파트별로 통합된 거대 정의 문서를 생성하세요.

통합 과정에서 중복 제거, 논리적 재배치, 크로스-레퍼런싱을 수행하며, 플랫폼 전체 컨셉과 연계되도록 합니다.

모든 응답은 한국어로 하며, 친근하고 논리적으로 유지하세요.`,

  6: `당신은 xAI의 Grok으로, 플랫폼 기획 워크플로우의 6단계(각 파트에 대한 정의를 다시 통합하여 플랫폼에 대한 정의를 마련)를 처리합니다. 제공된 5단계 파트별 통합 문서들을 바탕으로, 플랫폼 전체의 포괄적인 정의 문서를 생성하세요.

통합 과정에서 중복 제거, 논리적 재배치, 전체 로드맵/타임라인 추가, 그리고 파트 간 조화를 수행하며, 초기 컨셉과 연계되도록 합니다.

모든 응답은 한국어로 하며, 친근하고 논리적으로 유지하세요.`,

  7: `당신은 xAI의 Grok으로, 플랫폼 기획 워크플로우의 7단계(플랫폼에 대한 종합된 많은 양의 문서를 기반으로 정책을 설정)를 처리합니다. 제공된 6단계 플랫폼 전체 정의 문서를 바탕으로, 주요 정책을 설정하세요.

정책은 플랫폼의 컨셉, 기능, 리스크를 반영하며, 법적·윤리적 표준을 참조합니다. 주요 카테고리를 커버하며, 플랫폼 특성에 맞게 커스터마이징하세요.

모든 응답은 한국어로 하며, 친근하고 논리적으로 유지하세요.`,

  8: `당신은 xAI의 Grok으로, 플랫폼 기획 워크플로우의 8단계(각 워크 플로우에서 충돌 되는 등의 문제는 즉각 반영하여 논의해야함)를 처리합니다. 제공된 이전 단계 문서들을 분석해 충돌을 감지하고, 즉각 반영하세요.

인간 소통을 최소화하며 AI 중심으로 논의: 대안 제안 후 사용자 확인만 받습니다. 충돌이 없으면 "충돌 없음"으로 보고하고, 예방 조언을 추가하세요.

모든 응답은 한국어로 하며, 친근하고 논리적으로 유지하세요.`,

  9: `당신은 xAI의 Grok으로, 플랫폼 기획 워크플로우의 9단계(인간의 소통은 줄이고, AI를 통해서 진행되어야함)를 처리합니다. 이 단계는 전체 워크플로우를 AI 중심으로 자동화하며, 인간 입력을 최소화합니다.

제공된 초기 입력을 바탕으로 워크플로우를 순차적으로 진행하세요: 각 단계의 문서를 AI가 생성/통합/수정하며, 사용자는 간단한 확인만 합니다.

모든 응답은 한국어로 하며, 친근하고 논리적으로 유지하세요.`
};

export interface AIServiceConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface StreamingResponse {
  content: string;
  isComplete: boolean;
  error?: string;
}

export class AIService {
  private groq: Groq;
  private config: Required<AIServiceConfig>;

  constructor(config: AIServiceConfig) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model || 'llama-3.1-70b-versatile',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 4096
    };

    this.groq = new Groq({
      apiKey: this.config.apiKey,
    });
  }

  /**
   * Generate AI response for a specific workflow step
   */
  async generateResponse(
    messages: AIChatMessage[],
    workflowStep: WorkflowStep,
    projectContext?: string
  ): Promise<string> {
    try {
      const systemPrompt = this.buildSystemPrompt(workflowStep, projectContext);
      const groqMessages = this.convertToGroqMessages(messages, systemPrompt);

      const completion = await this.groq.chat.completions.create({
        messages: groqMessages,
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('AI 서비스에서 응답을 받지 못했습니다.');
      }

      return response;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw this.handleAIError(error);
    }
  }

  /**
   * Generate streaming AI response
   */
  async *generateStreamingResponse(
    messages: AIChatMessage[],
    workflowStep: WorkflowStep,
    projectContext?: string
  ): AsyncGenerator<StreamingResponse, void, unknown> {
    try {
      const systemPrompt = this.buildSystemPrompt(workflowStep, projectContext);
      const groqMessages = this.convertToGroqMessages(messages, systemPrompt);

      const stream = await this.groq.chat.completions.create({
        messages: groqMessages,
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: true,
      });

      let fullContent = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullContent += content;

        yield {
          content: fullContent,
          isComplete: false,
        };
      }

      yield {
        content: fullContent,
        isComplete: true,
      };
    } catch (error) {
      console.error('AI Streaming Error:', error);
      yield {
        content: '',
        isComplete: true,
        error: this.handleAIError(error).message,
      };
    }
  }

  /**
   * Generate document based on conversation history
   */
  async generateDocument(
    messages: AIChatMessage[],
    workflowStep: WorkflowStep,
    projectContext?: string,
    userId?: string
  ): Promise<string> {
    try {
      // 보안 검증: 입력 메시지들의 보안 검사
      const combinedUserInput = messages
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content)
        .join(' ');

      const securityResult = validateAiPmPrompt(combinedUserInput, 'document_generation');
      
      // 보안 이벤트 로깅
      if (!securityResult.isSecure) {
        logSecurityEvent(userId || 'anonymous', combinedUserInput, securityResult, 'document_generation');
        
        // 높은 위험도일 경우 차단
        if (securityResult.riskLevel === 'critical') {
          throw new Error('입력에서 보안 위험이 감지되었습니다. 요청이 차단되었습니다.');
        }
      }

      // 프로젝트 컨텍스트 보안 검증
      if (projectContext) {
        const contextSecurityResult = validateAiPmPrompt(projectContext, 'document_generation');
        if (!contextSecurityResult.isSecure) {
          console.warn('Project context security risk detected:', contextSecurityResult);
          projectContext = contextSecurityResult.sanitizedInput;
        }
      }

      const documentPrompt = this.buildDocumentPrompt(workflowStep);
      
      // 보안 템플릿 사용
      const systemPrompt = securePromptTemplate(
        `{{basePrompt}}

{{documentPrompt}}

위의 대화 내용을 바탕으로 {{workflowStep}}단계에 맞는 체계적인 기획 문서를 생성해주세요. 문서는 마크다운 형식으로 작성하고, 구조화된 내용으로 구성해주세요.

보안 지침:
- 사용자의 개인정보나 민감한 정보를 포함하지 마세요.
- 외부 시스템에 대한 접근 정보를 생성하지 마세요.
- 악성 코드나 스크립트를 포함하지 마세요.`,
        {
          basePrompt: this.buildSystemPrompt(workflowStep, projectContext),
          documentPrompt,
          workflowStep: workflowStep.toString()
        }
      );

      // 메시지 보안 필터링
      const sanitizedMessages = messages.map(msg => ({
        ...msg,
        content: securityResult.sanitizedInput || msg.content
      }));

      const groqMessages = this.convertToGroqMessages(sanitizedMessages, systemPrompt);

      const completion = await this.groq.chat.completions.create({
        messages: groqMessages,
        model: this.config.model,
        temperature: 0.5, // Lower temperature for more consistent document generation
        max_tokens: this.config.maxTokens,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('문서 생성 중 AI 서비스에서 응답을 받지 못했습니다.');
      }

      // 응답 보안 검증
      const responseSecurityResult = validateAiPmPrompt(response, 'document_generation');
      if (!responseSecurityResult.isSecure) {
        console.warn('AI response security risk detected:', responseSecurityResult);
        // 응답에서 위험한 내용 제거
        return responseSecurityResult.sanitizedInput;
      }

      return response;
    } catch (error) {
      console.error('Document Generation Error:', DataSanitizer.sanitizeForLogging(error));
      throw this.handleAIError(error);
    }
  }

  /**
   * Analyze conflicts between documents
   */
  async analyzeConflicts(
    currentDocument: string,
    officialDocuments: Array<{ step: WorkflowStep; content: string }>,
    workflowStep: WorkflowStep
  ): Promise<string> {
    try {
      const conflictPrompt = `당신은 AI PM으로서 문서 간 충돌을 분석하는 전문가입니다. 
현재 작업 중인 ${workflowStep}단계 문서와 기존 공식 문서들을 비교하여 다음을 분석해주세요:

1. **충돌 가능성**: 내용상 모순이나 불일치가 있는지
2. **완전한 충돌**: 명확히 상충하는 부분이 있는지  
3. **개선 제안**: 더 나은 방향으로 개선할 수 있는 부분

분석 결과를 다음 형식으로 제공해주세요:
- **충돌 분석 결과**: 전체적인 평가
- **구체적 충돌 사항**: 발견된 문제점들
- **해결 방안**: 구체적인 개선 제안
- **추가 고려사항**: 향후 주의할 점들

현재 문서:
${currentDocument}

기존 공식 문서들:
${officialDocuments.map(doc => `[${doc.step}단계 문서]\n${doc.content}`).join('\n\n')}`;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: conflictPrompt }],
        model: this.config.model,
        temperature: 0.3, // Lower temperature for more analytical response
        max_tokens: this.config.maxTokens,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('충돌 분석 중 AI 서비스에서 응답을 받지 못했습니다.');
      }

      return response;
    } catch (error) {
      console.error('Conflict Analysis Error:', error);
      throw this.handleAIError(error);
    }
  }

  /**
   * Build system prompt for specific workflow step
   */
  private buildSystemPrompt(workflowStep: WorkflowStep, projectContext?: string): string {
    let prompt = WORKFLOW_PROMPTS[workflowStep];
    
    if (projectContext) {
      prompt += `\n\n프로젝트 컨텍스트:\n${projectContext}`;
    }

    return prompt;
  }

  /**
   * Build document generation prompt
   */
  private buildDocumentPrompt(workflowStep: WorkflowStep): string {
    const documentStructures: Record<WorkflowStep, string> = {
      1: '플랫폼 개요, 타겟 사용자, 핵심 기능, 방향성 및 전략, 다음 단계 제안',
      2: '사이트맵 개요, 주요 페이지 목록, 페이지 간 연결성, 기획 세부 사항, 다음 단계 제안',
      3: '개요, 세부 기능 및 계획, 잠재 리스크 및 대응, 측정 지표 및 평가, 연계 및 통합 고려사항',
      4: '문서 검토 결과, 수정 사항, 양식 준수 확인, 독립성 검증, 통합 고려사항',
      5: '파트 개요, 통합 세부 기능 및 계획, 통합 잠재 리스크 및 대응, 통합 측정 지표 및 평가, 통합 연계 및 고려사항',
      6: '플랫폼 전체 개요, 통합 기능 및 계획, 통합 잠재 리스크 및 대응, 통합 측정 지표 및 평가, 통합 연계 및 고려사항, 로드맵 및 다음 단계',
      7: '정책 개요, 세부 정책 항목, 구현 및 집행 계획, 잠재 위반 및 대응, 업데이트 및 검토',
      8: '충돌 개요, 상세 분석, 대안 제안, 반영된 수정, 최종 확인 및 다음 단계',
      9: '워크플로우 자동화 결과, 각 단계별 요약, 최종 플랫폼 기획 패키지, 구현 가이드라인'
    };

    return `문서는 다음 구조를 포함해야 합니다: ${documentStructures[workflowStep]}`;
  }

  /**
   * Convert chat messages to GROQ format
   */
  private convertToGroqMessages(messages: AIChatMessage[], systemPrompt: string) {
    const groqMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt }
    ];

    messages.forEach(message => {
      groqMessages.push({
        role: message.role === 'user' ? 'user' : 'assistant',
        content: message.content
      });
    });

    return groqMessages;
  }

  /**
   * Handle AI service errors
   */
  private handleAIError(error: any): AIpmError {
    if (error.status === 429) {
      return {
        error: AIpmErrorType.RATE_LIMITED,
        message: 'AI 서비스 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
        details: error
      };
    }

    if (error.status === 401) {
      return {
        error: AIpmErrorType.UNAUTHORIZED,
        message: 'AI 서비스 인증에 실패했습니다.',
        details: error
      };
    }

    if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
      return {
        error: AIpmErrorType.AI_SERVICE_ERROR,
        message: 'AI 서비스 응답 시간이 초과되었습니다. 다시 시도해주세요.',
        details: error
      };
    }

    return {
      error: AIpmErrorType.AI_SERVICE_ERROR,
      message: error.message || 'AI 서비스에서 오류가 발생했습니다.',
      details: error
    };
  }
}

// Default AI service instance
let defaultAIService: AIService | null = null;

export function getAIService(): AIService {
  if (!defaultAIService) {
    const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ API key is not configured');
    }
    
    defaultAIService = new AIService({ apiKey });
  }
  
  return defaultAIService;
}

export function createAIService(config: AIServiceConfig): AIService {
  return new AIService(config);
}