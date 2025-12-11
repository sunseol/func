'use client';

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray, Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, startOfWeek, isSameWeek, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Bot, Edit, ArrowLeft, Plus, Trash2, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

import { Project, TaskItem, ReportData } from '../api/grop';
import { useAuth } from '@/contexts/AuthContext';
import { getRecentDailyReports, formatDailyReportsForAI, DailyReport } from '@/lib/weekly-report-utils';
import ResultDisplay from './ResultDisplay';

// Zod Schema (Matches InputForm for consistency)
const taskSchema = z.object({
  description: z.string().min(1, '업무 내용을 입력해주세요.'),
  collaborator: z.string().optional(),
  status: z.string().default('진행 중'),
});

const projectSchema = z.object({
  name: z.string().min(1, '프로젝트명을 입력해주세요.'),
  tasks: z.array(taskSchema),
});

const weeklyReportSchema = z.object({
  userName: z.string().min(1, '이름을 입력해주세요.'),
  projects: z.array(projectSchema),
  miscTasks: z.array(taskSchema),
});

type WeeklyFormValues = z.infer<typeof weeklyReportSchema>;

interface WeeklyReportFormProps {
  onSubmit: (data: ReportData) => void;
  initialData: ReportData;
  onAIGenerate?: (weeklyData: string) => void;
  isLoadingAI?: boolean;
  generatedText?: string | null;
}

type WriteMode = 'selection' | 'manual' | 'ai';

export function WeeklyReportForm({
  onSubmit,
  initialData,
  onAIGenerate,
  isLoadingAI = false,
  generatedText = null
}: WeeklyReportFormProps) {
  const { user } = useAuth();
  const [writeMode, setWriteMode] = useState<WriteMode>('selection');
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [weeklyReports, setWeeklyReports] = useState<DailyReport[]>([]);
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [previewReport, setPreviewReport] = useState<DailyReport | null>(null);

  const form = useForm<WeeklyFormValues>({
    resolver: zodResolver(weeklyReportSchema),
    defaultValues: {
      userName: initialData.userName || '',
      projects: initialData.projects && initialData.projects.length > 0
        ? initialData.projects
        : [{ name: '', tasks: [{ description: '', collaborator: '', status: '진행 중' }] }],
      miscTasks: initialData.miscTasks && initialData.miscTasks.length > 0
        ? initialData.miscTasks
        : [{ description: '', collaborator: '', status: '진행 중' }],
    },
  });

  const { fields: projectFields, append: appendProject, remove: removeProject } = useFieldArray({
    control: form.control,
    name: 'projects',
  });

  const { fields: miscTaskFields, append: appendMiscTask, remove: removeMiscTask } = useFieldArray({
    control: form.control,
    name: 'miscTasks',
  });

  // Sync initialData
  useEffect(() => {
    // Logic similar to InputForm reset
    if (initialData.userName !== form.getValues('userName')) {
      form.setValue('userName', initialData.userName);
    }
  }, [initialData.userName, form]);

  const handleManualSubmit = (values: WeeklyFormValues) => {
    const reportData: ReportData = {
      ...values,
      date: new Date().toISOString(),
      reportType: 'weekly',
    };
    onSubmit(reportData);
    toast.success('주간 보고서 제출 완료');
  };

  const handleAIMode = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    setIsLoadingReports(true);
    try {
      const reports = await getRecentDailyReports(user.id, 14); // Fetch 2 weeks roughly
      setWeeklyReports(reports);

      const today = new Date();
      // Auto select current week
      const currentWeekIds = reports
        .filter(report => isSameWeek(parseISO(report.report_date), today, { locale: ko }))
        .map(r => r.id);

      setSelectedReportIds(currentWeekIds.length > 0 ? currentWeekIds : reports.map(r => r.id));
      setWriteMode('ai');
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('일일 보고서 불러오기 실패');
    } finally {
      setIsLoadingReports(false);
    }
  };

  const selectAllReports = () => setSelectedReportIds(weeklyReports.map(r => r.id));
  const clearSelection = () => setSelectedReportIds([]);
  const selectCurrentWeekReports = () => {
    const today = new Date();
    const currentWeekIds = weeklyReports
      .filter(report => isSameWeek(parseISO(report.report_date), today, { locale: ko }))
      .map(r => r.id);
    setSelectedReportIds(currentWeekIds);
  };

  const handleConfirmAIGenerate = () => {
    const selectedReports = weeklyReports.filter(r => selectedReportIds.includes(r.id));
    if (selectedReports.length === 0) {
      toast.warning('보고서를 최소 1개 이상 선택해주세요.');
      return;
    }
    if (onAIGenerate) {
      const aiPromptData = formatDailyReportsForAI(selectedReports);
      onAIGenerate(aiPromptData);
    }
  };

  if (writeMode === 'selection') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>주간 보고서 작성 방식 선택</CardTitle>
            <CardDescription>원하는 방식을 선택하여 주간 보고서를 작성하세요.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <Card
              className="cursor-pointer hover:border-primary hover:bg-muted/50 transition-all group"
              onClick={handleAIMode}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 group-hover:text-primary transition-colors">
                  <Bot className="h-5 w-5" /> AI 자동 생성
                </CardTitle>
                <CardDescription>
                  이번 주 일일 보고서를 기반으로 AI가 자동으로 분석하여 작성합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" className="w-full" disabled={isLoadingReports}>
                  {isLoadingReports ? '로딩 중...' : '자동 생성 시작'}
                </Button>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:border-primary hover:bg-muted/50 transition-all group"
              onClick={() => setWriteMode('manual')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 group-hover:text-primary transition-colors">
                  <Edit className="h-5 w-5" /> 수동 작성
                </CardTitle>
                <CardDescription>
                  직접 프로젝트와 업무 내용을 입력하여 작성합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" className="w-full">
                  직접 작성 시작
                </Button>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (writeMode === 'ai') {
    const isAllSelected = weeklyReports.length > 0 && selectedReportIds.length === weeklyReports.length;

    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setWriteMode('selection')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> 뒤로가기
        </Button>

        {weeklyReports.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>데이터 없음</AlertTitle>
            <AlertDescription>작성된 일일 보고서가 없습니다. 먼저 일일 보고서를 작성해주세요.</AlertDescription>
          </Alert>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>일일 보고서 선택 ({weeklyReports.length}건)</CardTitle>
              <CardDescription>AI 분석에 사용할 보고서를 선택하세요.</CardDescription>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={selectAllReports} className="h-8">전체 선택</Button>
                <Button variant="outline" size="sm" onClick={selectCurrentWeekReports} className="h-8">이번 주만</Button>
                <Button variant="outline" size="sm" onClick={clearSelection} className="h-8">선택 해제</Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4 border rounded-md p-2">
                <div className="space-y-2">
                  {weeklyReports.map(report => {
                    const date = parseISO(report.report_date);
                    const dateStr = format(date, 'MM/dd (eee)', { locale: ko });
                    const isSelected = selectedReportIds.includes(report.id);

                    return (
                      <div
                        key={report.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border transition-colors hover:bg-muted",
                          isSelected ? "bg-muted/60 border-primary/40" : "bg-card"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedReportIds([...selectedReportIds, report.id]);
                            else setSelectedReportIds(selectedReportIds.filter(id => id !== report.id));
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm">
                              {report.report_type === 'morning' ? '🌅' : '🌙'} {dateStr}
                            </span>
                            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setPreviewReport(report)}>
                              내용 보기
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            Projects: {report.projects_data?.map(p => p.name).join(', ') || '없음'}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>

              <div className="mt-6 space-y-4">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleConfirmAIGenerate}
                  disabled={selectedReportIds.length === 0 || isLoadingAI}
                >
                  {isLoadingAI ? <span className="flex items-center gap-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> AI 생성 중...</span> : `선택한 ${selectedReportIds.length}건으로 AI 보고서 생성`}
                </Button>

                {generatedText && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">AI 생성 결과</h4>
                    <ResultDisplay isLoading={isLoadingAI} textToDisplay={generatedText} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preview Dialog */}
        <Dialog open={!!previewReport} onOpenChange={(open) => !open && setPreviewReport(null)}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {previewReport && format(parseISO(previewReport.report_date), 'yyyy년 MM월 dd일 (eeee)', { locale: ko })} 상세
              </DialogTitle>
            </DialogHeader>
            {previewReport && (
              <div className="space-y-4 text-sm">
                {previewReport.projects_data?.map((p, i) => (
                  <div key={i}>
                    <h5 className="font-semibold">{p.name}</h5>
                    <ul className="list-disc list-inside text-muted-foreground">
                      {p.tasks.map((t, ti) => <li key={ti}>{t.description}</li>)}
                    </ul>
                  </div>
                ))}
                {previewReport.misc_tasks_data?.length > 0 && (
                  <div>
                    <h5 className="font-semibold">기타 업무</h5>
                    <ul className="list-disc list-inside text-muted-foreground">
                      {previewReport.misc_tasks_data.map((t, i) => <li key={i}>{t.description}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Manual Mode
  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => setWriteMode('selection')} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> 뒤로가기
      </Button>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleManualSubmit)} className="space-y-8">
          <Card>
            <CardHeader><CardTitle>기본 정보</CardTitle></CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="userName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이름</FormLabel>
                    <FormControl><Input placeholder="이름" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>프로젝트별 업무</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => appendProject({ name: '', tasks: [{ description: '', collaborator: '', status: '진행 중' }] })}>
                <Plus className="mr-2 h-4 w-4" /> 프로젝트 추가
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {projectFields.map((field, index) => (
                <WeeklyProjectItem
                  key={field.id}
                  index={index}
                  control={form.control}
                  remove={removeProject}
                />
              ))}
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full">제출하기</Button>
        </form>
      </Form>
    </div>
  );
}

// Helper for nested field array in manual mode
function WeeklyProjectItem({ index, control, remove }: { index: number, control: Control<WeeklyFormValues>, remove: (index: number) => void }) {
  const { fields, append, remove: removeTask } = useFieldArray({
    control,
    name: `projects.${index}.tasks`
  });

  return (
    <Card className="border-secondary/50">
      <CardHeader className="p-4 flex flex-row items-center justify-between">
        <div className="flex-1 mr-4">
          <FormField
            control={control}
            name={`projects.${index}.name`}
            render={({ field }) => (
              <FormItem>
                <FormControl><Input placeholder="프로젝트명" className="font-semibold" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {fields.map((taskField, taskIndex) => (
          <div key={taskField.id} className="flex gap-2 items-start">
            <FormField
              control={control}
              name={`projects.${index}.tasks.${taskIndex}.description`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl><Input placeholder="업무 내용" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => removeTask(taskIndex)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" className="w-full border border-dashed" onClick={() => append({ description: '', collaborator: '', status: '진행 중' })}>
          <Plus className="mr-2 h-3 w-3" /> 업무 추가
        </Button>
      </CardContent>
    </Card>
  )
}
