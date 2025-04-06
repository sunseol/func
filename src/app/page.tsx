'use client';

import { useState } from 'react';
import InputForm from './components/InputForm';
import ResultDisplay from './components/ResultDisplay';

interface TaskItem {
  id: string;
  description: string;
  collaborator?: string;
  followUp?: string;
}

interface Project {
  id: string;
  name: string;
  tasks: TaskItem[];
}

interface ReportData {
  userName: string;
  date: string;
  projects: Project[];
  miscTasks: TaskItem[];
  reportType: 'morning' | 'evening';
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('daily');
  const [formData, setFormData] = useState<ReportData>({
    userName: '',
    date: '',
    projects: [],
    miscTasks: [],
    reportType: 'evening',
  });

  const handleDataChange = (data: Omit<ReportData, 'reportType'>) => {
    setFormData(prevData => ({
      ...data,
      reportType: prevData.reportType,
    }));
  };

  const handleReportTypeChange = (type: 'morning' | 'evening') => {
    setFormData(prevData => ({
      ...prevData,
      reportType: type,
    }));
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 lg:p-12">
      <div className="w-full max-w-7xl space-y-6">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">FunCommute</h1>
          <p className="text-gray-600">일일 업무 보고서 생성 도구</p>
        </header>

        <div className="flex border-b mb-4">
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === 'daily'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('daily')}
          >
            일간 보고서
          </button>
          <button
            className="py-2 px-4 font-medium text-gray-400 cursor-not-allowed"
            title="추후 지원 예정"
          >
            주간 보고서
          </button>
          <button
            className="py-2 px-4 font-medium text-gray-400 cursor-not-allowed"
            title="추후 지원 예정"
          >
            월간 보고서
          </button>
        </div>

        <div className="flex justify-center mb-4">
          <div className="bg-gray-100 p-1 rounded-lg flex">
            <button
              className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                formData.reportType === 'morning'
                  ? 'bg-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => handleReportTypeChange('morning')}
            >
              출근 보고서 (예정 업무)
            </button>
            <button
              className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                formData.reportType === 'evening'
                  ? 'bg-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-200'
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
          <div className="w-full lg:w-1/2">
            <ResultDisplay data={formData} />
          </div>
        </div>
      </div>
    </main>
  );
}
