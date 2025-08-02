'use client';

import React, { useState, useRef } from 'react';
import { Upload, Button, Card, Spin, Typography, Tabs, Input, App } from 'antd';
const { TextArea } = Input;
import { UploadOutlined, DownloadOutlined, FilePdfOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { jsPDF } from 'jspdf';

const { Title, Paragraph } = Typography;

const ReportGeneratorPageInternal: React.FC = () => {
  const { message: messageApi } = App.useApp();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('file');
  const [generatedReport, setGeneratedReport] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const reportContentRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    let initialBody: BodyInit;
    let initialHeaders: HeadersInit = {};

    if (activeTab === 'file') {
      if (fileList.length === 0) {
        messageApi.error('요약할 파일을 업로드해주세요.');
        return;
      }
      const formData = new FormData();
      formData.append('file', fileList[0] as any);
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
    setLoadingMessage('AI가 문서를 분석하고 요약 중입니다...');

    try {
      // 1단계: 요약 API 호출
      const summarizeResponse = await fetch('/api/report/summarize', {
        method: 'POST',
        body: initialBody,
        headers: initialHeaders,
      });

      if (!summarizeResponse.ok) {
        const errorData = await summarizeResponse.json();
        throw new Error(errorData.details || '문서 요약에 실패했습니다.');
      }

      const { summary } = await summarizeResponse.json();

      // 2단계: HTML 생성 API 호출
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

      const { report } = await generateResponse.json();
      setGeneratedReport(report);
      messageApi.success('리포트가 성공적으로 생성되었습니다.');

    } catch (error) {
      console.error('Error generating report:', error);
      messageApi.error((error as Error).message || '리포트 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleDownloadPdf = async () => {
    if (!reportContentRef.current) return;
    
    const loading = messageApi.loading('PDF 생성 중... 잠시만 기다려주세요.', 0);

    try {
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: true
      });
      
      pdf.addFont('/fonts/NotoSansKR-Regular.ttf', 'NotoSansKR', 'normal');
      pdf.setFont('NotoSansKR');

      await pdf.html(reportContentRef.current, {
        callback: function (doc) {
          doc.save('AI-Generated-Report.pdf');
        },
        x: 10,
        y: 10,
        width: 190, // A4 width in mm minus margins
        windowWidth: reportContentRef.current.scrollWidth,
        autoPaging: 'text',
        html2canvas: {
            scale: 0.25, // Increased scale for better quality
            useCORS: true,
            allowTaint: true
        }
      });
      
      loading(); // Close loading message
      messageApi.success('PDF가 성공적으로 다운로드되었습니다.');

    } catch (error) {
      loading(); // Close loading message
      console.error("PDF 다운로드 중 오류 발생:", error);
      messageApi.error("PDF 다운로드 중 오류가 발생했습니다.");
    }
  };


  const props = {
    onRemove: (file: UploadFile) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file: UploadFile) => {
      const isAllowedType = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type);
      if (!isAllowedType) {
        messageApi.error('PDF, TXT, DOCX 파일만 업로드할 수 있습니다.');
        return Upload.LIST_IGNORE;
      }
      setFileList([file]);
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
    <div style={{ padding: '40px' }}>
      <Card>
        <Title level={2}>AI 리포트 요약</Title>
        <Paragraph>
          리포트 파일(PDF, TXT, DOCX)을 업로드하거나 텍스트를 직접 붙여넣으면 AI가 한 페이지 분량의 인포그래픽 스타일 보고서로 요약해 드립니다.
        </Paragraph>

        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

        <Button
          type="primary"
          onClick={handleGenerate}
          disabled={(activeTab === 'file' && fileList.length === 0) || (activeTab === 'text' && !inputText.trim()) || isLoading}
          style={{ marginTop: 16 }}
        >
          {isLoading ? '리포트 생성 중...' : '리포트 생성'}
        </Button>

        {isLoading && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <Spin size="large" />
            <Paragraph style={{ marginTop: '10px' }}>{loadingMessage}</Paragraph>
          </div>
        )}

        {generatedReport && (
          <Card style={{ marginTop: '20px' }}>
            <Title level={4}>생성된 리포트</Title>
            <Button
                icon={<DownloadOutlined />}
                onClick={handleDownloadPdf}
                style={{ marginBottom: '20px' }}
            >
                PDF로 다운로드
            </Button>
            <div ref={reportContentRef} dangerouslySetInnerHTML={{ __html: generatedReport }} />
          </Card>
        )}
      </Card>
    </div>
  );
};

const ReportGeneratorPage: React.FC = () => (
  <App>
    <ReportGeneratorPageInternal />
  </App>
);

export default ReportGeneratorPage;
