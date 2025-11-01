import { createClient } from '@/lib/supabase/client';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

export interface DailyReportTaskData {
  id?: string;
  description?: string;
}

export interface DailyReportProjectData {
  id?: string;
  name?: string;
  tasks?: DailyReportTaskData[];
}

export interface DailyReportMiscTaskData {
  id?: string;
  description?: string;
}

export interface DailyReport {
  id: string;
  report_date: string;
  report_type: string;
  user_name_snapshot: string;
  projects_data: DailyReportProjectData[];
  misc_tasks_data: DailyReportMiscTaskData[];
  report_content: string;
  created_at: string;
}

/**
 * 이번 주 월요일부터 오늘까지의 일일 보고서를 조회합니다.
 */
export async function getThisWeekDailyReports(userId: string): Promise<DailyReport[]> {
  const supabase = createClient();

  // 이번 주 월요일
  const startOfWeek = dayjs().startOf('isoWeek').format('YYYY-MM-DD');

  // 오늘 (금요일 또는 현재 날짜)
  const today = dayjs().format('YYYY-MM-DD');

  console.log('[getThisWeekDailyReports] 조회 기간:', { startOfWeek, today });

  const { data, error } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('user_id', userId)
    .gte('report_date', startOfWeek)
    .lte('report_date', today)
    .order('report_date', { ascending: true });

  if (error) {
    console.error('[getThisWeekDailyReports] 조회 오류:', error);
    throw new Error(`일일 보고서 조회 실패: ${error.message}`);
  }

  console.log('[getThisWeekDailyReports] 조회 결과:', data?.length, '건');
  return data || [];
}

/**
 * 최근 N개의 일일 보고서를 조회합니다.
 */
export async function getRecentDailyReports(userId: string, limit: number = 9): Promise<DailyReport[]> {
  const supabase = createClient();

  console.log('[getRecentDailyReports] 조회 시작, limit:', limit);

  const { data, error } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('user_id', userId)
    .order('report_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[getRecentDailyReports] 조회 오류:', error);
    throw new Error(`일일 보고서 조회 실패: ${error.message}`);
  }

  console.log('[getRecentDailyReports] 조회 결과:', data?.length, '건');
  return data || [];
}

/**
 * 일일 보고서 데이터를 주간 보고서 AI 프롬프트용 텍스트로 변환합니다.
 */
export function formatDailyReportsForAI(reports: DailyReport[]): string {
  if (reports.length === 0) {
    return '이번 주 작성된 일일 보고서가 없습니다.';
  }

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return reports.map(report => {
    const date = dayjs(report.report_date);
    const dayOfWeek = weekDays[date.day()];
    const formattedDate = date.format('YYYY-MM-DD');

    // 프로젝트별 업무 요약
    const projectsSummary = report.projects_data?.map(project => {
      const tasksList = project.tasks?.map(task => `  - ${task.description ?? '업무 내용 없음'}`).join('\n') || '';
      return `[${project.name ?? '프로젝트명 없음'}]\n${tasksList}`;
    }).join('\n\n') || '';

    // 기타 업무 요약
    const miscTasksSummary = report.misc_tasks_data?.map(task =>
      `  - ${task.description ?? '업무 내용 없음'}`
    ).join('\n') || '';

    return `## ${dayOfWeek}요일 (${formattedDate}) - ${report.report_type === 'morning' ? '출근' : '퇴근'} 보고서

${projectsSummary}

${miscTasksSummary ? `[기타 업무]\n${miscTasksSummary}` : ''}`;
  }).join('\n\n---\n\n');
}

/**
 * 일일 보고서 데이터를 UI 프리뷰용으로 포맷합니다.
 */
export function formatDailyReportsForPreview(reports: DailyReport[]): string {
  if (reports.length === 0) {
    return '이번 주 작성된 일일 보고서가 없습니다.';
  }

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return reports.map(report => {
    const date = dayjs(report.report_date);
    const dayOfWeek = weekDays[date.day()];
    const emoji = report.report_type === 'morning' ? '🌅' : '🌙';

    // 프로젝트명만 추출
    const projects = report.projects_data?.map(p => p.name).filter(Boolean).join(', ') || '없음';

    // 업무 개수
    const taskCount = (report.projects_data?.reduce((sum, p) => sum + (p.tasks?.length || 0), 0) || 0) +
                     (report.misc_tasks_data?.length || 0);

    return `${emoji} ${dayOfWeek}요일 (${date.format('MM/DD')}) - ${projects} 외 ${taskCount}개 업무`;
  }).join('\n');
}
