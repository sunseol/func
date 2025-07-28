'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ProjectWithCreator } from '@/types/ai-pm';

interface NavigationState {
  // Current navigation context
  currentProjectId: string | null;
  currentProject: ProjectWithCreator | null;
  currentWorkflowStep: number | null;
  
  // Page states
  isNavigating: boolean;
  navigationHistory: string[];
  
  // UI states
  showSidebar: boolean;
  sidebarCollapsed: boolean;
}

interface NavigationContextType {
  state: NavigationState;
  
  // Navigation actions
  navigateToProject: (projectId: string) => void;
  navigateToWorkflowStep: (projectId: string, step: number) => void;
  navigateBack: () => void;
  
  // State management
  setCurrentProject: (project: ProjectWithCreator | null) => void;
  setCurrentWorkflowStep: (step: number | null) => void;
  
  // UI actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Route guards
  canAccessProject: (projectId: string) => boolean;
  canAccessWorkflowStep: (projectId: string, step: number) => boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [state, setState] = useState<NavigationState>({
    currentProjectId: null,
    currentProject: null,
    currentWorkflowStep: null,
    isNavigating: false,
    navigationHistory: [],
    showSidebar: true,
    sidebarCollapsed: false
  });

  // Parse current route and update state
  useEffect(() => {
    const pathSegments = pathname.split('/').filter(Boolean);
    
    if (pathSegments[0] === 'ai-pm') {
      const projectId = pathSegments[1] || null;
      const workflowStep = pathSegments[2] === 'workflow' && pathSegments[3] 
        ? parseInt(pathSegments[3]) 
        : null;

      setState(prev => ({
        ...prev,
        currentProjectId: projectId,
        currentWorkflowStep: workflowStep,
        navigationHistory: prev.navigationHistory.includes(pathname) 
          ? prev.navigationHistory 
          : [...prev.navigationHistory.slice(-9), pathname] // Keep last 10 routes
      }));
    }
  }, [pathname]);

  // Navigation actions
  const navigateToProject = (projectId: string) => {
    setState(prev => ({ ...prev, isNavigating: true }));
    router.push(`/ai-pm/${projectId}`);
    
    // Reset navigation state after a delay
    setTimeout(() => {
      setState(prev => ({ ...prev, isNavigating: false }));
    }, 300);
  };

  const navigateToWorkflowStep = (projectId: string, step: number) => {
    if (!canAccessWorkflowStep(projectId, step)) {
      console.warn(`Cannot access workflow step ${step} for project ${projectId}`);
      return;
    }

    setState(prev => ({ ...prev, isNavigating: true }));
    router.push(`/ai-pm/${projectId}/workflow/${step}`);
    
    setTimeout(() => {
      setState(prev => ({ ...prev, isNavigating: false }));
    }, 300);
  };

  const navigateBack = () => {
    const history = state.navigationHistory;
    if (history.length > 1) {
      const previousRoute = history[history.length - 2];
      setState(prev => ({ 
        ...prev, 
        isNavigating: true,
        navigationHistory: prev.navigationHistory.slice(0, -1)
      }));
      router.push(previousRoute);
      
      setTimeout(() => {
        setState(prev => ({ ...prev, isNavigating: false }));
      }, 300);
    } else {
      router.back();
    }
  };

  // State management
  const setCurrentProject = (project: ProjectWithCreator | null) => {
    setState(prev => ({ ...prev, currentProject: project }));
  };

  const setCurrentWorkflowStep = (step: number | null) => {
    setState(prev => ({ ...prev, currentWorkflowStep: step }));
  };

  // UI actions
  const toggleSidebar = () => {
    setState(prev => ({ ...prev, showSidebar: !prev.showSidebar }));
  };

  const setSidebarCollapsed = (collapsed: boolean) => {
    setState(prev => ({ ...prev, sidebarCollapsed: collapsed }));
  };

  // Route guards
  const canAccessProject = (projectId: string): boolean => {
    // TODO: Implement project access validation based on user permissions
    // For now, allow access if user is authenticated
    return !!projectId;
  };

  const canAccessWorkflowStep = (projectId: string, step: number): boolean => {
    // Validate step range
    if (step < 1 || step > 9) return false;
    
    // Check project access
    if (!canAccessProject(projectId)) return false;
    
    // TODO: Add more sophisticated step access logic based on project progress
    // For now, allow access to all steps
    return true;
  };

  const contextValue: NavigationContextType = {
    state,
    navigateToProject,
    navigateToWorkflowStep,
    navigateBack,
    setCurrentProject,
    setCurrentWorkflowStep,
    toggleSidebar,
    setSidebarCollapsed,
    canAccessProject,
    canAccessWorkflowStep
  };

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

// Custom hooks for specific navigation needs
export function useProjectNavigation() {
  const { state, navigateToProject, setCurrentProject, canAccessProject } = useNavigation();
  
  return {
    currentProjectId: state.currentProjectId,
    currentProject: state.currentProject,
    navigateToProject,
    setCurrentProject,
    canAccessProject
  };
}

export function useWorkflowNavigation() {
  const { 
    state, 
    navigateToWorkflowStep, 
    setCurrentWorkflowStep, 
    canAccessWorkflowStep 
  } = useNavigation();
  
  return {
    currentWorkflowStep: state.currentWorkflowStep,
    navigateToWorkflowStep,
    setCurrentWorkflowStep,
    canAccessWorkflowStep,
    navigateToNextStep: (projectId: string) => {
      const currentStep = state.currentWorkflowStep;
      if (currentStep && currentStep < 9) {
        navigateToWorkflowStep(projectId, currentStep + 1);
      }
    },
    navigateToPreviousStep: (projectId: string) => {
      const currentStep = state.currentWorkflowStep;
      if (currentStep && currentStep > 1) {
        navigateToWorkflowStep(projectId, currentStep - 1);
      }
    }
  };
} 