import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// CSRF 토큰 생성
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// CSRF 토큰 검증
export async function verifyCsrfToken(token: string | null, sessionToken: string | null = null): Promise<boolean> {
  if (!token) {
    return false;
  }
  
  // sessionToken이 제공되지 않으면 쿠키에서 가져오기
  const actualSessionToken = sessionToken || await getCsrfTokenFromCookie();
  
  if (!actualSessionToken) {
    return false;
  }
  
  try {
    // 상수 시간 비교로 타이밍 공격 방지
    return crypto.timingSafeEqual(
      Buffer.from(token, 'hex'),
      Buffer.from(actualSessionToken, 'hex')
    );
  } catch (error) {
    return false;
  }
}

// CSRF 토큰을 쿠키에 설정
export function setCsrfTokenCookie(response: NextResponse, token: string) {
  response.cookies.set('csrf-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24시간
    path: '/'
  });
}

// CSRF 토큰을 쿠키에서 가져오기
export async function getCsrfTokenFromCookie(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('csrf-token');
    return token?.value || null;
  } catch (error) {
    return null;
  }
}

// API 요청에서 CSRF 토큰 추출
export function extractCsrfToken(request: NextRequest): string | null {
  // 헤더에서 토큰 확인
  const headerToken = request.headers.get('x-csrf-token');
  if (headerToken) {
    return headerToken;
  }

  // POST 요청의 body에서 토큰 확인 (form data)
  const contentType = request.headers.get('content-type');
  if (contentType?.includes('application/x-www-form-urlencoded')) {
    // 이 경우는 별도 처리가 필요하지만, 현재는 JSON API만 사용
    return null;
  }

  return null;
}

// CSRF 보호 미들웨어
export function withCsrfProtection(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const method = request.method;
    
    // GET, HEAD, OPTIONS 요청은 CSRF 보호 제외
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return handler(request);
    }

    // CSRF 토큰 검증
    const requestToken = extractCsrfToken(request);
    const sessionToken = await getCsrfTokenFromCookie();

    if (!(await verifyCsrfToken(requestToken, sessionToken))) {
      return NextResponse.json(
        { error: 'CSRF token validation failed', code: 'CSRF_TOKEN_INVALID' },
        { status: 403 }
      );
    }

    return handler(request);
  };
}

// React Hook for CSRF token management
export const csrfTokenManager = {
  // 클라이언트에서 CSRF 토큰 가져오기
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    
    // meta 태그에서 토큰 가져오기
    const metaToken = document.querySelector('meta[name="csrf-token"]');
    if (metaToken) {
      return metaToken.getAttribute('content');
    }
    
    return null;
  },

  // API 요청에 CSRF 토큰 추가
  addTokenToHeaders: (headers: HeadersInit = {}): HeadersInit => {
    const token = csrfTokenManager.getToken();
    if (token) {
      return {
        ...headers,
        'X-CSRF-Token': token
      };
    }
    return headers;
  },

  // fetch 요청 래퍼
  secureFetch: async (url: string, options: RequestInit = {}): Promise<Response> => {
    const secureHeaders = csrfTokenManager.addTokenToHeaders(options.headers);
    
    return fetch(url, {
      ...options,
      headers: secureHeaders
    });
  }
};

// Next.js API 라우트용 CSRF 헬퍼
export class CsrfProtectedRoute {
  private csrfToken: string;

  constructor() {
    this.csrfToken = generateCsrfToken();
  }

  // CSRF 토큰을 응답에 설정
  setTokenInResponse(response: NextResponse): void {
    setCsrfTokenCookie(response, this.csrfToken);
  }

  // 요청 검증
  async validateRequest(request: NextRequest): Promise<boolean> {
    const method = request.method;
    
    // 안전한 HTTP 메서드는 검증하지 않음
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    const requestToken = extractCsrfToken(request);
    const sessionToken = await getCsrfTokenFromCookie();
    
    return await verifyCsrfToken(requestToken, sessionToken);
  }

  // 보호된 핸들러 생성
  protect<T extends any[]>(
    handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      if (!(await this.validateRequest(request))) {
        return NextResponse.json(
          { 
            error: 'CSRF protection failed',
            code: 'CSRF_TOKEN_INVALID',
            message: '요청이 거부되었습니다. 페이지를 새로고침 후 다시 시도해주세요.'
          },
          { status: 403 }
        );
      }

      const response = await handler(request, ...args);
      
      // 새로운 토큰을 응답에 설정 (토큰 로테이션)
      if (response.status < 400) {
        this.setTokenInResponse(response);
      }

      return response;
    };
  }
}

// CSRF 토큰을 HTML meta 태그로 설정하는 유틸리티
export function generateCsrfMetaTag(): string {
  const token = generateCsrfToken();
  return `<meta name="csrf-token" content="${token}" />`;
} 