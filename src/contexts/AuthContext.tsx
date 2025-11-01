'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User, Session, AuthApiError } from '@supabase/supabase-js';
import { ProjectRole } from '@/types/ai-pm';

// User profile interface
interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

// Project membership interface
interface ProjectMembership {
  project_id: string;
  role: ProjectRole;
  added_at: string;
}

// Authentication context interface
interface AuthContextType {
  // Core authentication
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  
  // AI PM specific
  isAdmin: boolean;
  projectMemberships: ProjectMembership[];
  
  // Methods
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshProjectMemberships: () => Promise<void>;
  
  
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [projectMemberships, setProjectMemberships] = useState<ProjectMembership[]>([]);
  // loading은 초기 부트스트랩 때만 true. 이후 토큰 갱신 등 재검증은 UI를 막지 않음
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const hasBootstrappedRef = useRef(false);
  
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const router = useRouter();
  const pathname = usePathname();

  // Derived state
  const isAdmin = profile?.role === 'admin';

  // Load user profile
  const loadUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabaseRef.current
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Profile load error:', error);
      setProfile(null); // Clear profile on error
    }
  }, []);

  // Load project memberships
  const loadProjectMemberships = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabaseRef.current
        .from('project_members')
        .select('project_id, role, added_at')
        .eq('user_id', userId);

      if (error) throw error;
      setProjectMemberships(data || []);
    } catch (error) {
      console.error('Project memberships load error:', error);
      setProjectMemberships([]);
    }
  }, []);

  // 초기 세션 부트스트랩: 최초 한 번만 로딩 표시
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;
        setSession(data.session ?? null);
        const currentUser = data.session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await Promise.all([
            loadUserProfile(currentUser.id),
            loadProjectMemberships(currentUser.id),
          ]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          hasBootstrappedRef.current = true;
          setInitialized(true);
        }
      }
    })();
    return () => { isMounted = false; };
  }, [loadUserProfile, loadProjectMemberships, supabase]);

  // 이후 인증 이벤트: UI를 막지 않고 백그라운드로 재검증
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        // 초기 부트스트랩 이전 이벤트는 초기 효과에서 처리됨
        if (!hasBootstrappedRef.current) return;

        if (!currentUser) {
          setProfile(null);
          setProjectMemberships([]);
          return;
        }

        // SIGNED_IN이나 사용자 변경 시에만 무거운 재조회 수행
        try {
          await Promise.all([
            loadUserProfile(currentUser.id),
            loadProjectMemberships(currentUser.id),
          ]);
        } catch (e) {
          // 에러는 조용히 로그만 남김 (UI 차단 없음)
          console.error('Auth revalidation error:', e);
        }
      }
    );
    return () => {
      subscription?.unsubscribe();
    };
  }, [loadUserProfile, loadProjectMemberships, supabase]);

  // Sign in method
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabaseRef.current.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error instanceof AuthApiError && error.status === 400) {
          return { error: '아이디 혹은 비밀번호가 틀렸습니다. 다시 확인해주세요.' };
        }
        return { error: error.message };
      }

      return {};
    } catch (error) {
      if (error instanceof AuthApiError && error.status === 400) {
        return { error: '아이디 혹은 비밀번호가 틀렸습니다. 다시 확인해주세요.' };
      }
      return { error: '로그인 중 오류가 발생했습니다.' };
    }
  }, []);

  // Sign out method
  const signOut = useCallback(async () => {
    try {
      await supabaseRef.current.auth.signOut();
      setUser(null);
      setProfile(null);
      setProjectMemberships([]);
      router.replace('/landing');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, [router]);

  useEffect(() => {
    if (!initialized || loading) return;
    if (!router) return;
    const publicPaths = ['/landing', '/login', '/signup', '/reset-password'];
    if (!user && pathname && !publicPaths.some(path => pathname.startsWith(path))) {
      router.replace('/landing');
    }
  }, [initialized, loading, user, pathname, router]);

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadUserProfile(user.id);
    }
  }, [user, loadUserProfile]);

  // Refresh project memberships
  const refreshProjectMemberships = useCallback(async () => {
    if (user) {
      await loadProjectMemberships(user.id);
    }
  }, [user, loadProjectMemberships]);

  

  const contextValue = useMemo(() => ({
    user,
    session,
    profile,
    loading,
    initialized,
    isAdmin,
    projectMemberships,
    signIn,
    signOut,
    refreshProfile,
    refreshProjectMemberships,
    
  }), [
    user,
    session,
    profile,
    loading,
    initialized,
    isAdmin,
    projectMemberships,
    signIn,
    signOut,
    refreshProfile,
    refreshProjectMemberships,
    
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    requireAuth?: boolean;
    
    redirectTo?: string;
  } = {}
) {
  const { requireAuth = true, redirectTo = '/login' } = options;

  return function AuthenticatedComponent(props: P) {
    const { user, profile, loading } = useAuth();
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
      if (loading) return;

      if (requireAuth && !user) {
        window.location.href = redirectTo;
        return;
      }

      

      setShouldRender(true);
    }, [user, profile, loading]);

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      );
    }

    if (!shouldRender) {
      return null;
    }

    return <Component {...props} />;
  };
}
