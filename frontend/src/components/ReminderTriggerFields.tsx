'use client';

import { useMemo, useState } from 'react';
import {
  TimelineMode,
  REMINDER_PERCENT_OPTIONS,
  MANDATORY_REMINDER_PERCENTS,
  OVERDUE_REMINDER_PERCENT,
  DateEndSlot,
  formatReminderTriggersPreview,
} from '@/lib/timeline-utils';

interface Props {
  timelineMode: TimelineMode;
  startDate: string;
  endDate: string;
  endDateSlot?: DateEndSlot;
  startTime: string;
  endDurationHours: number;
  reminderPercents: number[];
  onReminderPercentsChange: (value: number[]) => void;
}

function shortWhen(detail: string): string {
  return detail
    .replace(/^Triggers around /, '')
    .replace(/^Overdue email triggers around /, '');
}

export default function ReminderTriggerFields({
  timelineMode,
  startDate,
  endDate,
  endDateSlot,
  startTime,
  endDurationHours,
  reminderPercents,
  onReminderPercentsChange,
}: Props) {
  const [showWhen, setShowWhen] = useState(false);

  const preview = useMemo(
    () =>
      formatReminderTriggersPreview({
        timeline_mode: timelineMode,
        start_date: startDate,
        end_date: endDate,
        start_time: startTime,
        end_duration_hours: endDurationHours,
        date_end_slot: endDateSlot,
        reminder_percents: reminderPercents,
      }),
    [timelineMode, startDate, endDate, endDateSlot, startTime, endDurationHours, reminderPercents]
  );

  const togglePercent = (percent: number) => {
    if (reminderPercents.includes(percent)) {
      onReminderPercentsChange(reminderPercents.filter((p) => p !== percent));
    } else {
      onReminderPercentsChange([...reminderPercents, percent].sort((a, b) => a - b));
    }
  };

  const alwaysOn = [...MANDATORY_REMINDER_PERCENTS, OVERDUE_REMINDER_PERCENT]
    .map((p) => (p === OVERDUE_REMINDER_PERCENT ? '100% due' : `${p}%`))
    .join(' · ');

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold text-slate-700">Reminders</span>
        <span className="shrink-0 text-[10px] tabular-nums text-slate-400">
          {preview.totalCount} email{preview.totalCount !== 1 ? 's' : ''}
        </span>
      </div>

      <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
        Always on: <span className="font-medium text-emerald-700">{alwaysOn}</span>
      </p>

      <div className="mt-1 flex flex-wrap items-center gap-1">
        <span className="mr-0.5 text-[10px] text-slate-500">Add:</span>
        {REMINDER_PERCENT_OPTIONS.map((value) => {
          const on = reminderPercents.includes(value);
          return (
            <button
              key={value}
              type="button"
              title={on ? `Remove ${value}% reminder` : `Add ${value}% reminder`}
              aria-pressed={on}
              onClick={() => togglePercent(value)}
              className={`h-5 min-w-[1.75rem] rounded px-1 text-[10px] font-semibold leading-none transition ${
                on
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-amber-50 hover:ring-amber-300'
              }`}
            >
              {value}%
            </button>
          );
        })}
        {preview.optionalCount === 0 && (
          <span className="text-[10px] text-slate-400">tap to add more</span>
        )}
      </div>

      <button
        type="button"
        className="mt-1 text-[10px] text-indigo-600 hover:text-indigo-800"
        onClick={() => setShowWhen((v) => !v)}
      >
        {showWhen ? '▾ Hide schedule' : '▸ When do they send?'}
      </button>

      {showWhen && (
        <ul className="mt-0.5 space-y-px border-t border-slate-200/70 pt-1">
          {!preview.ready ? (
            <li className="text-[10px] text-slate-400">Set dates above first.</li>
          ) : (
            preview.items.map((item) => (
              <li key={item.percent} className="flex items-baseline justify-between gap-2 text-[10px]">
                <span className={item.mandatory ? 'font-medium text-emerald-700' : 'font-medium text-amber-800'}>
                  {item.percent}%
                </span>
                <span className="truncate text-right text-slate-400">
                  {preview.ready ? shortWhen(item.detail) : '—'}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
