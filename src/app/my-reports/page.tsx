'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Edit,
  Copy,
  Trash2,
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  FileText,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';

interface DailyReport {
  id: string;
  user_id: string;
  report_date: string;
  report_type: string;
  user_name_snapshot: string;
  report_content: string;
  projects_data?: any;
  misc_tasks_data?: any;
  created_at: string;
}

export default function MyReportsPage() {
  const { user, loading: authLoading, initialized } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<DailyReport | null>(null);

  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [formData, setFormData] = useState({
    date: '',
    type: 'morning',
    content: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReports = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error: dbError } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('report_date', { ascending: false });
      if (dbError) throw dbError;
      setReports(data || []);
    } catch (err: unknown) {
      console.error('보고서 로딩 오류:', err);
      toast.error('보고서를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (initialized && !authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, initialized, router]);

  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [user, fetchReports]);

  const filteredReports = reports.filter(report => {
    const searchTermMatch = report.report_content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.report_date.includes(searchTerm);
    const typeMatch = filterType === 'all' || report.report_type === filterType;
    return searchTermMatch && typeMatch;
  });

  const handleDeleteReport = async () => {
    if (!user || !reportToDelete) return;
    try {
      const { error: deleteError } = await supabase
        .from('daily_reports')
        .delete()
        .eq('id', reportToDelete.id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setReports(prevReports => prevReports.filter(report => report.id !== reportToDelete.id));
      toast.success('보고서가 삭제되었습니다.');
      setDeleteConfirmOpen(false);
      setReportToDelete(null);
    } catch (err) {
      console.error('삭제 오류:', err);
      toast.error('보고서 삭제 실패');
    }
  };

  const handleOpenAdd = () => {
    setFormData({ date: new Date().toISOString().split('T')[0], type: 'morning', content: '' });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (report: DailyReport) => {
    setSelectedReport(report);
    setFormData({
      date: report.report_date,
      type: report.report_type,
      content: report.report_content
    });
    setIsEditModalOpen(true);
  };

  const handleOpenCopy = (report: DailyReport) => {
    setSelectedReport(report);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      type: report.report_type,
      content: report.report_content
    });
    setIsCopyModalOpen(true);
  };

  const handleSubmit = async (mode: 'add' | 'edit' | 'copy') => {
    if (!user) return;
    if (!formData.content.trim()) {
      toast.warning('내용을 입력해주세요.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (mode === 'edit' && selectedReport) {
        const { error } = await supabase
          .from('daily_reports')
          .update({ report_content: formData.content })
          .eq('id', selectedReport.id);
        if (error) throw error;
        toast.success('수정되었습니다.');
        setIsEditModalOpen(false);
      } else {
        // Add or Copy (Insert)
        const newReport = {
          user_id: user.id,
          report_date: formData.date,
          report_type: formData.type,
          user_name_snapshot: user.user_metadata?.full_name || '사용자',
          report_content: formData.content,
          projects_data: mode === 'copy' ? selectedReport?.projects_data : null,
          misc_tasks_data: mode === 'copy' ? selectedReport?.misc_tasks_data : null
        };
        const { error } = await supabase.from('daily_reports').insert([newReport]);
        if (error) throw error;
        toast.success(mode === 'add' ? '추가되었습니다.' : '복사되었습니다.');
        if (mode === 'add') setIsAddModalOpen(false);
        else setIsCopyModalOpen(false);
      }
      fetchReports();
    } catch (err) {
      console.error(err);
      toast.error('작업 실패');
    } finally {
      setIsSubmitting(false);
    }
  };

  if ((authLoading && !initialized) || (loading && !reports.length)) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" /> 내 보고서 목록
          </h1>
          <Button onClick={handleOpenAdd} className="gap-2">
            <Plus className="h-4 w-4" /> 수동 추가
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="검색..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue placeholder="유형 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 유형</SelectItem>
              <SelectItem value="morning">출근 보고서</SelectItem>
              <SelectItem value="evening">퇴근 보고서</SelectItem>
              <SelectItem value="weekly">주간 보고서</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {filteredReports.map((report) => (
            <Card key={report.id} className="transition-all hover:shadow-md">
              <CardHeader className="py-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {report.report_type === 'morning' ? <Sun className="h-4 w-4 text-orange-500" /> : report.report_type === 'evening' ? <Moon className="h-4 w-4 text-indigo-500" /> : <FileText className="h-4 w-4 text-green-500" />}
                      {format(new Date(report.report_date), 'yyyy년 MM월 dd일')}
                    </CardTitle>
                    <CardDescription>
                      {report.user_name_snapshot}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(report)} title="편집">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleOpenCopy(report)} title="복사">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setReportToDelete(report); setDeleteConfirmOpen(true); }} className="text-destructive hover:text-destructive" title="삭제">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-2 pb-4">
                <div className={expandedReportId === report.id ? "" : "line-clamp-3 text-muted-foreground"}>
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {report.report_content}
                  </pre>
                </div>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto mt-2"
                  onClick={() => setExpandedReportId(expandedReportId === report.id ? null : report.id)}
                >
                  {expandedReportId === report.id ? <span className="flex items-center">접기 <ChevronUp className="ml-1 h-3 w-3" /></span> : <span className="flex items-center">더보기 <ChevronDown className="ml-1 h-3 w-3" /></span>}
                </Button>
              </CardContent>
            </Card>
          ))}
          {filteredReports.length === 0 && (
            <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
              표시할 보고서가 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>보고서를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제된 보고서는 복구할 수 없습니다. 정말 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReport} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>새 보고서 추가</DialogTitle>
            <DialogDescription>과거 보고서를 수동으로 추가합니다.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>날짜</Label>
                <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>유형</Label>
                <Select value={formData.type} onValueChange={val => setFormData({ ...formData, type: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">출근 보고서</SelectItem>
                    <SelectItem value="evening">퇴근 보고서</SelectItem>
                    <SelectItem value="weekly">주간 보고서</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>내용</Label>
              <Textarea
                rows={10}
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                placeholder="보고서 내용을 입력하세요..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>취소</Button>
            <Button onClick={() => handleSubmit('add')} disabled={isSubmitting}>{isSubmitting ? '저장 중...' : '저장'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>보고서 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              rows={15}
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>취소</Button>
            <Button onClick={() => handleSubmit('edit')} disabled={isSubmitting}>{isSubmitting ? '저장 중...' : '저장'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Modal */}
      <Dialog open={isCopyModalOpen} onOpenChange={setIsCopyModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>보고서 복사</DialogTitle>
            <DialogDescription>내용을 기반으로 새 보고서를 작성합니다.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>새 날짜</Label>
                <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>유형</Label>
                <Select value={formData.type} onValueChange={val => setFormData({ ...formData, type: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">출근 보고서</SelectItem>
                    <SelectItem value="evening">퇴근 보고서</SelectItem>
                    <SelectItem value="weekly">주간 보고서</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>내용</Label>
              <Textarea
                rows={10}
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCopyModalOpen(false)}>취소</Button>
            <Button onClick={() => handleSubmit('copy')} disabled={isSubmitting}>{isSubmitting ? '복사 중...' : '복사'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}