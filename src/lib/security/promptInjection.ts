// AI 프롬프트 인젝션 공격 탐지 및 방지

// 위험한 프롬프트 패턴들
const DANGEROUS_PATTERNS = [
  // 직접적인 명령어 인젝션
  /ignore\s+(previous|above|all)\s+(instructions?|commands?|prompts?)/gi,
  /forget\s+(previous|above|all)\s+(instructions?|commands?|prompts?)/gi,
  /disregard\s+(previous|above|all)\s+(instructions?|commands?|prompts?)/gi,
  
  // 역할 변경 시도
  /you\s+are\s+now\s+a?\s*(different|new)/gi,
  /act\s+as\s+(if\s+you\s+are\s+)?a?\s*(different|new)/gi,
  /pretend\s+(to\s+be\s+)?a?\s*(different|new)/gi,
  /roleplay\s+as/gi,
  /from\s+now\s+on\s+you\s+are/gi,
  
  // 시스템 프롬프트 노출 시도
  /show\s+me\s+(your|the)\s+(system\s+)?(prompt|instructions?)/gi,
  /what\s+(is|are)\s+(your|the)\s+(system\s+)?(prompt|instructions?)/gi,
  /reveal\s+(your|the)\s+(system\s+)?(prompt|instructions?)/gi,
  /display\s+(your|the)\s+(system\s+)?(prompt|instructions?)/gi,
  
  // 제약 해제 시도
  /ignore\s+(all\s+)?(safety|ethical|moral)\s+(guidelines?|constraints?|rules?)/gi,
  /bypass\s+(safety|security|content)\s+(filters?|checks?)/gi,
  /disable\s+(safety|security|content)\s+(mode|filters?)/gi,
  
  // 출력 형식 조작
  /respond\s+only\s+with\s*(json|xml|code|script)/gi,
  /output\s+format\s*:\s*(json|xml|code|script)/gi,
  /return\s+in\s*(json|xml|code|script)\s+format/gi,
  
  // 다단계 명령어
  /first\s+do\s+.*then\s+(ignore|forget|disregard)/gi,
  /step\s+1:.*step\s+2:\s*(ignore|forget|disregard)/gi,
  
  // 숨겨진 명령어 (특수 문자 사용)
  /<!--.*-->/gi,
  /\/\*.*\*\//gi,
  /{%.*%}/gi,
  /\[\[.*\]\]/gi,
  
  // 토큰 조작 시도
  /<\|.*\|>/gi,
  /\[INST\].*\[\/INST\]/gi,
  /<s>.*<\/s>/gi,
  
  // 개발자 모드/관리자 모드 시도
  /developer\s+mode/gi,
  /admin\s+mode/gi,
  /debug\s+mode/gi,
  /maintenance\s+mode/gi,
];

// 의심스러운 키워드들
const SUSPICIOUS_KEYWORDS = [
  'jailbreak', 'jail break', 'jail-break',
  'prompt injection', 'prompt-injection',
  'dan mode', 'do anything now',
  'evil mode', 'unlimited mode',
  'unrestricted', 'uncensored',
  'hackerman', 'override',
  'sudo', 'root access',
  'system override', 'emergency protocol',
  'unlock', 'unleash', 'bypass'
];

// 컨텍스트별 위험도 평가
export interface PromptSecurityResult {
  isSecure: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  detectedPatterns: string[];
  suspiciousKeywords: string[];
  sanitizedInput: string;
  recommendations: string[];
}

// 프롬프트 보안 검사
export function analyzePromptSecurity(input: string): PromptSecurityResult {
  const detectedPatterns: string[] = [];
  const suspiciousKeywords: string[] = [];
  const recommendations: string[] = [];
  
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let sanitizedInput = input;

  // 위험한 패턴 검사
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(input)) {
      detectedPatterns.push(pattern.source);
      riskLevel = 'critical';
    }
  }

  // 의심스러운 키워드 검사
  for (const keyword of SUSPICIOUS_KEYWORDS) {
    if (input.toLowerCase().includes(keyword)) {
      suspiciousKeywords.push(keyword);
      if (riskLevel === 'low') riskLevel = 'medium';
    }
  }

  // 연속된 특수 문자 패턴 검사 (인코딩 우회 시도)
  const specialCharPattern = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{5,}/g;
  if (specialCharPattern.test(input)) {
    detectedPatterns.push('excessive_special_characters');
    if (riskLevel === 'low') riskLevel = 'medium';
  }

  // 비정상적으로 긴 입력 검사
  if (input.length > 5000) {
    detectedPatterns.push('excessive_length');
    if (riskLevel === 'low') riskLevel = 'medium';
  }

  // 반복적인 패턴 검사 (DoS 시도)
  const repetitivePattern = /(.{10,}?)\1{3,}/g;
  if (repetitivePattern.test(input)) {
    detectedPatterns.push('repetitive_pattern');
    if (riskLevel === 'low') riskLevel = 'medium';
  }

  // Base64 인코딩된 내용 검사
  const base64Pattern = /[A-Za-z0-9+/]{50,}={0,2}/g;
  const base64Matches = input.match(base64Pattern);
  if (base64Matches) {
    for (const match of base64Matches) {
      try {
        const decoded = atob(match);
        const decodedResult = analyzePromptSecurity(decoded);
        if (!decodedResult.isSecure) {
          detectedPatterns.push('base64_encoded_injection');
          riskLevel = 'high';
        }
      } catch (e) {
        // Not valid base64, ignore
      }
    }
  }

  // URL 인코딩된 내용 검사
  if (input.includes('%')) {
    try {
      const decoded = decodeURIComponent(input);
      if (decoded !== input) {
        const decodedResult = analyzePromptSecurity(decoded);
        if (!decodedResult.isSecure) {
          detectedPatterns.push('url_encoded_injection');
          riskLevel = 'high';
        }
      }
    } catch (e) {
      // Invalid URL encoding, ignore
    }
  }

  // 입력 sanitization
  sanitizedInput = sanitizePromptInput(input);

  // 권장사항 생성
  if (detectedPatterns.length > 0) {
    recommendations.push('입력에서 위험한 패턴이 감지되었습니다.');
    recommendations.push('사용자 입력을 검토하고 필터링하세요.');
  }
  
  if (suspiciousKeywords.length > 0) {
    recommendations.push('의심스러운 키워드가 포함되어 있습니다.');
    recommendations.push('추가적인 검증이 필요할 수 있습니다.');
  }

  if (riskLevel === 'critical') {
    recommendations.push('CRITICAL: 이 입력은 프롬프트 인젝션 공격일 가능성이 높습니다.');
    recommendations.push('즉시 차단하고 보안 팀에 보고하세요.');
  }

  const isSecure = riskLevel === 'low' && detectedPatterns.length === 0;

  return {
    isSecure,
    riskLevel,
    detectedPatterns,
    suspiciousKeywords,
    sanitizedInput,
    recommendations
  };
}

// 프롬프트 입력 sanitization
export function sanitizePromptInput(input: string): string {
  let sanitized = input;

  // 위험한 패턴 제거
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[FILTERED]');
  }

  // 의심스러운 키워드 필터링
  for (const keyword of SUSPICIOUS_KEYWORDS) {
    const regex = new RegExp(keyword, 'gi');
    sanitized = sanitized.replace(regex, '[FILTERED]');
  }

  // 특수 문자 시퀀스 제한
  sanitized = sanitized.replace(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{5,}/g, '[FILTERED]');

  // 제어 문자 제거
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // 과도한 공백 정리
  sanitized = sanitized.replace(/\s{3,}/g, ' ').trim();

  // 길이 제한
  if (sanitized.length > 2000) {
    sanitized = sanitized.substring(0, 2000) + '... [TRUNCATED]';
  }

  return sanitized;
}

// AI PM 컨텍스트별 보안 검사
export function validateAiPmPrompt(
  userInput: string,
  context: 'document_generation' | 'chat' | 'analysis' | 'report_generation'
): PromptSecurityResult {
  const baseResult = analyzePromptSecurity(userInput);

  // 컨텍스트별 추가 검사
  switch (context) {
    case 'document_generation':
      return validateDocumentGenerationPrompt(userInput, baseResult);
    case 'chat':
      return validateChatPrompt(userInput, baseResult);
    case 'analysis':
      return validateAnalysisPrompt(userInput, baseResult);
    case 'report_generation':
      return validateReportGenerationPrompt(userInput, baseResult);
    default:
      return baseResult;
  }
}

// 문서 생성 프롬프트 검증
function validateDocumentGenerationPrompt(
  input: string,
  baseResult: PromptSecurityResult
): PromptSecurityResult {
  const additionalPatterns = [
    // 문서 생성 컨텍스트에서 위험한 패턴
    /generate\s+(code|script|sql|query)/gi,
    /create\s+(executable|virus|malware)/gi,
    /write\s+a\s+(virus|trojan|malware)/gi,
  ];

  let riskLevel = baseResult.riskLevel;
  const detectedPatterns = [...baseResult.detectedPatterns];

  for (const pattern of additionalPatterns) {
    if (pattern.test(input)) {
      detectedPatterns.push(`doc_gen_${pattern.source}`);
      if (riskLevel === 'low') riskLevel = 'medium';
    }
  }

  return {
    ...baseResult,
    riskLevel,
    detectedPatterns
  };
}

// 채팅 프롬프트 검증
function validateChatPrompt(
  input: string,
  baseResult: PromptSecurityResult
): PromptSecurityResult {
  const additionalPatterns = [
    // 채팅 컨텍스트에서 위험한 패턴
    /simulate\s+(being|another|different)/gi,
    /pretend\s+(you\s+)?(don't|do\s+not)\s+know/gi,
    /act\s+confused\s+about/gi,
  ];

  let riskLevel = baseResult.riskLevel;
  const detectedPatterns = [...baseResult.detectedPatterns];

  for (const pattern of additionalPatterns) {
    if (pattern.test(input)) {
      detectedPatterns.push(`chat_${pattern.source}`);
      if (riskLevel === 'low') riskLevel = 'medium';
    }
  }

  return {
    ...baseResult,
    riskLevel,
    detectedPatterns
  };
}

// 분석 프롬프트 검증
function validateAnalysisPrompt(
  input: string,
  baseResult: PromptSecurityResult
): PromptSecurityResult {
  const additionalPatterns = [
    // 분석 컨텍스트에서 위험한 패턴
    /analyze\s+this\s+(system|database|network)/gi,
    /find\s+(vulnerabilities|exploits|weaknesses)/gi,
    /reverse\s+engineer/gi,
  ];

  let riskLevel = baseResult.riskLevel;
  const detectedPatterns = [...baseResult.detectedPatterns];

  for (const pattern of additionalPatterns) {
    if (pattern.test(input)) {
      detectedPatterns.push(`analysis_${pattern.source}`);
      if (riskLevel === 'low') riskLevel = 'medium';
    }
  }

  return {
    ...baseResult,
    riskLevel,
    detectedPatterns
  };
}

// 프롬프트 템플릿 보안 검증
export function securePromptTemplate(template: string, variables: Record<string, string>): string {
  let secureTemplate = template;

  // 변수 치환 전 보안 검사
  for (const [key, value] of Object.entries(variables)) {
    const securityResult = analyzePromptSecurity(value);
    
    if (!securityResult.isSecure) {
      console.warn(`Security risk detected in variable ${key}:`, securityResult);
      // 위험한 변수는 sanitized 버전으로 교체
      variables[key] = securityResult.sanitizedInput;
    }
  }

  // 안전한 변수 치환
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    secureTemplate = secureTemplate.replace(new RegExp(placeholder, 'g'), value);
  }

  return secureTemplate;
}

// 프롬프트 로깅 (보안 감시용)
export function logSecurityEvent(
  userId: string,
  input: string,
  result: PromptSecurityResult,
  context: string
): void {
  if (!result.isSecure || result.riskLevel !== 'low') {
    const logData = {
      timestamp: new Date().toISOString(),
      userId: userId || 'anonymous',
      context,
      riskLevel: result.riskLevel,
      detectedPatterns: result.detectedPatterns,
      suspiciousKeywords: result.suspiciousKeywords,
      inputLength: input.length,
      // 민감한 정보는 로그에 포함하지 않음
      inputHash: hashInput(input)
    };

    // 실제 환경에서는 보안 로그 시스템으로 전송
    console.warn('Security event detected:', logData);
    
    // 심각한 경우 즉시 알림
    if (result.riskLevel === 'critical') {
      console.error('CRITICAL SECURITY EVENT:', logData);
      // 실제 환경에서는 알림 시스템 호출
    }
  }
}

// 입력 해시 생성 (개인정보 보호)
function hashInput(input: string): string {
  // 간단한 해시 함수 (실제로는 crypto 모듈 사용 권장)
  let hash = 0;
  if (input.length === 0) return hash.toString();
  
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32비트 정수로 변환
  }
  
  return Math.abs(hash).toString(16);
}

// 리포트 생성 프롬프트 검증 (완화된 규칙)
function validateReportGenerationPrompt(
  input: string,
  baseResult: PromptSecurityResult
): PromptSecurityResult {
  // 리포트 생성 컨텍스트에서는 특정 규칙을 완화합니다.
  const allowedPatterns = [
    /<!--.*-->/.source, // HTML 주석 허용
    'excessive_length',      // 길이 제한 완화
    'excessive_special_characters' // 특수 문자 제한 완화
  ];

  const filteredPatterns = baseResult.detectedPatterns.filter(
    p => !allowedPatterns.includes(p)
  );

  let riskLevel = baseResult.riskLevel;
  // 완화된 규칙을 제외하고도 여전히 위험한 패턴이 남아있는지 확인
  if (filteredPatterns.length > 0) {
     // 위험도가 critical이 아닌 경우, high로 설정
    if (riskLevel !== 'critical') riskLevel = 'high';
  } else if (baseResult.suspiciousKeywords.length > 0) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }
  
  // isSecure 재평가: 완화된 패턴을 제외하고 다른 문제가 없으면 안전한 것으로 간주
  const isSecure = riskLevel === 'low';

  return {
    ...baseResult,
    riskLevel,
    detectedPatterns: filteredPatterns, // 완화된 패턴을 제외한 결과
    isSecure,
  };
} 