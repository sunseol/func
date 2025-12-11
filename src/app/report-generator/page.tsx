'use client';

import React, { useState, useRef } from 'react';
import { Upload, Download, FileText, File as FileIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';

const ReportGeneratorPageInternal: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [inputText, setInputText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('file');
  const [generatedReport, setGeneratedReport] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const reportContentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      const isAllowedType = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(selectedFile.type);

      if (!isAllowedType) {
        toast.error('PDF, TXT, DOCX 파일만 업로드할 수 있습니다.');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleGenerate = async () => {
    let initialBody: BodyInit;
    let initialHeaders: HeadersInit = {};

    if (activeTab === 'file') {
      if (!file) {
        toast.error('요약할 파일을 업로드해주세요.');
        return;
      }
      const formData = new FormData();
      formData.append('file', file);
      initialBody = formData;
    } else {
      if (!inputText.trim()) {
        toast.error('요약할 텍스트를 입력해주세요.');
        return;
      }
      initialBody = JSON.stringify({ text: inputText });
      initialHeaders = { 'Content-Type': 'application/json' };
    }

    setIsLoading(true);
    setGeneratedReport('');
    setProgress(0);
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

      const { summary } = await summarizeResponse.json();

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

      const { report } = await generateResponse.json();

      // AI 응답에서 불필요한 코드 블록 마크업 제거
      const cleanedReport = report
        .replace(/```html/g, '')
        .replace(/```/g, '')
        .trim();

      setProgress(100);
      setGeneratedReport(cleanedReport);
      toast.success('리포트가 성공적으로 생성되었습니다.');

    } catch (error) {
      console.error('Error generating report:', error);
      toast.error((error as Error).message || '리포트 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background p-8 print:p-0 print:bg-white">
      <div className="max-w-5xl mx-auto printable-area">
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-2xl">AI 리포트 요약</CardTitle>
            <CardDescription>
              리포트 파일(PDF, TXT, DOCX)을 업로드하거나 텍스트를 직접 붙여넣으면 AI가 한 페이지 분량의 인포그래픽 스타일 보고서로 요약해 드립니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                <TabsTrigger value="file">파일 업로드</TabsTrigger>
                <TabsTrigger value="text">텍스트 직접 입력</TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="space-y-4 py-4">
                <div
                  className="border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.txt,.docx"
                  />
                  <FileIcon className="h-10 w-10 text-muted-foreground mb-4" />
                  {file ? (
                    <div className="space-y-2">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setFile(null); }}>제거</Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="font-medium">파일 선택 또는 드래그 앤 드롭</p>
                      <p className="text-sm text-muted-foreground">PDF, TXT, DOCX (최대 10MB)</p>
                      <Button variant="secondary" size="sm">파일 찾기</Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="text" className="py-4">
                <Textarea
                  rows={10}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="여기에 리포트 원문 텍스트를 붙여넣으세요."
                  className="resize-none"
                />
              </TabsContent>
            </Tabs>

            <Button
              size="lg"
              className="w-full sm:w-auto"
              onClick={handleGenerate}
              disabled={(activeTab === 'file' && !file) || (activeTab === 'text' && !inputText.trim()) || isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? '리포트 생성 중...' : '리포트 생성'}
            </Button>
          </CardContent>
        </Card>

        {isLoading && (
          <div className="mt-8 text-center space-y-4 print:hidden">
            <Progress value={progress} className="w-full max-w-md mx-auto" />
            <p className="text-muted-foreground animate-pulse">{loadingMessage}</p>
          </div>
        )}

        {generatedReport && (
          <div className="mt-8 space-y-8">
            <div className="flex justify-center print:hidden">
              <Button onClick={handleDownloadPdf} variant="outline" className="gap-2">
                <Download className="h-4 w-4" /> PDF로 저장 / 인쇄
              </Button>
            </div>

            <div className="report-preview-container bg-white shadow-xl p-[15mm] mx-auto max-w-[210mm] min-h-[297mm] print:shadow-none print:m-0 print:p-0 print:w-full">
              <style jsx global>{`
                        @page {
                            size: A4;
                            margin: 15mm;
                        }
                        @media print {
                            body {
                                background: white;
                            }
                            .print\\:hidden {
                                display: none;
                            }
                            .report-preview-container {
                                box-shadow: none !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                width: 100% !important;
                            }
                        }
                     `}</style>
              <div
                dangerouslySetInnerHTML={{ __html: generatedReport }}
                className="prose max-w-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportGeneratorPageInternal;
