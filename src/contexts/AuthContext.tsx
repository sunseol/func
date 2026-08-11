'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { AuthChangeEvent, User, Session } from '@supabase/supabase-js';
import { ProjectRole } from '@/types/ai-pm';
import {
  buildLoginRedirect,
  getPostLoginPath,
  getRequestedPath,
  isProtectedPath,
} from '@/lib/auth/navigation';

function isSupabaseAuthApiError(error: unknown): error is { status?: number; message?: string } {
  return typeof error === 'object' && error !== null && 'status' in error;
}

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
  const [pendingRevalidationUserId, setPendingRevalidationUserId] = useState<string | null>(null);
  const hasBootstrappedRef = useRef(false);
  const authUserIdRef = useRef<string | null>(null);
  const authGenerationRef = useRef(0);
  const profileRequestIdRef = useRef(0);
  const membershipRequestIdRef = useRef(0);
  const isMountedRef = useRef(false);
  const signOutInProgressRef = useRef(false);
  
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const router = useRouter();
  const pathname = usePathname();

  // Derived state
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      authGenerationRef.current += 1;
    };
  }, []);

  // Load user profile
  const loadUserProfile = useCallback(async (userId: string) => {
    const generation = authGenerationRef.current;
    const requestId = profileRequestIdRef.current + 1;
    profileRequestIdRef.current = requestId;
    try {
      const { data, error } = await supabaseRef.current
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (
        !isMountedRef.current
        || authGenerationRef.current !== generation
        || authUserIdRef.current !== userId
        || profileRequestIdRef.current !== requestId
      ) return;
      setProfile(data);
    } catch (error) {
      if (
        !isMountedRef.current
        || authGenerationRef.current !== generation
        || authUserIdRef.current !== userId
        || profileRequestIdRef.current !== requestId
      ) return;
      console.error('Profile load error:', error);
      setProfile(null); // Clear profile on error
    }
  }, []);

  // Load project memberships
  const loadProjectMemberships = useCallback(async (userId: string) => {
    const generation = authGenerationRef.current;
    const requestId = membershipRequestIdRef.current + 1;
    membershipRequestIdRef.current = requestId;
    try {
      const { data, error } = await supabaseRef.current
        .from('project_members')
        .select('project_id, role, added_at')
        .eq('user_id', userId);

      if (error) throw error;
      if (
        !isMountedRef.current
        || authGenerationRef.current !== generation
        || authUserIdRef.current !== userId
        || membershipRequestIdRef.current !== requestId
      ) return;
      setProjectMemberships(data || []);
    } catch (error) {
      if (
        !isMountedRef.current
        || authGenerationRef.current !== generation
        || authUserIdRef.current !== userId
        || membershipRequestIdRef.current !== requestId
      ) return;
      console.error('Project memberships load error:', error);
      setProjectMemberships([]);
    }
  }, []);

  // 초기 세션 부트스트랩: 최초 한 번만 로딩 표시
  useEffect(() => {
    let isMounted = true;
    const generation = authGenerationRef.current;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted || !isMountedRef.current || authGenerationRef.current !== generation) return;
        setSession(data.session ?? null);
        const currentUser = data.session?.user ?? null;
        authUserIdRef.current = currentUser?.id ?? null;
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
      (_event: AuthChangeEvent, session: Session | null) => {
        authGenerationRef.current += 1;
        setSession(session);
        const currentUser = session?.user ?? null;
        const previousUserId = authUserIdRef.current;
        authUserIdRef.current = currentUser?.id ?? null;
        setUser(currentUser);

        if (!currentUser) {
          setProfile(null);
          setProjectMemberships([]);
          if (!hasBootstrappedRef.current) setPendingRevalidationUserId(null);
          return;
        }

        if (!hasBootstrappedRef.current || previousUserId !== currentUser.id) {
          setProfile(null);
          setProjectMemberships([]);
          setPendingRevalidationUserId(currentUser.id);
        }
      }
    );
    return () => {
      subscription?.unsubscribe();
    };
  }, [loadUserProfile, loadProjectMemberships, supabase]);

  useEffect(() => {
    if (!pendingRevalidationUserId) return;
    const userId = pendingRevalidationUserId;
    setPendingRevalidationUserId(null);
    void Promise.all([
      loadUserProfile(userId),
      loadProjectMemberships(userId),
    ]).catch((error: unknown) => {
      console.error('Auth revalidation error:', error);
    });
  }, [loadProjectMemberships, loadUserProfile, pendingRevalidationUserId]);

  // Sign in method
  const signIn = useCallback(async (email: string, password: string) => {
    const signInGeneration = authGenerationRef.current;
    try {
      const { data, error } = await supabaseRef.current.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (isSupabaseAuthApiError(error) && error.status === 400) {
          return { error: '아이디 혹은 비밀번호가 틀렸습니다. 다시 확인해주세요.' };
        }
        return { error: error.message };
      }

      const nextSession = data.session;
      const currentUser = nextSession?.user ?? null;
      if (
        !isMountedRef.current
        || signOutInProgressRef.current
        || (authUserIdRef.current !== null && authUserIdRef.current !== currentUser?.id)
        || (authUserIdRef.current === null && authGenerationRef.current !== signInGeneration)
      ) return {};
      setSession(nextSession);
      signOutInProgressRef.current = false;
      const previousUserId = authUserIdRef.current;
      if (previousUserId !== currentUser?.id) {
        authGenerationRef.current += 1;
        setProfile(null);
        setProjectMemberships([]);
      }
      authUserIdRef.current = currentUser?.id ?? null;
      setUser(currentUser);
      if (currentUser) {
        await Promise.all([
          loadUserProfile(currentUser.id),
          loadProjectMemberships(currentUser.id),
        ]);
      }

      return {};
    } catch (error) {
      if (isSupabaseAuthApiError(error) && error.status === 400) {
        return { error: '아이디 혹은 비밀번호가 틀렸습니다. 다시 확인해주세요.' };
      }
      return { error: '로그인 중 오류가 발생했습니다.' };
    }
  }, [loadProjectMemberships, loadUserProfile]);

  // Sign out method
  const signOut = useCallback(async () => {
    signOutInProgressRef.current = true;
    const previousUserId = authUserIdRef.current;
    authGenerationRef.current += 1;
    const signOutGeneration = authGenerationRef.current;
    authUserIdRef.current = null;
    try {
      await supabaseRef.current.auth.signOut();
      if (!isMountedRef.current) return;
      setSession(null);
      setUser(null);
      setProfile(null);
      setProjectMemberships([]);
      router.replace('/landing');
    } catch (error) {
      signOutInProgressRef.current = false;
      if (authGenerationRef.current === signOutGeneration) {
        authGenerationRef.current += 1;
        authUserIdRef.current = previousUserId;
      }
      console.error('Sign out error:', error);
    }
  }, [router]);

  useEffect(() => {
    if (!initialized || loading) return;
    if (!router) return;
    if (signOutInProgressRef.current) {
      if (pathname === '/landing') signOutInProgressRef.current = false;
      return;
    }
    const search = typeof window !== 'undefined' ? window.location.search : '';
    if (!user && pathname && isProtectedPath(pathname)) {
      router.replace(buildLoginRedirect(getRequestedPath(pathname, search)));
      return;
    }
    if (user && pathname === '/login') {
      router.replace(getPostLoginPath(new URLSearchParams(search).get('redirect')));
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
    const { user, loading } = useAuth();
    const [shouldRender, setShouldRender] = useState(false);
    const hocRouter = useRouter();
    const hocPathname = usePathname();

    useEffect(() => {
      if (loading) return;

      if (requireAuth && !user) {
        const requestedPath = getRequestedPath(
          hocPathname,
          typeof window !== 'undefined' ? window.location.search : '',
        );
        hocRouter.replace(redirectTo === '/login' ? buildLoginRedirect(requestedPath) : redirectTo);
        return;
      }

      

      setShouldRender(true);
    }, [user, loading, hocPathname, hocRouter]);

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
