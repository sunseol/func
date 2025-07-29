'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Session } from '@supabase/supabase-js';
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
  
  // AI PM specific
  isAdmin: boolean;
  projectMemberships: ProjectMembership[];
  
  // Methods
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshProjectMemberships: () => Promise<void>;
  
  // Permission checks
  canAccessProject: (projectId: string) => boolean;
  getProjectRole: (projectId: string) => ProjectRole | null;
  canManageProject: (projectId: string) => boolean;
  canCreateProject: () => boolean;
  canManageMembers: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [projectMemberships, setProjectMemberships] = useState<ProjectMembership[]>([]);
  const [loading, setLoading] = useState(true);
  
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // Derived state
  const isAdmin = profile?.role === 'admin';

  // Load user profile
  const loadUserProfile = useCallback(async (userId: string) => {
    try {
      console.log('Loading user profile for user:', userId);
      const { data, error } = await supabaseRef.current
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Profile load error details:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return;
      }

      console.log('User profile loaded successfully:', data);
      setProfile(data);
    } catch (error) {
      console.error('Profile load error (catch):', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }, []);

  // Load project memberships
  const loadProjectMemberships = useCallback(async (userId: string) => {
    try {
      console.log('Loading project memberships for user:', userId);
      const { data, error } = await supabaseRef.current
        .from('project_members')
        .select('project_id, role, added_at')
        .eq('user_id', userId);

      if (error) {
        console.error('Project memberships load error details:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        // If table doesn't exist or no access, set empty array
        setProjectMemberships([]);
        return;
      }

      console.log('Project memberships loaded successfully:', data);
      setProjectMemberships(data || []);
    } catch (error) {
      console.error('Project memberships load error (catch):', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      // Set empty array on any error
      setProjectMemberships([]);
    }
  }, []);

  // Initialize authentication state
  useEffect(() => {
    // This is a temporary diagnostic step to isolate the problem.
    console.log('[DIAGNOSTIC] Setting up simplified auth listener.');

    const { data: { subscription } } = supabaseRef.current.auth.onAuthStateChange(
      (event, session) => {
        console.log(`[DIAGNOSTIC] Auth event: ${event}. Session: ${session ? 'exists' : 'null'}`);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Temporarily bypass profile loading for diagnosis.
        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setProjectMemberships([]);
        }
        
        console.log('[DIAGNOSTIC] Forcing loading to false.');
        setLoading(false);
      }
    );

    return () => {
      console.log('[DIAGNOSTIC] Cleaning up auth listener.');
      subscription?.unsubscribe();
    };
  }, []); // Intentionally empty for this diagnostic step.

  // Sign in method
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabaseRef.current.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: '로그인 중 오류가 발생했습니다.' };
    }
  }, []);

  // Sign out method
  const signOut = useCallback(async () => {
    try {
      await supabaseRef.current.auth.signOut();
      setProfile(null);
      setProjectMemberships([]);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, []);

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

  // Permission check methods
  const canAccessProject = useCallback((projectId: string): boolean => {
    if (isAdmin) return true;
    return projectMemberships.some(membership => membership.project_id === projectId);
  }, [isAdmin, projectMemberships]);

  const getProjectRole = useCallback((projectId: string): ProjectRole | null => {
    const membership = projectMemberships.find(m => m.project_id === projectId);
    return membership?.role || null;
  }, [projectMemberships]);

  const canManageProject = useCallback((projectId: string): boolean => {
    if (isAdmin) return true;
    // For now, only admins can manage projects
    // This can be extended to include project creators
    return false;
  }, [isAdmin]);

  const canCreateProject = useCallback(() => {
    return isAdmin;
  }, [isAdmin]);

  const canManageMembers = useCallback(() => {
    return isAdmin;
  }, [isAdmin]);

  const contextValue = useMemo(() => ({
    user,
    session,
    profile,
    loading,
    isAdmin,
    projectMemberships,
    signIn,
    signOut,
    refreshProfile,
    refreshProjectMemberships,
    canAccessProject,
    getProjectRole,
    canManageProject,
    canCreateProject,
    canManageMembers,
  }), [
    user,
    session,
    profile,
    loading,
    isAdmin,
    projectMemberships,
    signIn,
    signOut,
    refreshProfile,
    refreshProjectMemberships,
    canAccessProject,
    getProjectRole,
    canManageProject,
    canCreateProject,
    canManageMembers,
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
    requireAdmin?: boolean;
    redirectTo?: string;
  } = {}
) {
  const { requireAuth = true, requireAdmin = false, redirectTo = '/login' } = options;

  return function AuthenticatedComponent(props: P) {
    const { user, profile, loading } = useAuth();
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
      if (loading) return;

      if (requireAuth && !user) {
        window.location.href = redirectTo;
        return;
      }

      if (requireAdmin && profile?.role !== 'admin') {
        window.location.href = '/unauthorized';
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

// Hook for project-specific permissions
export function useProjectPermissions(projectId?: string) {
  const { canAccessProject, getProjectRole, canManageProject, isAdmin } = useAuth();

  return {
    canAccess: projectId ? canAccessProject(projectId) : false,
    role: projectId ? getProjectRole(projectId) : null,
    canManage: projectId ? canManageProject(projectId) : false,
    isAdmin,
  };
}