'use client';

import { useState, useEffect } from 'react';
import {
  Layout,
  Tabs,
  Button,
  Radio,
  Row,
  Col,
  Space,
  Typography,
  Switch,
  RadioChangeEvent,
  App,
} from 'antd';
import { SunOutlined, MoonOutlined, RocketOutlined, BellOutlined } from '@ant-design/icons';
import InputForm from './components/InputForm';
import ResultDisplay from './components/ResultDisplay';
import { WeeklyReportForm } from './components/WeeklyReportForm';
import { ReportData, Project, TaskItem, formatDefaultReport, generateReport } from './api/grop';
import { useTheme } from './components/ThemeProvider';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import MainHeader from '@/components/layout/MainHeader';

const { Header, Content } = Layout;
const { Title, Paragraph } = Typography;

interface InputFormData {
  userName: string;
  date: string;
  projects: Project[];
  miscTasks: TaskItem[];
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('daily');
  const [formData, setFormData] = useState<ReportData>({
    userName: '',
    date: '',
    projects: [] as Project[],
    miscTasks: [] as TaskItem[],
    reportType: 'morning',
  });
  const { isDarkMode, setIsDarkMode } = useTheme();
  const { user, loading: authLoading, signOut } = useAuth();
  const { unreadCount, sendBrowserNotification } = useNotification();
  const { message: messageApi } = App.useApp();
  const supabase = createClient();

  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [defaultPreviewText, setDefaultPreviewText] = useState<string | null>(null);
  const [isSavingReport, setIsSavingReport] = useState(false);



  useEffect(() => {
    if (user && !formData.userName) {
      const nameFromMeta = user.user_metadata?.full_name as string | undefined;
      const suggestedUserName = nameFromMeta || user.email?.split('@')[0] || '';
      setFormData(prev => ({ ...prev, userName: suggestedUserName }));
    }
  }, [user, formData.userName]);

  useEffect(() => {
    if (aiError) {
      messageApi.error(aiError);
    }
  }, [aiError, messageApi]);

  useEffect(() => {
    if (activeTab === 'daily' && (formData.userName || formData.date || formData.projects.length > 0 || formData.miscTasks.length > 0)) {
       const defaultText = formatDefaultReport(formData);
       setDefaultPreviewText(defaultText);
    } else {
       setDefaultPreviewText(null);
    }
    setGeneratedText(null);
  }, [formData, activeTab]);

  const handleDataChange = (newData: InputFormData) => {
    setFormData(prevData => ({
      reportType: prevData.reportType,
      userName: newData.userName,
      date: newData.date,
      projects: newData.projects.map(p => ({
        ...p,
        tasks: p.tasks.map(t => ({ ...t })),
      })),
      miscTasks: newData.miscTasks.map(t => ({ ...t })),
    }));
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    
    if (key === 'weekly') {
      setFormData(prevData => ({
        ...prevData,
        reportType: 'weekly',
        date: prevData.date || new Date().toISOString()
      }));
    } else {
      setFormData(prevData => ({
        ...prevData,
        reportType: prevData.reportType === 'weekly' ? 'morning' : prevData.reportType,
        date: prevData.date || ''
      }));
    }
    setGeneratedText(null);
    setAiError(null);
  };

  const handleReportTypeChange = (e: RadioChangeEvent) => {
    if (activeTab === 'daily') {
        setFormData(prevData => ({ ...prevData, reportType: e.target.value }));
    }
  };

  const handleWeeklySubmit = (data: ReportData) => {
    setFormData({
      ...data,
      reportType: 'weekly',
      projects: data.projects.map(p => ({
          ...p,
          tasks: p.tasks.map(t => ({...t}))
      })),
      miscTasks: data.miscTasks.map(t => ({...t}))
    });
    setGeneratedText(null);
    setAiError(null);
  };

  const handleGenerateAIReport = async () => {
      setAiError(null);
      if (!formData.userName || !formData.date) {
          setAiError('AI 보고서 생성을 위해 사용자 이름과 날짜를 입력해주세요.');
          return;
      }
      const hasContent = formData.projects.some(p => p.tasks.some(t => t.description)) || formData.miscTasks.some(t => t.description);
      if (!hasContent) {
          setAiError('AI 보고서 생성을 위해 내용을 입력해주세요.');
          return;
      }

      setIsLoadingAI(true);
      setGeneratedText(null);

      try {
          const result = await generateReport(formData);
          setGeneratedText(result);
          messageApi.success('AI 보고서 생성 완료!');
      } catch (err) {
          console.error('AI 보고서 생성 오류:', err);
          setAiError(err instanceof Error ? err.message : 'AI 보고서 생성 중 오류가 발생했습니다.');
      } finally {
          setIsLoadingAI(false);
      }
  };

  const getTextForDailyDisplay = (): string | null => {
      if (activeTab !== 'daily') return null;
      return generatedText ?? defaultPreviewText;
  }

  const getTextForWeeklyDisplay = (): string | null => {
      if (activeTab !== 'weekly') return null;
      return generatedText ?? defaultPreviewText;
  }

  const hasRequiredUserInfo = !!formData.userName && !!formData.date;
  const hasAnyContent = formData.projects.some(p => p.tasks.some(t => t.description)) || formData.miscTasks.some(t => t.description);
  const isAiButtonDisabled = isLoadingAI || !hasRequiredUserInfo || !hasAnyContent;



  const handleSaveReport = async (editedContent?: string) => {
    if (!user) {
      messageApi.error('로그인이 필요합니다. 보고서를 저장할 수 없습니다.');
      return;
    }

    // 편집된 내용이 있으면 사용, 없으면 기본 내용 사용
    const reportContentToSave = editedContent || getTextForDailyDisplay();
    if (!reportContentToSave) {
      messageApi.error('저장할 보고서 내용이 없습니다.');
      return;
    }

    if (!formData.date) {
      messageApi.error('보고서 날짜를 입력해주세요.');
      return;
    }

    setIsSavingReport(true);
    try {
      const originalDateString = formData.date;
      const formattedDate = originalDateString ? originalDateString.substring(0, 10) : null;
      
      console.log('[handleSaveReport] Original date string:', originalDateString);
      console.log('[handleSaveReport] Formatted date for DB:', formattedDate);

      if (!formattedDate || formattedDate.length !== 10 || !/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
        messageApi.error('유효한 날짜 형식(YYYY-MM-DD)이 아닙니다. 날짜를 다시 확인해주세요.');
        setIsSavingReport(false);
        return;
      }

      const reportToInsert = {
        user_id: user.id,
        report_date: formattedDate,
        report_type: formData.reportType,
        user_name_snapshot: formData.userName,
        projects_data: formData.projects,
        misc_tasks_data: formData.miscTasks,
        report_content: reportContentToSave,
      };

      const { error: dbError } = await supabase.from('daily_reports').insert([reportToInsert]);

      if (dbError) {
        let detailedErrorMessage = `Supabase DB Error (Code: ${dbError.code || 'N/A'}) - Message: ${dbError.message}`;
        if (dbError.details) detailedErrorMessage += ` | Details: ${dbError.details}`;
        if (dbError.hint) detailedErrorMessage += ` | Hint: ${dbError.hint}`;
        console.error(detailedErrorMessage);
        throw new Error(detailedErrorMessage);
      }

      messageApi.success('보고서가 성공적으로 저장되었습니다!');
      
      // 보고서 저장 완료 알림
      const reportTypeText = formData.reportType === 'morning' ? '출근' : '퇴근';
      sendBrowserNotification(
        '📝 보고서 저장 완료',
        `${reportTypeText} 보고서가 성공적으로 저장되었습니다!`,
        'report_completed'
      );
      

    } catch (caughtError: unknown) {
      console.error('보고서 저장 중 오류 발생 (catch 블록):', caughtError);
      let displayErrorMessage = '보고서 저장 실패: 알 수 없는 오류가 발생했습니다.';
      if (caughtError instanceof Error) {
        displayErrorMessage = caughtError.message;
      }
      messageApi.error(displayErrorMessage);
    } finally {
      setIsSavingReport(false);
    }
  };

  const tabItems = [
    {
      key: 'daily',
      label: '일간 보고서',
      children: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Radio.Group 
            value={formData.reportType} 
            onChange={handleReportTypeChange} 
            buttonStyle="solid"
            style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}
          >
            <Radio.Button value="morning">출근 보고서 (예정 업무)</Radio.Button>
            <Radio.Button value="evening">퇴근 보고서 (진행 업무)</Radio.Button>
          </Radio.Group>
          <Row gutter={[32, 32]}>
            <Col xs={24} lg={12}>
              <InputForm onDataChange={handleDataChange} initialData={formData} />
            </Col>
            <Col xs={24} lg={12}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Button
                  type="primary"
                  icon={<RocketOutlined />}
                  loading={isLoadingAI}
                  disabled={isAiButtonDisabled}
                  onClick={handleGenerateAIReport}
                  block
                  size="large"
                >
                  {isLoadingAI ? 'AI 생성 중...' : '✨ AI야 도와줘'}
                </Button>
                


                <ResultDisplay
                  isLoading={isLoadingAI}
                  textToDisplay={getTextForDailyDisplay()}
                />
                <Button
                  type="primary"
                  onClick={() => handleSaveReport()}
                  loading={isSavingReport}
                  disabled={!user || !getTextForDailyDisplay()}
                  block
                  size="large"
                  style={{ marginTop: 16 }}
                >
                  보고서 저장
                </Button>
              </Space>
            </Col>
          </Row>
        </Space>
      ),
    },
    {
      key: 'weekly',
      label: '주간 보고서',
      children: (
        <Row gutter={[32, 32]}>
          <Col xs={24} lg={12}>
            <WeeklyReportForm onSubmit={handleWeeklySubmit} initialData={formData} />
          </Col>
          <Col xs={24} lg={12}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Button
                type="primary"
                icon={<RocketOutlined />}
                loading={isLoadingAI}
                disabled={isLoadingAI || !formData.userName || !formData.date || !(formData.projects.some(p => p.tasks.some(t => t.description)) || formData.miscTasks.some(t => t.description))}
                onClick={handleGenerateAIReport}
                block
                size="large"
              >
                {isLoadingAI ? 'AI 생성 중...' : '✨ AI야 도와줘 (주간)'}
              </Button>
              <ResultDisplay
                isLoading={isLoadingAI}
                textToDisplay={generatedText ?? defaultPreviewText}
              />
            </Space>
          </Col>
        </Row>
      ),
    },
    {
      key: 'monthly',
      label: '월간 보고서',
      disabled: true,
      children: <Paragraph style={{ textAlign: 'center' }}>추후 지원 예정입니다.</Paragraph>,
    },
  ];

  return (
    <Layout className="min-h-screen bg-white dark:bg-neutral-950" style={{ minHeight: '100vh' }}>
      <Content className="px-3 sm:px-6 md:px-12 py-6">
        <div className="rounded-lg shadow" style={{ background: isDarkMode ? '#141414' : '#fff', padding: 12 }}>
          <Tabs defaultActiveKey="daily" activeKey={activeTab} onChange={handleTabChange} items={tabItems} centered />
        </div>
      </Content>
    </Layout>
  );
}
