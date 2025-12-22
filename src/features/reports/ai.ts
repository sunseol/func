import { groqChat } from '@/lib/groq/client';
import type { Project, ReportDraft, TaskItem } from '@/features/reports/types';

function parseIsoDate(dateStr: string): Date {
  const iso = dateStr.length >= 10 ? dateStr.slice(0, 10) : dateStr;
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function formatKoreanDate(dateStr: string): string {
  const date = parseIsoDate(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'long' }).format(date);
  return `${y}.${m}.${d}.${weekday}`;
}

function formatTasksForPrompt(projects: Project[], miscTasks: TaskItem[]): string {
  const lines: string[] = [];

  const normalizedProjects = projects
    .filter((project) => project.name?.trim())
    .map((project) => ({
      name: project.name.trim(),
      tasks: (project.tasks ?? []).filter((task) => task.description?.trim()),
    }))
    .filter((project) => project.tasks.length > 0);

  if (normalizedProjects.length > 0) {
    lines.push('프로젝트별 업무:');
    normalizedProjects.forEach((project, index) => {
      lines.push(`${index + 1}. ${project.name}`);
      project.tasks.forEach((task) => {
        const collaborator = task.collaborator?.trim();
        const followUp = task.followUp?.trim();
        lines.push(`- ${task.description?.trim()}${collaborator ? ` ${collaborator}` : ''}`);
        if (followUp) {
          lines.push(`  => ${followUp}`);
        }
      });
      lines.push('');
    });
  }

  const normalizedMisc = (miscTasks ?? []).filter((task) => task.description?.trim());
  if (normalizedMisc.length > 0) {
    lines.push('기타 업무:');
    normalizedMisc.forEach((task) => {
      const collaborator = task.collaborator?.trim();
      const followUp = task.followUp?.trim();
      lines.push(`- ${task.description?.trim()}${collaborator ? ` ${collaborator}` : ''}`);
      if (followUp) {
        lines.push(`  => ${followUp}`);
      }
    });
  }

  return lines.join('\n').trim();
}

function getWeekOfMonth(date: Date): number {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDow = (firstOfMonth.getDay() + 6) % 7; // Monday=0
  return Math.ceil((date.getDate() + firstDow) / 7);
}

function getWeekRangeMondayToFriday(date: Date): { monday: Date; friday: Date } {
  const dayOfWeek = (date.getDay() + 6) % 7; // Monday=0
  const monday = new Date(date);
  monday.setDate(date.getDate() - dayOfWeek);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return { monday, friday };
}

function formatWeekTitle(dateStr: string): { title: string; subtitle: string; bodyDate: string } {
  const date = parseIsoDate(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const week = getWeekOfMonth(date);

  const { monday, friday } = getWeekRangeMondayToFriday(date);
  const mm = (d: Date) => d.getMonth() + 1;
  const dd = (d: Date) => d.getDate();

  const range =
    mm(monday) !== mm(friday)
      ? `${year}년 ${mm(monday)}월 ${dd(monday)}일 ~ ${mm(friday)}월 ${dd(friday)}일`
      : `${year}년 ${month}월 ${dd(monday)}일 ~ ${dd(friday)}일`;

  return {
    title: `주간계획서(${year}년 ${month}월 ${week}주차)`,
    subtitle: `${month}월 ${week}주차 업무목표`,
    bodyDate: `${month}월 ${week}주차 (${range})`,
  };
}

export function formatDefaultReport(draft: ReportDraft): string {
  if (draft.reportType === 'weekly') {
    const { title, subtitle, bodyDate } = formatWeekTitle(draft.date);
    const details = formatTasksForPrompt(draft.projects, draft.miscTasks);
    return `${title}_${draft.userName}\n\n${subtitle}\n\n${bodyDate}\n${details}\n`;
  }

  const sectionTitle = draft.reportType === 'morning' ? '[금일 예정 업무]' : '[금일 진행 업무]';
  const details = formatTasksForPrompt(draft.projects, draft.miscTasks);
  return `업무보고_ ${draft.userName}\n${formatKoreanDate(draft.date)}\n--------------------------------\n${sectionTitle}\n\n${details}\n`;
}

export async function generateReport(draft: ReportDraft): Promise<string> {
  const content = formatTasksForPrompt(draft.projects, draft.miscTasks);
  if (!draft.userName || !draft.date || !content) {
    return formatDefaultReport(draft);
  }

  if (draft.reportType === 'weekly') {
    const { title, subtitle, bodyDate } = formatWeekTitle(draft.date);
    const system = [
      '너는 주간 업무 계획서를 작성하는 전문가다.',
      '사용자가 제공한 일일 보고 내용을 바탕으로, 한국어로 구조화된 주간 계획서를 작성하라.',
      '불필요한 수식/군더더기 없이, 그대로 복사해 사용할 수 있는 텍스트만 출력하라.',
    ].join('\n');

    const user = [
      `출력 형식(반드시 준수):`,
      `${title}_${draft.userName}`,
      '',
      subtitle,
      '',
      bodyDate,
      '',
      '입력 데이터:',
      content,
    ].join('\n');

    return groqChat(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { model: 'meta-llama/llama-4-scout-17b-16e-instruct', temperature: 0.3, maxTokens: 2500 },
    );
  }

  const system = [
    '너는 FunCommute 업무 보고서 작성 전문가다.',
    '입력된 업무 항목을 바탕으로 한국어 일일 업무 보고서를 작성하라.',
    '불필요한 메타 설명 없이, 보고서 텍스트만 출력하라.',
  ].join('\n');

  const sectionTitle = draft.reportType === 'morning' ? '출근 보고서(금일 예정 업무)' : '퇴근 보고서(금일 진행 업무)';
  const user = [
    `이름: ${draft.userName}`,
    `날짜: ${draft.date}`,
    `보고서 유형: ${sectionTitle}`,
    '',
    '입력 데이터:',
    content,
  ].join('\n');

  return groqChat(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { model: 'meta-llama/llama-4-scout-17b-16e-instruct', temperature: 0.4, maxTokens: 1400 },
  );
}

export async function generateWeeklyReportFromDaily(dailyReportsText: string, userName: string): Promise<string> {
  const system = [
    '너는 주간 업무 보고서를 작성하는 전문가다.',
    '사용자가 제공한 한 주치 일일 보고서를 요약/재구성해 주간 보고서를 작성하라.',
    '한국어로, 그대로 복사해 사용할 수 있는 텍스트만 출력하라.',
  ].join('\n');

  const user = [
    `작성자: ${userName}`,
    '',
    '입력(일일 보고 모음):',
    dailyReportsText,
  ].join('\n');

  return groqChat(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { model: 'meta-llama/llama-4-scout-17b-16e-instruct', temperature: 0.3, maxTokens: 2500 },
  );
}

