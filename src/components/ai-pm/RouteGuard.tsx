'use client';

import React, { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';

interface RouteGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requiredProjectId?: string;
  allowedRoles?: string[];
  fallbackPath?: string;
}

interface GuardState {
  isChecking: boolean;
  hasAccess: boolean;
  errorMessage?: string;
}

export default function RouteGuard({
  children,
  requireAuth = true,
  requireAdmin = false,
  requiredProjectId,
  allowedRoles = [],
  fallbackPath = '/ai-pm'
}: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading: authLoading, canAccessProject, getProjectRole } = useAuth();
  const { canAccessProject: navCanAccessProject } = useNavigation();
  
  const [guardState, setGuardState] = useState<GuardState>({
    isChecking: true,
    hasAccess: false
  });

  useEffect(() => {
    const checkAccess = async () => {
      if (authLoading) {
        return; // Wait for auth to load
      }

      setGuardState({ isChecking: true, hasAccess: false });

      try {
        // Check authentication requirement
        if (requireAuth && !user) {
          setGuardState({
            isChecking: false,
            hasAccess: false,
            errorMessage: '로그인이 필요합니다.'
          });
          router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }

        // Check admin requirement
        if (requireAdmin && profile?.role !== 'admin') {
          setGuardState({
            isChecking: false,
            hasAccess: false,
            errorMessage: '관리자 권한이 필요합니다.'
          });
          router.push(fallbackPath);
          return;
        }

        // Check project access
        if (requiredProjectId) {
          const hasProjectAccess = canAccessProject(requiredProjectId) && 
                                  navCanAccessProject(requiredProjectId);
          
          if (!hasProjectAccess) {
            setGuardState({
              isChecking: false,
              hasAccess: false,
              errorMessage: '이 프로젝트에 접근할 권한이 없습니다.'
            });
            router.push(fallbackPath);
            return;
          }

          // Check role requirements for project
          if (allowedRoles.length > 0) {
            const userRole = getProjectRole(requiredProjectId);
            const hasRoleAccess = userRole && allowedRoles.includes(userRole);
            
            if (!hasRoleAccess) {
              setGuardState({
                isChecking: false,
                hasAccess: false,
                errorMessage: `이 기능을 사용하려면 다음 역할 중 하나가 필요합니다: ${allowedRoles.join(', ')}`
              });
              router.push(`/ai-pm/${requiredProjectId}`);
              return;
            }
          }
        }

        // All checks passed
        setGuardState({
          isChecking: false,
          hasAccess: true
        });

      } catch (error) {
        console.error('Route guard error:', error);
        setGuardState({
          isChecking: false,
          hasAccess: false,
          errorMessage: '권한 검증 중 오류가 발생했습니다.'
        });
        router.push(fallbackPath);
      }
    };

    checkAccess();
  }, [
    user, 
    profile, 
    authLoading, 
    requireAuth, 
    requireAdmin, 
    requiredProjectId, 
    allowedRoles, 
    pathname,
    router,
    fallbackPath,
    canAccessProject,
    getProjectRole,
    navCanAccessProject
  ]);

  // Show loading spinner while checking
  if (guardState.isChecking || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">권한을 확인하는 중...</p>
        </div>
      </div>
    );
  }

  // Show error message if access denied
  if (!guardState.hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">접근 권한이 없습니다</h2>
          <p className="text-gray-600 mb-6">{guardState.errorMessage}</p>
          <button
            onClick={() => router.push(fallbackPath)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  // Render children if access granted
  return <>{children}</>;
}

// Convenience wrapper components for common guard scenarios
export function AuthGuard({ children }: { children: ReactNode }) {
  return (
    <RouteGuard requireAuth={true}>
      {children}
    </RouteGuard>
  );
}

export function AdminGuard({ children }: { children: ReactNode }) {
  return (
    <RouteGuard requireAuth={true} requireAdmin={true}>
      {children}
    </RouteGuard>
  );
}

export function ProjectGuard({ 
  children, 
  projectId, 
  allowedRoles = [] 
}: { 
  children: ReactNode;
  projectId: string;
  allowedRoles?: string[];
}) {
  return (
    <RouteGuard 
      requireAuth={true} 
      requiredProjectId={projectId}
      allowedRoles={allowedRoles}
    >
      {children}
    </RouteGuard>
  );
} 