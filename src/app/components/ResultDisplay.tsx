'use client';

import React, { useState } from 'react';

interface ResultDisplayProps {
  textToDisplay: string | null;
  isLoading: boolean;
  error: string | null;
}

export default function ResultDisplay({ textToDisplay, isLoading, error }: ResultDisplayProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    if (textToDisplay) {
      navigator.clipboard.writeText(textToDisplay)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => console.error('클립보드 복사 실패:', err));
    }
  };

  const displayContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-full">
          <div className="text-gray-500 dark:text-gray-400">AI 보고서 생성 중...</div>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
           </svg>
        </div>
      );
    }
    if (error) {
      return <div className="text-red-500 whitespace-pre-wrap">{error}</div>;
    }
    if (textToDisplay) {
      return <pre className="whitespace-pre-wrap text-sm font-sans text-gray-800 dark:text-gray-200">{textToDisplay}</pre>;
    }
    return <div className="text-gray-400 dark:text-gray-500">입력된 내용 기반의 보고서가 여기에 표시됩니다. (AI 처리 전)</div>;
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md h-full flex flex-col transition-colors duration-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">미리보기</h2>
        <button
          onClick={copyToClipboard}
          disabled={!textToDisplay || isLoading}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            copied
              ? 'bg-green-500 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-400 dark:disabled:bg-gray-600'
          }`}
        >
          {copied ? '복사 완료!' : '본문 복사'}
        </button>
      </div>
      <div className="flex-grow bg-gray-50 dark:bg-gray-700 p-4 rounded border border-gray-200 dark:border-gray-600 overflow-auto transition-colors duration-200">
        {displayContent()}
      </div>
    </div>
  );
}