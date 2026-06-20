import { Project, TimelineItem, User, CustomFieldDefinition, TimelineReportItem } from './types';
import { appPath } from './config';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

export function setToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('auth_token');
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  skipAuth = false
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getToken();
  if (token && !skipAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_URL}${endpoint}`;
  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    throw new Error(
      'Cannot connect to API. Start PHP API: run scripts\\start-api.bat (or install XAMPP). ' +
      'Quick fix: set NEXT_PUBLIC_API_URL=https://dash-bot.net/project-management/api in frontend\\.env.local'
    );
  }

  if (res.status === 401) {
    clearToken();
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = appPath('/login/');
    }
    throw new Error('Session expired. Please login again.');
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return {} as T;
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}

// Auth
export async function login(username: string, password: string): Promise<{ token: string; user: User }> {
  const data = await request<{ token: string; user: User }>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ username, password }) },
    true
  );
  setToken(data.token);
  return data;
}

export async function getMe(): Promise<User> {
  const data = await request<{ user: User }>('/auth/me');
  return data.user;
}

// Projects
export async function getProjects(): Promise<Project[]> {
  const data = await request<{ projects: Project[] }>('/projects');
  return data.projects;
}

export async function createProject(
  projectId: string,
  title: string,
  endDate?: string
): Promise<Project> {
  const data = await request<{ project: Project }>('/projects', {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId, title, end_date: endDate || null }),
  });
  return data.project;
}

export async function getProject(id: number): Promise<Project> {
  const data = await request<{ project: Project }>(`/projects/${id}`);
  return data.project;
}

export async function updateProject(
  id: number,
  updates: Partial<{ title: string; end_date: string | null }>
): Promise<Project> {
  const data = await request<{ project: Project }>(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return data.project;
}

export async function deleteProject(id: number): Promise<void> {
  await request(`/projects/${id}`, { method: 'DELETE' });
}

export interface TimelineEmailNotifications {
  sent: number;
  failed: number;
  skipped: number;
  recipients: string[];
}

export interface CreateTimelineItemResult {
  item: TimelineItem;
  notifications?: TimelineEmailNotifications;
}
export async function getTimelineItems(
  projectId: number,
  type?: string
): Promise<TimelineItem[]> {
  const fetchAll = async () => {
    const data = await request<{ items: TimelineItem[] }>(
      `/timeline?project_id=${projectId}`
    );
    return data.items;
  };

  if (!type) {
    return fetchAll();
  }

  try {
    const data = await request<{ items: TimelineItem[] }>(
      `/timeline?project_id=${projectId}&type=${encodeURIComponent(type)}`
    );
    return data.items;
  } catch (err) {
    if (err instanceof Error && err.message === 'Invalid timeline type') {
      const items = await fetchAll();
      return items.filter((item) => item.timeline_type === type);
    }
    throw err;
  }
}

export async function getTimelineReport(): Promise<{
  items: TimelineReportItem[];
  generated_at: string;
  total: number;
}> {
  return request('/timeline/report');
}

export async function createTimelineItem(item: {
  project_id: number;
  timeline_type: string;
  title: string;
  description?: string;
  status?: string;
  start_date?: string;
  due_date?: string;
  sort_order?: number;
  custom_fields?: Record<string, string | number>;
}): Promise<CreateTimelineItemResult> {
  const title = item.title?.trim() ?? '';

  if (!item.project_id || item.project_id <= 0) {
    throw new Error('Project is required');
  }
  if (!item.timeline_type?.trim()) {
    throw new Error('Timeline type is required');
  }
  if (!title) {
    throw new Error('Assign to is required');
  }

  const data = await request<CreateTimelineItemResult>('/timeline', {
    method: 'POST',
    body: JSON.stringify({
      project_id: item.project_id,
      timeline_type: item.timeline_type,
      title,
      description: item.description?.trim() || '',
      status: item.status || 'pending',
      start_date: item.start_date,
      due_date: item.due_date,
      sort_order: item.sort_order ?? 0,
      custom_fields: item.custom_fields ?? {},
    }),
  });
  return data;
}

export async function updateTimelineItem(
  id: number,
  updates: Partial<{
    title: string;
    description: string;
    status: string;
    start_date: string;
    due_date: string;
    sort_order: number;
    custom_fields: Record<string, string | number>;
  }>
): Promise<{ item: TimelineItem; notifications?: { sent: number } }> {
  const data = await request<{ item: TimelineItem; notifications?: { sent: number } }>(`/timeline/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return data;
}

export async function deleteTimelineItem(id: number): Promise<void> {
  await request(`/timeline/${id}`, { method: 'DELETE' });
}

// Custom fields
export async function getCustomFields(timelineType?: string): Promise<CustomFieldDefinition[]> {
  const params = timelineType ? `?timeline_type=${timelineType}` : '';
  const data = await request<{ fields: CustomFieldDefinition[] }>(`/custom-fields${params}`);
  return data.fields;
}

// Export URLs (open in new tab with auth token as query - or use fetch blob)
export function getExportUrl(projectId: number, format: 'excel' | 'pdf'): string {
  const token = getToken();
  const base = `${API_URL}/export/${format}?project_id=${projectId}`;
  return token ? `${base}&token=${encodeURIComponent(token)}` : base;
}

export async function downloadExport(projectId: number, format: 'excel' | 'pdf'): Promise<void> {
  const token = getToken();
  const url = `${API_URL}/export/${format}?project_id=${projectId}`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Export failed');
  }

  const blob = await res.blob();
  const ext = format === 'excel' ? 'csv' : 'html';
  const filename = `timeline_export_${projectId}.${ext}`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
