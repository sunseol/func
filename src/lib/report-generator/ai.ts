import Groq from 'groq-sdk';
import { validateAiPmPrompt, logSecurityEvent } from '@/lib/security/promptInjection';

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
});

/**
 * 1단계: 빠르고 저렴한 모델로 원본 텍스트를 요약합니다.
 */
export async function summarizeContent(rawContent: string): Promise<string> {
  console.log('[AI_SERVICE] Starting content summarization...');
  try {
    const summarizationPrompt = `
      다음 텍스트를 전문적인 인포그래픽 보고서에 들어갈 핵심 내용만 담아 간결하게 요약해줘.

      **중요 규칙**:
      - 문서의 실제 내용만 추출하고 요약할 것
      - 호스트명(localhost), 생성 날짜/시간, 파일 경로, URL, 페이지 번호 등 메타데이터는 절대 포함하지 말것
      - 3-5개의 주요 섹션으로 구조화
      - 각 섹션은 핵심 포인트를 충분히 포함 (너무 압축하지 말것)
      - 원본 문서의 핵심 메시지, 주요 기능, 중요 데이터를 모두 유지
      - 표나 목록으로 표현할 수 있는 내용은 구조화해서 정리
      - A4 한 페이지 분량을 목표로 하되, 내용의 완성도를 우선시

      --- 원본 내용 ---
      ${rawContent}
    `;

    // 요약 단계에서는 보안 검사를 적용하지 않거나, 매우 완화된 규칙을 적용할 수 있습니다.
    // 여기서는 일단 적용하되, 결과적으로 문제가 되면 제거를 고려합니다.
    // const securityResult = validateAiPmPrompt(summarizationPrompt, 'report_generation');
    // if (!securityResult.isSecure && securityResult.riskLevel === 'critical') {
    //   logSecurityEvent('anonymous', summarizationPrompt, securityResult, 'report_generation');
    //   throw new Error('요약 과정에서 보안 위험이 감지되었습니다.');
    // }

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: summarizationPrompt }],
      model: 'llama-3.1-8b-instant', // 빠르고 경제적인 모델 사용
      temperature: 0.2, // 창의성보다는 정확성에 초점
      max_tokens: 3500, // 충분한 요약 분량 확보
    });

    const summary = completion.choices[0]?.message?.content;
    if (!summary) {
      throw new Error('AI 서비스에서 요약 내용을 받지 못했습니다.');
    }
    console.log('[AI_SERVICE] Content summarization successful.');
    return summary;

  } catch (error) {
    console.error('Content Summarization Error:', error);
    throw new Error('콘텐츠 요약 중 오류가 발생했습니다.');
  }
}

/**
 * 2단계: 강력한 모델로 요약된 내용을 HTML 인포그래픽으로 생성합니다.
 */
export async function generateReport(summary: string, reportPrompt: string): Promise<string> {
  console.log('[AI_SERVICE] Starting report generation from summary...');
  try {
    const fullPrompt = `${reportPrompt}\n${summary}`;
    
    // // 이 단계에서는 프롬프트와 요약된 내용 모두에 대해 보안 검사를 수행합니다.
    // const securityResult = validateAiPmPrompt(fullPrompt, 'report_generation');
    // if (!securityResult.isSecure && securityResult.riskLevel === 'critical') {
    //   logSecurityEvent('anonymous', fullPrompt, securityResult, 'report_generation');
    //   throw new Error('리포트 생성 과정에서 보안 위험이 감지되었습니다.');
    // }

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: fullPrompt }],
      model: 'llama-3.3-70b-versatile', // 강력한 모델로 HTML 생성
      temperature: 0.3, // 더 일관된 레이아웃을 위해 낮춤
      max_tokens: 4500, // 충분한 HTML 생성 분량
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('리포트 생성 중 AI 서비스에서 응답을 받지 못했습니다.');
    }

    // // 응답에 대한 보안 검증도 중요합니다.
    // const responseSecurityResult = validateAiPmPrompt(response, 'report_generation');
    // if (!responseSecurityResult.isSecure) {
    //     console.warn('AI response security risk detected:', responseSecurityResult);
    //     return responseSecurityResult.sanitizedInput;
    // }
    
    console.log('[AI_SERVICE] Report generation successful.');
    return response;
  } catch (error) {
    console.error('Report Generation Error:', error);
    if (error instanceof Error) {
        throw new Error(`AI 서비스 오류: ${error.message}`);
    }
    throw new Error('알 수 없는 AI 서비스 오류가 발생했습니다.');
  }
}
