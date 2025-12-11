'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  User,
  Calendar as CalendarIcon,
  BarChart,
  Bot,
  Search
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from 'next-themes';
import { format, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface DailyReport {
  id: string;
  user_id: string;
  report_date: string;
  report_type: string;
  user_name_snapshot: string;
  report_content: string;
  projects_data?: unknown;
  misc_tasks_data?: unknown;
  created_at: string;
}

interface SummaryData {
  totalReports: number;
  userCount: number;
  reportsByType: Record<string, number>;
  reportsByUser: Record<string, number>;
  keyInsights: string[];
  aiSummary: string;
}

interface ReportSummaryProps {
  onSummaryGenerated?: (summary: SummaryData) => void;
}

export default function ReportSummary({ onSummaryGenerated }: ReportSummaryProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);

  // Filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [reportType, setReportType] = useState<string>('all');
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string, name: string }>>([]);
  const [supabase] = useState(() => createClient());

  // Load users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data: reportsData } = await supabase
          .from('daily_reports')
          .select('user_id, user_name_snapshot')
          .order('created_at', { ascending: false });

        if (reportsData) {
          const uniqueUsers = new Map();
          reportsData.forEach(report => {
            if (!uniqueUsers.has(report.user_id)) {
              uniqueUsers.set(report.user_id, {
                id: report.user_id,
                name: report.user_name_snapshot
              });
            }
          });
          setAvailableUsers(Array.from(uniqueUsers.values()));
        }
      } catch (error) {
        console.error('사용자 목록 로드 실패:', error);
      }
    };

    fetchUsers();
  }, [supabase]);

  // Reset summary on filter change
  useEffect(() => {
    if (summaryData) {
      setSummaryData(null);
    }
  }, [dateRange, selectedUser, reportType]);

  const fetchReports = async () => {
    setLoading(true);
    setSummaryData(null);

    try {
      let query = supabase
        .from('daily_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (dateRange?.from) {
        const fromStr = format(dateRange.from, 'yyyy-MM-dd');
        query = query.gte('report_date', fromStr);
      }
      if (dateRange?.to) {
        const toStr = format(dateRange.to, 'yyyy-MM-dd');
        query = query.lte('report_date', toStr);
      }

      if (selectedUser !== 'all') {
        query = query.eq('user_id', selectedUser);
      }

      if (reportType !== 'all') {
        query = query.eq('report_type', reportType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('보고서 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    if (reports.length === 0) return;

    setLoading(true);
    try {
      // Basic stats
      const totalReports = reports.length;
      const uniqueUsers = new Set(reports.map(r => r.user_id));
      const userCount = uniqueUsers.size;

      const reportsByType = reports.reduce((acc, report) => {
        acc[report.report_type] = (acc[report.report_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const reportsByUser = reports.reduce((acc, report) => {
        const userName = report.user_name_snapshot;
        acc[userName] = (acc[userName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const keyInsights = generateKeyInsights(reports, reportsByType, reportsByUser);
      const aiSummary = await generateAISummary(reports);

      const summary: SummaryData = {
        totalReports,
        userCount,
        reportsByType,
        reportsByUser,
        keyInsights,
        aiSummary
      };

      setSummaryData(summary);
      onSummaryGenerated?.(summary);
    } catch (error) {
      console.error('요약 생성 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateKeyInsights = (
    reports: DailyReport[],
    reportsByType: Record<string, number>,
    reportsByUser: Record<string, number>
  ): string[] => {
    const insights: string[] = [];

    const mostActiveUser = Object.entries(reportsByUser)
      .sort(([, a], [, b]) => b - a)[0];
    if (mostActiveUser) {
      insights.push(`가장 활발한 사용자: ${mostActiveUser[0]} (${mostActiveUser[1]}개 보고서)`);
    }

    const typeNames: Record<string, string> = {
      morning: '출근 보고서',
      evening: '퇴근 보고서',
      weekly: '주간 보고서'
    };
    const mostCommonType = Object.entries(reportsByType)
      .sort(([, a], [, b]) => b - a)[0];
    if (mostCommonType) {
      insights.push(`가장 많은 보고서 유형: ${typeNames[mostCommonType[0]] || mostCommonType[0]} (${mostCommonType[1]}개)`);
    }

    const recentReports = reports.filter(r => {
      const reportDate = new Date(r.report_date);
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      return reportDate >= threeDaysAgo;
    });
    insights.push(`최근 3일간 ${recentReports.length}개의 보고서가 작성되었습니다`);

    return insights;
  };

  const generateAISummary = async (reports: DailyReport[]): Promise<string> => {
    try {
      const sampleReports = reports.slice(0, 10).map(r => ({
        date: r.report_date,
        type: r.report_type,
        user: r.user_name_snapshot,
        content: r.report_content.substring(0, 200)
      }));

      const prompt = `
다음은 업무 보고서 데이터입니다. 이를 바탕으로 간결하고 유용한 요약을 한국어로 작성해주세요:

보고서 수: ${reports.length}개
기간: ${reports[reports.length - 1]?.report_date} ~ ${reports[0]?.report_date}

샘플 보고서:
${sampleReports.map(r => `- ${r.date} (${r.type}): ${r.user} - ${r.content}`).join('\n')}

다음 관점에서 요약해주세요:
1. 전반적인 업무 동향
2. 주요 프로젝트나 업무 패턴
3. 팀의 생산성 및 협업 상황
4. 개선점이나 주목할 점

요약은 3-4문단으로 작성해주세요.
      `;

      const response = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error('AI 요약 생성 실패');
      }

      const data = await response.json();
      return data.content || '요약을 생성할 수 없습니다.';
    } catch (error) {
      console.error('AI 요약 생성 오류:', error);
      return '현재 AI 요약 기능을 사용할 수 없습니다. 수동으로 보고서를 검토해주세요.';
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart className="h-5 w-5" />
          <CardTitle>보고서 요약 분석</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <span className="text-sm font-medium">기간 선택</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>날짜 선택</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">사용자 선택</span>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="사용자 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 사용자</SelectItem>
                {availableUsers.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">보고서 유형</span>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue placeholder="유형 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 유형</SelectItem>
                <SelectItem value="morning">출근 보고서</SelectItem>
                <SelectItem value="evening">퇴근 보고서</SelectItem>
                <SelectItem value="weekly">주간 보고서</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={fetchReports} disabled={loading} className="gap-2">
            <Search className="h-4 w-4" /> 보고서 조회
          </Button>
          <Button
            onClick={generateSummary}
            className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
            disabled={loading || reports.length === 0}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
            AI 요약 생성
          </Button>
        </div>

        {/* Stats */}
        {summaryData && (
          <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-muted/50">
                <CardContent className="p-6 flex flex-col items-center">
                  <FileText className="h-8 w-8 mb-2 text-primary" />
                  <div className="text-2xl font-bold">{summaryData.totalReports}</div>
                  <div className="text-xs text-muted-foreground">총 보고서</div>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="p-6 flex flex-col items-center">
                  <User className="h-8 w-8 mb-2 text-primary" />
                  <div className="text-2xl font-bold">{summaryData.userCount}</div>
                  <div className="text-xs text-muted-foreground">참여 사용자</div>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="p-6 flex flex-col items-center">
                  <CalendarIcon className="h-8 w-8 mb-2 text-primary" />
                  <div className="text-sm font-bold text-center">
                    {reports.length > 0 ? `${format(new Date(reports[reports.length - 1].report_date), 'MM/dd')} ~ ${format(new Date(reports[0].report_date), 'MM/dd')}` : '-'}
                  </div>
                  <div className="text-xs text-muted-foreground">기간</div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" /> AI 분석 결과
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">📈 주요 인사이트</h4>
                  <div className="flex flex-wrap gap-2">
                    {summaryData.keyInsights.map((insight, i) => (
                      <Badge key={i} variant="secondary">{insight}</Badge>
                    ))}
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-2">🧠 AI 종합 분석</h4>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    {summaryData.aiSummary}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold mb-2">보고서 유형별 분포</h4>
                <div className="space-y-2">
                  {Object.entries(summaryData.reportsByType).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-sm border p-2 rounded bg-card">
                      <span>{type === 'morning' ? '출근' : type === 'evening' ? '퇴근' : '주간'}</span>
                      <span className="font-bold">{count}개</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">사용자별 작성 현황</h4>
                <div className="space-y-2">
                  {Object.entries(summaryData.reportsByUser)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([user, count]) => (
                      <div key={user} className="flex justify-between text-sm border p-2 rounded bg-card">
                        <span>{user}</span>
                        <span className="font-bold">{count}개</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  );
}