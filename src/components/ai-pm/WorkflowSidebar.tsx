'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  WORKFLOW_STEPS, 
  WorkflowStep, 
  ProjectProgress,
  getWorkflowStepName 
} from '@/types/ai-pm';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  DocumentTextIcon,
  ChevronRightIcon,
  QuestionMarkCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

interface WorkflowSidebarProps {
  projectId: string;
  progress: ProjectProgress[];
  currentStep?: WorkflowStep;
  className?: string;
}

interface WorkflowStepData {
  step: WorkflowStep;
  name: string;
  description: string;
  hasOfficialDocument: boolean;
  documentCount: number;
  lastUpdated: string | null;
  status: 'not_started' | 'in_progress' | 'completed';
}

// Step descriptions based on AIPM.md workflow
const STEP_DESCRIPTIONS: Record<WorkflowStep, string> = {
  1: '플랫폼의 전체 컨셉과 방향성을 정의합니다',
  2: '플랫폼의 주요 페이지를 나열하고 기획합니다',
  3: '각 페이지의 파트별 상세 문서를 제작합니다',
  4: '문서의 공통 양식과 독립성을 유지합니다',
  5: '페이지 및 파트별 문서를 통합합니다',
  6: '파트별 정의를 통합하여 플랫폼 정의를 마련합니다',
  7: '종합 문서를 기반으로 정책을 설정합니다',
  8: '충돌 사항을 반영하고 논의합니다',
  9: '인간 소통을 최소화하고 AI 중심으로 진행합니다'
};

export default function WorkflowSidebar({ 
  projectId, 
  progress, 
  currentStep,
  className = '' 
}: WorkflowSidebarProps) {
  const pathname = usePathname();
  const [showHelp, setShowHelp] = useState(false);

  // Create workflow steps data with progress information
  const workflowSteps: WorkflowStepData[] = Object.entries(WORKFLOW_STEPS).map(([stepNum, stepName]) => {
    const stepNumber = parseInt(stepNum) as WorkflowStep;
    const stepProgress = progress.find(p => p.workflow_step === stepNumber);
    
    const hasOfficialDocument = stepProgress?.has_official_document || false;
    const documentCount = stepProgress?.document_count || 0;
    
    let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
    if (hasOfficialDocument) {
      status = 'completed';
    } else if (documentCount > 0) {
      status = 'in_progress';
    }
    
    return {
      step: stepNumber,
      name: stepName,
      description: STEP_DESCRIPTIONS[stepNumber],
      hasOfficialDocument,
      documentCount,
      lastUpdated: stepProgress?.last_updated || null,
      status
    };
  });

  const completedSteps = workflowSteps.filter(step => step.status === 'completed').length;
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

  const getStepStatusColor = (step: WorkflowStepData, isActive: boolean) => {
    if (isActive) {
      return 'border-blue-500 bg-blue-50';
    }
    
    switch (step.status) {
      case 'completed':
        return 'border-green-200 bg-green-50 hover:bg-green-100';
      case 'in_progress':
        return 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100';
      default:
        return 'border-gray-200 bg-white hover:bg-gray-50';
    }
  };

  const getStepIcon = (step: WorkflowStepData) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircleIconSolid className="h-6 w-6 text-green-500" />;
      case 'in_progress':
        return <ClockIcon className="h-6 w-6 text-yellow-500" />;
      default:
        return (
          <div className="h-6 w-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-500">{step.step}</span>
          </div>
        );
    }
  };

  return (
    <div className={`bg-white border-r border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">워크플로우</h2>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            title="워크플로우 가이드"
          >
            <QuestionMarkCircleIcon className="h-5 w-5" />
          </button>
        </div>
        
        {/* Progress Overview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">진행 상황</span>
            <span className="font-medium text-gray-900">
              {completedSteps}/9 단계 ({progressPercentage}%)
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-xs text-center">
            <div>
              <div className="font-medium text-green-600">{completedSteps}</div>
              <div className="text-gray-500">완료</div>
            </div>
            <div>
              <div className="font-medium text-yellow-600">
                {workflowSteps.filter(s => s.status === 'in_progress').length}
              </div>
              <div className="text-gray-500">진행중</div>
            </div>
            <div>
              <div className="font-medium text-gray-400">
                {workflowSteps.filter(s => s.status === 'not_started').length}
              </div>
              <div className="text-gray-500">미시작</div>
            </div>
          </div>
        </div>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div className="p-4 bg-blue-50 border-b border-blue-200">
          <div className="flex items-start space-x-2">
            <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <h3 className="font-medium text-blue-900 mb-2">워크플로우 가이드</h3>
              <p className="text-blue-700 mb-2">
                9단계 워크플로우를 통해 체계적으로 플랫폼을 기획합니다.
              </p>
              <ul className="text-blue-600 space-y-1 text-xs">
                <li>• 각 단계를 순차적으로 진행하세요</li>
                <li>• AI와 대화하며 문서를 생성합니다</li>
                <li>• 필요시 이전 단계로 돌아갈 수 있습니다</li>
                <li>• 문서 승인 후 다음 단계로 진행하세요</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Steps */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          {workflowSteps.map((step) => {
            const isActive = currentStep === step.step || 
              pathname.includes(`/workflow/${step.step}`);
            
            return (
              <Link
                key={step.step}
                href={`/ai-pm/${projectId}/workflow/${step.step}`}
                className="block"
              >
                <div className={`
                  p-3 rounded-lg border transition-all duration-200 cursor-pointer
                  ${getStepStatusColor(step, isActive)}
                  ${isActive ? 'ring-2 ring-blue-500 ring-opacity-20' : ''}
                `}>
                  <div className="flex items-start space-x-3">
                    {/* Step Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {getStepIcon(step)}
                    </div>
                    
                    {/* Step Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {step.step}. {step.name}
                        </h3>
                        {!isActive && (
                          <ChevronRightIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-600 mt-1 overflow-hidden" style={{ 
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {step.description}
                      </p>
                      
                      {/* Step Status Info */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-2 text-xs">
                          {step.status === 'completed' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              완료
                            </span>
                          )}
                          
                          {step.documentCount > 0 && (
                            <div className="flex items-center text-gray-500">
                              <DocumentTextIcon className="h-3 w-3 mr-1" />
                              <span>{step.documentCount}</span>
                            </div>
                          )}
                        </div>
                        
                        {step.lastUpdated && (
                          <span className="text-xs text-gray-400">
                            {formatLastUpdated(step.lastUpdated)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500 text-center">
          <p>AI PM 워크플로우</p>
          <p className="mt-1">체계적인 플랫폼 기획을 위한 9단계</p>
        </div>
      </div>
    </div>
  );
}