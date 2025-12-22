'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface ProgressStep {
  id: string;
  name: string;
  weight: number; // Relative weight for calculating overall progress
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number; // 0-100
  startTime?: number;
  endTime?: number;
  error?: string;
}

export interface ProgressTrackingOptions {
  steps: Omit<ProgressStep, 'status' | 'progress' | 'startTime' | 'endTime' | 'error'>[];
  onStepStart?: (step: ProgressStep) => void;
  onStepComplete?: (step: ProgressStep) => void;
  onStepFail?: (step: ProgressStep, error: string) => void;
  onComplete?: (totalTime: number) => void;
  onFail?: (failedStep: ProgressStep, error: string) => void;
  autoAdvance?: boolean;
}

export function useProgressTracking(options: ProgressTrackingOptions) {
  const [steps, setSteps] = useState<ProgressStep[]>(() =>
    options.steps.map(step => ({
      ...step,
      status: 'pending' as const,
      progress: 0
    }))
  );
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);

  const progressRef = useRef({ steps, currentStepIndex, overallProgress });

  // Update ref when state changes
  useEffect(() => {
    progressRef.current = { steps, currentStepIndex, overallProgress };
  }, [steps, currentStepIndex, overallProgress]);

  // Calculate overall progress
  const calculateOverallProgress = useCallback((updatedSteps: ProgressStep[]) => {
    const totalWeight = updatedSteps.reduce((sum, step) => sum + step.weight, 0);
    const completedWeight = updatedSteps.reduce((sum, step) => {
      if (step.status === 'completed') {
        return sum + step.weight;
      } else if (step.status === 'running') {
        return sum + (step.weight * step.progress / 100);
      }
      return sum;
    }, 0);

    return totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;
  }, []);

  // Update step
  const updateStep = useCallback((
    stepId: string, 
    updates: Partial<Pick<ProgressStep, 'status' | 'progress' | 'error' | 'startTime' | 'endTime'>>
  ) => {
    setSteps(prevSteps => {
      const updatedSteps = prevSteps.map(step => {
        if (step.id === stepId) {
          const updatedStep = { ...step, ...updates };
          
          // Set timestamps
          if (updates.status === 'running' && !step.startTime) {
            updatedStep.startTime = Date.now();
          } else if ((updates.status === 'completed' || updates.status === 'failed') && !step.endTime) {
            updatedStep.endTime = Date.now();
          }
          
          return updatedStep;
        }
        return step;
      });

      // Calculate new overall progress
      const newOverallProgress = calculateOverallProgress(updatedSteps);
      setOverallProgress(newOverallProgress);

      return updatedSteps;
    });
  }, [calculateOverallProgress]);

  // Start tracking
  const start = useCallback(() => {
    setIsRunning(true);
    setIsCompleted(false);
    setIsFailed(false);
    setStartTime(Date.now());
    setEndTime(null);
    setCurrentStepIndex(0);

    // Reset all steps
    setSteps(prevSteps => prevSteps.map(step => ({
      ...step,
      status: 'pending' as const,
      progress: 0,
      startTime: undefined,
      endTime: undefined,
      error: undefined
    })));

    // Start first step if auto-advance is enabled
    if (options.autoAdvance && options.steps.length > 0) {
      const firstStep = options.steps[0];
      updateStep(firstStep.id, { status: 'running' });
      if (options.onStepStart) {
        options.onStepStart({ ...firstStep, status: 'running', progress: 0 });
      }
    }
  }, [options.autoAdvance, options.steps, options.onStepStart, updateStep]);

  // Start specific step
  const startStep = useCallback((stepId: string) => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return;

    updateStep(stepId, { status: 'running', progress: 0 });
    
    if (options.onStepStart) {
      options.onStepStart({ ...step, status: 'running', progress: 0 });
    }
  }, [steps, updateStep, options.onStepStart]);

  // Update step progress
  const updateStepProgress = useCallback((stepId: string, progress: number) => {
    updateStep(stepId, { progress: Math.min(Math.max(progress, 0), 100) });
  }, [updateStep]);

  // Complete step
  const completeStep = useCallback((stepId: string) => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return;

    updateStep(stepId, { status: 'completed', progress: 100 });
    
    if (options.onStepComplete) {
      options.onStepComplete({ ...step, status: 'completed', progress: 100 });
    }

    // Auto-advance to next step
    if (options.autoAdvance) {
      const currentIndex = steps.findIndex(s => s.id === stepId);
      const nextIndex = currentIndex + 1;
      
      if (nextIndex < steps.length) {
        setCurrentStepIndex(nextIndex);
        const nextStep = steps[nextIndex];
        setTimeout(() => {
          startStep(nextStep.id);
        }, 100);
      } else {
        // All steps completed
        setIsRunning(false);
        setIsCompleted(true);
        setEndTime(Date.now());
        
        if (options.onComplete && startTime) {
          options.onComplete(Date.now() - startTime);
        }
      }
    }
  }, [steps, updateStep, options, startTime, startStep]);

  // Fail step
  const failStep = useCallback((stepId: string, error: string) => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return;

    updateStep(stepId, { status: 'failed', error });
    setIsRunning(false);
    setIsFailed(true);
    setEndTime(Date.now());
    
    if (options.onStepFail) {
      options.onStepFail({ ...step, status: 'failed', error }, error);
    }
    
    if (options.onFail) {
      options.onFail({ ...step, status: 'failed', error }, error);
    }
  }, [steps, updateStep, options]);

  // Retry failed step
  const retryStep = useCallback((stepId: string) => {
    const step = steps.find(s => s.id === stepId);
    if (!step || step.status !== 'failed') return;

    setIsFailed(false);
    setIsRunning(true);
    setEndTime(null);
    
    updateStep(stepId, { 
      status: 'running', 
      progress: 0, 
      error: undefined,
      startTime: Date.now(),
      endTime: undefined
    });
    
    if (options.onStepStart) {
      options.onStepStart({ ...step, status: 'running', progress: 0 });
    }
  }, [steps, updateStep, options.onStepStart]);

  // Skip step
  const skipStep = useCallback((stepId: string) => {
    updateStep(stepId, { status: 'completed', progress: 100 });
    
    if (options.autoAdvance) {
      const currentIndex = steps.findIndex(s => s.id === stepId);
      const nextIndex = currentIndex + 1;
      
      if (nextIndex < steps.length) {
        setCurrentStepIndex(nextIndex);
        const nextStep = steps[nextIndex];
        setTimeout(() => {
          startStep(nextStep.id);
        }, 100);
      }
    }
  }, [updateStep, options.autoAdvance, steps, startStep]);

  // Reset tracking
  const reset = useCallback(() => {
    setSteps(options.steps.map(step => ({
      ...step,
      status: 'pending' as const,
      progress: 0,
      startTime: undefined,
      endTime: undefined,
      error: undefined
    })));
    setCurrentStepIndex(0);
    setOverallProgress(0);
    setIsRunning(false);
    setIsCompleted(false);
    setIsFailed(false);
    setStartTime(null);
    setEndTime(null);
  }, [options.steps]);

  // Get current step
  const getCurrentStep = useCallback(() => {
    return steps[currentStepIndex] || null;
  }, [steps, currentStepIndex]);

  // Get step by id
  const getStep = useCallback((stepId: string) => {
    return steps.find(step => step.id === stepId) || null;
  }, [steps]);

  // Get completed steps
  const getCompletedSteps = useCallback(() => {
    return steps.filter(step => step.status === 'completed');
  }, [steps]);

  // Get failed steps
  const getFailedSteps = useCallback(() => {
    return steps.filter(step => step.status === 'failed');
  }, [steps]);

  // Get running steps
  const getRunningSteps = useCallback(() => {
    return steps.filter(step => step.status === 'running');
  }, [steps]);

  // Get total duration
  const getTotalDuration = useCallback(() => {
    if (!startTime) return 0;
    return (endTime || Date.now()) - startTime;
  }, [startTime, endTime]);

  // Get step duration
  const getStepDuration = useCallback((stepId: string) => {
    const step = getStep(stepId);
    if (!step || !step.startTime) return 0;
    return (step.endTime || Date.now()) - step.startTime;
  }, [getStep]);

  return {
    // State
    steps,
    currentStepIndex,
    overallProgress,
    isRunning,
    isCompleted,
    isFailed,
    startTime,
    endTime,

    // Actions
    start,
    startStep,
    updateStepProgress,
    completeStep,
    failStep,
    retryStep,
    skipStep,
    reset,

    // Getters
    getCurrentStep,
    getStep,
    getCompletedSteps,
    getFailedSteps,
    getRunningSteps,
    getTotalDuration,
    getStepDuration
  };
}

// Hook for simple progress tracking without steps
export function useSimpleProgress() {
  const [progress, setProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);

  const start = useCallback(() => {
    setProgress(0);
    setIsRunning(true);
    setIsCompleted(false);
    setStartTime(Date.now());
    setEndTime(null);
  }, []);

  const updateProgress = useCallback((newProgress: number) => {
    const clampedProgress = Math.min(Math.max(newProgress, 0), 100);
    setProgress(clampedProgress);
    
    if (clampedProgress >= 100) {
      setIsRunning(false);
      setIsCompleted(true);
      setEndTime(Date.now());
    }
  }, []);

  const complete = useCallback(() => {
    setProgress(100);
    setIsRunning(false);
    setIsCompleted(true);
    setEndTime(Date.now());
  }, []);

  const reset = useCallback(() => {
    setProgress(0);
    setIsRunning(false);
    setIsCompleted(false);
    setStartTime(null);
    setEndTime(null);
  }, []);

  const getDuration = useCallback(() => {
    if (!startTime) return 0;
    return (endTime || Date.now()) - startTime;
  }, [startTime, endTime]);

  return {
    progress,
    isRunning,
    isCompleted,
    startTime,
    endTime,
    start,
    updateProgress,
    complete,
    reset,
    getDuration
  };
}

// Utility function to create progress steps
export function createProgressSteps(
  stepDefinitions: Array<{ id: string; name: string; weight?: number }>
): Omit<ProgressStep, 'status' | 'progress' | 'startTime' | 'endTime' | 'error'>[] {
  return stepDefinitions.map(def => ({
    id: def.id,
    name: def.name,
    weight: def.weight || 1
  }));
}
