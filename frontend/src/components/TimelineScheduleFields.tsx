'use client';

import { useEffect, useRef, useState } from 'react';
import {
  TimelineMode,
  DateEndSlot,
  todayISO,
  currentTimeSlot,
  generateTimeOptions,
  ensureTimeInOptions,
  getEndDurationOptions,
  getEndDurationOption,
  formatTime12,
  formatEndDurationDetail,
  EndDurationOption,
  DATE_END_SLOT_OPTIONS,
  DEFAULT_DATE_END_SLOT,
} from '@/lib/timeline-utils';

interface Props {
  mode: TimelineMode;
  onModeChange: (mode: TimelineMode) => void;
  startDate: string;
  endDate: string;
  endDateSlot: DateEndSlot;
  startTime: string;
  endDurationHours: number;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onEndDateSlotChange: (v: DateEndSlot) => void;
  onStartTimeChange: (v: string) => void;
  onEndDurationChange: (v: number) => void;
}

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onClose]);
}

function StartTimeDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input-field flex h-auto min-h-9 w-full items-center justify-between gap-2 py-1.5 text-left text-sm"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-medium leading-tight text-slate-800">
            {value ? formatTime12(value) : 'Select time'}
          </span>
          {value && (
            <span className="block text-xs leading-tight text-slate-500">{value}</span>
          )}
        </span>
        <span className="shrink-0 text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                onChange(t);
                setOpen(false);
              }}
              className={`flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-50 ${
                t === value ? 'bg-blue-50' : ''
              }`}
            >
              <span className={`text-sm leading-tight ${t === value ? 'font-semibold text-blue-700' : 'font-medium text-slate-800'}`}>
                {formatTime12(t)}
              </span>
              <span className={`text-xs leading-tight ${t === value ? 'text-blue-600' : 'text-slate-500'}`}>
                {t}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EndDurationDropdown({
  value,
  options,
  onChange,
}: {
  value: number;
  options: EndDurationOption[];
  onChange: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const selected = getEndDurationOption(options, value) || options[0];

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input-field flex h-auto min-h-9 w-full items-center justify-between gap-2 py-1.5 text-left text-sm"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-medium leading-tight text-slate-800">
            {selected?.hoursLabel || 'Select end'}
          </span>
          {selected && (
            <span className="block text-xs leading-tight text-slate-500">
              {formatEndDurationDetail(selected)}
            </span>
          )}
        </span>
        <span className="shrink-0 text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-50 ${
                  isSelected ? 'bg-blue-50' : ''
                }`}
              >
                <span className={`text-sm leading-tight ${isSelected ? 'font-semibold text-blue-700' : 'font-medium text-slate-800'}`}>
                  {opt.hoursLabel}
                </span>
                <span className={`text-xs leading-tight ${isSelected ? 'text-blue-600' : 'text-slate-500'}`}>
                  {formatEndDurationDetail(opt)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TimelineScheduleFields({
  mode,
  onModeChange,
  startDate,
  endDate,
  endDateSlot,
  startTime,
  endDurationHours,
  onStartDateChange,
  onEndDateChange,
  onEndDateSlotChange,
  onStartTimeChange,
  onEndDurationChange,
}: Props) {
  const activeStartTime = startTime || currentTimeSlot();
  const activeDay = startDate || todayISO();
  const timeOptions = ensureTimeInOptions(activeStartTime, generateTimeOptions());
  const endDurationOptions = getEndDurationOptions(activeStartTime, activeDay);

  return (
    <div className="space-y-2">
      <div className="flex rounded border border-slate-200 bg-white p-0.5 text-xs">
        <button
          type="button"
          onClick={() => onModeChange('date')}
          className={`flex-1 rounded px-2 py-1.5 font-medium transition ${
            mode === 'date' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Date
        </button>
        <button
          type="button"
          onClick={() => {
            onModeChange('same_day');
            if (!startDate) onStartDateChange(todayISO());
            onStartTimeChange(currentTimeSlot());
            onEndDateSlotChange(DEFAULT_DATE_END_SLOT);
          }}
          className={`flex-1 rounded px-2 py-1.5 font-medium transition ${
            mode === 'same_day' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Same day
        </button>
      </div>

      {mode === 'date' ? (
        <div className="space-y-1.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-0.5 block text-xs text-slate-600">Start date *</label>
              <input
                type="date"
                className="input-field h-8 text-sm"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-0.5 block text-xs text-slate-600">End date *</label>
              <input
                type="date"
                className="input-field h-8 text-sm"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => onEndDateChange(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] text-slate-500">End time on due date</label>
            <div className="flex flex-wrap gap-1">
              {DATE_END_SLOT_OPTIONS.map((opt) => {
                const on = endDateSlot === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    title={opt.short}
                    aria-pressed={on}
                    onClick={() => onEndDateSlotChange(opt.value)}
                    className={`rounded px-2 py-1 text-[10px] font-semibold leading-none transition ${
                      on
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-blue-300'
                    }`}
                  >
                    {opt.label} <span className="font-normal opacity-80">({opt.short})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div>
            <label className="mb-0.5 block text-xs text-slate-600">Day *</label>
            <input
              type="date"
              className="input-field h-8 text-sm"
              value={activeDay}
              onChange={(e) => onStartDateChange(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0">
              <label className="mb-0.5 block text-xs text-slate-600">Start time *</label>
              <StartTimeDropdown
                value={activeStartTime}
                options={timeOptions}
                onChange={onStartTimeChange}
              />
            </div>
            <div className="min-w-0">
              <label className="mb-0.5 block text-xs text-slate-600">End *</label>
              <EndDurationDropdown
                value={endDurationHours}
                options={endDurationOptions}
                onChange={onEndDurationChange}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
