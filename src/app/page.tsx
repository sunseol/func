'use client';

import { useState, useEffect } from 'react';
import InputForm from './components/InputForm';
import ResultDisplay from './components/ResultDisplay';
import { WeeklyReportForm } from './components/WeeklyReportForm';
import { ReportData, Project, TaskItem, formatDefaultReport, generateReport } from './api/grop';

// InputForm에서 onDataChange로 전달하는 데이터 타입을 가정
// (InputForm 구현에 따라 조정 필요)
interface InputFormData {
  userName: string;
  date: string;
  projects: Project[]; // grop.ts의 Project 타입 사용
  miscTasks: TaskItem[]; // grop.ts의 TaskItem 타입 사용
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('daily');
  const [formData, setFormData] = useState<ReportData>({
    userName: '',
    date: '',
    projects: [] as Project[],
    miscTasks: [] as TaskItem[],
    reportType: 'morning',
  });
  const [isDarkMode, setIsDarkMode] = useState(false);

  // AI 관련 상태 추가
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  // 기본 포맷팅 텍스트 상태 추가
  const [defaultPreviewText, setDefaultPreviewText] = useState<string | null>(null);

  // 초기 로드 시 및 formData 변경 시 기본 미리보기 업데이트
  useEffect(() => {
    // reportType이 weekly일 때는 WeeklyReportForm에서 관리하므로 기본 미리보기 불필요
    if (activeTab === 'daily' && (formData.userName || formData.date || formData.projects.length > 0 || formData.miscTasks.length > 0)) {
       // grop.ts의 formatDefaultReport는 ReportData 전체를 받으므로 formData 그대로 사용
       const defaultText = formatDefaultReport(formData);
       setDefaultPreviewText(defaultText);
    } else {
       setDefaultPreviewText(null); // 주간 탭이거나 데이터 없으면 초기화
    }
    // formData 변경 시 AI 생성 텍스트는 초기화
    setGeneratedText(null);
    setAiError(null);
  }, [formData, activeTab]); // activeTab도 의존성에 추가

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialMode = savedMode ? JSON.parse(savedMode) : prefersDark;
    setIsDarkMode(initialMode);

    if (initialMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  const handleDataChange = (newData: InputFormData) => {
    setFormData(prevData => ({
      reportType: prevData.reportType,
      userName: newData.userName,
      date: newData.date,
      projects: newData.projects.map(p => ({
        ...p,
        tasks: p.tasks.map(t => ({ ...t })),
      })),
      miscTasks: newData.miscTasks.map(t => ({ ...t })),
    }));
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    if (tab === 'weekly') {
      setFormData(prevData => ({
        ...prevData,
        reportType: 'weekly',
        date: prevData.date || new Date().toISOString()
      }));
    } else {
      setFormData(prevData => ({
        ...prevData,
        reportType: prevData.reportType === 'weekly' ? 'morning' : prevData.reportType,
        date: prevData.date || ''
      }));
    }
    // 탭 변경 시 AI 결과 초기화
    setGeneratedText(null);
    setAiError(null);
  };

  const handleReportTypeChange = (type: 'morning' | 'evening') => {
    if (activeTab === 'daily') {
        setFormData(prevData => ({ ...prevData, reportType: type }));
    }
  };

  const handleWeeklySubmit = (data: ReportData) => {
    setFormData({
      ...data,
      reportType: 'weekly',
      projects: data.projects.map(p => ({
          ...p,
          tasks: p.tasks.map(t => ({...t}))
      })),
      miscTasks: data.miscTasks.map(t => ({...t}))
    });
    // 주간 보고서 탭에서는 이 함수 호출 후 ResultDisplay가 자체적으로 AI 호출할 수 있도록 구조 변경 필요
    // 지금은 일단 상태만 업데이트
    setGeneratedText(null);
    setAiError(null);
  };

  // AI 보고서 생성 함수
  const handleGenerateAIReport = async () => {
      if (!formData.userName || !formData.date) {
          setAiError('AI 보고서 생성을 위해 사용자 이름과 날짜를 입력해주세요.');
          return;
      }
      const hasContent = formData.projects.some(p => p.tasks.some(t => t.description)) || formData.miscTasks.some(t => t.description);
      if (!hasContent) {
          setAiError('AI 보고서 생성을 위해 내용을 입력해주세요.');
          return;
      }

      setIsLoadingAI(true);
      setGeneratedText(null);
      setAiError(null);

      try {
          const result = await generateReport(formData);
          setGeneratedText(result);
      } catch (err) {
          console.error('AI 보고서 생성 오류:', err);
          setAiError('AI 보고서 생성 중 오류가 발생했습니다.');
      } finally {
          setIsLoadingAI(false);
      }
  };

  // ResultDisplay에 전달할 텍스트 결정
  const getTextForDailyDisplay = (): string | null => {
      if (activeTab !== 'daily') return null;
      // AI 생성 텍스트가 있으면 그것, 없으면 기본 포맷팅 텍스트
      return generatedText ?? defaultPreviewText;
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 lg:p-12 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="w-full max-w-7xl space-y-6">
        <header className="text-center mb-8 relative">
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">FunCommute</h1>
          <p className="text-gray-600 dark:text-gray-400">일일 업무 보고서 생성 도구</p>
          <button
            onClick={toggleDarkMode}
            className="absolute top-0 right-0 p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            aria-label={isDarkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
          >
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </header>

        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
          <button
            className={`py-2 px-4 font-medium transition-colors ${
              activeTab === 'daily'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
            onClick={() => handleTabChange('daily')}
          >
            일간 보고서
          </button>
          <button
            className={`py-2 px-4 font-medium transition-colors ${
              activeTab === 'weekly'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
            onClick={() => handleTabChange('weekly')}
          >
            주간 보고서
          </button>
          <button
            className="py-2 px-4 font-medium text-gray-400 dark:text-gray-600 cursor-not-allowed"
            title="추후 지원 예정"
          >
            월간 보고서
          </button>
        </div>

        {activeTab === 'daily' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg flex">
                <button
                  className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                    formData.reportType === 'morning'
                      ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => handleReportTypeChange('morning')}
                >
                  출근 보고서 (예정 업무)
                </button>
                <button
                  className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                    formData.reportType === 'evening'
                      ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => handleReportTypeChange('evening')}
                >
                  퇴근 보고서 (진행 업무)
                </button>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
              <div className="w-full lg:w-1/2">
                <InputForm onDataChange={handleDataChange} />
              </div>
              <div className="w-full lg:w-1/2 flex flex-col gap-4">
                 {/* AI 생성 버튼 */}
                 <button
                    onClick={handleGenerateAIReport}
                    disabled={isLoadingAI || !formData.userName || !formData.date || (!formData.projects.some(p => p.tasks.some(t => t.description)) && !formData.miscTasks.some(t => t.description)) }
                    className="w-full px-4 py-2 rounded text-white font-medium transition-colors bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-600"
                  >
                    {isLoadingAI ? 'AI 생성 중...' : '✨ AI야 도와줘'}
                  </button>
                {/* 미리보기 컴포넌트 */}
                <ResultDisplay
                    isLoading={isLoadingAI}
                    error={aiError}
                    textToDisplay={getTextForDailyDisplay()} // 일간 탭용 텍스트 전달
                 />
              </div>
            </div>
          </>
        )}

        {activeTab === 'weekly' && (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="w-full lg:w-1/2">
              <WeeklyReportForm onSubmit={handleWeeklySubmit} />
            </div>
            <div className="w-full lg:w-1/2 flex flex-col gap-4">
                   <button
                      onClick={handleGenerateAIReport} // 동일한 핸들러 사용 (주간 보고서용 로직 분리 필요 가능성 있음)
                      disabled={isLoadingAI || !formData.userName || !formData.date || (!formData.projects.some(p => p.tasks.some(t => t.description)) && !formData.miscTasks.some(t => t.description))}
                      className="w-full px-4 py-2 rounded text-white font-medium transition-colors bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-600"
                    >
                      {isLoadingAI ? 'AI 생성 중...' : '✨ AI야 도와줘 (주간)'}
                    </button>
                   <ResultDisplay
                      isLoading={isLoadingAI}
                      error={aiError}
                      // 주간 탭에서는 generatedText를 직접 표시하거나, 별도 로직 필요
                      textToDisplay={generatedText ?? defaultPreviewText} // 일단 일간과 동일하게 표시
                   />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
