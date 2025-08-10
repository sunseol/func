import { createClient } from '@/lib/supabase/server';
import { AIpmErrorType, ProjectRole } from '@/types/ai-pm';

// Authentication result types
export interface AuthSuccess {
  user: {
    id: string;
    email?: string;
  };
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    role: 'user' | 'admin';
    created_at: string;
    updated_at: string;
  };
}

export interface AuthError {
  error: AIpmErrorType;
  message: string;
}

export type AuthResult = AuthSuccess | AuthError;

// Project membership interface
export interface ProjectMembership {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  added_by: string;
  added_at: string;
}

// Enhanced auth result with project memberships
export interface EnhancedAuthSuccess extends AuthSuccess {
  projectMemberships: ProjectMembership[];
}

export type EnhancedAuthResult = EnhancedAuthSuccess | AuthError;

// Check authentication and optionally require admin permissions
export async function checkAuth(): Promise<AuthResult> {
  try {
    const supabase = await createClient();
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { 
        error: AIpmErrorType.UNAUTHORIZED, 
        message: '인증이 필요합니다.' 
      };
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // 프로필이 없더라도 인증 자체는 통과시키고 기본 프로필로 대체
    if (profileError || !profile) {
      if (profileError) {
        console.warn('Profile fetch error, using fallback profile:', profileError);
      }
      const fallbackProfile = {
        id: user.id,
        email: user.email || '',
        full_name: null,
        role: 'user' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return {
        user: { id: user.id, email: user.email || '' },
        profile: fallbackProfile,
      };
    }

    return {
      user: { id: user.id, email: user.email },
      profile
    };
  } catch (error) {
    console.error('Auth check error:', error);
    return { 
      error: AIpmErrorType.INTERNAL_ERROR, 
      message: '인증 확인 중 오류가 발생했습니다.' 
    };
  }
}

// Enhanced authentication check with project memberships
export async function checkAuthWithMemberships(
  supabase: any
): Promise<EnhancedAuthResult> {
  try {
    const authResult = await checkAuth();
    
    if ('error' in authResult) {
      return authResult;
    }

    // Get user's project memberships
    const { data: memberships, error: membershipError } = await supabase
      .from('project_members')
      .select('*')
      .eq('user_id', authResult.user.id);

    if (membershipError) {
      console.error('Membership fetch error:', membershipError);
      // Don't fail auth if memberships can't be loaded
    }

    return {
      ...authResult,
      projectMemberships: memberships || []
    };
  } catch (error) {
    console.error('Enhanced auth check error:', error);
    return { 
      error: AIpmErrorType.INTERNAL_ERROR, 
      message: '인증 확인 중 오류가 발생했습니다.' 
    };
  }
}




// Validate UUID format
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Validate project role
export function isValidProjectRole(role: string): boolean {
  return ['콘텐츠기획', '서비스기획', 'UIUX기획', '개발자'].includes(role);
}

// Validate document status
export function isValidDocumentStatus(status: string): boolean {
  return ['private', 'pending_approval', 'official'].includes(status);
}

// Validate workflow step
export function isValidWorkflowStep(step: number): boolean {
  return Number.isInteger(step) && step >= 1 && step <= 9;
}

// Common validation errors
export const ValidationErrors = {
  INVALID_UUID: (field: string) => ({
    error: AIpmErrorType.VALIDATION_ERROR,
    message: `유효하지 않은 ${field} 형식입니다.`
  }),
  REQUIRED_FIELD: (field: string) => ({
    error: AIpmErrorType.VALIDATION_ERROR,
    message: `${field}은(는) 필수입니다.`
  }),
  INVALID_ROLE: {
    error: AIpmErrorType.VALIDATION_ERROR,
    message: '유효한 역할이 필요합니다. (콘텐츠기획, 서비스기획, UIUX기획, 개발자)'
  },
  INVALID_STATUS: {
    error: AIpmErrorType.VALIDATION_ERROR,
    message: '유효한 문서 상태가 필요합니다. (private, pending_approval, official)'
  },
  INVALID_WORKFLOW_STEP: {
    error: AIpmErrorType.VALIDATION_ERROR,
    message: '유효한 워크플로우 단계가 필요합니다. (1-9)'
  },
  MAX_LENGTH: (field: string, maxLength: number) => ({
    error: AIpmErrorType.VALIDATION_ERROR,
    message: `${field}은(는) ${maxLength}자를 초과할 수 없습니다.`
  })
};

// Session security functions
export async function validateSessionSecurity(
  supabase: any,
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    // Get user's recent sessions/activities
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      return { valid: false, reason: '유효하지 않은 세션입니다.' };
    }

    // Check for suspicious activity patterns
    // This is a basic implementation - can be enhanced with more sophisticated checks
    const lastSignIn = new Date(user.user.last_sign_in_at || 0);
    const now = new Date();
    const timeDiff = now.getTime() - lastSignIn.getTime();
    
    // Session older than 7 days requires re-authentication for sensitive operations
    if (timeDiff > 7 * 24 * 60 * 60 * 1000) {
      return { valid: false, reason: '보안을 위해 재인증이 필요합니다.' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Session security validation error:', error);
    return { valid: false, reason: '세션 검증 중 오류가 발생했습니다.' };
  }
}

// Rate limiting for API calls (basic implementation)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 100, 
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = identifier;
  
  let record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + windowMs };
    rateLimitStore.set(key, record);
  }
  
  if (record.count >= maxRequests) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetTime: record.resetTime 
    };
  }
  
  record.count++;
  return { 
    allowed: true, 
    remaining: maxRequests - record.count, 
    resetTime: record.resetTime 
  };
}

// Clean up old rate limit records periodically
export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Security headers helper
export function getSecurityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
}

// Input sanitization
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 10000); // Limit length
}

// Validate and sanitize project data
export function validateProjectData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.name || typeof data.name !== 'string') {
    errors.push('프로젝트 이름이 필요합니다.');
  } else if (data.name.length > 255) {
    errors.push('프로젝트 이름은 255자를 초과할 수 없습니다.');
  }
  
  if (data.description && typeof data.description !== 'string') {
    errors.push('프로젝트 설명은 문자열이어야 합니다.');
  } else if (data.description && data.description.length > 2000) {
    errors.push('프로젝트 설명은 2000자를 초과할 수 없습니다.');
  }
  
  return { valid: errors.length === 0, errors };
}

// Common database errors
export const DatabaseErrors = {
  NOT_FOUND: (resource: string) => ({
    error: AIpmErrorType.PROJECT_NOT_FOUND,
    message: `${resource}을(를) 찾을 수 없습니다.`
  }),
  QUERY_ERROR: (operation: string) => ({
    error: AIpmErrorType.DATABASE_ERROR,
    message: `${operation} 중 오류가 발생했습니다.`
  }),
  ALREADY_EXISTS: (resource: string) => ({
    error: AIpmErrorType.VALIDATION_ERROR,
    message: `${resource}이(가) 이미 존재합니다.`
  }),
  RATE_LIMITED: {
    error: AIpmErrorType.VALIDATION_ERROR,
    message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
  },
  SECURITY_VIOLATION: {
    error: AIpmErrorType.FORBIDDEN,
    message: '보안 정책 위반이 감지되었습니다.'
  }
};
