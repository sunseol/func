import crypto from 'crypto';

// 환경 변수 검증 및 관리
export class SecretsManager {
  private static instance: SecretsManager;
  private secrets: Map<string, string> = new Map();
  private readonly encryptionKey: string;

  private constructor() {
    // 암호화 키 생성 (실제 환경에서는 안전한 키 관리 시스템 사용)
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateEncryptionKey();
    this.loadSecrets();
  }

  public static getInstance(): SecretsManager {
    if (!SecretsManager.instance) {
      SecretsManager.instance = new SecretsManager();
    }
    return SecretsManager.instance;
  }

  // 암호화 키 생성
  private generateEncryptionKey(): string {
    const key = crypto.randomBytes(32).toString('hex');
    console.warn('Generated temporary encryption key. Use ENCRYPTION_KEY environment variable in production.');
    return key;
  }

  // 비밀 정보 로드
  private loadSecrets(): void {
    // 필수 환경 변수 목록
    const requiredSecrets = [
      'NEXT_PUBLIC_GROQ_API_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    const optionalSecrets = [
      'OPENAI_API_KEY',
      'CLAUDE_API_KEY',
      'DATABASE_URL',
      'JWT_SECRET',
      'WEBHOOK_SECRET'
    ];

    // 필수 비밀 정보 검증
    for (const secretName of requiredSecrets) {
      const value = process.env[secretName];
      if (!value) {
        throw new Error(`Required secret ${secretName} is missing`);
      }
      this.validateSecretFormat(secretName, value);
      this.secrets.set(secretName, value);
    }

    // 선택적 비밀 정보 로드
    for (const secretName of optionalSecrets) {
      const value = process.env[secretName];
      if (value) {
        this.validateSecretFormat(secretName, value);
        this.secrets.set(secretName, value);
      }
    }

    console.log(`Loaded ${this.secrets.size} secrets successfully`);
  }

  // 비밀 정보 형식 검증
  private validateSecretFormat(name: string, value: string): void {
    const validationRules: Record<string, RegExp> = {
      'NEXT_PUBLIC_GROQ_API_KEY': /^gsk_[a-zA-Z0-9]{40,}$/,
      'NEXT_PUBLIC_SUPABASE_URL': /^https:\/\/[a-z0-9]+\.supabase\.co$/,
      'NEXT_PUBLIC_SUPABASE_ANON_KEY': /^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/,
      'SUPABASE_SERVICE_ROLE_KEY': /^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/,
      'OPENAI_API_KEY': /^sk-[a-zA-Z0-9]{20,}$/,
      'CLAUDE_API_KEY': /^sk-ant-[a-zA-Z0-9_-]{20,}$/,
      'DATABASE_URL': /^postgresql:\/\/.+$/,
      'JWT_SECRET': /^.{32,}$/,
      'WEBHOOK_SECRET': /^.{20,}$/
    };

    const rule = validationRules[name];
    if (rule && !rule.test(value)) {
      throw new Error(`Invalid format for secret: ${name}`);
    }

    // 길이 검증
    if (value.length < 10) {
      throw new Error(`Secret ${name} is too short`);
    }

    // 약한 비밀 정보 검사
    if (this.isWeakSecret(value)) {
      console.warn(`Warning: Secret ${name} appears to be weak`);
    }
  }

  // 약한 비밀 정보 검사
  private isWeakSecret(value: string): boolean {
    const weakPatterns = [
      /^(test|demo|example|sample|default)/i,
      /^(admin|password|secret|key)/i,
      /^(123|abc|000)/,
      /^(.)\1{5,}$/, // 반복 문자
    ];

    return weakPatterns.some(pattern => pattern.test(value));
  }

  // 비밀 정보 가져오기
  public getSecret(name: string): string | null {
    const value = this.secrets.get(name);
    if (!value) {
      console.warn(`Secret ${name} not found`);
      return null;
    }
    return value;
  }

  // 비밀 정보 마스킹 (로그 출력용)
  public maskSecret(value: string): string {
    if (value.length <= 8) {
      return '***';
    }
    const start = value.substring(0, 4);
    const end = value.substring(value.length - 4);
    return `${start}${'*'.repeat(value.length - 8)}${end}`;
  }

  // 암호화
  public encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  // 복호화
  public decrypt(ciphertext: string): string {
    const [ivHex, encrypted] = ciphertext.split(':');
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // 런타임 비밀 정보 검증
  public validateRuntimeSecrets(): boolean {
    const currentTime = Date.now();
    
    for (const [name, value] of this.secrets.entries()) {
      // JWT 토큰 만료 검사
      if (name.includes('JWT') || name.includes('TOKEN')) {
        try {
          const payload = JSON.parse(Buffer.from(value.split('.')[1], 'base64').toString());
          if (payload.exp && payload.exp * 1000 < currentTime) {
            console.error(`Secret ${name} has expired`);
            return false;
          }
        } catch (error) {
          // JWT가 아닌 경우 무시
        }
      }

      // API 키 유효성 검사 (선택적)
      if (name.includes('API_KEY')) {
        // 실제 환경에서는 API 엔드포인트에 헬스 체크 요청
        // 여기서는 기본적인 형식 검증만 수행
        this.validateSecretFormat(name, value);
      }
    }

    return true;
  }
}

// 민감한 정보 필터링
export class DataSanitizer {
  private static sensitivePatterns = [
    // API 키 패턴
    /sk-[a-zA-Z0-9]{20,}/g,
    /gsk_[a-zA-Z0-9]{40,}/g,
    /sk-ant-[a-zA-Z0-9_-]{20,}/g,
    
    // JWT 토큰
    /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
    
    // 이메일 주소
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    
    // 전화번호
    /(\+?[1-9]\d{1,14}|\d{3}-\d{3,4}-\d{4})/g,
    
    // 신용카드 번호 (간단한 패턴)
    /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
    
    // 비밀번호 필드 (일반적인 필드명)
    /"password"\s*:\s*"[^"]+"/g,
    /"secret"\s*:\s*"[^"]+"/g,
    /"token"\s*:\s*"[^"]+"/g,
  ];

  // 로그에서 민감한 정보 제거
  public static sanitizeForLogging(data: any): any {
    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }

    if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data)) {
        return data.map(item => this.sanitizeForLogging(item));
      }

      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (this.isSensitiveField(key)) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeForLogging(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  // 문자열에서 민감한 정보 마스킹
  private static sanitizeString(str: string): string {
    let sanitized = str;
    
    for (const pattern of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, (match) => {
        if (match.length <= 8) {
          return '***';
        }
        const start = match.substring(0, 4);
        const end = match.substring(match.length - 4);
        return `${start}${'*'.repeat(match.length - 8)}${end}`;
      });
    }

    return sanitized;
  }

  // 민감한 필드명 검사
  private static isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'password', 'passwd', 'pwd',
      'secret', 'api_key', 'apikey', 'token',
      'private_key', 'privatekey',
      'credit_card', 'creditcard', 'ssn',
      'phone', 'email', 'address'
    ];

    return sensitiveFields.some(field => 
      fieldName.toLowerCase().includes(field)
    );
  }
}

// 보안 헤더 관리
export class SecurityHeaders {
  public static getSecureHeaders(): Record<string, string> {
    return {
      // XSS 보호
      'X-XSS-Protection': '1; mode=block',
      
      // 콘텐츠 타입 스니핑 방지
      'X-Content-Type-Options': 'nosniff',
      
      // 클릭재킹 방지
      'X-Frame-Options': 'DENY',
      
      // 참조자 정책
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // 권한 정책
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      
      // 콘텐츠 보안 정책 (개발 환경용 - 실제 환경에서는 더 엄격하게)
      'Content-Security-Policy': process.env.NODE_ENV === 'production' 
        ? "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.groq.com https://*.supabase.co;"
        : "default-src 'self' 'unsafe-eval' 'unsafe-inline'; connect-src 'self' https://api.groq.com https://*.supabase.co ws: wss:;",
      
      // HSTS (HTTPS에서만)
      ...(process.env.NODE_ENV === 'production' && {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
      })
    };
  }

  // Next.js API 응답에 보안 헤더 추가
  public static addSecurityHeaders(response: any): void {
    const headers = this.getSecureHeaders();
    
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }
  }
}

// 환경별 보안 설정
export class SecurityConfig {
  public static getConfig() {
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return {
      // 로깅 레벨
      logging: {
        level: isProduction ? 'warn' : 'debug',
        sanitizeData: true,
        includeStackTrace: isDevelopment
      },
      
      // 세션 설정
      session: {
        maxAge: isProduction ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000, // 1일 vs 7일
        secure: isProduction,
        httpOnly: true,
        sameSite: 'strict' as const
      },
      
      // API 제한
      api: {
        rateLimitWindow: 15 * 60 * 1000, // 15분
        rateLimitMax: isProduction ? 100 : 1000, // 요청 제한
        enableCors: isDevelopment,
        requireAuth: true
      },
      
      // 파일 업로드
      upload: {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        scanForMalware: isProduction
      },
      
      // AI 보안
      ai: {
        maxPromptLength: 5000,
        enablePromptFiltering: true,
        logSuspiciousActivity: true,
        blockHighRiskPrompts: isProduction
      }
    };
  }
}

// 전역 보안 초기화
export function initializeSecurity(): void {
  const secretsManager = SecretsManager.getInstance();
  
  // 런타임 비밀 정보 검증
  if (!secretsManager.validateRuntimeSecrets()) {
    throw new Error('Security validation failed: Invalid secrets detected');
  }
  
  // 개발 환경에서 보안 경고
  if (process.env.NODE_ENV === 'development') {
    console.warn('🔒 Development mode: Some security features are relaxed');
  }
  
  // 프로덕션 환경에서 추가 검증
  if (process.env.NODE_ENV === 'production') {
    const requiredEnvVars = ['ENCRYPTION_KEY', 'JWT_SECRET'];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Production environment missing required variable: ${envVar}`);
      }
    }
    console.log('🔒 Production security initialized');
  }
}

// 싱글톤 인스턴스 export
export const secretsManager = SecretsManager.getInstance();
export const securityConfig = SecurityConfig.getConfig(); 