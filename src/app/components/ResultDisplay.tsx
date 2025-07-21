'use client';

import React from 'react';
import { App } from 'antd';
import RichEditor from './RichEditor';

interface ResultDisplayProps {
  textToDisplay: string | null;
  isLoading: boolean;
  onSave?: (content?: string) => Promise<void>;
  isSaving?: boolean;
  saveActionDisabled?: boolean;
}

export default function ResultDisplay({ 
  textToDisplay, 
  isLoading, 
  onSave,
  isSaving,
  saveActionDisabled 
}: ResultDisplayProps) {
  const { message: messageApi } = App.useApp();

  const handleSave = async (content: string) => {
    if (onSave) {
      await onSave(content);
    }
  };

  const handleCopy = () => {
    messageApi.success('클립보드에 복사되었습니다!');
  };

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div className="text-gray-500 dark:text-gray-400">AI 보고서 생성 중...</div>
        <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (!textToDisplay) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        color: '#999',
        textAlign: 'center'
      }}>
        입력된 내용 기반의 보고서가 여기에 표시됩니다.
      </div>
    );
  }

  return (
    <RichEditor
      initialContent={textToDisplay}
      onSave={onSave ? handleSave : undefined}
      onCopy={handleCopy}
      isSaving={isSaving}
      saveActionDisabled={saveActionDisabled}
      title="보고서 편집"
    />
  );
}