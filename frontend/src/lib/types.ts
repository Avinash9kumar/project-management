export const TIMELINE_TYPES = [
  'programming',
  'launch',
  'qc',
  'tabs_syntax',
  'oe_coding',
  'tabs',
  'invite',
  'reminders',
  'project_end_date',
] as const;

export type TimelineType = (typeof TIMELINE_TYPES)[number];

export const TIMELINE_LABELS: Record<TimelineType, string> = {
  programming: 'Programming Timeline',
  launch: 'Launch Timeline',
  qc: 'QC Timeline',
  tabs_syntax: 'Tabs Syntax Timeline',
  oe_coding: 'OE Coding Timeline',
  tabs: 'Tabs Timeline',
  invite: 'Invite Timeline',
  reminders: 'Reminders Timeline',
  project_end_date: 'Project End Date',
};

/** Short labels for compact tab bar */
export const TIMELINE_TAB_LABELS: Record<TimelineType | 'gantt', string> = {
  gantt: 'Gantt',
  programming: 'Programming',
  launch: 'Launch',
  qc: 'QC',
  tabs_syntax: 'Tabs Syntax',
  oe_coding: 'OE Coding',
  tabs: 'Tabs',
  invite: 'Invite',
  reminders: 'Reminders',
  project_end_date: 'End Date',
};

export type ProjectStatus = 'pending' | 'in_progress' | 'completed';

export interface User {
  id: number;
  username: string;
}

export interface Project {
  id: number;
  project_id: string;
  title: string;
  end_date?: string | null;
  created_at?: string;
  updated_at?: string;
  timelines?: Record<TimelineType, { label: string; count: number }>;
}

export interface TimelineItem {
  id: number;
  project_id: number;
  timeline_type: TimelineType;
  title: string;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  sort_order: number;
  custom_fields?: Record<string, string | number>;
  created_at?: string;
  updated_at?: string;
}

export interface TimelineReportItem {
  id: number;
  project_id: number;
  project_code: string;
  project_title: string;
  timeline_type: TimelineType;
  title: string;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  custom_fields?: Record<string, string | number>;
  assign_to: string;
  remaining_seconds: number | null;
  progress_percent: number | null;
}

export interface CustomFieldDefinition {
  id: number;
  timeline_type: TimelineType;
  field_key: string;
  field_label: string;
  field_type: 'text' | 'number' | 'date' | 'select';
  options_json: string[] | null;
  sort_order: number;
}

export interface Assignee {
  id: number;
  value: string;
  sort_order: number;
  created_at?: string;
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  pending: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800',
};

export const GANTT_COLORS: Record<TimelineType, string> = {
  programming: '#3b82f6',
  launch: '#8b5cf6',
  qc: '#f59e0b',
  tabs_syntax: '#10b981',
  oe_coding: '#ef4444',
  tabs: '#06b6d4',
  invite: '#ec4899',
  reminders: '#f97316',
  project_end_date: '#dc2626',
};
