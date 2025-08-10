'use client';

import React from 'react';
import { WorkflowStep } from '@/types/ai-pm';
import { useViewport } from '@/contexts/ViewportContext';
import { 
  CheckCircleIcon,
  ClockIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { 
  CheckCircleIcon as CheckCircleIconSolid
} from '@heroicons/react/24/solid';

interface MobileWorkflowProgressProps {
  currentStep: WorkflowStep;
  completedSteps?: WorkflowStep[];
  className?: string;
  variant?: 'compact' | 'detailed' | 'circular';
  showLabels?: boolean;
  showPercentage?: boolean;
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

const STEP_SHORT_LABELS: Record<WorkflowStep, string> = {
  1: '컨셉',
  2: '기획',
  3: '설계',
  4: '개발',
  5: '테스트',
  6: '배포',
  7: '운영',
  8: '마케팅',
  9: '사업화'
};

export default function MobileWorkflowProgress({
  currentStep,
  completedSteps = [],
  className = '',
  variant = 'compact',
  showLabels = true,
  showPercentage = true
}: MobileWorkflowProgressProps) {
  const { isMobile, isTablet } = useViewport();
  
  const allSteps: WorkflowStep[] = Array.from({ length: 9 }, (_, i) => (i + 1) as WorkflowStep);
  const completionPercentage = Math.round((completedSteps.length / allSteps.length) * 100);

  const getStepStatus = (step: WorkflowStep): 'completed' | 'current' | 'pending' => {
    if (completedSteps.includes(step)) return 'completed';
    if (step === currentStep) return 'current';
    return 'pending';
  };

  const getStepIcon = (status: 'completed' | 'current' | 'pending', size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6'
    };

    switch (status) {
      case 'completed':
        return <CheckCircleIconSolid className={`${sizeClasses[size]} text-green-500`} />;
      case 'current':
        return <ClockIcon className={`${sizeClasses[size]} text-blue-500`} />;
      default:
        return (
          <div className={`${sizeClasses[size]} rounded-full border-2 border-gray-300 bg-white flex items-center justify-center`}>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          </div>
        );
    }
  };

  // Compact horizontal progress bar
  if (variant === 'compact') {
    return (
      <div className={`bg-white rounded-lg p-3 shadow-sm border border-gray-200 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-medium text-gray-900">워크플로우 진행률</h3>
            {showPercentage && (
              <p className="text-xs text-gray-500 mt-1">
                {completedSteps.length}/{allSteps.length} 단계 완료
              </p>
            )}
          </div>
          {showPercentage && (
            <div className="text-right">
              <div className="text-lg font-semibold text-blue-600">{completionPercentage}%</div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center space-x-1">
            {allSteps.map((step) => {
              const status = getStepStatus(step);
              return (
                <div
                  key={step}
                  className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                    status === 'completed'
                      ? 'bg-green-500'
                      : status === 'current'
                      ? 'bg-blue-500'
                      : 'bg-gray-200'
                  }`}
                />
              );
            })}
          </div>

          {/* Current step indicator */}
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-full">
              {getStepIcon(getStepStatus(currentStep), 'sm')}
              <span className="text-xs font-medium text-blue-700">
                {currentStep}. {isMobile ? STEP_SHORT_LABELS[currentStep] : STEP_LABELS[currentStep]}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Detailed step-by-step view
  if (variant === 'detailed') {
    return (
      <div className={`bg-white rounded-lg p-4 shadow-sm border border-gray-200 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">워크플로우 단계</h3>
          {showPercentage && (
            <div className="text-sm text-gray-500">
              {completionPercentage}% 완료
            </div>
          )}
        </div>

        {/* Steps list */}
        <div className="space-y-3">
          {allSteps.map((step, index) => {
            const status = getStepStatus(step);
            const isLast = index === allSteps.length - 1;

            return (
              <div key={step} className="relative">
                <div className="flex items-center space-x-3">
                  {/* Step icon */}
                  <div className="flex-shrink-0">
                    {getStepIcon(status, 'md')}
                  </div>

                  {/* Step content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${
                        status === 'completed' 
                          ? 'text-green-700' 
                          : status === 'current'
                          ? 'text-blue-700'
                          : 'text-gray-500'
                      }`}>
                        {step}. {isMobile ? STEP_SHORT_LABELS[step] : STEP_LABELS[step]}
                      </p>
                      {status === 'current' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          진행 중
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Connecting line */}
                {!isLast && (
                  <div className="absolute left-2.5 top-6 w-0.5 h-6 bg-gray-200" />
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">전체 진행률</span>
            <span className="font-medium text-gray-900">
              {completedSteps.length} / {allSteps.length} 단계
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Circular progress view
  if (variant === 'circular') {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (completionPercentage / 100) * circumference;

    return (
      <div className={`bg-white rounded-lg p-4 shadow-sm border border-gray-200 ${className}`}>
        <div className="flex items-center space-x-4">
          {/* Circular progress */}
          <div className="relative">
            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="text-blue-500 transition-all duration-500"
              />
            </svg>
            {/* Percentage text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-gray-900">{completionPercentage}%</span>
            </div>
          </div>

          {/* Progress details */}
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900 mb-2">워크플로우 진행률</h3>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">완료된 단계</span>
                <span className="font-medium text-green-600">{completedSteps.length}개</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">현재 단계</span>
                <span className="font-medium text-blue-600">
                  {currentStep}. {STEP_SHORT_LABELS[currentStep]}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">남은 단계</span>
                <span className="font-medium text-gray-600">
                  {allSteps.length - completedSteps.length - 1}개
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}