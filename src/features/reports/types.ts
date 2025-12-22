export type ReportType = 'morning' | 'evening' | 'weekly';

export interface TaskItem {
  id?: string;
  description?: string;
  collaborator?: string;
  followUp?: string;
}

export interface Project {
  id?: string;
  name: string;
  tasks: TaskItem[];
}

export interface ReportDraft {
  userName: string;
  date: string; // ISO `YYYY-MM-DD`
  projects: Project[];
  miscTasks: TaskItem[];
  reportType: ReportType;
}

