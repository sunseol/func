'use client';

import { useState, useEffect } from 'react';
import { Rocket, Save } from 'lucide-react';
import InputForm from './components/InputForm';
import ResultDisplay from './components/ResultDisplay';
import { WeeklyReportForm } from './components/WeeklyReportForm';
import { ReportData, Project, TaskItem, formatDefaultReport, generateReport, generateWeeklyReportFromDaily } from './api/grop';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// Types
interface InputFormData {
  userName: string;
  date: string;
  projects: Project[];
  miscTasks: TaskItem[];
}

const createEmptyReportData = (): ReportData => ({
  userName: '',
  date: '',
  projects: [] as Project[],
  miscTasks: [] as TaskItem[],
  reportType: 'morning',
});

export default function Home() {
  const [activeTab, setActiveTab] = useState('daily');
  const [formData, setFormData] = useState<ReportData>(createEmptyReportData());
  const { user, loading: authLoading, initialized } = useAuth();
  const { sendBrowserNotification } = useNotification();
  const supabase = createClient();
  const router = useRouter();

  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  const [defaultPreviewText, setDefaultPreviewText] = useState<string | null>(null);
  const [isSavingReport, setIsSavingReport] = useState(false);

  useEffect(() => {
    if (!authLoading && initialized && !user) {
      router.replace('/landing');
      setFormData(createEmptyReportData());
      setActiveTab('daily');
      setGeneratedText(null);
    }
  }, [authLoading, initialized, user, router]);

  useEffect(() => {
    if (user && !formData.userName) {
      const nameFromMeta = user.user_metadata?.full_name as string | undefined;
      const suggestedUserName = nameFromMeta || user.email?.split('@')[0] || '';
      setFormData(prev => ({ ...prev, userName: suggestedUserName }));
    }
  }, [user, formData.userName]);

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

  const handleReportTypeChange = (type: string) => {
    setFormData(prevData => ({ ...prevData, reportType: type }));
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);

    if (key === 'weekly') {
      setFormData(prevData => ({
        ...prevData,
        reportType: 'weekly',
        date: prevData.date || new Date().toISOString() // Or keep current date logic
      }));
    } else {
      setFormData(prevData => ({
        ...prevData,
        reportType: prevData.reportType === 'weekly' ? 'morning' : prevData.reportType,
        date: prevData.date || ''
      }));
    }
    setGeneratedText(null);
  };

  const handleWeeklySubmit = (data: ReportData) => {
    setFormData({
      ...data,
      reportType: 'weekly',
      projects: data.projects.map(p => ({
        ...p,
        tasks: p.tasks.map(t => ({ ...t }))
      })),
      miscTasks: data.miscTasks.map(t => ({ ...t }))
    });
    setGeneratedText(null);
  };

  // AI 자동 생성 핸들러 (일일 보고서 기반)
  const handleWeeklyAIGenerate = async (weeklyData: string) => {
    setIsLoadingAI(true);
    setGeneratedText(null);

    try {
      const result = await generateWeeklyReportFromDaily(weeklyData, formData.userName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '');
      setGeneratedText(result);
      toast.success('AI 주간 보고서 생성 완료!');
    } catch (err) {
      console.error('AI 주간 보고서 생성 오류:', err);
      toast.error(err instanceof Error ? err.message : 'AI 주간 보고서 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleGenerateAIReport = async () => {
    if (!formData.userName || !formData.date) {
      toast.error('AI 보고서 생성을 위해 사용자 이름과 날짜를 입력해주세요.');
      return;
    }
    const hasContent = formData.projects.some(p => p.tasks.some(t => t.description)) || formData.miscTasks.some(t => t.description);
    if (!hasContent) {
      toast.error('AI 보고서 생성을 위해 내용을 입력해주세요.');
      return;
    }

    setIsLoadingAI(true);
    setGeneratedText(null);

    try {
      const result = await generateReport(formData);
      setGeneratedText(result);
      toast.success('AI 보고서 생성 완료!');
    } catch (err) {
      console.error('AI 보고서 생성 오류:', err);
      toast.error(err instanceof Error ? err.message : 'AI 보고서 생성 중 오류가 발생했습니다.');
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


  const handleSaveReport = async (editedContent?: string) => {
    if (!user) {
      toast.error('로그인이 필요합니다. 보고서를 저장할 수 없습니다.');
      return;
    }

    const reportContentToSave = editedContent || getTextForDailyDisplay();
    if (!reportContentToSave) {
      toast.error('저장할 보고서 내용이 없습니다.');
      return;
    }

    if (!formData.date) {
      toast.error('보고서 날짜를 입력해주세요.');
      return;
    }

    setIsSavingReport(true);
    try {
      const originalDateString = formData.date;
      // Note: input form now might return formatted date string, need to ensure YYYY-MM-DD
      const formattedDate = originalDateString.substring(0, 10);

      if (!formattedDate || formattedDate.length !== 10 || !/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
        toast.error('유효한 날짜 형식이 아닙니다.');
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

      if (dbError) throw dbError;

      toast.success('보고서가 성공적으로 저장되었습니다!');

      const reportTypeText = formData.reportType === 'morning' ? '출근' : '퇴근';
      sendBrowserNotification(
        '📝 보고서 저장 완료',
        `${reportTypeText} 보고서가 성공적으로 저장되었습니다!`,
        'report_completed'
      );

    } catch (caughtError: unknown) {
      console.error('보고서 저장 실패:', caughtError);
      toast.error(caughtError instanceof Error ? caughtError.message : '보고서 저장 실패');
    } finally {
      setIsSavingReport(false);
    }
  };

  if (!user) return null; // Or loading spinner handled by useAuth

  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <div className="flex justify-center">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="daily">일간 보고서</TabsTrigger>
              <TabsTrigger value="weekly">주간 보고서</TabsTrigger>
              <TabsTrigger value="monthly" disabled>월간 보고서</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="daily" className="space-y-6">
            {/* Report Type Toggle */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center rounded-lg border bg-muted p-1 text-muted-foreground">
                <button
                  onClick={() => handleReportTypeChange('morning')}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${formData.reportType === 'morning' ? 'bg-background text-foreground shadow-sm' : 'hover:bg-background/50 text-muted-foreground'}`}
                >
                  출근 보고서 (예정 업무)
                </button>
                <button
                  onClick={() => handleReportTypeChange('evening')}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${formData.reportType === 'evening' ? 'bg-background text-foreground shadow-sm' : 'hover:bg-background/50 text-muted-foreground'}`}
                >
                  퇴근 보고서 (진행 업무)
                </button>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                <InputForm onDataChange={handleDataChange} initialData={formData} />
              </div>
              <div className="space-y-6">
                <div className="sticky top-20 space-y-4">
                  <Button
                    size="lg"
                    className="w-full text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                    onClick={handleGenerateAIReport}
                    disabled={isAiButtonDisabled}
                  >
                    {isLoadingAI ? <span className="flex items-center gap-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> AI 생성 중...</span> : <span className="flex items-center gap-2"><Rocket className="h-5 w-5 fill-current" /> ✨ AI야 도와줘</span>}
                  </Button>

                  <ResultDisplay
                    isLoading={isLoadingAI}
                    textToDisplay={getTextForDailyDisplay()}
                  />

                  <Button
                    size="lg"
                    variant="secondary"
                    className="w-full text-lg"
                    onClick={() => handleSaveReport()}
                    disabled={!user || !getTextForDailyDisplay() || isSavingReport}
                  >
                    {isSavingReport ? '저장 중...' : <span className="flex items-center gap-2"><Save className="h-5 w-5" /> 보고서 저장</span>}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="weekly">
            <WeeklyReportForm
              onSubmit={handleWeeklySubmit}
              initialData={formData}
              onAIGenerate={handleWeeklyAIGenerate}
              isLoadingAI={isLoadingAI}
              generatedText={generatedText}
            />
          </TabsContent>

          <TabsContent value="monthly">
            <Card>
              <CardContent className="flex items-center justify-center p-12 text-muted-foreground">
                추후 지원 예정입니다.
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
