'use client';

import {
  TimelineItem,
  TIMELINE_LABELS,
  TIMELINE_TAB_LABELS,
  GANTT_COLORS,
  STATUS_LABELS,
  TimelineType,
  ProjectStatus,
} from '@/lib/types';
import {
  getAssignMain,
  getAssignCcList,
  formatTimelineRange,
  getItemScheduleStartMs,
  getItemScheduleEndMs,
  sortItemsForGantt,
  getItemDurationMs,
} from '@/lib/timeline-utils';

interface Props {
  items: TimelineItem[];
}

const MS_DAY = 86400000;

function formatDuration(ms: number): string {
  if (ms >= MS_DAY) {
    const days = Math.round(ms / MS_DAY);
    return `${days}d`;
  }
  const hours = Math.round(ms / 3600000);
  if (hours >= 1) return `${hours}h`;
  const mins = Math.round(ms / 60000);
  return `${mins}m`;
}

function statusBarClass(status: ProjectStatus): string {
  switch (status) {
    case 'completed':
      return 'opacity-60';
    case 'hold':
      return 'opacity-75 ring-2 ring-violet-300 ring-offset-1';
    case 'in_progress':
      return 'ring-2 ring-amber-300 ring-offset-1';
    default:
      return '';
  }
}

export default function GanttChart({ items }: Props) {
  const datedItems = sortItemsForGantt(
    items.filter((item) => item.start_date || item.due_date)
  );

  if (datedItems.length === 0) {
    return (
      <div className="empty-state py-10">
        <p className="text-sm font-medium text-slate-600">No scheduled timeline items yet</p>
        <p className="mt-1 text-xs text-slate-400">Add start and end dates on timeline tabs to see the chart</p>
      </div>
    );
  }

  let minMs = Number.MAX_SAFE_INTEGER;
  let maxMs = Number.MIN_SAFE_INTEGER;
  datedItems.forEach((item) => {
    const start = getItemScheduleStartMs(item);
    const end = getItemScheduleEndMs(item);
    if (start !== null) minMs = Math.min(minMs, start);
    if (end !== null) maxMs = Math.max(maxMs, end);
  });

  minMs -= MS_DAY;
  maxMs += MS_DAY * 2;
  const totalMs = Math.max(maxMs - minMs, MS_DAY);
  const now = Date.now();
  const todayLeft = ((now - minMs) / totalMs) * 100;
  const showToday = now >= minMs && now <= maxMs;

  const getBarStyle = (item: TimelineItem) => {
    const start = getItemScheduleStartMs(item) ?? minMs;
    const end = getItemScheduleEndMs(item) ?? start + MS_DAY;
    const left = ((start - minMs) / totalMs) * 100;
    const width = Math.max(((end - start) / totalMs) * 100, 0.8);
    const color = GANTT_COLORS[item.timeline_type as TimelineType] || '#64748b';
    return { left: `${left}%`, width: `${width}%`, backgroundColor: color };
  };

  const weekMarkers: { label: string; left: number }[] = [];
  const cursor = new Date(minMs);
  cursor.setHours(0, 0, 0, 0);
  while (cursor.getTime() <= maxMs) {
    const left = ((cursor.getTime() - minMs) / totalMs) * 100;
    weekMarkers.push({
      label: cursor.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      left,
    });
    cursor.setDate(cursor.getDate() + 7);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>{datedItems.length} tasks · sorted earliest → latest, shortest first</span>
        {showToday && (
          <span className="flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 font-medium text-rose-600 ring-1 ring-rose-100">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            Today
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50/50">
        <div className="min-w-[720px]">
          {/* Timeline header */}
          <div className="grid grid-cols-[minmax(220px,280px)_1fr] border-b border-slate-200 bg-white">
            <div className="border-r border-slate-100 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Task
            </div>
            <div className="relative h-10">
              {weekMarkers.map((m, i) => (
                <div
                  key={i}
                  className="absolute top-0 border-l border-slate-200 px-1 pt-2 text-[10px] text-slate-400"
                  style={{ left: `${m.left}%` }}
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {datedItems.map((item, index) => {
            const main = getAssignMain(item);
            const cc = getAssignCcList(item);
            const assignLabel = main
              ? cc.length
                ? `${main} (CC: ${cc.join(', ')})`
                : main
              : 'Unassigned';
            const color = GANTT_COLORS[item.timeline_type as TimelineType] || '#64748b';
            const duration = formatDuration(getItemDurationMs(item));
            const barStyle = getBarStyle(item);

            return (
              <div
                key={item.id}
                className="grid grid-cols-[minmax(220px,280px)_1fr] border-b border-slate-100 bg-white last:border-b-0 hover:bg-indigo-50/30"
              >
                <div className="border-r border-slate-50 px-3 py-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-bold text-slate-500">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-white"
                          style={{ backgroundColor: color }}
                        >
                          {TIMELINE_TAB_LABELS[item.timeline_type as TimelineType] || item.timeline_type}
                        </span>
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                          {duration}
                        </span>
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                            item.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : item.status === 'in_progress'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {STATUS_LABELS[item.status]}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs font-medium text-slate-800" title={assignLabel}>
                        {assignLabel}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-slate-400" title={formatTimelineRange(item)}>
                        {formatTimelineRange(item)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative flex items-center px-2 py-3">
                  {showToday && (
                    <div
                      className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 bg-rose-400/80"
                      style={{ left: `${todayLeft}%` }}
                    />
                  )}
                  <div className="relative h-8 w-full rounded-lg bg-slate-100/80">
                    <div
                      className={`absolute top-1 h-6 rounded-md shadow-sm transition-all ${statusBarClass(item.status)} ${item.status === 'completed' ? 'line-through decoration-white/50' : ''}`}
                      style={barStyle}
                      title={`${TIMELINE_LABELS[item.timeline_type as TimelineType]} · ${formatTimelineRange(item)}`}
                    >
                      <span className="block truncate px-2 pt-1 text-[9px] font-semibold text-white drop-shadow-sm">
                        {duration}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {Object.entries(GANTT_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
            {TIMELINE_TAB_LABELS[type as TimelineType]}
          </div>
        ))}
      </div>
    </div>
  );
}
