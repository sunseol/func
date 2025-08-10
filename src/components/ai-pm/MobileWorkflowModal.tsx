'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WorkflowStep } from '@/types/ai-pm';
import { useViewport } from '@/contexts/ViewportContext';
import { 
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface MobileWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  currentStep: WorkflowStep;
  completedSteps?: WorkflowStep[];
  children: React.ReactNode;
  className?: string;
}

const STEP_LABELS: Record<WorkflowStep, string> = {
  1: '컨셉 정의',
  2: '기능 기획',
  3: '기술 설계',
  4: '개발 계획',
  5: '테스트 계획',
  6: '배포 준비',
  7: '운영 계획',
  8: '마케팅 전략',
  9: '사업화 계획'
};

export default function MobileWorkflowModal({
  isOpen,
  onClose,
  projectId,
  currentStep,
  completedSteps = [],
  children,
  className = ''
}: MobileWorkflowModalProps) {
  const { isMobile, width } = useViewport();
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Swipe threshold (30% of screen width)
  const swipeThreshold = width * 0.3;

  // Get available steps for navigation
  const getAvailableSteps = useCallback((): WorkflowStep[] => {
    return Array.from({ length: 9 }, (_, i) => (i + 1) as WorkflowStep);
  }, []);

  const availableSteps = getAvailableSteps();
  const currentStepIndex = availableSteps.indexOf(currentStep);

  // Navigation functions
  const goToPreviousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const previousStep = availableSteps[currentStepIndex - 1];
      router.push(`/ai-pm/${projectId}/workflow/${previousStep}`);
    }
  }, [currentStepIndex, availableSteps, router, projectId]);

  const goToNextStep = useCallback(() => {
    if (currentStepIndex < availableSteps.length - 1) {
      const nextStep = availableSteps[currentStepIndex + 1];
      router.push(`/ai-pm/${projectId}/workflow/${nextStep}`);
    }
  }, [currentStepIndex, availableSteps, router, projectId]);

  // Drag handlers
  const handleDragStart = useCallback((clientX: number) => {
    setIsDragging(true);
    setDragStartX(clientX);
    setDragOffset(0);
  }, []);

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging) return;
    
    const deltaX = clientX - dragStartX;
    setDragOffset(deltaX);
  }, [isDragging, dragStartX]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);
    
    // Determine swipe direction and navigate if threshold is met
    if (Math.abs(dragOffset) > swipeThreshold) {
      if (dragOffset > 0) {
        // Swiped right - go to previous step
        goToPreviousStep();
      } else {
        // Swiped left - go to next step
        goToNextStep();
      }
    }
    
    // Reset drag offset
    setDragOffset(0);
  }, [isDragging, dragOffset, swipeThreshold, goToPreviousStep, goToNextStep]);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  }, [handleDragStart]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleDragMove(e.clientX);
  }, [handleDragMove]);

  const handleMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX);
  }, [handleDragStart]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    handleDragMove(touch.clientX);
  }, [handleDragMove]);

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Add global event listeners for drag
  useEffect(() => {
    if (!isDragging) return;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Don't render on non-mobile devices
  if (!isMobile) return null;

  if (!isOpen) return null;

  const canGoPrevious = currentStepIndex > 0;
  const canGoNext = currentStepIndex < availableSteps.length - 1;

  return (
    <div className={`fixed inset-0 bg-white z-50 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <button
          onClick={onClose}
          className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="모달 닫기"
        >
          <XMarkIcon className="w-6 h-6 text-gray-600" />
        </button>

        <div className="flex-1 text-center">
          <h1 className="text-lg font-semibold text-gray-900">
            {currentStep}. {STEP_LABELS[currentStep]}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {currentStepIndex + 1} / {availableSteps.length}
          </p>
        </div>

        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Progress indicator */}
      <div className="flex-shrink-0 px-4 py-2 bg-gray-50">
        <div className="flex items-center space-x-1">
          {availableSteps.map((step, index) => {
            const isCompleted = completedSteps.includes(step);
            const isCurrent = step === currentStep;
            
            return (
              <div
                key={step}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  isCompleted
                    ? 'bg-green-500'
                    : isCurrent
                    ? 'bg-blue-500'
                    : 'bg-gray-200'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Content area with swipe support */}
      <div
        ref={modalRef}
        className="flex-1 overflow-hidden relative"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          transform: isDragging ? `translateX(${dragOffset}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {/* Swipe indicators */}
        {isDragging && (
          <>
            {dragOffset > swipeThreshold && canGoPrevious && (
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg z-10">
                <ChevronLeftIcon className="w-5 h-5" />
              </div>
            )}
            {dragOffset < -swipeThreshold && canGoNext && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg z-10">
                <ChevronRightIcon className="w-5 h-5" />
              </div>
            )}
          </>
        )}

        {/* Main content */}
        <div className="h-full overflow-y-auto">
          {children}
        </div>
      </div>

      {/* Navigation footer */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-t border-gray-200 bg-white">
        <button
          onClick={goToPreviousStep}
          disabled={!canGoPrevious}
          className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            canGoPrevious
              ? 'text-blue-600 hover:bg-blue-50 active:bg-blue-100'
              : 'text-gray-400 cursor-not-allowed'
          }`}
        >
          <ChevronLeftIcon className="w-4 h-4 mr-1" />
          이전 단계
        </button>

        <div className="text-xs text-gray-500">
          좌우로 스와이프하여 단계 이동
        </div>

        <button
          onClick={goToNextStep}
          disabled={!canGoNext}
          className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            canGoNext
              ? 'text-blue-600 hover:bg-blue-50 active:bg-blue-100'
              : 'text-gray-400 cursor-not-allowed'
          }`}
        >
          다음 단계
          <ChevronRightIcon className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
}