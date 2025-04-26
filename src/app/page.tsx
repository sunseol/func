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
  message,
  RadioChangeEvent,
} from 'antd';
import { SunOutlined, MoonOutlined, RocketOutlined } from '@ant-design/icons';
import InputForm from './components/InputForm';
import ResultDisplay from './components/ResultDisplay';
import { WeeklyReportForm } from './components/WeeklyReportForm';
import { ReportData, Project, TaskItem, formatDefaultReport, generateReport } from './api/grop';
import { useTheme } from './components/ThemeProvider';

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

  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [defaultPreviewText, setDefaultPreviewText] = useState<string | null>(null);

  useEffect(() => {
    if (aiError) {
      message.error(aiError);
    }
  }, [aiError]);

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
          message.success('AI 보고서 생성 완료!');
      } catch (err) {
          console.error('AI 보고서 생성 오류:', err);
          setAiError('AI 보고서 생성 중 오류가 발생했습니다.');
      } finally {
          setIsLoadingAI(false);
      }
  };

  const getTextForDailyDisplay = (): string | null => {
      if (activeTab !== 'daily') return null;
      return generatedText ?? defaultPreviewText;
  }

  const hasRequiredUserInfo = !!formData.userName && !!formData.date;
  const hasAnyContent = formData.projects.some(p => p.tasks.some(t => t.description)) || formData.miscTasks.some(t => t.description);
  const isAiButtonDisabled = isLoadingAI || !hasRequiredUserInfo || !hasAnyContent;

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
                disabled={isAiButtonDisabled}
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
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <Title level={3} style={{ color: 'white', margin: 0 }}>FunCommute</Title>
        <Space>
          <Paragraph style={{ color: 'rgba(255, 255, 255, 0.65)', margin: 0 }}>일일 업무 보고서 생성 도구</Paragraph>
          <Switch
            checkedChildren={<MoonOutlined />}
            unCheckedChildren={<SunOutlined />}
            checked={isDarkMode}
            onChange={setIsDarkMode}
          />
        </Space>
      </Header>
      <Content style={{ padding: '24px 48px' }}>
        <div style={{ 
              background: isDarkMode ? '#141414' : '#fff',
              padding: 24, 
              borderRadius: 8 
           }}
        >
           <Tabs 
              activeKey={activeTab} 
              onChange={handleTabChange} 
              items={tabItems} 
              centered
           />
        </div>
      </Content>
    </Layout>
  );
}
