'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getEmployeeReport } from '@/lib/api';
import { useIdleRefresh } from '@/lib/useIdleRefresh';
import {
  TimelineReportItem,
  TimelineItem,
  TIMELINE_TAB_LABELS,
  STATUS_LABELS,
  TimelineType,
  ProjectStatus,
} from '@/lib/types';
import {
  formatTimelineRange,
  formatTimeRemaining,
  remainingUrgencyClass,
  getAssignCcList,
  joinAssignTo,
} from '@/lib/timeline-utils';
import { DEFAULT_REPORT_STATUS_FILTER } from '@/components/ReportFilters';
import AuthGuard from '@/components/AuthGuard';
import { NotificationBell } from '@/components/AppNotifications';
import { useAuth } from '@/context/AuthContext';

type ViewStatusFilter = 'all' | 'in_progress' | 'hold' | 'overdue' | 'completed';

const STATUS_FILTERS: { id: ViewStatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'hold', label: 'Hold' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'completed', label: 'Completed' },
];

function isReportItemOverdue(item: TimelineReportItem): boolean {
  return (
    item.status !== 'completed' &&
    item.status !== 'hold' &&
    item.remaining_seconds !== null &&
    item.remaining_seconds < 0
  );
}

function isReportInProgressStatus(status: ProjectStatus): boolean {
  return status === 'pending' || status === 'in_progress';
}

function reportStatusLabel(status: ProjectStatus | string): string {
  if (status === 'pending') return STATUS_LABELS.in_progress;
  if (status in STATUS_LABELS) return STATUS_LABELS[status as ProjectStatus];
  return status ? String(status) : '—';
}

function matchesStatusFilter(item: TimelineReportItem, filter: ViewStatusFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'in_progress':
      return isReportInProgressStatus(item.status);
    case 'hold':
      return item.status === 'hold';
    case 'completed':
      return item.status === 'completed';
    case 'overdue':
      return isReportItemOverdue(item);
    default:
      return true;
  }
}

function statusBadgeClass(status: ProjectStatus) {
  switch (status) {
    case 'completed':
      return 'badge-completed';
    case 'hold':
      return 'badge-hold';
    case 'in_progress':
      return 'badge-progress';
    default:
      return 'badge-pending';
  }
}

function displayName(email: string): string {
  if (!email.includes('@')) return email;
  return email.split('@')[0];
}

function ViewRow({ item, rank }: { item: TimelineReportItem; rank: number }) {
  const remainingMs =
    item.remaining_seconds !== null ? item.remaining_seconds * 1000 : null;
  const tabLabel =
    TIMELINE_TAB_LABELS[item.timeline_type as TimelineType] || item.timeline_type;
  const ccAssign = joinAssignTo(getAssignCcList(item));

  return (
    <tr>
      <td className="table-cell w-10 text-center font-bold text-slate-400">{rank}</td>
      <td className="table-cell">
        <span
          className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${remainingUrgencyClass(remainingMs, item.status)}`}
        >
          {formatTimeRemaining(remainingMs, item.status)}
        </span>
        {item.progress_percent !== null && item.status !== 'completed' && (
          <p className="mt-1 text-[10px] text-slate-400">{item.progress_percent}% elapsed</p>
        )}
      </td>
      <td className="table-cell">
        <p className="font-semibold text-slate-900">{item.project_title}</p>
        <p className="font-mono text-xs text-slate-500">{item.project_code}</p>
      </td>
      <td className="table-cell">
        <span className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
          {tabLabel}
        </span>
      </td>
      <td className="table-cell text-sm text-slate-600">{ccAssign || '—'}</td>
      <td className="table-cell min-w-[7.25rem] whitespace-nowrap">
        <span className={`${statusBadgeClass(item.status)} whitespace-nowrap`}>
          {reportStatusLabel(item.status)}
        </span>
      </td>
      <td className="table-cell text-xs text-slate-500">
        {formatTimelineRange({ ...item, sort_order: 0 } as TimelineItem)}
      </td>
      <td className="table-cell max-w-[220px] text-sm text-slate-600">
        <p className="line-clamp-2">{item.description?.trim() || '—'}</p>
      </td>
    </tr>
  );
}

function ViewCard({ item, rank }: { item: TimelineReportItem; rank: number }) {
  const remainingMs =
    item.remaining_seconds !== null ? item.remaining_seconds * 1000 : null;
  const tabLabel =
    TIMELINE_TAB_LABELS[item.timeline_type as TimelineType] || item.timeline_type;
  const ccAssign = joinAssignTo(getAssignCcList(item));

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
          {rank}
        </span>
        <span
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${remainingUrgencyClass(remainingMs, item.status)}`}
        >
          {formatTimeRemaining(remainingMs, item.status)}
        </span>
        <span className={`${statusBadgeClass(item.status)} whitespace-nowrap`}>
          {reportStatusLabel(item.status)}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        <div>
          <p className="font-semibold text-slate-900">{item.project_title}</p>
          <p className="text-xs text-slate-500">
            {item.project_code} · {tabLabel}
          </p>
        </div>
        {ccAssign && (
          <p className="text-sm text-slate-700">
            <span className="text-slate-400">CC:</span> {ccAssign}
          </p>
        )}
        <p className="text-xs text-slate-400">
          {formatTimelineRange({ ...item, sort_order: 0 } as TimelineItem)}
        </p>
        {item.description?.trim() && (
          <p className="text-sm text-slate-600">{item.description}</p>
        )}
      </div>
    </div>
  );
}

function EmployeeViewContent() {
  const searchParams = useSearchParams();
  useIdleRefresh();
  const { user, logout } = useAuth();
  const token = searchParams.get('token')?.trim() || '';

  const [items, setItems] = useState<TimelineReportItem[]>([]);
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<ViewStatusFilter>(DEFAULT_REPORT_STATUS_FILTER);

  const loadReport = useCallback(async () => {
    if (!token) {
      setError('Missing link token. Use the personal link shared with you.');
      setLoading(false);
      return;
    }

    try {
      setError('');
      const data = await getEmployeeReport(token);
      setItems(data.items);
      setEmployeeEmail(data.employee_email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your tasks');
      setItems([]);
      setEmployeeEmail('');
    }
  }, [token]);

  useEffect(() => {
    loadReport().finally(() => setLoading(false));
  }, [loadReport]);

  const filterCounts = useMemo(() => {
    const counts: Record<ViewStatusFilter, number> = {
      all: items.length,
      in_progress: 0,
      hold: 0,
      overdue: 0,
      completed: 0,
    };

    for (const item of items) {
      if (isReportInProgressStatus(item.status)) counts.in_progress++;
      if (item.status === 'hold') counts.hold++;
      if (item.status === 'completed') counts.completed++;
      if (isReportItemOverdue(item)) counts.overdue++;
    }

    return counts;
  }, [items]);

  const filtered = useMemo(
    () => items.filter((item) => matchesStatusFilter(item, statusFilter)),
    [items, statusFilter]
  );

  return (
    <div className="min-h-screen">
      <header className="nav-dark sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/25">
              PM
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">My Tasks</p>
              <p className="truncate text-xs text-white/55">
                {employeeEmail ? displayName(employeeEmail) : user?.username || 'AE Research'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell />
            <button
              type="button"
              onClick={logout}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-6 sm:py-8">
        <div>
          <p className="page-kicker">Assigned to you</p>
          <h1 className="page-title">Your assignments</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in with your assignee username and password to view tickets assigned to you.
            Read-only — no edit or delete.
          </p>
        </div>

        <div className="card p-4">
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
            {STATUS_FILTERS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setStatusFilter(id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === id
                    ? id === 'overdue'
                      ? 'bg-white text-rose-700 shadow-sm ring-1 ring-rose-100'
                      : 'bg-white text-indigo-700 shadow-sm'
                    : id === 'overdue'
                      ? 'text-rose-600 hover:text-rose-800'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                    statusFilter === id
                      ? id === 'overdue'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-indigo-100 text-indigo-700'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {filterCounts[id]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {loading ? (
          <div className="card p-8">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p className="text-sm text-slate-600">No tasks match your filters.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {filtered.map((item, index) => (
                <ViewCard key={item.id} item={item} rank={index + 1} />
              ))}
            </div>

            <div className="card hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1020px]">
                <thead>
                  <tr>
                    <th className="table-header w-10 text-center">#</th>
                    <th className="table-header">Time left</th>
                    <th className="table-header">Project</th>
                    <th className="table-header">Timeline</th>
                    <th className="table-header">CC</th>
                    <th className="table-header min-w-[7.25rem]">Status</th>
                    <th className="table-header">Schedule</th>
                    <th className="table-header">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, index) => (
                    <ViewRow key={item.id} item={item} rank={index + 1} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function EmployeeViewPage() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          </div>
        }
      >
        <EmployeeViewContent />
      </Suspense>
    </AuthGuard>
  );
}
