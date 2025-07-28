'use client';

import Link from 'next/link';
import { ProjectProgress, WORKFLOW_STEPS, WorkflowStep } from '@/types/ai-pm';
import { 
  ClockIcon, 
  DocumentTextIcon,
  ChevronRightIcon 
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

interface WorkflowProgressProps {
  progress: ProjectProgress[];
  projectId: string;
}

export default function WorkflowProgress({ progress, projectId }: WorkflowProgressProps) {
  // Create a complete workflow steps array with progress data
  const workflowSteps = Object.entries(WORKFLOW_STEPS).map(([stepNum, stepName]) => {
    const stepNumber = parseInt(stepNum) as WorkflowStep;
    const stepProgress = progress.find(p => p.workflow_step === stepNumber);
    
    return {
      step: stepNumber,
      name: stepName,
      hasOfficialDocument: stepProgress?.has_official_document || false,
      documentCount: stepProgress?.document_count || 0,
      lastUpdated: stepProgress?.last_updated || null
    };
  });

  const completedSteps = workflowSteps.filter(step => step.hasOfficialDocument).length;
  const progressPercentage = Math.round((completedSteps / 9) * 100);

  const formatLastUpdated = (dateString: string | null) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return '방금 전';
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    if (diffInHours < 24 * 7) return `${Math.floor(diffInHours / 24)}일 전`;
    
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">워크플로우 진행 상황</h3>
          <div className="flex items-center text-sm text-gray-600">
            <span className="font-medium">{completedSteps}/9 단계 완료</span>
            <span className="ml-2 text-blue-600 font-medium">({progressPercentage}%)</span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {workflowSteps.map((step, index) => {
            const isCompleted = step.hasOfficialDocument;
            const hasDocuments = step.documentCount > 0;
            
            return (
              <Link
                key={step.step}
                href={`/ai-pm/${projectId}/workflow/${step.step}`}
                className="block"
              >
                <div className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
                  {/* Step Number & Status Icon */}
                  <div className="flex-shrink-0 mr-4">
                    {isCompleted ? (
                      <CheckCircleIconSolid className="h-8 w-8 text-green-500" />
                    ) : hasDocuments ? (
                      <ClockIcon className="h-8 w-8 text-yellow-500" />
                    ) : (
                      <div className="h-8 w-8 rounded-full border-2 border-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-500">{step.step}</span>
                      </div>
                    )}
                  </div>

                  {/* Step Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {step.step}. {step.name}
                      </h4>
                      <ChevronRightIcon className="h-5 w-5 text-gray-400 ml-2 flex-shrink-0" />
                    </div>
                    
                    <div className="mt-1 flex items-center text-xs text-gray-500">
                      {isCompleted && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mr-2">
                          완료
                        </span>
                      )}
                      
                      {hasDocuments && (
                        <div className="flex items-center mr-3">
                          <DocumentTextIcon className="h-3 w-3 mr-1" />
                          <span>문서 {step.documentCount}개</span>
                        </div>
                      )}
                      
                      {step.lastUpdated && (
                        <span>최근 업데이트: {formatLastUpdated(step.lastUpdated)}</span>
                      )}
                      
                      {!hasDocuments && (
                        <span className="text-gray-400">시작하지 않음</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{completedSteps}</div>
              <div className="text-sm text-gray-600">완료</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {workflowSteps.filter(s => s.documentCount > 0 && !s.hasOfficialDocument).length}
              </div>
              <div className="text-sm text-gray-600">진행 중</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-400">
                {workflowSteps.filter(s => s.documentCount === 0).length}
              </div>
              <div className="text-sm text-gray-600">미시작</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}