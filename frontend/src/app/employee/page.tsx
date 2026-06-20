'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTimelineReport, updateTimelineItem, deleteTimelineItem } from '@/lib/api';
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
  isMainAssigneeForEmployee,
} from '@/lib/timeline-utils';
import { SELF_ASSIGNEE, DEFAULT_ASSIGNEE_EMAILS } from '@/lib/assignees';
import { useAssignees } from '@/context/AssigneeContext';
import AuthGuard from '@/components/AuthGuard';
import ReportTimelineEditModal from '@/components/ReportTimelineEditModal';

type ReportStatusFilter = 'all' | 'pending' | 'in_progress' | 'overdue' | 'completed';

const REPORT_STATUS_FILTERS: { id: ReportStatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'completed', label: 'Completed' },
];

function isReportItemOverdue(item: TimelineReportItem): boolean {
  return (
    item.status !== 'completed' &&
    item.remaining_seconds !== null &&
    item.remaining_seconds < 0
  );
}

function matchesReportStatusFilter(item: TimelineReportItem, filter: ReportStatusFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'pending':
      return item.status === 'pending';
    case 'in_progress':
      return item.status === 'in_progress';
    case 'completed':
      return item.status === 'completed';
    case 'overdue':
      return isReportItemOverdue(item);
    default:
      return true;
  }
}

function displayLabel(value: string): string {
  if (value === SELF_ASSIGNEE) return SELF_ASSIGNEE;
  if (!value.includes('@')) return value;
  return value.split('@')[0];
}

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

function EmployeeRow({
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
    TIMELINE_TAB_LABELS[item.timeline_type as TimelineType] || item.timeline_type;
  const ccAssign = joinAssignTo(getAssignCcList(item));

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
      <td className="table-cell cursor-pointer text-sm text-slate-600" onClick={onOpen}>
        {ccAssign || '—'}
      </td>
      <td className="table-cell cursor-pointer" onClick={onOpen}>
        <span className={statusBadgeClass(item.status)}>{STATUS_LABELS[item.status]}</span>
      </td>
      <td className="table-cell cursor-pointer text-xs text-slate-500" onClick={onOpen}>
        {formatTimelineRange({ ...item, sort_order: 0 } as TimelineItem)}
      </td>
      <td className="table-cell max-w-[220px] cursor-pointer text-sm text-slate-600" onClick={onOpen}>
        <p className="line-clamp-2">{item.description?.trim() || '—'}</p>
      </td>
      <td className="table-cell text-right">
        <div className="flex shrink-0 justify-end gap-1" onClick={(e) => e.stopPropagation()}>
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
      </td>
    </tr>
  );
}

function EmployeeCard({
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
    TIMELINE_TAB_LABELS[item.timeline_type as TimelineType] || item.timeline_type;
  const ccAssign = joinAssignTo(getAssignCcList(item));

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2" onClick={onOpen} role="button">
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
          <button
            type="button"
            className="btn-ghost px-2 py-1 text-xs text-indigo-600"
            onClick={onEdit}
          >
            Edit
          </button>
          <button
            type="button"
            className="btn-ghost px-2 py-1 text-xs text-rose-600"
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      </div>
      <div className="mt-3 cursor-pointer space-y-2" onClick={onOpen} role="button">
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

export default function EmployeeReportPage() {
  const router = useRouter();
  const { assigneeValues, loading: assigneesLoading } = useAssignees();
  const [items, setItems] = useState<TimelineReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>('all');
  const [editingItem, setEditingItem] = useState<TimelineReportItem | null>(null);

  const employeeOptions = useMemo(() => {
    const pool = assigneeValues.length > 0 ? assigneeValues : [...DEFAULT_ASSIGNEE_EMAILS];
    return [SELF_ASSIGNEE, ...pool];
  }, [assigneeValues]);

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

  useEffect(() => {
    if (!selectedEmployee && employeeOptions.length > 0) {
      setSelectedEmployee(employeeOptions[0]);
    }
  }, [employeeOptions, selectedEmployee]);

  const employeeItems = useMemo(() => {
    if (!selectedEmployee) return [];

    return items
      .filter((item) => isMainAssigneeForEmployee(item, selectedEmployee))
      .sort((a, b) => {
        const aDone = a.status === 'completed';
        const bDone = b.status === 'completed';
        if (aDone !== bDone) return aDone ? 1 : -1;

        const aRem = a.remaining_seconds;
        const bRem = b.remaining_seconds;
        if (aRem === null && bRem === null) {
          return a.project_title.localeCompare(b.project_title);
        }
        if (aRem === null) return 1;
        if (bRem === null) return -1;
        return aRem - bRem;
      });
  }, [items, selectedEmployee]);

  const filterCounts = useMemo(() => {
    const counts: Record<ReportStatusFilter, number> = {
      all: employeeItems.length,
      pending: 0,
      in_progress: 0,
      overdue: 0,
      completed: 0,
    };

    for (const item of employeeItems) {
      if (item.status === 'pending') counts.pending++;
      if (item.status === 'in_progress') counts.in_progress++;
      if (item.status === 'completed') counts.completed++;
      if (isReportItemOverdue(item)) counts.overdue++;
    }

    return counts;
  }, [employeeItems]);

  const filtered = useMemo(() => {
    return employeeItems.filter((item) => matchesReportStatusFilter(item, statusFilter));
  }, [employeeItems, statusFilter]);

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
    const tabLabel =
      TIMELINE_TAB_LABELS[item.timeline_type as TimelineType] || item.timeline_type;
    const label = `${item.project_title} · ${tabLabel}`;
    if (!confirm(`Delete this timeline item?\n\n${label}`)) return;
    try {
      await deleteTimelineItem(item.id);
      await loadReport();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  return (
    <AuthGuard>
      <div className="page-enter space-y-6">
        <div>
          <h1 className="page-title">Employee Report</h1>
        </div>

        <div className="card p-4">
          <label htmlFor="employee-select" className="mb-2 block text-sm font-semibold text-slate-700">
            Employee
          </label>
          <select
            id="employee-select"
            className="input-field max-w-md"
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            disabled={assigneesLoading}
          >
            {employeeOptions.map((value) => (
              <option key={value} value={value}>
                {displayLabel(value)}
                {value.includes('@') ? ` (${value})` : ''}
              </option>
            ))}
          </select>

          {selectedEmployee && (
            <div className="mt-4 flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
              {REPORT_STATUS_FILTERS.map(({ id, label }) => (
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
          )}
        </div>

        {error && <div className="alert-error">{error}</div>}

        {loading ? (
          <div className="card p-8">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          </div>
        ) : !selectedEmployee ? (
          <div className="empty-state">
            <p className="text-sm text-slate-600">Select an employee to view their assignments.</p>
          </div>
        ) : employeeItems.length === 0 ? (
          <div className="empty-state">
            <p className="text-sm text-slate-600">
              No work where {displayLabel(selectedEmployee)} is the main assignee.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p className="text-sm text-slate-600">No timeline items match your filters.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {filtered.map((item, index) => (
                <EmployeeCard
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
              <table className="w-full min-w-[1050px]">
                <thead>
                  <tr>
                    <th className="table-header w-10 text-center">#</th>
                    <th className="table-header">Time left</th>
                    <th className="table-header">Project</th>
                    <th className="table-header">Timeline</th>
                    <th className="table-header">CC</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Schedule</th>
                    <th className="table-header">Description</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, index) => (
                    <EmployeeRow
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
          Sorted by urgency · Click a row to open the project · Edit or delete from each row
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
