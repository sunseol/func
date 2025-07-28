'use client';

import { useState } from 'react';
import { 
  WorkflowStep, 
  getWorkflowStepName 
} from '@/types/ai-pm';
import { 
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface WorkflowGuideProps {
  currentStep: WorkflowStep;
  className?: string;
}

// Detailed guide content for each workflow step based on AIPM.md
const STEP_GUIDES: Record<WorkflowStep, {
  description: string;
  objectives: string[];
  keyActivities: string[];
  deliverables: string[];
  tips: string[];
  commonIssues: string[];
  aiPromptExample: string;
}> = {
  1: {
    description: '플랫폼의 전체 컨셉과 방향성을 정의하는 단계입니다. 플랫폼의 미션, 비전, 타겟 사용자, 핵심 기능을 명확히 설정합니다.',
    objectives: [
      '플랫폼의 명확한 미션과 비전 수립',
      '타겟 사용자 프로필 정의',
      '핵심 기능 및 가치 제안 설정',
      '시장 포지셔닝 및 차별화 포인트 도출'
    ],
    keyActivities: [
      'AI와 대화하며 플랫폼 아이디어 구체화',
      '타겟 사용자 페르소나 작성',
      '핵심 기능 우선순위 설정',
      'SWOT 분석 수행'
    ],
    deliverables: [
      '플랫폼 개요 문서',
      '타겟 사용자 정의서',
      '핵심 기능 목록',
      '방향성 및 전략 문서'
    ],
    tips: [
      '구체적이고 측정 가능한 목표를 설정하세요',
      '타겟 사용자를 너무 넓게 설정하지 마세요',
      '경쟁사 분석을 통해 차별화 포인트를 찾으세요',
      'AI에게 여러 관점에서 질문해보세요'
    ],
    commonIssues: [
      '모호한 컨셉 정의로 인한 방향성 혼란',
      '타겟 사용자 정의 부족',
      '핵심 기능과 부가 기능의 구분 미흡',
      '시장 분석 부족으로 인한 현실성 부족'
    ],
    aiPromptExample: '전자책 플랫폼을 기획하고 있습니다. 20-30대 직장인을 타겟으로 하는 개인화된 독서 경험을 제공하고 싶습니다.'
  },
  2: {
    description: '1단계에서 정의한 컨셉을 바탕으로 플랫폼의 주요 페이지를 나열하고 기획하는 단계입니다.',
    objectives: [
      '전체 사이트맵 구조 설계',
      '주요 페이지별 목적과 기능 정의',
      '페이지 간 연결성 및 사용자 플로우 설계',
      '각 페이지의 초기 기획 아이디어 도출'
    ],
    keyActivities: [
      '사이트맵 다이어그램 작성',
      '페이지별 목적과 핵심 요소 정의',
      '사용자 여정 맵핑',
      '페이지 간 이동 경로 설계'
    ],
    deliverables: [
      '사이트맵 개요',
      '주요 페이지 목록',
      '페이지 간 연결성 문서',
      '페이지별 기획 세부사항'
    ],
    tips: [
      '사용자 관점에서 페이지 구조를 설계하세요',
      '너무 복잡한 구조는 피하고 직관적으로 만드세요',
      '모바일과 데스크톱 모두 고려하세요',
      '페이지별 우선순위를 명확히 하세요'
    ],
    commonIssues: [
      '페이지 구조가 너무 복잡하거나 단순함',
      '사용자 플로우 고려 부족',
      '페이지 간 일관성 부족',
      '핵심 페이지와 부가 페이지 구분 미흡'
    ],
    aiPromptExample: '전자책 플랫폼의 주요 페이지를 설계해주세요. 홈페이지, 도서 검색, 마이페이지, 독서 페이지 등을 포함해야 합니다.'
  },
  3: {
    description: '각 페이지에 대하여 운영, 콘텐츠, 마케팅, 서비스, UX/UI 디자인 파트별로 상세한 문서를 제작하는 단계입니다.',
    objectives: [
      '페이지별 파트별 상세 기획서 작성',
      '각 파트의 전문성을 반영한 독립적 문서 생성',
      '공통 양식을 활용한 일관성 있는 문서화',
      '파트 간 연계성 고려'
    ],
    keyActivities: [
      '파트별 전문 관점에서 페이지 분석',
      '세부 기능 및 구현 계획 수립',
      '리스크 분석 및 대응 방안 마련',
      'KPI 설정 및 측정 방법 정의'
    ],
    deliverables: [
      '파트별 페이지 기획서',
      '세부 기능 명세서',
      '리스크 분석 보고서',
      'KPI 측정 계획서'
    ],
    tips: [
      '각 파트의 전문성을 최대한 활용하세요',
      '공통 양식을 준수하여 일관성을 유지하세요',
      '다른 파트와의 연계성을 항상 고려하세요',
      '구체적이고 실행 가능한 계획을 수립하세요'
    ],
    commonIssues: [
      '파트별 관점의 차이로 인한 불일치',
      '너무 세부적이거나 추상적인 기획',
      '파트 간 중복 기능 발생',
      '실현 가능성 검토 부족'
    ],
    aiPromptExample: '전자책 플랫폼의 마이페이지를 콘텐츠 기획 관점에서 상세히 기획해주세요. 개인화된 추천, 독서 기록, 리뷰 시스템을 포함해야 합니다.'
  },
  4: {
    description: '3단계에서 생성된 문서들이 공통 양식을 따르는지 확인하고, 각 문서의 독립성을 유지하면서 수정하는 단계입니다.',
    objectives: [
      '공통 양식 준수 여부 검토',
      '문서별 독립성 확보',
      '플랫폼 전체 컨셉과의 연계성 확인',
      '문서 품질 및 일관성 향상'
    ],
    keyActivities: [
      '문서 양식 표준화 검토',
      '중복 내용 제거 및 통합',
      '누락된 섹션 보완',
      '문서 간 일관성 확보'
    ],
    deliverables: [
      '수정된 파트별 문서',
      '변경 사항 요약 보고서',
      '문서 품질 검토 결과',
      '표준화 가이드라인'
    ],
    tips: [
      '객관적인 기준으로 문서를 평가하세요',
      '각 문서의 고유성을 존중하면서 표준화하세요',
      '독자 관점에서 문서의 명확성을 확인하세요',
      'AI를 활용해 객관적인 검토를 받으세요'
    ],
    commonIssues: [
      '과도한 표준화로 인한 개성 상실',
      '형식에만 치중하여 내용 품질 저하',
      '문서 간 연결성 고려 부족',
      '검토 기준의 모호함'
    ],
    aiPromptExample: '작성된 마이페이지 기획서들이 공통 양식을 따르는지 검토하고, 필요한 수정사항을 제안해주세요.'
  },
  5: {
    description: '각 페이지 및 파트별로 나뉜 문서들을 통합하여 각 파트에 대한 거대한 정의를 마련하는 단계입니다.',
    objectives: [
      '파트별 통합 문서 생성',
      '중복 제거 및 논리적 재배치',
      '크로스 레퍼런싱 구현',
      '파트별 전체 전략 수립'
    ],
    keyActivities: [
      '파트별 문서 통합 작업',
      '중복 내용 식별 및 제거',
      '논리적 구조 재편성',
      '파트 간 인터페이스 정의'
    ],
    deliverables: [
      '파트별 통합 정의 문서',
      '통합 기능 명세서',
      '파트별 KPI 프레임워크',
      '연계성 분석 보고서'
    ],
    tips: [
      '통합 과정에서 핵심 내용이 누락되지 않도록 주의하세요',
      '파트별 특성을 유지하면서 통합하세요',
      '통합된 문서의 가독성을 확보하세요',
      '파트 간 시너지 효과를 고려하세요'
    ],
    commonIssues: [
      '통합 과정에서 중요 정보 손실',
      '문서 구조의 복잡성 증가',
      '파트별 특성 희석',
      '통합 기준의 일관성 부족'
    ],
    aiPromptExample: '콘텐츠 파트의 모든 페이지 문서를 통합하여 전체 콘텐츠 전략을 수립해주세요.'
  },
  6: {
    description: '각 파트에 대한 정의를 다시 통합하여 플랫폼 전체에 대한 포괄적인 정의를 마련하는 단계입니다.',
    objectives: [
      '플랫폼 전체 통합 문서 생성',
      '파트 간 조화 및 일관성 확보',
      '전체 로드맵 및 타임라인 수립',
      '플랫폼 차원의 전략 완성'
    ],
    keyActivities: [
      '파트별 정의 통합',
      '플랫폼 전체 아키텍처 설계',
      '구현 로드맵 작성',
      '전체 KPI 체계 구축'
    ],
    deliverables: [
      '플랫폼 전체 정의서',
      '통합 기능 아키텍처',
      '구현 로드맵',
      '전체 성과 측정 체계'
    ],
    tips: [
      '플랫폼의 일관된 비전을 유지하세요',
      '파트 간 균형을 고려하여 통합하세요',
      '실현 가능한 로드맵을 수립하세요',
      '이해관계자 관점을 모두 고려하세요'
    ],
    commonIssues: [
      '파트 간 우선순위 충돌',
      '통합 문서의 복잡성 과다',
      '실현 가능성 검토 부족',
      '전체적 일관성 부족'
    ],
    aiPromptExample: '모든 파트의 정의를 통합하여 전자책 플랫폼의 최종 정의서를 작성해주세요.'
  },
  7: {
    description: '플랫폼에 대한 종합된 문서를 기반으로 운영에 필요한 각종 정책을 설정하는 단계입니다.',
    objectives: [
      '플랫폼 운영 정책 수립',
      '법적, 윤리적 기준 준수',
      '사용자 보호 및 서비스 품질 보장',
      '정책 집행 및 모니터링 체계 구축'
    ],
    keyActivities: [
      '정책 카테고리별 세부 규정 작성',
      '법적 요구사항 검토',
      '정책 집행 방안 수립',
      '위반 시 대응 절차 마련'
    ],
    deliverables: [
      '플랫폼 운영 정책서',
      '개인정보 보호 정책',
      '콘텐츠 관리 정책',
      '정책 집행 가이드라인'
    ],
    tips: [
      '관련 법규를 철저히 검토하세요',
      '사용자 친화적인 정책을 만드세요',
      '정책의 실행 가능성을 확인하세요',
      '정기적인 정책 업데이트 계획을 수립하세요'
    ],
    commonIssues: [
      '법적 요구사항 누락',
      '정책의 실행 가능성 부족',
      '사용자 편의성 고려 부족',
      '정책 간 상충 발생'
    ],
    aiPromptExample: '전자책 플랫폼의 저작권 보호, 개인정보 처리, 사용자 행동 규범 등의 정책을 수립해주세요.'
  },
  8: {
    description: '각 워크플로우에서 발생한 충돌이나 문제점을 즉각 반영하여 논의하고 해결하는 단계입니다.',
    objectives: [
      '문서 간 충돌 사항 식별',
      '충돌 원인 분석 및 해결 방안 도출',
      '수정된 내용 반영',
      '전체 일관성 확보'
    ],
    keyActivities: [
      'AI를 활용한 충돌 분석',
      '대안 시나리오 검토',
      '이해관계자 의견 수렴',
      '최종 수정안 적용'
    ],
    deliverables: [
      '충돌 분석 보고서',
      '해결 방안 제안서',
      '수정된 문서',
      '일관성 검증 결과'
    ],
    tips: [
      '객관적인 기준으로 충돌을 평가하세요',
      '다양한 해결 방안을 검토하세요',
      'AI의 분석 결과를 적극 활용하세요',
      '장기적 관점에서 최적의 해결책을 선택하세요'
    ],
    commonIssues: [
      '충돌 식별의 어려움',
      '해결 방안의 부작용 미고려',
      '이해관계자 간 의견 차이',
      '수정 과정에서 새로운 충돌 발생'
    ],
    aiPromptExample: '현재까지 작성된 모든 문서를 분석하여 충돌하는 부분을 찾고 해결 방안을 제시해주세요.'
  },
  9: {
    description: '인간의 소통을 최소화하고 AI를 중심으로 전체 워크플로우를 자동화하여 진행하는 단계입니다.',
    objectives: [
      '워크플로우 자동화 구현',
      '인간 개입 최소화',
      'AI 중심 문서 생성 및 관리',
      '최종 플랫폼 기획 패키지 완성'
    ],
    keyActivities: [
      'AI 자동화 프로세스 설정',
      '전체 워크플로우 순차 실행',
      '자동 품질 검증',
      '최종 결과물 패키징'
    ],
    deliverables: [
      '완전 자동화된 기획 프로세스',
      '최종 플랫폼 기획 패키지',
      'AI 자동화 가이드',
      '프로세스 개선 제안서'
    ],
    tips: [
      'AI의 한계를 이해하고 적절히 활용하세요',
      '자동화 과정에서도 품질을 확보하세요',
      '인간의 최종 검토는 반드시 포함하세요',
      '지속적인 프로세스 개선을 고려하세요'
    ],
    commonIssues: [
      'AI 의존도 과다로 인한 품질 저하',
      '자동화 과정의 오류 누적',
      '인간 판단이 필요한 부분 간과',
      '최종 결과물의 일관성 부족'
    ],
    aiPromptExample: '전체 워크플로우를 AI 중심으로 자동화하여 최종 플랫폼 기획서를 완성해주세요.'
  }
};

export default function WorkflowGuide({ currentStep, className = '' }: WorkflowGuideProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'activities' | 'tips' | 'issues'>('overview');

  const guide = STEP_GUIDES[currentStep];

  const tabs = [
    { id: 'overview' as const, label: '개요', icon: InformationCircleIcon },
    { id: 'activities' as const, label: '주요 활동', icon: CheckCircleIcon },
    { id: 'tips' as const, label: '팁', icon: LightBulbIcon },
    { id: 'issues' as const, label: '주의사항', icon: ExclamationTriangleIcon }
  ];

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center space-x-2">
            <InformationCircleIcon className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-medium text-gray-900">
              {currentStep}단계 가이드: {getWorkflowStepName(currentStep)}
            </h3>
          </div>
          {isExpanded ? (
            <ChevronUpIcon className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-gray-400" />
          )}
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-6">
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${activeTab === tab.id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="space-y-4">
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">단계 설명</h4>
                  <p className="text-gray-700 leading-relaxed">{guide.description}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">주요 목표</h4>
                  <ul className="space-y-1">
                    {guide.objectives.map((objective, index) => (
                      <li key={index} className="flex items-start space-x-2 text-gray-700">
                        <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{objective}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">주요 결과물</h4>
                  <ul className="space-y-1">
                    {guide.deliverables.map((deliverable, index) => (
                      <li key={index} className="flex items-start space-x-2 text-gray-700">
                        <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        <span>{deliverable}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'activities' && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">주요 활동</h4>
                <div className="space-y-3">
                  {guide.keyActivities.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                      <div className="h-6 w-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                        {index + 1}
                      </div>
                      <span className="text-gray-700">{activity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'tips' && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">유용한 팁</h4>
                <div className="space-y-3">
                  {guide.tips.map((tip, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                      <LightBulbIcon className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'issues' && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">주의사항</h4>
                <div className="space-y-3">
                  {guide.commonIssues.map((issue, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{issue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Prompt Example */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
              <span>AI 프롬프트 예시</span>
            </h4>
            <div className="bg-white p-3 rounded border border-gray-200">
              <code className="text-sm text-gray-700 break-words">
                {guide.aiPromptExample}
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}