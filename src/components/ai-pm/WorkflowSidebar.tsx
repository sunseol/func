'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WorkflowStep } from '@/types/ai-pm';
import { 
  ChevronLeftIcon,
  DocumentTextIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
  CogIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface WorkflowSidebarProps {
  projectId: string;
  projectName: string;
  currentStep: WorkflowStep;
  completedSteps?: WorkflowStep[];
  memberCount: number;
  documentCount: number;
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

export default function WorkflowSidebar({
  projectId,
  projectName,
  currentStep,
  completedSteps = [],
  memberCount,
  documentCount,
  onStepClick
}: WorkflowSidebarProps) {
  const pathname = usePathname();

  const getStepStatus = React.useCallback((step: WorkflowStep) => {
    // 매우 방어적인 접근
    let safeSteps: WorkflowStep[] = [];
    
    try {
      if (completedSteps && Array.isArray(completedSteps)) {
        safeSteps = completedSteps;
      }
    } catch (e) {
      console.error('Error processing completedSteps:', e);
      safeSteps = [];
    }
    
    // 수동으로 includes 구현
    let isCompleted = false;
    try {
      for (let i = 0; i < safeSteps.length; i++) {
        if (safeSteps[i] === step) {
          isCompleted = true;
          break;
        }
      }
    } catch (e) {
      console.error('Error checking completion:', e);
      isCompleted = false;
    }
    
    if (isCompleted) {
      return 'completed';
    }
    
    if (step === currentStep) {
      return 'current';
    }
    
    return 'pending';
  }, [completedSteps, currentStep]);

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'current':
        return <ClockIcon className="w-4 h-4 text-blue-500" />;
      default:
        return <div className="w-4 h-4 rounded-full border border-gray-300 bg-gray-50" />;
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'current':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const isActiveLink = (href: string) => {
    return pathname === href;
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* 프로젝트 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <Link 
          href="/ai-pm"
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-3"
        >
          <ChevronLeftIcon className="w-4 h-4 mr-1" />
          프로젝트 목록
        </Link>
        
        <h2 className="text-lg font-semibold text-gray-900 truncate">
          {projectName}
        </h2>
        
        <div className="mt-3 space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <UsersIcon className="w-4 h-4 mr-2" />
            <span>멤버 {memberCount}명</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <DocumentTextIcon className="w-4 h-4 mr-2" />
            <span>문서 {documentCount}개</span>
          </div>
        </div>
      </div>

      {/* 네비게이션 메뉴 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">워크플로우</h3>
          
          <div className="space-y-1">
            {Array.from({ length: 9 }, (_, i) => (i + 1) as WorkflowStep).map((step) => {
              const status = getStepStatus(step);
              const href = `/ai-pm/${projectId}/workflow/${step}`;
              const isActive = isActiveLink(href);
              
              return (
                <Link
                  key={step}
                  href={href}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive 
                      ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => onStepClick?.(step)}
                >
                  <div className="flex-shrink-0 mr-3">
                    {getStepIcon(status)}
                  </div>
                  <span className="font-medium">{step}. {STEP_LABELS[step]}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 추가 메뉴 */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">도구</h3>
          
          <div className="space-y-1">
            <Link
              href={`/ai-pm/${projectId}/chat`}
              className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                isActiveLink(`/ai-pm/${projectId}/chat`)
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <ChatBubbleLeftRightIcon className="w-4 h-4 mr-3" />
              <span>AI 어시스턴트</span>
            </Link>
            
            <Link
              href={`/ai-pm/${projectId}/documents`}
              className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                isActiveLink(`/ai-pm/${projectId}/documents`)
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <DocumentTextIcon className="w-4 h-4 mr-3" />
              <span>문서 관리</span>
            </Link>
            
            <Link
              href={`/ai-pm/${projectId}/members`}
              className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                isActiveLink(`/ai-pm/${projectId}/members`)
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <UsersIcon className="w-4 h-4 mr-3" />
              <span>멤버 관리</span>
            </Link>
            
            <Link
              href={`/ai-pm/${projectId}/settings`}
              className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                isActiveLink(`/ai-pm/${projectId}/settings`)
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <CogIcon className="w-4 h-4 mr-3" />
              <span>프로젝트 설정</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 진행률 요약 */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900">진행률</span>
          <span className="text-sm text-gray-600">
            {completedSteps.length}/9
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(completedSteps.length / 9) * 100}%` }}
          ></div>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          {Math.round((completedSteps.length / 9) * 100)}% 완료
        </div>
      </div>
    </div>
  );
}