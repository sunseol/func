import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User, Session } from '@supabase/supabase-js';

// Session security configuration
interface SessionConfig {
  maxAge: number; // Maximum session age in milliseconds
  refreshThreshold: number; // Refresh session when this much time is left
  maxInactivity: number; // Maximum inactivity period
  requireReauth: string[]; // Actions that require re-authentication
}

// Default session configuration
const DEFAULT_SESSION_CONFIG: SessionConfig = {
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  refreshThreshold: 60 * 60 * 1000, // 1 hour
  maxInactivity: 4 * 60 * 60 * 1000, // 4 hours
  requireReauth: ['delete_project', 'manage_members', 'approve_document'],
};

// Session activity tracking
interface SessionActivity {
  lastActivity: number;
  lastRefresh: number;
  activityCount: number;
  ipAddress?: string;
  userAgent?: string;
}

// In-memory session activity store (in production, use Redis or database)
const sessionActivityStore = new Map<string, SessionActivity>();

export class SessionManager {
  private supabase;
  private config: SessionConfig;

  constructor(config: Partial<SessionConfig> = {}) {
    this.supabase = createClientComponentClient();
    this.config = { ...DEFAULT_SESSION_CONFIG, ...config };
  }

  // Initialize session tracking
  async initializeSession(user: User, ipAddress?: string, userAgent?: string): Promise<void> {
    const now = Date.now();
    
    sessionActivityStore.set(user.id, {
      lastActivity: now,
      lastRefresh: now,
      activityCount: 1,
      ipAddress,
      userAgent,
    });

    // Set up periodic session validation
    this.scheduleSessionValidation(user.id);
  }

  // Update session activity
  updateActivity(userId: string): void {
    const activity = sessionActivityStore.get(userId);
    if (activity) {
      activity.lastActivity = Date.now();
      activity.activityCount += 1;
      sessionActivityStore.set(userId, activity);
    }
  }

  // Check if session is valid
  async validateSession(userId: string): Promise<{
    valid: boolean;
    reason?: string;
    requiresRefresh?: boolean;
    requiresReauth?: boolean;
  }> {
    try {
      // Get current session
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error || !session || session.user.id !== userId) {
        return { valid: false, reason: '세션을 찾을 수 없습니다.' };
      }

      const now = Date.now();
      const sessionStart = new Date(session.user.created_at).getTime();
      const lastSignIn = new Date(session.user.last_sign_in_at || 0).getTime();
      
      // Check session age
      if (now - lastSignIn > this.config.maxAge) {
        return { 
          valid: false, 
          reason: '세션이 만료되었습니다.',
          requiresReauth: true 
        };
      }

      // Check activity
      const activity = sessionActivityStore.get(userId);
      if (activity) {
        // Check inactivity
        if (now - activity.lastActivity > this.config.maxInactivity) {
          return { 
            valid: false, 
            reason: '비활성 상태가 너무 오래 지속되었습니다.',
            requiresReauth: true 
          };
        }

        // Check if refresh is needed
        if (now - activity.lastRefresh > this.config.refreshThreshold) {
          return { 
            valid: true, 
            requiresRefresh: true 
          };
        }
      }

      return { valid: true };
    } catch (error) {
      console.error('Session validation error:', error);
      return { valid: false, reason: '세션 검증 중 오류가 발생했습니다.' };
    }
  }

  // Refresh session
  async refreshSession(userId: string): Promise<{
    success: boolean;
    session?: Session;
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();
      
      if (error || !data.session) {
        return { success: false, error: '세션 갱신에 실패했습니다.' };
      }

      // Update activity tracking
      const activity = sessionActivityStore.get(userId);
      if (activity) {
        activity.lastRefresh = Date.now();
        sessionActivityStore.set(userId, activity);
      }

      return { success: true, session: data.session };
    } catch (error) {
      console.error('Session refresh error:', error);
      return { success: false, error: '세션 갱신 중 오류가 발생했습니다.' };
    }
  }

  // Check if action requires re-authentication
  requiresReauth(action: string): boolean {
    return this.config.requireReauth.includes(action);
  }

  // Perform re-authentication check
  async checkReauthRequired(
    userId: string, 
    action: string
  ): Promise<{
    required: boolean;
    reason?: string;
    lastAuth?: number;
  }> {
    if (!this.requiresReauth(action)) {
      return { required: false };
    }

    const activity = sessionActivityStore.get(userId);
    if (!activity) {
      return { 
        required: true, 
        reason: '세션 정보를 찾을 수 없습니다.' 
      };
    }

    const now = Date.now();
    const timeSinceLastAuth = now - activity.lastRefresh;
    
    // Require re-auth if last authentication was more than 30 minutes ago
    if (timeSinceLastAuth > 30 * 60 * 1000) {
      return { 
        required: true, 
        reason: '보안을 위해 재인증이 필요합니다.',
        lastAuth: activity.lastRefresh
      };
    }

    return { required: false, lastAuth: activity.lastRefresh };
  }

  // Invalidate session
  async invalidateSession(userId: string): Promise<void> {
    try {
      await this.supabase.auth.signOut();
      sessionActivityStore.delete(userId);
    } catch (error) {
      console.error('Session invalidation error:', error);
    }
  }

  // Get session statistics
  getSessionStats(userId: string): SessionActivity | null {
    return sessionActivityStore.get(userId) || null;
  }

  // Clean up expired sessions
  cleanupExpiredSessions(): void {
    const now = Date.now();
    
    for (const [userId, activity] of sessionActivityStore.entries()) {
      if (now - activity.lastActivity > this.config.maxInactivity) {
        sessionActivityStore.delete(userId);
      }
    }
  }

  // Schedule periodic session validation
  private scheduleSessionValidation(userId: string): void {
    // Check session every 5 minutes
    const intervalId = setInterval(async () => {
      const validation = await this.validateSession(userId);
      
      if (!validation.valid) {
        await this.invalidateSession(userId);
        clearInterval(intervalId);
      } else if (validation.requiresRefresh) {
        await this.refreshSession(userId);
      }
    }, 5 * 60 * 1000);

    // Clean up interval after max session age
    setTimeout(() => {
      clearInterval(intervalId);
    }, this.config.maxAge);
  }

  // Security event logging
  logSecurityEvent(
    userId: string, 
    event: string, 
    details?: any
  ): void {
    const activity = sessionActivityStore.get(userId);
    
    console.log(`[SECURITY] ${event}`, {
      userId,
      timestamp: new Date().toISOString(),
      ipAddress: activity?.ipAddress,
      userAgent: activity?.userAgent,
      details,
    });
  }

  // Detect suspicious activity
  detectSuspiciousActivity(userId: string): {
    suspicious: boolean;
    reasons: string[];
  } {
    const activity = sessionActivityStore.get(userId);
    const reasons: string[] = [];
    
    if (!activity) {
      return { suspicious: false, reasons };
    }

    const now = Date.now();
    
    // Check for excessive activity
    if (activity.activityCount > 1000) {
      reasons.push('과도한 활동 감지');
    }

    // Check for rapid requests (basic implementation)
    const activityRate = activity.activityCount / ((now - activity.lastRefresh) / 1000);
    if (activityRate > 10) { // More than 10 requests per second
      reasons.push('비정상적인 요청 빈도');
    }

    return {
      suspicious: reasons.length > 0,
      reasons,
    };
  }
}

// Global session manager instance
export const sessionManager = new SessionManager();

// React hook for session management
export function useSessionManager() {
  const supabase = createClientComponentClient();

  const validateCurrentSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { valid: false, reason: '사용자가 인증되지 않았습니다.' };
    
    return sessionManager.validateSession(user.id);
  };

  const refreshCurrentSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: '사용자가 인증되지 않았습니다.' };
    
    return sessionManager.refreshSession(user.id);
  };

  const updateActivity = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      sessionManager.updateActivity(user.id);
    }
  };

  const checkActionAuth = async (action: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { required: true, reason: '사용자가 인증되지 않았습니다.' };
    
    return sessionManager.checkReauthRequired(user.id, action);
  };

  return {
    validateCurrentSession,
    refreshCurrentSession,
    updateActivity,
    checkActionAuth,
    sessionManager,
  };
}

// Cleanup expired sessions periodically
setInterval(() => {
  sessionManager.cleanupExpiredSessions();
}, 10 * 60 * 1000); // Every 10 minutes