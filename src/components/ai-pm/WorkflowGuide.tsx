'use client';

import React from 'react';
import { WorkflowStep } from '@/types/ai-pm';
import { 
  LightBulbIcon,
  DocumentTextIcon,
  UsersIcon,
  CogIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface WorkflowGuideProps {
  currentStep: WorkflowStep;
}

const WORKFLOW_GUIDES: Record<WorkflowStep, {
  title: string;
  description: string;
  tips: string[];
  icon: React.ComponentType<any>;
  color: string;
}> = {
  1: {
    title: '컨셉 정의 및 기획',
    description: '플랫폼의 기본 컨셉과 방향성을 정의하는 단계입니다.',
    tips: [
      '명확한 미션과 비전을 설정하세요',
      '타겟 사용자를 구체적으로 정의하세요',
      '핵심 기능을 우선순위별로 정리하세요',
      '시장 포지셔닝과 차별화 포인트를 명확히 하세요',
      'SWOT 분석을 통해 강점과 약점을 파악하세요'
    ],
    icon: LightBulbIcon,
    color: 'bg-blue-50 border-blue-200 text-blue-800'
  },
  2: {
    title: '페이지 정의 및 기획',
    description: '플랫폼의 주요 페이지를 나열하고 기획하는 단계입니다.',
    tips: [
      '사용자 여정을 중심으로 페이지를 설계하세요',
      '각 페이지의 목적과 핵심 기능을 명확히 하세요',
      '페이지 간 연결성과 네비게이션을 고려하세요',
      '반응형 디자인을 고려한 레이아웃을 계획하세요',
      '사용자 경험(UX)을 최우선으로 생각하세요'
    ],
    icon: DocumentTextIcon,
    color: 'bg-green-50 border-green-200 text-green-800'
  },
  3: {
    title: '파트별 문서 제작',
    description: '각 페이지의 파트별 상세 문서를 작성하는 단계입니다.',
    tips: [
      '운영, 콘텐츠, 마케팅, 서비스, UX/UI 각 파트의 전문성을 살리세요',
      '구체적이고 실행 가능한 계획을 수립하세요',
      '잠재적 리스크와 대응 방안을 미리 준비하세요',
      '측정 가능한 KPI를 설정하세요',
      '다른 파트와의 연계성을 고려하세요'
    ],
    icon: UsersIcon,
    color: 'bg-purple-50 border-purple-200 text-purple-800'
  },
  4: {
    title: '문서 양식 및 독립성 유지',
    description: '문서의 공통 양식을 확인하고 독립성을 유지하는 단계입니다.',
    tips: [
      '모든 문서가 동일한 구조를 따르는지 확인하세요',
      '각 파트의 전문적 독립성을 유지하세요',
      '중복되는 내용이 있다면 정리하세요',
      '문서 간 일관성을 확보하세요',
      '플랫폼 전체 컨셉과의 연계성을 확인하세요'
    ],
    icon: CogIcon,
    color: 'bg-yellow-50 border-yellow-200 text-yellow-800'
  },
  5: {
    title: '파트별 문서 통합',
    description: '각 파트의 문서를 통합하여 거대한 정의를 마련하는 단계입니다.',
    tips: [
      '중복되는 내용을 제거하고 통합하세요',
      '논리적 순서로 재배치하세요',
      '크로스-레퍼런싱을 통해 연결성을 강화하세요',
      '각 파트의 핵심 가치를 유지하세요',
      '전체적인 일관성을 확보하세요'
    ],
    icon: ChartBarIcon,
    color: 'bg-indigo-50 border-indigo-200 text-indigo-800'
  },
  6: {
    title: '플랫폼 정의 마련',
    description: '모든 파트를 통합하여 플랫폼 전체 정의를 마련하는 단계입니다.',
    tips: [
      '플랫폼의 전체적인 비전을 명확히 하세요',
      '모든 기능이 조화롭게 작동하는지 확인하세요',
      '구현 로드맵과 타임라인을 설정하세요',
      '파트 간 충돌을 해결하세요',
      '최종 검토를 통해 완성도를 높이세요'
    ],
    icon: CheckCircleIcon,
    color: 'bg-emerald-50 border-emerald-200 text-emerald-800'
  },
  7: {
    title: '정책 설정',
    description: '플랫폼의 종합 문서를 기반으로 정책을 설정하는 단계입니다.',
    tips: [
      '데이터 프라이버시 정책을 수립하세요',
      '콘텐츠 관리 정책을 정의하세요',
      '사용자 행동 정책을 설정하세요',
      '마케팅 윤리 정책을 준비하세요',
      '운영 보안 정책을 수립하세요'
    ],
    icon: ExclamationTriangleIcon,
    color: 'bg-red-50 border-red-200 text-red-800'
  },
  8: {
    title: '충돌 반영 및 논의',
    description: '워크플로우에서 발생한 충돌을 즉각 반영하여 논의하는 단계입니다.',
    tips: [
      '발견된 충돌을 즉시 기록하세요',
      '충돌의 원인을 분석하세요',
      '해결 방안을 제시하세요',
      '대안을 검토하고 선택하세요',
      '최종 수정사항을 반영하세요'
    ],
    icon: ClockIcon,
    color: 'bg-orange-50 border-orange-200 text-orange-800'
  },
  9: {
    title: 'AI 중심 진행',
    description: '인간 소통을 최소화하고 AI를 통해 진행하는 단계입니다.',
    tips: [
      'AI가 자동으로 문서를 생성하도록 하세요',
      '사용자는 간단한 확인만 하세요',
      '각 단계의 결과를 요약하세요',
      '전체 워크플로우를 자동화하세요',
      '최종 플랫폼 기획 패키지를 완성하세요'
    ],
    icon: LightBulbIcon,
    color: 'bg-pink-50 border-pink-200 text-pink-800'
  }
};

export default function WorkflowGuide({ currentStep }: WorkflowGuideProps) {
  const guide = WORKFLOW_GUIDES[currentStep];
  const Icon = guide.icon;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${guide.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {currentStep}단계: {guide.title}
            </h3>
            <p className="text-sm text-gray-600">{guide.description}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <LightBulbIcon className="h-4 w-4 text-yellow-500" />
            이 단계에서 도움이 될 팁들
          </h4>
          <ul className="space-y-2">
            {guide.tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="flex-shrink-0 w-1.5 h-1.5 bg-blue-500 rounded-full mt-2"></span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            AI 어시스턴트 활용법
          </h4>
          <p className="text-sm text-blue-700 mb-3">
            왼쪽 AI 어시스턴트와 대화하여 이 단계의 기획 작업을 진행하세요. 
            구체적인 질문이나 아이디어를 공유하면 더 정확한 도움을 받을 수 있습니다.
          </p>
          <div className="text-xs text-blue-600">
            <p>💡 예시 질문:</p>
            <ul className="mt-1 space-y-1">
              <li>• "이 단계에서 가장 중요한 것은 무엇인가요?"</li>
              <li>• "타겟 사용자를 어떻게 정의해야 할까요?"</li>
              <li>• "핵심 기능의 우선순위를 어떻게 정해야 할까요?"</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}