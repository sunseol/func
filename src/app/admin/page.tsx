'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import {
  Users,
  FileText,
  BarChart,
  Calendar,
  Search,
  Trash2,
  Eye,
  ShieldAlert,
  ShieldCheck,
  MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import ReportSummary from '@/app/components/ReportSummary';
import AdminAIAssistant from '@/app/components/AdminAIAssistant';

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

interface UserProfile {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    role?: string;
  };
  created_at: string;
  last_sign_in_at?: string;
}

interface AdminStats {
  totalUsers: number;
  totalReports: number;
  reportsToday: number;
  reportsThisWeek: number;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supabase] = useState(() => createClient());
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalReports: 0,
    reportsToday: 0,
    reportsThisWeek: 0
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('ai-summary');

  // Admin Check
  const isAdmin = user?.email === 'jakeseol99@keduall.com';

  const fetchData = useCallback(async () => {
    if (!user || !isAdmin) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch Reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('daily_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (reportsError) throw new Error(reportsError.message);

      setReports(reportsData || []);

      // Stats
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const reportsToday = reportsData?.filter((r: any) => r.report_date === today).length || 0;
      const reportsThisWeek = reportsData?.filter((r: any) => r.report_date >= weekAgo).length || 0;

      // 2. Fetch Users (Try table first, fallback to extraction)
      let profilesData = null;
      try {
        const result = await supabase
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false });
        profilesData = result.data;
      } catch (err) {
        console.log('user_profiles fallback');
      }

      if (profilesData) {
        setUsers(profilesData);
        setStats({
          totalUsers: profilesData.length,
          totalReports: reportsData?.length || 0,
          reportsToday,
          reportsThisWeek
        });
      } else {
        // Fallback: extract from reports + current user
        const uniqueUsers = new Map();
        reportsData?.forEach((report: any) => {
          if (!uniqueUsers.has(report.user_id)) {
            uniqueUsers.set(report.user_id, {
              id: report.user_id,
              email: 'Unknown',
              user_metadata: { full_name: report.user_name_snapshot, role: 'user' },
              created_at: report.created_at
            });
          }
        });
        if (user && !uniqueUsers.has(user.id)) {
          uniqueUsers.set(user.id, {
            id: user.id,
            email: user.email || 'Unknown',
            user_metadata: {
              full_name: user.user_metadata?.full_name || 'Unknown',
              role: user.email === 'jakeseol99@keduall.com' ? 'admin' : 'user'
            },
            created_at: user.created_at
          });
        }
        const extracted = Array.from(uniqueUsers.values()) as UserProfile[];
        setUsers(extracted);
        setStats({
          totalUsers: extracted.length,
          totalReports: reportsData?.length || 0,
          reportsToday,
          reportsThisWeek
        });
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || '데이터 로딩 실패');
      toast.error('데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, supabase]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (!authLoading && user && !isAdmin) {
      toast.error('관리자 권한이 필요합니다.');
      router.push('/');
      return;
    }
  }, [user, authLoading, isAdmin, router]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchData();
    }
  }, [user, isAdmin, fetchData]);

  const handleDeleteReport = async (reportId: string) => {
    try {
      const { error } = await supabase.from('daily_reports').delete().eq('id', reportId);
      if (error) throw error;
      setReports(prev => prev.filter(r => r.id !== reportId));
      toast.success('보고서가 삭제되었습니다.');
    } catch (err) {
      console.error(err);
      toast.error('삭제 실패');
    }
  };

  const handleUpdateUserRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
      await fetchData();
      toast.success(`사용자 권한이 ${role === 'admin' ? '관리자로' : '사용자로'} 변경되었습니다.`);
    } catch (err) {
      console.error(err);
      toast.error('권한 변경 실패');
    }
  };

  const filteredReports = reports.filter(report => {
    const matchTerm = report.report_content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.user_name_snapshot.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.report_date.includes(searchTerm);
    const matchType = filterType === 'all' || report.report_type === filterType;
    return matchTerm && matchType;
  });

  if (authLoading || (loading && !reports.length && !error)) {
    return <div className="flex h-screen items-center justify-center">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen bg-muted/40 p-4 md:p-8 pt-6">
      <div className="max-w-7xl mx-auto space-y-8">

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">관리자 대시보드</h2>
            <p className="text-muted-foreground">시스템 현황 및 보고서 관리</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchData}>새로고침</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 사용자</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 보고서</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReports}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">오늘 보고서</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.reportsToday}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">이번 주 보고서</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.reportsThisWeek}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="ai-summary" className="space-y-4" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="ai-summary">AI 분석</TabsTrigger>
            <TabsTrigger value="reports">보고서 관리</TabsTrigger>
            <TabsTrigger value="users">사용자 관리</TabsTrigger>
          </TabsList>

          <TabsContent value="ai-summary" className="space-y-4">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ReportSummary />
              </div>
              <div className="lg:col-span-1">
                <AdminAIAssistant className="h-[600px]" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>보고서 목록</CardTitle>
                <CardDescription>전체 사용자의 업무 보고서를 조회하고 관리합니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="검색어 입력..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <div className="w-full md:w-[200px]">
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger>
                        <SelectValue placeholder="유형 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="morning">출근</SelectItem>
                        <SelectItem value="evening">퇴근</SelectItem>
                        <SelectItem value="weekly">주간</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>날짜</TableHead>
                        <TableHead>사용자</TableHead>
                        <TableHead>유형</TableHead>
                        <TableHead className="w-[400px]">내용 요약</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            보고서가 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredReports.map((report) => (
                          <TableRow key={report.id}>
                            <TableCell>{report.report_date}</TableCell>
                            <TableCell className="font-medium">{report.user_name_snapshot}</TableCell>
                            <TableCell>
                              <Badge variant={report.report_type === 'morning' ? 'default' : report.report_type === 'evening' ? 'secondary' : 'outline'}>
                                {report.report_type === 'morning' ? '출근' : report.report_type === 'evening' ? '퇴근' : '주간'}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[400px] truncate text-muted-foreground">
                              {report.report_content}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => { setSelectedReport(report); setIsReportModalVisible(true); }}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteReport(report.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>사용자 목록</CardTitle>
                <CardDescription>시스템 사용자 및 권한 현황입니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>이름</TableHead>
                        <TableHead>이메일</TableHead>
                        <TableHead>권한</TableHead>
                        <TableHead>가입일</TableHead>
                        <TableHead className="text-right">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.user_metadata?.full_name || '-'}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>
                            {u.user_metadata?.role === 'admin' || u.email === 'jakeseol99@keduall.com' ? (
                              <Badge variant="destructive" className="gap-1">
                                <ShieldAlert className="h-3 w-3" /> 관리자
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1">
                                <ShieldCheck className="h-3 w-3" /> 사용자
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            {u.email !== 'jakeseol99@keduall.com' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>권한 설정</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleUpdateUserRole(u.id, 'admin')}>
                                    관리자로 변경
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUpdateUserRole(u.id, 'user')}>
                                    사용자로 변경
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Report Detail Modal */}
      <Dialog open={isReportModalVisible} onOpenChange={setIsReportModalVisible}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>보고서 상세</DialogTitle>
            <DialogDescription>
              {selectedReport?.report_date} - {selectedReport?.user_name_snapshot}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-4 text-sm">
              <div className="font-bold">유형: {selectedReport?.report_type}</div>
              <div className="text-muted-foreground">작성일: {selectedReport?.created_at && new Date(selectedReport.created_at).toLocaleString()}</div>
            </div>
            <div className="bg-muted p-4 rounded-md whitespace-pre-wrap leading-relaxed">
              {selectedReport?.report_content}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsReportModalVisible(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}