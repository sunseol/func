'use client';

import React, { useState } from 'react';
import { Card, Button, Typography, Spin, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';

interface ResultDisplayProps {
  textToDisplay: string | null;
  isLoading: boolean;
}

const { Paragraph } = Typography;

export default function ResultDisplay({ textToDisplay, isLoading }: ResultDisplayProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    if (textToDisplay) {
      navigator.clipboard.writeText(textToDisplay)
        .then(() => {
          setCopied(true);
          message.success('클립보드에 복사되었습니다!');
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => {
            console.error('클립보드 복사 실패:', err);
            message.error('클립보드 복사에 실패했습니다.');
        });
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
    if (textToDisplay) {
      return <Paragraph><pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{textToDisplay}</pre></Paragraph>;
    }
    return <Paragraph type="secondary">입력된 내용 기반의 보고서가 여기에 표시됩니다. (AI 처리 전)</Paragraph>;
  };

  return (
    <Card 
      title="미리보기" 
      extra={
        <Button
          icon={<CopyOutlined />}
          onClick={copyToClipboard}
          disabled={!textToDisplay || isLoading}
          type={copied ? 'primary' : 'default'}
          ghost={copied}
        >
          {copied ? '복사 완료!' : '본문 복사'}
        </Button>
      }
      style={{ height: '100%' }}
      styles={{ body: { height: 'calc(100% - 58px)', overflow: 'auto' } }}
    >
      <Spin spinning={isLoading} tip="AI 보고서 생성 중..." size="large" style={{ maxHeight: 'none' }}>
        <div style={{ padding: '0' }}> 
            {displayContent()} 
        </div>
      </Spin>
    </Card>
  );
}