import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { AIpmErrorType, ProjectRole } from '@/types/ai-pm';

// Create Supabase client for server-side operations
export function createSupabaseClient() {
  const cookieStore = cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

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
export async function checkAuth(
  supabase: any, 
  requireAdmin = false
): Promise<AuthResult> {
  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { 
        error: AIpmErrorType.UNAUTHORIZED, 
        message: '인증이 필요합니다.' 
      };
    }

    // Validate session freshness (optional security check)
    const sessionAge = Date.now() - new Date(user.last_sign_in_at || 0).getTime();
    const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (sessionAge > maxSessionAge) {
      return { 
        error: AIpmErrorType.UNAUTHORIZED, 
        message: '세션이 만료되었습니다. 다시 로그인해주세요.' 
      };
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return { 
        error: AIpmErrorType.UNAUTHORIZED, 
        message: '사용자 프로필을 찾을 수 없습니다.' 
      };
    }

    // Check admin requirement
    if (requireAdmin && profile.role !== 'admin') {
      return { 
        error: AIpmErrorType.FORBIDDEN, 
        message: '관리자 권한이 필요합니다.' 
      };
    }

    return { 
      user: {
        id: user.id,
        email: user.email
      },
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
  supabase: any, 
  requireAdmin = false
): Promise<EnhancedAuthResult> {
  try {
    const authResult = await checkAuth(supabase, requireAdmin);
    
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

// Check if user has access to a specific project
export async function checkProjectAccess(
  supabase: any, 
  userId: string, 
  projectId: string
): Promise<boolean> {
  try {
    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role === 'admin') {
      return true;
    }

    // Check if user is project member
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    return !!membership;
  } catch (error) {
    console.error('Project access check error:', error);
    return false;
  }
}

// Get user's role in a specific project
export async function getUserProjectRole(
  supabase: any, 
  userId: string, 
  projectId: string
): Promise<ProjectRole | null> {
  try {
    const { data: membership } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    return membership?.role || null;
  } catch (error) {
    console.error('Project role check error:', error);
    return null;
  }
}

// Check if user can manage a specific project (admin or project creator)
export async function checkProjectManagementAccess(
  supabase: any, 
  userId: string, 
  projectId: string
): Promise<boolean> {
  try {
    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role === 'admin') {
      return true;
    }

    // Check if user is project creator
    const { data: project } = await supabase
      .from('projects')
      .select('created_by')
      .eq('id', projectId)
      .single();

    return project?.created_by === userId;
  } catch (error) {
    console.error('Project management access check error:', error);
    return false;
  }
}

// Check if user can approve documents for a specific workflow step
export async function checkDocumentApprovalAccess(
  supabase: any, 
  userId: string, 
  projectId: string, 
  workflowStep: number
): Promise<boolean> {
  try {
    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role === 'admin') {
      return true;
    }

    // Check if user is project creator
    const { data: project } = await supabase
      .from('projects')
      .select('created_by')
      .eq('id', projectId)
      .single();

    if (project?.created_by === userId) {
      return true;
    }

    // For now, any project member can approve documents
    // This can be extended to role-based approval in the future
    const hasAccess = await checkProjectAccess(supabase, userId, projectId);
    return hasAccess;
  } catch (error) {
    console.error('Document approval access check error:', error);
    return false;
  }
}

// Check if user can modify a specific document
export async function checkDocumentAccess(
  supabase: any, 
  userId: string, 
  documentId: string,
  requireOwnership = false
): Promise<{ canAccess: boolean; canModify: boolean; document?: any }> {
  try {
    // Get document with project info
    const { data: document, error: docError } = await supabase
      .from('planning_documents')
      .select(`
        *,
        projects!inner(id, created_by)
      `)
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return { canAccess: false, canModify: false };
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    const isAdmin = profile?.role === 'admin';
    const isDocumentCreator = document.created_by === userId;
    const isProjectCreator = document.projects.created_by === userId;

    // Check if user is project member
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', document.project_id)
      .eq('user_id', userId)
      .single();

    const isProjectMember = !!membership;

    // Determine access levels
    const canAccess = isAdmin || isProjectMember;
    let canModify = false;

    if (requireOwnership) {
      canModify = isAdmin || isDocumentCreator;
    } else {
      canModify = isAdmin || isDocumentCreator || isProjectCreator;
    }

    return { 
      canAccess, 
      canModify, 
      document 
    };
  } catch (error) {
    console.error('Document access check error:', error);
    return { canAccess: false, canModify: false };
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
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
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