'use client';

import { useState, useEffect } from 'react';
import { Button, Space, Card, Typography } from 'antd';
import { EditOutlined, EyeOutlined, CopyOutlined, SaveOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';

// MDEditor를 동적으로 로드 (SSR 방지)
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
);

const { Title } = Typography;

interface RichEditorProps {
  initialContent: string;
  onSave?: (content: string) => void;
  onCopy?: (content: string) => void;
  isSaving?: boolean;
  saveActionDisabled?: boolean;
  title?: string;
}

export default function RichEditor({
  initialContent,
  onSave,
  onCopy,
  isSaving = false,
  saveActionDisabled = false,
  title = "보고서 편집"
}: RichEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleSave = () => {
    if (onSave) {
      onSave(content);
    }
  };

  const handleCopy = async () => {
    try {
      // 마크다운을 일반 텍스트로 변환 (간단한 변환)
      const plainText = content
        .replace(/#{1,6}\s/g, '') // 헤더 제거
        .replace(/\*\*(.*?)\*\*/g, '$1') // 볼드 제거
        .replace(/\*(.*?)\*/g, '$1') // 이탤릭 제거
        .replace(/`(.*?)`/g, '$1') // 인라인 코드 제거
        .replace(/```[\s\S]*?```/g, '') // 코드 블록 제거
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 링크 제거
        .replace(/^\s*[-*+]\s/gm, '• ') // 리스트 마커 변경
        .trim();

      await navigator.clipboard.writeText(plainText);
      if (onCopy) {
        onCopy(plainText);
      }
    } catch (err) {
      console.error('복사 실패:', err);
    }
  };

  return (
    <Card 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>{title}</Title>
          <Space>
            <Button
              icon={isEditing ? <EyeOutlined /> : <EditOutlined />}
              onClick={() => setIsEditing(!isEditing)}
              type={isEditing ? "default" : "primary"}
            >
              {isEditing ? '미리보기' : '편집'}
            </Button>
            <Button
              icon={<CopyOutlined />}
              onClick={handleCopy}
            >
              복사
            </Button>
            {onSave && (
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={isSaving}
                disabled={saveActionDisabled}
                onClick={handleSave}
              >
                {isSaving ? '저장 중...' : '저장'}
              </Button>
            )}
          </Space>
        </div>
      }
      style={{ height: '100%' }}
    >
      <div style={{ minHeight: '400px' }}>
        <MDEditor
          value={content}
          onChange={(val) => setContent(val || '')}
          preview={isEditing ? 'edit' : 'preview'}
          hideToolbar={!isEditing}
          height={400}
        />
      </div>
    </Card>
  );
}