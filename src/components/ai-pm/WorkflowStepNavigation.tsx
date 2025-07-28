'use client';

import { useRouter } from 'next/navigation';
import { 
  WORKFLOW_STEPS, 
  WorkflowStep, 
  ProjectProgress,
  getWorkflowStepName 
} from '@/types/ai-pm';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

interface WorkflowStepNavigationProps {
  projectId: string;
  currentStep: WorkflowStep;
  progress: ProjectProgress[];
  className?: string;
}

export default function WorkflowStepNavigation({ 
  projectId, 
  currentStep, 
  progress,
  className = '' 
}: WorkflowStepNavigationProps) {
  const router = useRouter();

  const currentStepProgress = progress.find(p => p.workflow_step === currentStep);
  const hasOfficialDocument = currentStepProgress?.has_official_document || false;
  const documentCount = currentStepProgress?.document_count || 0;

  const previousStep = currentStep > 1 ? (currentStep - 1) as WorkflowStep : null;
  const nextStep = currentStep < 9 ? (currentStep + 1) as WorkflowStep : null;

  const getPreviousStepProgress = () => {
    if (!previousStep) return null;
    return progress.find(p => p.workflow_step === previousStep);
  };

  const getNextStepProgress = () => {
    if (!nextStep) return null;
    return progress.find(p => p.workflow_step === nextStep);
  };

  const getStepStatusIcon = (step: WorkflowStep) => {
    const stepProgress = progress.find(p => p.workflow_step === step);
    const hasOfficial = stepProgress?.has_official_document || false;
    const docCount = stepProgress?.document_count || 0;

    if (hasOfficial) {
      return <CheckCircleIconSolid className="h-5 w-5 text-green-500" />;
    } else if (docCount > 0) {
      return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    } else {
      return (
        <div className="h-5 w-5 rounded-full border-2 border-gray-300 flex items-center justify-center">
          <span className="text-xs font-medium text-gray-500">{step}</span>
        </div>
      );
    }
  };

  const navigateToStep = (step: WorkflowStep) => {
    router.push(`/ai-pm/${projectId}/workflow/${step}`);
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Current Step Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStepStatusIcon(currentStep)}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {currentStep}단계: {getWorkflowStepName(currentStep)}
              </h2>
              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                {hasOfficialDocument && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    완료됨
                  </span>
                )}
                {documentCount > 0 && (
                  <span>문서 {documentCount}개</span>
                )}
                {documentCount === 0 && (
                  <span className="text-gray-400">시작하지 않음</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Previous Step */}
          <div className="flex-1">
            {previousStep ? (
              <button
                onClick={() => navigateToStep(previousStep)}
                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">이전 단계</div>
                  <div className="text-xs text-gray-500 truncate max-w-32">
                    {previousStep}. {getWorkflowStepName(previousStep)}
                  </div>
                </div>
              </button>
            ) : (
              <div className="text-sm text-gray-400">첫 번째 단계</div>
            )}
          </div>

          {/* Step Indicator */}
          <div className="flex items-center space-x-2 px-4">
            {Array.from({ length: 9 }, (_, i) => {
              const step = (i + 1) as WorkflowStep;
              const stepProgress = progress.find(p => p.workflow_step === step);
              const isCompleted = stepProgress?.has_official_document || false;
              const isCurrent = step === currentStep;
              
              return (
                <button
                  key={step}
                  onClick={() => navigateToStep(step)}
                  className={`
                    h-2 w-2 rounded-full transition-all duration-200
                    ${isCurrent 
                      ? 'bg-blue-600 ring-2 ring-blue-200' 
                      : isCompleted 
                        ? 'bg-green-500 hover:bg-green-600' 
                        : 'bg-gray-300 hover:bg-gray-400'
                    }
                  `}
                  title={`${step}단계: ${getWorkflowStepName(step)}`}
                />
              );
            })}
          </div>

          {/* Next Step */}
          <div className="flex-1 flex justify-end">
            {nextStep ? (
              <button
                onClick={() => navigateToStep(nextStep)}
                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <div className="text-right">
                  <div className="font-medium">다음 단계</div>
                  <div className="text-xs text-gray-500 truncate max-w-32">
                    {nextStep}. {getWorkflowStepName(nextStep)}
                  </div>
                </div>
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            ) : (
              <div className="text-sm text-gray-400">마지막 단계</div>
            )}
          </div>
        </div>
      </div>

      {/* Step Progress Summary */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-4">
            <span>
              완료: {progress.filter(p => p.has_official_document).length}/9
            </span>
            <span>
              진행중: {progress.filter(p => p.document_count > 0 && !p.has_official_document).length}
            </span>
          </div>
          <div>
            전체 진행률: {Math.round((progress.filter(p => p.has_official_document).length / 9) * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
}