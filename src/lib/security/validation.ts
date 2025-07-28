import DOMPurify from 'isomorphic-dompurify';

// 입력 검증 타입 정의
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  allowedTags?: string[];
  sanitize?: boolean;
  custom?: (value: string) => boolean | string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// HTML 태그 제거 및 엔티티 이스케이프
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// HTML 태그 완전 제거
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

// DOMPurify를 사용한 안전한 HTML sanitization
export function sanitizeHtml(dirty: string, options?: {
  allowedTags?: string[];
  allowedAttributes?: string[];
  forbiddenTags?: string[];
}): string {
  const config: any = {
    ALLOWED_TAGS: options?.allowedTags || [
      'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'code', 'pre'
    ],
    ALLOWED_ATTR: options?.allowedAttributes || ['class', 'id'],
    FORBID_TAGS: options?.forbiddenTags || ['script', 'style', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false,
    SANITIZE_DOM: true,
    FORCE_BODY: false,
    SAFE_FOR_TEMPLATES: true
  };

  return DOMPurify.sanitize(dirty, config);
}

// 입력값 검증 함수
export function validateInput(
  value: string | null | undefined, 
  rules: ValidationRule
): ValidationError | null {
  const strValue = String(value || '');

  // Required 검증
  if (rules.required && (!value || strValue.trim() === '')) {
    return {
      field: 'input',
      message: '필수 입력 항목입니다.',
      code: 'REQUIRED'
    };
  }

  // 빈 값이면 나머지 검증 스킵
  if (!strValue.trim()) {
    return null;
  }

  // 길이 검증
  if (rules.minLength && strValue.length < rules.minLength) {
    return {
      field: 'input',
      message: `최소 ${rules.minLength}자 이상 입력해주세요.`,
      code: 'MIN_LENGTH'
    };
  }

  if (rules.maxLength && strValue.length > rules.maxLength) {
    return {
      field: 'input',
      message: `최대 ${rules.maxLength}자까지 입력 가능합니다.`,
      code: 'MAX_LENGTH'
    };
  }

  // 패턴 검증
  if (rules.pattern && !rules.pattern.test(strValue)) {
    return {
      field: 'input',
      message: '올바른 형식으로 입력해주세요.',
      code: 'INVALID_FORMAT'
    };
  }

  // 커스텀 검증
  if (rules.custom) {
    const customResult = rules.custom(strValue);
    if (typeof customResult === 'string') {
      return {
        field: 'input',
        message: customResult,
        code: 'CUSTOM_VALIDATION'
      };
    }
    if (customResult === false) {
      return {
        field: 'input',
        message: '유효하지 않은 입력입니다.',
        code: 'CUSTOM_VALIDATION'
      };
    }
  }

  return null;
}

// 다중 필드 검증
export function validateFields(
  data: Record<string, any>,
  rules: Record<string, ValidationRule>
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];
    const error = validateInput(value, rule);
    
    if (error) {
      errors.push({
        ...error,
        field
      });
    }
  }

  return errors;
}

// 파일 이름 안전성 검증
export function validateFileName(fileName: string): boolean {
  // 위험한 문자 및 패턴 검증
  const dangerousPatterns = [
    /\.\./,           // 디렉토리 트래버설
    /[<>:"|?*]/,      // 윈도우 예약 문자
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i, // 윈도우 예약 이름
    /^\./,            // 숨김 파일
    /\.(exe|bat|cmd|scr|pif|com|msi|ps1|vbs|js|jar)$/i // 실행 파일
  ];

  return !dangerousPatterns.some(pattern => pattern.test(fileName));
}

// URL 안전성 검증
export function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // HTTPS만 허용
    if (urlObj.protocol !== 'https:') {
      return false;
    }
    
    // IP 주소 차단 (프라이빗 IP 포함)
    const ipPattern = /^\d+\.\d+\.\d+\.\d+$/;
    if (ipPattern.test(urlObj.hostname)) {
      return false;
    }
    
    // localhost 차단
    if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

// 이메일 검증 (RFC 5322 기반)
export function validateEmail(email: string): boolean {
  const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailPattern.test(email) && email.length <= 254;
}

// SQL 인젝션 패턴 검사
export function detectSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /('|(\\'))|(;)|(\b(select|union|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
    /(script|javascript|vbscript|onload|onerror|onclick)/i,
    /(\b(or|and)\b.*(\b(true|false)\b|[0-9]+\s*=\s*[0-9]+))/i
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

// XSS 패턴 검사
export function detectXss(input: string): boolean {
  const xssPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]+src[=\s]*["']?(.*?)["'>]/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

// 종합적인 보안 검증
export function securityValidation(input: string): {
  isSecure: boolean;
  threats: string[];
  sanitized: string;
} {
  const threats: string[] = [];
  let sanitized = input;

  // XSS 검사
  if (detectXss(input)) {
    threats.push('XSS');
  }

  // SQL 인젝션 검사
  if (detectSqlInjection(input)) {
    threats.push('SQL_INJECTION');
  }

  // HTML 정리
  sanitized = sanitizeHtml(input);

  return {
    isSecure: threats.length === 0,
    threats,
    sanitized
  };
}

// AI PM 문서 제목 검증
export const DOCUMENT_TITLE_RULES: ValidationRule = {
  required: true,
  minLength: 1,
  maxLength: 200,
  sanitize: true,
  custom: (value: string) => {
    // 특수 문자 제한
    if (/[<>:"\\|?*]/.test(value)) {
      return '제목에는 특수문자 < > : " \\ | ? * 를 사용할 수 없습니다.';
    }
    return true;
  }
};

// AI PM 문서 내용 검증
export const DOCUMENT_CONTENT_RULES: ValidationRule = {
  required: false,
  maxLength: 100000, // 100KB
  sanitize: true,
  allowedTags: [
    'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre', 'a', 'img'
  ]
};

// 프로젝트 이름 검증
export const PROJECT_NAME_RULES: ValidationRule = {
  required: true,
  minLength: 2,
  maxLength: 100,
  sanitize: true,
  pattern: /^[a-zA-Z0-9가-힣\s\-_]+$/,
  custom: (value: string) => {
    if (value.trim() !== value) {
      return '프로젝트 이름의 앞뒤 공백을 제거해주세요.';
    }
    return true;
  }
};

// 사용자 이름 검증
export const USER_NAME_RULES: ValidationRule = {
  required: true,
  minLength: 2,
  maxLength: 50,
  sanitize: true,
  pattern: /^[a-zA-Z0-9가-힣]+$/
}; 