'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Button, Card, Spin, Typography, Tabs, Input, App, Progress } from 'antd';
const { TextArea } = Input;
import { UploadOutlined, DownloadOutlined, FilePdfOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { sanitizeReportHtml } from '@/lib/security/validation';
import { REPORT_STYLES } from './report-styles';

const { Title, Paragraph } = Typography;

const ReportGeneratorPageInternal: React.FC = () => {
  const { message: messageApi } = App.useApp();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('file');
  const [generatedReport, setGeneratedReport] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const reportContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This effect can be used for other purposes when the report is generated.
    // For now, we keep it simple.
  }, [generatedReport]);

  const handleGenerate = async () => {
    let initialBody: BodyInit;
    let initialHeaders: HeadersInit = {};

    if (activeTab === 'file') {
      if (fileList.length === 0) {
        messageApi.error('요약할 파일을 업로드해주세요.');
        return;
      }
      const formData = new FormData();
      const file = fileList[0]?.originFileObj;
      if (!file) {
        messageApi.error('선택한 파일을 읽을 수 없습니다.');
        return;
      }
      formData.append('file', file);
      initialBody = formData;
    } else { // activeTab === 'text'
      if (!inputText.trim()) {
        messageApi.error('요약할 텍스트를 입력해주세요.');
        return;
      }
      initialBody = JSON.stringify({ text: inputText });
      initialHeaders = { 'Content-Type': 'application/json' };
    }

    setIsLoading(true);
    setGeneratedReport('');
    setProgress(0); // Reset progress
    setLoadingMessage('AI가 문서를 분석하고 요약 중입니다...');

    try {
      // 1단계: 요약 API 호출
      setProgress(10);
      const summarizeResponse = await fetch('/api/report/summarize', {
        method: 'POST',
        body: initialBody,
        headers: initialHeaders,
      });
      
      if (!summarizeResponse.ok) {
        const errorData = await summarizeResponse.json();
        throw new Error(errorData.details || '문서 요약에 실패했습니다.');
      }
      
      const summaryResponse: unknown = await summarizeResponse.json();
      if (
        typeof summaryResponse !== 'object' ||
        summaryResponse === null ||
        !('summary' in summaryResponse) ||
        typeof summaryResponse.summary !== 'string' ||
        summaryResponse.summary.trim().length === 0
      ) {
        throw new Error('문서 요약 응답이 올바르지 않습니다.');
      }
      const { summary } = summaryResponse;
      
      // 2단계: HTML 생성 API 호출
      setProgress(50);
      setLoadingMessage('요약된 내용으로 인포그래픽 보고서를 생성 중입니다...');
      
      const generateResponse = await fetch('/api/report/generateHtml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary }),
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        throw new Error(errorData.details || '보고서 생성에 실패했습니다.');
      }

      const reportResponse: unknown = await generateResponse.json();
      if (
        typeof reportResponse !== 'object' ||
        reportResponse === null ||
        !('report' in reportResponse) ||
        typeof reportResponse.report !== 'string' ||
        reportResponse.report.trim().length === 0
      ) {
        throw new Error('생성된 보고서 응답이 올바르지 않습니다.');
      }
      const { report } = reportResponse;
      
      // AI 응답에서 불필요한 코드 블록 마크업 제거
      const cleanedReport = report
        .replace(/```html/g, '')
        .replace(/```/g, '')
        .trim();
      
      setProgress(100);
      const safeReport = sanitizeReportHtml(cleanedReport);
      if (!safeReport.trim()) {
        throw new Error('생성된 보고서에 표시할 내용이 없습니다.');
      }
      setGeneratedReport(safeReport);
      messageApi.success('리포트가 성공적으로 생성되었습니다.');

    } catch (error) {
      console.error('Error generating report:', error);
      messageApi.error((error as Error).message || '리포트 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleDownloadPdf = () => {
    if (!reportContentRef.current) return;
    window.print();
  };


  const props: UploadProps = {
    onRemove: (file: UploadFile) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file) => {
      const allowedTypes = new Set([
        'application/pdf',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ]);
      const allowedExtensions = /\.(pdf|txt|docx)$/i;
      const isAllowedType = allowedTypes.has(file.type ?? '') || allowedExtensions.test(file.name);
      if (!isAllowedType) {
        const feedback = 'PDF, TXT, DOCX 파일만 업로드할 수 있습니다.';
        setUploadFeedback(feedback);
        messageApi.error(feedback);
        return Upload.LIST_IGNORE;
      }
      setUploadFeedback(null);
      setFileList([{
        uid: file.uid,
        name: file.name,
        status: 'done',
        size: file.size,
        type: file.type,
        originFileObj: file,
      }]);
      return false; // Prevent auto-upload
    },
    fileList,
    maxCount: 1,
  };

  const tabItems = [
    {
      key: 'file',
      label: '파일 업로드',
      children: (
        <Upload {...props}>
          <Button icon={<UploadOutlined />}>파일 선택</Button>
        </Upload>
      ),
    },
    {
      key: 'text',
      label: '텍스트 직접 입력',
      children: (
        <TextArea
          rows={10}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="여기에 리포트 원문 텍스트를 붙여넣으세요."
        />
      ),
    },
  ];

  return (
    <div className="report-generator-container">
      <div style={{ padding: '40px' }} className="printable-area">
        <Card>
          <div className="non-printable">
            <Title level={2}>AI 리포트 요약</Title>
            <Paragraph>
              리포트 파일(PDF, TXT, DOCX)을 업로드하거나 텍스트를 직접 붙여넣으면 AI가 한 페이지 분량의 인포그래픽 스타일 보고서로 요약해 드립니다.
            </Paragraph>
            {uploadFeedback && (
              <div role="alert" aria-live="polite" style={{ marginBottom: 16 }}>
                {uploadFeedback}
              </div>
            )}
            <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
            <Button
              type="primary"
              onClick={handleGenerate}
              disabled={(activeTab === 'file' && fileList.length === 0) || (activeTab === 'text' && !inputText.trim()) || isLoading}
              style={{ marginTop: 16 }}
            >
              {isLoading ? '리포트 생성 중...' : '리포트 생성'}
            </Button>
          </div>

          {isLoading && (
            <div style={{ textAlign: 'center', marginTop: '20px' }} className="non-printable">
              <Progress percent={progress} className="animated-progress" />
              <Paragraph style={{ marginTop: '10px' }}>{loadingMessage}</Paragraph>
            </div>
          )}

          <style>{REPORT_STYLES}</style>

          {generatedReport && (
            <Card 
              style={{ marginTop: '20px' }} 
              styles={{ body: { display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f0f2f5' } }}
            >
              <div className="non-printable" style={{ textAlign: 'center', marginBottom: '20px', width: '100%' }}>
                <Title level={4} style={{ marginBottom: '16px' }}>생성된 리포트</Title>
                <Button
                    icon={<DownloadOutlined />}
                    onClick={handleDownloadPdf}
                >
                    PDF로 다운로드
                </Button>
              </div>
              <div
                className="page-container"
                ref={reportContentRef}
                role="article"
                aria-label="생성된 리포트 내용"
              >
                <div className="report-content-wrapper" dangerouslySetInnerHTML={{ __html: generatedReport }} />
              </div>
            </Card>
          )}
        </Card>
      </div>
    </div>
  );
};

const ReportGeneratorPage: React.FC = () => (
  <App>
    <ReportGeneratorPageInternal />
  </App>
);

export default ReportGeneratorPage;
