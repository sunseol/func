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
  };
}

export default function ResultDisplay({ data }: ResultDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedText, setGeneratedText] = useState<string | null>(null);

  const formatData = () => {
    let result = `${data.userName}님의 일간 보고서 (${data.date})\n`;
    result += '――――――――――――――\n\n';

    // 프로젝트별 업무
    if (data.projects.length > 0) {
      data.projects.forEach((project, index) => {
        if (project.name && project.tasks.length > 0) {
          result += `${index + 1}. ${project.name}\n`;
          
          project.tasks.forEach(task => {
            if (task.description) {
              result += `- ${task.description}`;
              
              if (task.collaborator) {
                result += ` ${task.collaborator}`;
              }
              
              if (task.followUp) {
                result += `\n  => ${task.followUp}`;
              }
              
              result += '\n';
            }
          });
          
          result += '\n';
        }
      });
    }

    // 기타 업무
    if (data.miscTasks.length > 0 && data.miscTasks.some(task => task.description)) {
      result += '기타 업무\n';
      
      data.miscTasks.forEach(task => {
        if (task.description) {
          result += `- ${task.description}\n`;
        }
      });
    }

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