'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getTimelineReport, updateTimelineItem, deleteTimelineItem } from '@/lib/api';
import QuickTicketModal from '@/components/QuickTicketModal';
import {
  TimelineReportItem,
  TimelineItem,
  TIMELINE_TYPES,
  TIMELINE_TAB_LABELS,
  TIMELINE_LABELS,
  STATUS_LABELS,
  TimelineType,
  ProjectStatus,
} from '@/lib/types';
import { formatTimelineRange, formatTimeRemaining, remainingUrgencyClass } from '@/lib/timeline-utils';
import MainAuthGuard from '@/components/MainAuthGuard';
import { useIdleRefresh } from '@/lib/useIdleRefresh';
import ReportTimelineEditModal from '@/components/ReportTimelineEditModal';
import ReportFilters, {
  ReportStatusFilter,
  TimelineTabFilter,
  DEFAULT_REPORT_STATUS_FILTER,
} from '@/components/ReportFilters';

function matchesTimelineTabFilter(item: TimelineReportItem, filter: TimelineTabFilter): boolean {
  if (filter === 'all') return true;
  return item.timeline_type === filter;
}

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

function reportTabLabel(type: string): string {
  if (String(type) === 'quick') return 'Quick';
  return TIMELINE_TAB_LABELS[type as TimelineType] || type;
}

function reportStatusLabel(status: ProjectStatus | string): string {
  if (status === 'pending') return STATUS_LABELS.in_progress;
  if (status in STATUS_LABELS) return STATUS_LABELS[status as ProjectStatus];
  return status ? String(status) : '—';
}

function matchesReportStatusFilter(item: TimelineReportItem, filter: ReportStatusFilter): boolean {
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

function getReportAllSortRank(item: TimelineReportItem): number {
  if (isReportItemOverdue(item)) return 0;
  if (isReportInProgressStatus(item.status)) return 1;
  if (item.status === 'hold') return 2;
  if (item.status === 'completed') return 3;
  return 4;
}

function compareRemainingSeconds(
  a: number | null,
  b: number | null
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

function sortReportItemsForAllFilter(items: TimelineReportItem[]): TimelineReportItem[] {
  return [...items].sort((a, b) => {
    const rankDiff = getReportAllSortRank(a) - getReportAllSortRank(b);
    if (rankDiff !== 0) return rankDiff;

    const rank = getReportAllSortRank(a);
    if (rank === 0 || rank === 1) {
      const byRemaining = compareRemainingSeconds(a.remaining_seconds, b.remaining_seconds);
      if (byRemaining !== 0) return byRemaining;
    }

    const byTitle = a.project_title.localeCompare(b.project_title);
    if (byTitle !== 0) return byTitle;

    return a.id - b.id;
  });
}

function statusBadgeClass(status: ProjectStatus) {
  switch (status) {
    case 'completed':
      return 'badge-completed';
    case 'hold':
      return 'badge-hold';
    case 'pending':
    case 'in_progress':
      return 'badge-progress';
    default:
      return 'badge-progress';
  }
}

function ActionButtons({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="btn-ghost min-h-10 px-3 py-2 text-xs text-indigo-600 hover:bg-indigo-50"
        onClick={onEdit}
      >
        Edit
      </button>
      <button
        type="button"
        className="btn-ghost min-h-10 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50"
        onClick={onDelete}
      >
        Delete
      </button>
    </div>
  );
}

function reportDescription(item: TimelineReportItem): string | null {
  const text = item.description?.trim();
  return text || null;
}

function ReportDescription({ text }: { text: string }) {
  return (
    <p className="mt-1 max-w-md text-sm leading-snug text-slate-600 line-clamp-3 whitespace-pre-wrap">
      {text}
    </p>
  );
}

function ReportRow({
  item,
  rank,
  onOpen,
  onEdit,
  onDelete,
}: {
  item: TimelineReportItem;
  rank: number;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const remainingMs =
    item.remaining_seconds !== null ? item.remaining_seconds * 1000 : null;
  const tabLabel = reportTabLabel(item.timeline_type);
  const description = reportDescription(item);

  return (
    <tr className="transition hover:bg-indigo-50/40">
      <td className="table-cell w-10 text-center font-bold text-slate-400">{rank}</td>
      <td className="table-cell cursor-pointer" onClick={onOpen}>
        <span
          className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${remainingUrgencyClass(remainingMs, item.status)}`}
        >
          {formatTimeRemaining(remainingMs, item.status)}
        </span>
        {item.progress_percent !== null && item.status !== 'completed' && (
          <p className="mt-1 text-[10px] text-slate-400">{item.progress_percent}% elapsed</p>
        )}
      </td>
      <td className="table-cell cursor-pointer" onClick={onOpen}>
        <p className="font-semibold text-slate-900">{item.project_title}</p>
        <p className="font-mono text-xs text-slate-500">{item.project_code}</p>
      </td>
      <td className="table-cell cursor-pointer" onClick={onOpen}>
        <span className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
          {tabLabel}
        </span>
      </td>
      <td className="table-cell cursor-pointer text-sm text-slate-700" onClick={onOpen}>
        {item.assign_to || '—'}
        {description && <ReportDescription text={description} />}
      </td>
      <td className="table-cell min-w-[7.25rem] cursor-pointer whitespace-nowrap" onClick={onOpen}>
        <span className={`${statusBadgeClass(item.status)} whitespace-nowrap`}>
          {reportStatusLabel(item.status)}
        </span>
      </td>
      <td className="table-cell cursor-pointer text-xs text-slate-500" onClick={onOpen}>
        {formatTimelineRange({ ...item, sort_order: 0 } as TimelineItem)}
      </td>
      <td className="table-cell text-right">
        <ActionButtons onEdit={onEdit} onDelete={onDelete} />
      </td>
    </tr>
  );
}

function ReportCard({
  item,
  rank,
  onOpen,
  onEdit,
  onDelete,
}: {
  item: TimelineReportItem;
  rank: number;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const remainingMs =
    item.remaining_seconds !== null ? item.remaining_seconds * 1000 : null;
  const tabLabel = reportTabLabel(item.timeline_type);
  const description = reportDescription(item);

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2" onClick={onOpen} role="button">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
            {rank}
          </span>
          <span
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${remainingUrgencyClass(remainingMs, item.status)}`}
          >
            {formatTimeRemaining(remainingMs, item.status)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`${statusBadgeClass(item.status)} whitespace-nowrap`}>
            {reportStatusLabel(item.status)}
          </span>
          <ActionButtons onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>
      <div className="mt-3 cursor-pointer" onClick={onOpen} role="button">
        <p className="font-semibold text-slate-900">{item.project_title}</p>
        <p className="text-xs text-slate-500">
          {item.project_code} · {tabLabel}
        </p>
        <p className="mt-2 text-sm text-slate-700">{item.assign_to}</p>
        {description && <ReportDescription text={description} />}
        <p className="mt-1 text-xs text-slate-400">
          {formatTimelineRange({ ...item, sort_order: 0 } as TimelineItem)}
        </p>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const router = useRouter();
  useIdleRefresh();
  const [items, setItems] = useState<TimelineReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>(DEFAULT_REPORT_STATUS_FILTER);
  const [timelineFilter, setTimelineFilter] = useState<TimelineTabFilter>('all');
  const [editingItem, setEditingItem] = useState<TimelineReportItem | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);

  const itemsForStatusCounts = useMemo(
    () => items.filter((item) => matchesTimelineTabFilter(item, timelineFilter)),
    [items, timelineFilter]
  );

  const itemsForTimelineCounts = useMemo(
    () => items.filter((item) => matchesReportStatusFilter(item, statusFilter)),
    [items, statusFilter]
  );

  const loadReport = useCallback(async () => {
    try {
      setError('');
      const data = await getTimelineReport();
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    }
  }, []);

  useEffect(() => {
    loadReport().finally(() => setLoading(false));
  }, [loadReport]);

  const filtered = useMemo(() => {
    let list = items.filter(
      (i) =>
        matchesReportStatusFilter(i, statusFilter) &&
        matchesTimelineTabFilter(i, timelineFilter)
    );

    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (i) =>
          i.project_title.toLowerCase().includes(q) ||
          i.project_code.toLowerCase().includes(q) ||
          i.assign_to.toLowerCase().includes(q) ||
          (i.description || '').toLowerCase().includes(q) ||
          (TIMELINE_LABELS[i.timeline_type as TimelineType] || '').toLowerCase().includes(q) ||
          reportTabLabel(i.timeline_type).toLowerCase().includes(q)
      );
    }

    if (statusFilter === 'all') {
      return sortReportItemsForAllFilter(list);
    }

    return list;
  }, [items, search, statusFilter, timelineFilter]);

  const openTimelineItem = (item: TimelineReportItem) => {
    if (String(item.timeline_type) === 'quick') {
      setEditingItem(item);
      return;
    }
    router.push(`/project/?id=${item.project_id}&tab=${item.timeline_type}&item=${item.id}`);
  };

  const handleSave = async (
    id: number,
    updates: Parameters<typeof updateTimelineItem>[1]
  ) => {
    const result = await updateTimelineItem(id, updates);
    await loadReport();
    return { emailSent: result.notifications?.sent ?? 0 };
  };

  const handleDelete = async (item: TimelineReportItem) => {
    const label = `${item.project_title} · ${reportTabLabel(item.timeline_type)}`;
    if (!confirm(`Delete this timeline item?\n\n${label}`)) return;
    try {
      await deleteTimelineItem(item.id);
      await loadReport();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  const filterCounts = useMemo(() => {
    const counts: Record<ReportStatusFilter, number> = {
      all: 0,
      in_progress: 0,
      hold: 0,
      overdue: 0,
      completed: 0,
    };

    for (const item of itemsForStatusCounts) {
      counts.all++;
      if (isReportInProgressStatus(item.status)) counts.in_progress++;
      if (item.status === 'hold') counts.hold++;
      if (item.status === 'completed') counts.completed++;
      if (isReportItemOverdue(item)) counts.overdue++;
    }

    return counts;
  }, [itemsForStatusCounts]);

  const timelineFilterCounts = useMemo(() => {
    const counts = Object.fromEntries(TIMELINE_TYPES.map((type) => [type, 0])) as Record<
      TimelineType,
      number
    >;

    for (const item of itemsForTimelineCounts) {
      const type = item.timeline_type as TimelineType;
      if (type in counts) {
        counts[type]++;
      }
    }

    return { all: itemsForTimelineCounts.length, ...counts } as Record<TimelineTabFilter, number>;
  }, [itemsForTimelineCounts]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter(DEFAULT_REPORT_STATUS_FILTER);
    setTimelineFilter('all');
  };

  const hasActiveFilters =
    statusFilter !== DEFAULT_REPORT_STATUS_FILTER ||
    timelineFilter !== 'all' ||
    search.trim().length > 0;

  return (
    <MainAuthGuard>
      <div className="page-enter space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="page-kicker">Today</p>
            <h1 className="page-title text-xl sm:text-2xl">Timeline Report</h1>
          </div>
          <button type="button" className="btn-primary w-full shrink-0 sm:w-auto" onClick={() => setQuickOpen(true)}>
            Quick ticket
          </button>
        </div>

        <ReportFilters
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          timelineFilter={timelineFilter}
          onTimelineFilterChange={setTimelineFilter}
          statusCounts={filterCounts}
          timelineCounts={timelineFilterCounts}
          totalItems={items.length}
          filteredCount={filtered.length}
          onClearFilters={clearFilters}
        />

        {error && <div className="alert-error">{error}</div>}

        {loading ? (
          <div className="card p-8">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-700">No tasks match your filters</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {hasActiveFilters
                ? 'Try clearing filters or choosing a different timeline tab or status.'
                : 'There are no timeline items in the report yet.'}
            </p>
            {hasActiveFilters && (
              <button type="button" onClick={clearFilters} className="btn-secondary mt-4 text-sm">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {filtered.map((item, index) => (
                <ReportCard
                  key={item.id}
                  item={item}
                  rank={index + 1}
                  onOpen={() => openTimelineItem(item)}
                  onEdit={() => setEditingItem(item)}
                  onDelete={() => handleDelete(item)}
                />
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
                    <th className="table-header">Assignee</th>
                    <th className="table-header min-w-[7.25rem]">Status</th>
                    <th className="table-header">Schedule</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, index) => (
                    <ReportRow
                      key={item.id}
                      item={item}
                      rank={index + 1}
                      onOpen={() => openTimelineItem(item)}
                      onEdit={() => setEditingItem(item)}
                      onDelete={() => handleDelete(item)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <p className="text-center text-xs text-slate-400">
          Use Edit or Delete on each row · Click a row to open that ticket in its timeline tab
        </p>
      </div>

      <ReportTimelineEditModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleSave}
      />
      <QuickTicketModal
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onCreated={loadReport}
      />
    </MainAuthGuard>
  );
}
