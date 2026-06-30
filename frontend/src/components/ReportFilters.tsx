'use client';

import {
  TIMELINE_TYPES,
  TIMELINE_TAB_LABELS,
  TimelineType,
} from '@/lib/types';

export type ReportStatusFilter = 'all' | 'in_progress' | 'overdue' | 'completed';
export type TimelineTabFilter = 'all' | TimelineType;

const STATUS_OPTIONS: {
  id: ReportStatusFilter;
  label: string;
  hint: string;
  activeClass: string;
  badgeActive: string;
  idleClass?: string;
}[] = [
  {
    id: 'all',
    label: 'All',
    hint: 'Active tasks (excludes completed)',
    activeClass: 'bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-100',
    badgeActive: 'bg-indigo-100 text-indigo-700',
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    hint: 'Active work',
    activeClass: 'bg-white text-sky-700 shadow-sm ring-1 ring-sky-100',
    badgeActive: 'bg-sky-100 text-sky-700',
  },
  {
    id: 'overdue',
    label: 'Overdue',
    hint: 'Past deadline',
    activeClass: 'bg-white text-rose-700 shadow-sm ring-1 ring-rose-100',
    badgeActive: 'bg-rose-100 text-rose-700',
    idleClass: 'text-rose-600 hover:text-rose-800',
  },
  {
    id: 'completed',
    label: 'Completed',
    hint: 'Done',
    activeClass: 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100',
    badgeActive: 'bg-emerald-100 text-emerald-700',
  },
];

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: ReportStatusFilter;
  onStatusFilterChange: (value: ReportStatusFilter) => void;
  timelineFilter: TimelineTabFilter;
  onTimelineFilterChange: (value: TimelineTabFilter) => void;
  statusCounts: Record<ReportStatusFilter, number>;
  timelineCounts: Record<TimelineTabFilter, number>;
  totalItems: number;
  filteredCount: number;
  onClearFilters: () => void;
}

export default function ReportFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  timelineFilter,
  onTimelineFilterChange,
  statusCounts,
  timelineCounts,
  totalItems,
  filteredCount,
  onClearFilters,
}: Props) {
  const hasActiveFilters =
    statusFilter !== 'all' || timelineFilter !== 'all' || search.trim().length > 0;

  const timelineOptions = TIMELINE_TYPES.filter((type) => timelineCounts[type] > 0);

  return (
    <div className="report-toolbar space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="report-search" className="report-filter-label">
            Search
          </label>
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              id="report-search"
              type="search"
              className="toolbar-search"
              placeholder="Project name, ID, assignee..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {search.trim() && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-200/80 hover:text-slate-600"
                aria-label="Clear search"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="w-full lg:w-64">
          <label htmlFor="report-timeline" className="report-filter-label">
            Timeline tab
          </label>
          <select
            id="report-timeline"
            className="input-field h-11 w-full text-sm"
            value={timelineFilter}
            onChange={(e) => onTimelineFilterChange(e.target.value as TimelineTabFilter)}
          >
            <option value="all">
              All timelines ({timelineCounts.all})
            </option>
            {timelineOptions.map((type) => (
              <option key={type} value={type}>
                {TIMELINE_TAB_LABELS[type]} ({timelineCounts[type]})
              </option>
            ))}
          </select>
        </div>

        <div className="stat-pill shrink-0 self-end">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-indigo-600 shadow-sm">
            {filteredCount}
          </span>
          <span className="text-slate-600">
            {hasActiveFilters ? (
              <>
                of <strong className="font-semibold text-slate-800">{totalItems}</strong> tasks
              </>
            ) : (
              <>task{totalItems !== 1 ? 's' : ''}</>
            )}
          </span>
        </div>
      </div>

      {statusCounts.overdue > 0 && statusFilter !== 'overdue' && (
        <button
          type="button"
          onClick={() => onStatusFilterChange('overdue')}
          className="flex w-full items-center gap-3 rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-orange-50 px-4 py-3 text-left transition hover:border-rose-300 hover:shadow-sm"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-rose-800">
              {statusCounts.overdue} overdue task{statusCounts.overdue !== 1 ? 's' : ''} need attention
            </span>
            <span className="block text-xs text-rose-600/90">Tap to show overdue only</span>
          </span>
          <span className="shrink-0 text-xs font-semibold text-rose-700">View →</span>
        </button>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="report-filter-label mb-0">Status</p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-800"
            >
              Clear all filters
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map(({ id, label, hint, activeClass, badgeActive, idleClass }) => {
            const isActive = statusFilter === id;
            const count = statusCounts[id];
            const isEmpty = id !== 'all' && count === 0;

            return (
              <button
                key={id}
                type="button"
                onClick={() => onStatusFilterChange(id)}
                disabled={isEmpty}
                title={hint}
                className={`group flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${
                  isActive
                    ? `border-transparent ${activeClass}`
                    : isEmpty
                      ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-50'
                      : `border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40 ${idleClass ?? ''}`
                }`}
              >
                <span
                  className={`text-sm font-semibold ${isActive ? '' : 'text-slate-700 group-hover:text-slate-900'}`}
                >
                  {label}
                </span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                    isActive ? badgeActive : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-xs font-medium text-slate-400">Active:</span>
          {search.trim() && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
            >
              Search: &quot;{search.trim()}&quot;
              <span className="text-slate-400">×</span>
            </button>
          )}
          {statusFilter !== 'all' && (
            <button
              type="button"
              onClick={() => onStatusFilterChange('all')}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
            >
              {STATUS_OPTIONS.find((o) => o.id === statusFilter)?.label}
              <span className="text-indigo-400">×</span>
            </button>
          )}
          {timelineFilter !== 'all' && (
            <button
              type="button"
              onClick={() => onTimelineFilterChange('all')}
              className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100"
            >
              {TIMELINE_TAB_LABELS[timelineFilter]}
              <span className="text-violet-400">×</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
