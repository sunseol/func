'use client';

import React, { useState } from 'react';
import { Card, Button, Typography, Spin, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';

interface ResultDisplayProps {
  textToDisplay: string | null;
  isLoading: boolean;
  onSave?: () => Promise<void>;
  isSaving?: boolean;
  saveActionDisabled?: boolean;
}

const { Paragraph } = Typography;

export default function ResultDisplay({ 
  textToDisplay, 
  isLoading, 
  onSave,
  isSaving,
  saveActionDisabled 
}: ResultDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleAction = async () => {
    let copyAttempted = false;
    if (textToDisplay) {
      copyAttempted = true;
      try {
        await navigator.clipboard.writeText(textToDisplay);
        message.success('클립보드에 복사되었습니다!');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('클립보드 복사 실패:', err);
        message.error('클립보드 복사에 실패했습니다.');
      }
    }

    if (onSave) {
      // onSave는 부모 컴포넌트에서 isSaving 상태를 관리하고 메시지를 표시합니다.
      // 여기서 추가적인 isSaving 상태 변경이나 메시지 표시는 필요 없습니다.
      // 단, 복사만 시도하고 저장 기능이 없는 경우를 위해 copyAttempted 확인.
      if (!copyAttempted && !textToDisplay) {
         // 저장할 내용도 없고 복사할 내용도 없을 때 onSave 호출 방지 (버튼 disabled 로직에서 이미 처리될 수 있음)
         // 하지만 명시적으로 추가.
         return;
      }
      await onSave();
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
  
  const getButtonText = () => {
    if (onSave && isSaving) return '저장 중...';
    if (copied) return '복사 완료!';
    if (onSave) return '저장 및 복사';
    return '본문 복사';
  };

  const isButtonDisabled = () => {
    if (isLoading) return true; // AI 결과 로딩 중
    if (onSave && isSaving) return true; // 저장 중
    if (!textToDisplay) return true; // 표시할 텍스트가 없음 (복사/저장 대상 없음)
    if (onSave && saveActionDisabled) return true; // 부모가 저장 액션 비활성화 요청
    return false;
  };

  return (
    <Card 
      title="미리보기" 
      extra={
        <Button
          icon={<CopyOutlined />}
          onClick={handleAction}
          disabled={isButtonDisabled()}
          loading={onSave && isSaving}
          type={copied && !(onSave && isSaving) ? 'primary' : 'default'}
          ghost={copied && !(onSave && isSaving)}
        >
          {getButtonText()}
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