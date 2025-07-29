'use client';

import React from 'react';
import { WorkflowStep } from '@/types/ai-pm';
import { 
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

interface WorkflowProgressProps {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  totalSteps: number;
  onStepClick?: (step: WorkflowStep) => void;
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

const STEP_DESCRIPTIONS: Record<WorkflowStep, string> = {
  1: '플랫폼 컨셉과 방향성 정의',
  2: '핵심 기능과 요구사항 정리',
  3: '기술 스택과 아키텍처 설계',
  4: '개발 일정과 리소스 계획',
  5: '테스트 전략과 품질 보증',
  6: '배포 전략과 운영 준비',
  7: '운영 프로세스와 모니터링 계획',
  8: '마케팅 전략과 사용자 확보 계획',
  9: '수익화 모델과 사업화 전략'
};

export default function WorkflowProgress({
  currentStep,
  completedSteps,
  totalSteps,
  onStepClick
}: WorkflowProgressProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => (i + 1) as WorkflowStep);
  const progressPercentage = (completedSteps.length / totalSteps) * 100;

  const getStepStatus = (step: WorkflowStep) => {
    if (completedSteps.includes(step)) return 'completed';
    if (step === currentStep) return 'current';
    return 'pending';
  };

  const getStepIcon = (step: WorkflowStep, status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
      case 'current':
        return <ClockIcon className="w-6 h-6 text-blue-500" />;
      default:
        return <div className="w-6 h-6 rounded-full border-2 border-gray-300 bg-gray-50" />;
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'current':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* 전체 진행률 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-gray-900">워크플로우 진행률</h3>
          <span className="text-sm font-medium text-gray-600">
            {completedSteps.length} / {totalSteps} 완료
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          {Math.round(progressPercentage)}% 완료
        </div>
      </div>

      {/* 단계별 진행 상황 */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const status = getStepStatus(step);
          const isClickable = onStepClick && (status === 'completed' || status === 'current');
          
          return (
            <div key={step} className="relative">
              {/* 연결선 */}
              {index < steps.length - 1 && (
                <div className="absolute left-3 top-6 w-0.5 h-8 bg-gray-200"></div>
              )}
              
              <div 
                className={`flex items-start space-x-4 p-4 rounded-lg border transition-all duration-200 ${
                  getStepColor(status)
                } ${isClickable ? 'cursor-pointer hover:shadow-md' : ''}`}
                onClick={() => isClickable && onStepClick?.(step)}
              >
                {/* 아이콘 */}
                <div className="flex-shrink-0 mt-1">
                  {getStepIcon(step, status)}
                </div>

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium">
                      {step}. {STEP_LABELS[step]}
                    </h4>
                    {status === 'current' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        진행 중
                      </span>
                    )}
                    {status === 'completed' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        완료
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {STEP_DESCRIPTIONS[step]}
                  </p>
                </div>

                {/* 화살표 */}
                {index < steps.length - 1 && (
                  <div className="flex-shrink-0 mt-1">
                    <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 현재 단계 정보 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center space-x-2">
          <ClockIcon className="w-5 h-5 text-blue-500" />
          <h4 className="font-medium text-blue-900">
            현재 단계: {STEP_LABELS[currentStep]}
          </h4>
        </div>
        <p className="text-sm text-blue-700 mt-1">
          {STEP_DESCRIPTIONS[currentStep]}
        </p>
      </div>
    </div>
  );
}