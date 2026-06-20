'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getTimelineReport, updateTimelineItem, deleteTimelineItem } from '@/lib/api';
import {
  TimelineReportItem,
  TimelineItem,
  TIMELINE_TAB_LABELS,
  TIMELINE_LABELS,
  STATUS_LABELS,
  TimelineType,
  ProjectStatus,
} from '@/lib/types';
import { formatTimelineRange, formatTimeRemaining, remainingUrgencyClass } from '@/lib/timeline-utils';
import AuthGuard from '@/components/AuthGuard';
import ReportTimelineEditModal from '@/components/ReportTimelineEditModal';

function statusBadgeClass(status: ProjectStatus) {
  switch (status) {
    case 'completed':
      return 'badge-completed';
    case 'in_progress':
      return 'badge-progress';
    default:
      return 'badge-pending';
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
        className="btn-ghost px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50"
        onClick={onEdit}
      >
        Edit
      </button>
      <button
        type="button"
        className="btn-ghost px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
        onClick={onDelete}
      >
        Delete
      </button>
    </div>
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
  const tabLabel =
    TIMELINE_TAB_LABELS[item.timeline_type as TimelineType] ||
    item.timeline_type;

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
      </td>
      <td className="table-cell cursor-pointer" onClick={onOpen}>
        <span className={statusBadgeClass(item.status)}>{STATUS_LABELS[item.status]}</span>
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
  const tabLabel =
    TIMELINE_TAB_LABELS[item.timeline_type as TimelineType] ||
    item.timeline_type;

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
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
          <span className={statusBadgeClass(item.status)}>{STATUS_LABELS[item.status]}</span>
          <ActionButtons onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>
      <div className="mt-3 cursor-pointer" onClick={onOpen} role="button">
        <p className="font-semibold text-slate-900">{item.project_title}</p>
        <p className="text-xs text-slate-500">
          {item.project_code} · {tabLabel}
        </p>
        <p className="mt-2 text-sm text-slate-700">{item.assign_to}</p>
        <p className="mt-1 text-xs text-slate-400">
          {formatTimelineRange({ ...item, sort_order: 0 } as TimelineItem)}
        </p>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const router = useRouter();
  const [items, setItems] = useState<TimelineReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [editingItem, setEditingItem] = useState<TimelineReportItem | null>(null);

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
    let list = items;
    if (statusFilter === 'active') {
      list = list.filter((i) => i.status !== 'completed');
    } else if (statusFilter === 'completed') {
      list = list.filter((i) => i.status === 'completed');
    }

    const q = search.toLowerCase().trim();
    if (!q) return list;

    return list.filter(
      (i) =>
        i.project_title.toLowerCase().includes(q) ||
        i.project_code.toLowerCase().includes(q) ||
        i.assign_to.toLowerCase().includes(q) ||
        (TIMELINE_LABELS[i.timeline_type as TimelineType] || '').toLowerCase().includes(q)
    );
  }, [items, search, statusFilter]);

  const openProject = (projectId: number) => {
    router.push(`/project/?id=${projectId}`);
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
    const label = `${item.project_title} · ${TIMELINE_TAB_LABELS[item.timeline_type as TimelineType]}`;
    if (!confirm(`Delete this timeline item?\n\n${label}`)) return;
    try {
      await deleteTimelineItem(item.id);
      await loadReport();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  const overdueCount = items.filter(
    (i) => i.status !== 'completed' && i.remaining_seconds !== null && i.remaining_seconds < 0
  ).length;

  return (
    <AuthGuard>
      <div className="page-enter space-y-6">
        <div>
          <h1 className="page-title">Timeline Report</h1>
          <p className="page-subtitle mt-1">
            All timelines across projects — sorted by least time remaining (most urgent first)
          </p>
        </div>

        <div className="card flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[200px] flex-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              className="search-input"
              placeholder="Search project, assignee, tab..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {(['active', 'all', 'completed'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  statusFilter === f
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f === 'active' ? 'Active' : f}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-xl bg-indigo-50 px-3 py-1.5 font-semibold text-indigo-700">
              {filtered.length} items
            </span>
            {overdueCount > 0 && (
              <span className="rounded-xl bg-rose-50 px-3 py-1.5 font-semibold text-rose-700">
                {overdueCount} overdue
              </span>
            )}
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {loading ? (
          <div className="card p-8">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p className="text-sm text-slate-600">No timeline items match your filters.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {filtered.map((item, index) => (
                <ReportCard
                  key={item.id}
                  item={item}
                  rank={index + 1}
                  onOpen={() => openProject(item.project_id)}
                  onEdit={() => setEditingItem(item)}
                  onDelete={() => handleDelete(item)}
                />
              ))}
            </div>

            <div className="card hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr>
                    <th className="table-header w-10 text-center">#</th>
                    <th className="table-header">Time left</th>
                    <th className="table-header">Project</th>
                    <th className="table-header">Timeline</th>
                    <th className="table-header">Assignee</th>
                    <th className="table-header">Status</th>
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
                      onOpen={() => openProject(item.project_id)}
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
          Use Edit or Delete on each row · Click project details to open the project
        </p>
      </div>

      <ReportTimelineEditModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleSave}
      />
    </AuthGuard>
  );
}
