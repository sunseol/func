'use client';

import React, { useState } from 'react';
import { generateReport } from '../api/grop';

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

interface ResultDisplayProps {
  data: {
    userName: string;
    date: string;
    projects: Project[];
    miscTasks: TaskItem[];
    reportType: 'morning' | 'evening';
  };
}

export default function ResultDisplay({ data }: ResultDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedText, setGeneratedText] = useState<string | null>(null);

  // 날짜 포맷 변환 함수 (예: 2025.4.4(금) -> 2025.04.04.금요일)
  const formatDateForOutput = (dateStr: string): string => {
    try {
      // 날짜 문자열에서 년, 월, 일, 요일 추출
      const match = dateStr.match(/(\d+)\.(\d+)\.(\d+)\((.)\)/);
      
      if (!match) return dateStr;
      
      const [, year, month, day, weekdayShort] = match;
      
      // 요일 매핑
      const weekdayMap: {[key: string]: string} = {
        '월': '월요일',
        '화': '화요일',
        '수': '수요일',
        '목': '목요일',
        '금': '금요일',
        '토': '토요일',
        '일': '일요일'
      };
      
      // 월, 일을 2자리로 포맷팅
      const formattedMonth = month.padStart(2, '0');
      const formattedDay = day.padStart(2, '0');
      const fullWeekday = weekdayMap[weekdayShort] || weekdayShort;
      
      return `${year}.${formattedMonth}.${formattedDay}.${fullWeekday}`;
    } catch (error) {
      // 에러 발생 시 원본 문자열 반환
      console.error('날짜 포맷 변환 중 오류 발생:', error);
      return dateStr;
    }
  };

  // 보고서 유형에 따른 제목 반환
  const getReportTitle = (): string => {
    return data.reportType === 'morning' ? '[금일 예정 업무]' : '[금일 진행 업무]';
  };

  // 템플릿에 맞춘 프롬프트 포맷팅
  const formatPromptDataForTemplate = (data: ResultDisplayProps['data']): string => {
    let prompt = '';
    
    // 모든 프로젝트와 기타 업무를 하나의 리스트로 처리
    const allItems: { title: string; tasks: TaskItem[] }[] = [
      ...data.projects.map(project => ({ title: project.name, tasks: project.tasks })),
    ];
    
    // 기타 업무가 있으면 추가
    if (data.miscTasks.length > 0 && data.miscTasks.some(task => task.description)) {
      allItems.push({ title: '기타 업무', tasks: data.miscTasks });
    }
    
    // 각 항목을 포맷팅
    allItems.forEach((item, idx) => {
      if (item.title && item.tasks.length > 0 && item.tasks.some(t => t.description)) {
        // 프로젝트/업무 섹션 이름 표시
        prompt += `◼ ${item.title}\n`;
        
        // 각 업무 항목을 하위 항목으로 표시
        item.tasks.forEach((task) => {
          if (task.description) {
            prompt += `- ${task.description}`;
            
            // 협업자 정보 추가
            if (task.collaborator && task.collaborator.trim()) {
              prompt += ` ${task.collaborator}`;
            }
            
            prompt += '\n';
            
            // 후속 조치는 > 형식으로 표시
            if (task.followUp && task.followUp.trim()) {
              prompt += `  > ${task.followUp}\n`;
            }
          }
        });
        
        // 항목 간 줄바꿈 추가
        if (idx < allItems.length - 1) {
          prompt += '\n';
        }
      }
    });
    
    return prompt;
  };

  const formatData = () => {
    // 지정된 형식에 맞는 출력 형식
    let result = `업무보고_ ${data.userName}\n`;
    result += `${formatDateForOutput(data.date)}\n`;
    result += '――――――――――――――\n';
    result += `${getReportTitle()}\n\n`;
    
    // 모든 프로젝트와 태스크를 지정된 형식으로 포맷팅
    result += formatPromptDataForTemplate(data);
    
    return result;
  };

  const formattedText = generatedText || formatData();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(formattedText).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      (err) => {
        console.error('클립보드에 복사할 수 없습니다:', err);
      }
    );
  };

  const handleSendToLLM = async () => {
    setIsLoading(true);
    try {
      const result = await generateReport(data);
      setGeneratedText(result);
    } catch (error) {
      console.error('LLM 처리 중 오류가 발생했습니다:', error);
      alert('LLM 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">미리보기</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleSendToLLM}
            disabled={isLoading}
            className={`px-3 py-1 rounded ${
              isLoading ? 'bg-gray-400' : 'bg-purple-500 hover:bg-purple-600'
            } text-white`}
          >
            {isLoading ? '처리 중...' : 'LLM에게 보내기'}
          </button>
          <button
            onClick={copyToClipboard}
            className={`px-3 py-1 rounded ${
              copied ? 'bg-green-500' : 'bg-blue-500 hover:bg-blue-600'
            } text-white`}
          >
            {copied ? '복사됨!' : '전체 복사'}
          </button>
        </div>
      </div>
      <div className="border p-4 rounded bg-gray-50 whitespace-pre-wrap font-mono">
        {formattedText}
      </div>
    </div>
  );
}