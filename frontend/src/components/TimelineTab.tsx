'use client';

import { useState } from 'react';
import { TimelineItem, STATUS_LABELS } from '@/lib/types';
import {
  getAssignMain,
  getAssignCcList,
  joinAssignTo,
  formatTimelineRange,
  itemToFormState,
  itemToAssignState,
  toApiPayload,
  TimelineMode,
  TimelineItemInput,
  validateTimelineItemInput,
  showLaunchEndDateReminder,
} from '@/lib/timeline-utils';
import AssignEmailFields from '@/components/AssignEmailFields';
import TimelineScheduleFields from '@/components/TimelineScheduleFields';

interface Props {
  timelineType: import('@/lib/types').TimelineType;
  items: TimelineItem[];
  loading: boolean;
  onUpdate: (
    id: number,
    updates: Partial<{
      title: string;
      description: string;
      status: string;
      start_date: string;
      due_date: string;
      custom_fields: Record<string, string | number>;
    }>
  ) => Promise<{ emailSent?: number } | void>;
  onDelete: (id: number) => Promise<void>;
}

function statusBadgeClass(status: TimelineItem['status']) {
  switch (status) {
    case 'completed':
      return 'badge-completed';
    case 'in_progress':
      return 'badge-progress';
    default:
      return 'badge-pending';
  }
}

export default function TimelineTab({ timelineType, items, loading, onUpdate, onDelete }: Props) {
  if (loading) {
    return (
      <div className="space-y-3 py-4">
        {[1, 2].map((i) => (
          <div key={i} className="skeleton h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="empty-state py-12">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-600">No items in this timeline yet</p>
        <p className="mt-1 text-xs text-slate-400">Use the form on the left to add your first item</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <TimelineItemCard
          key={item.id}
          item={item}
          index={index}
          timelineType={timelineType}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function TimelineItemCard({
  item,
  index,
  timelineType,
  onUpdate,
  onDelete,
}: {
  item: TimelineItem;
  index: number;
  timelineType: Props['timelineType'];
  onUpdate: Props['onUpdate'];
  onDelete: Props['onDelete'];
}) {
  const formDefaults = itemToFormState(item);
  const assignState = itemToAssignState(item);
  const [editing, setEditing] = useState(false);
  const [mainAssign, setMainAssign] = useState(assignState.assign_main);
  const [ccAssign, setCcAssign] = useState<string[]>(getAssignCcList(item));
  const [description, setDescription] = useState(item.description || '');
  const [status, setStatus] = useState(item.status);
  const [timelineMode, setTimelineMode] = useState<TimelineMode>(formDefaults.timeline_mode);
  const [startDate, setStartDate] = useState(formDefaults.start_date);
  const [endDate, setEndDate] = useState(formDefaults.end_date);
  const [startTime, setStartTime] = useState(formDefaults.start_time);
  const [endDurationHours, setEndDurationHours] = useState(formDefaults.end_duration_hours);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  const loadEditState = () => {
    const s = itemToFormState(item);
    const assign = itemToAssignState(item);
    setMainAssign(assign.assign_main);
    setCcAssign(getAssignCcList(item));
    setDescription(item.description || '');
    setStatus(item.status);
    setTimelineMode(s.timeline_mode);
    setStartDate(s.start_date);
    setEndDate(s.end_date);
    setStartTime(s.start_time);
    setEndDurationHours(s.end_duration_hours);
  };

  const handleStatusChange = (nextStatus: TimelineItem['status']) => {
    if (timelineType === 'launch' && nextStatus !== item.status) {
      showLaunchEndDateReminder(timelineType);
    }
    setEditError('');
    setStatus(nextStatus);
  };

  const handleSave = async () => {
    const input: TimelineItemInput = {
      timeline_mode: timelineMode,
      assign_main: mainAssign,
      assign_cc: joinAssignTo(ccAssign),
      description: description.trim(),
      status,
      start_date: startDate,
      end_date: endDate,
      start_time: startTime,
      end_duration_hours: endDurationHours,
    };

    const validationError = validateTimelineItemInput(input);
    if (validationError) {
      setEditError(validationError);
      return;
    }

    if (timelineType === 'launch' && status !== item.status) {
      showLaunchEndDateReminder(timelineType);
    }

    setEditError('');
    setEditSuccess('');
    const payload = toApiPayload(input);
    setSaving(true);
    try {
      const result = await onUpdate(item.id, {
        title: payload.title,
        description: payload.description,
        status: payload.status,
        start_date: payload.start_date,
        due_date: payload.due_date,
        custom_fields: payload.custom_fields,
      });
      setEditing(false);
      if (result?.emailSent && result.emailSent > 0) {
        setEditSuccess(
          result.emailSent === 1
            ? 'Update email sent to main assignee.'
            : `Update email sent to main assignee with ${result.emailSent - 1} CC.`
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const mainAssignee = getAssignMain(item);
  const ccList = getAssignCcList(item);

  return (
    <div className="timeline-card">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-500">
        {index + 1}
      </div>

      <div className="min-w-0 flex-1 overflow-visible">
        {editing ? (
          <div className="space-y-3 overflow-visible">
            {editError && <div className="alert-error text-xs">{editError}</div>}
            <TimelineScheduleFields
              mode={timelineMode}
              onModeChange={setTimelineMode}
              startDate={startDate}
              endDate={endDate}
              startTime={startTime}
              endDurationHours={endDurationHours}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onStartTimeChange={setStartTime}
              onEndDurationChange={setEndDurationHours}
            />
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Status *</label>
              <select
                className="input-field h-10 w-full appearance-auto text-sm"
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as TimelineItem['status'])}
              >
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Description</label>
              <textarea
                className="input-field min-h-[60px] text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="relative z-20 overflow-visible">
              <AssignEmailFields
                mainAssign={mainAssign}
                ccAssign={ccAssign}
                onMainChange={setMainAssign}
                onCcChange={setCcAssign}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button className="btn-primary px-4 py-2 text-xs" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <button className="btn-secondary px-4 py-2 text-xs" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {mainAssignee && (
                  <span className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                    To: {mainAssignee}
                  </span>
                )}
                {ccList.map((email) => (
                  <span key={email} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                    CC: {email}
                  </span>
                ))}
              </div>
              <span className={statusBadgeClass(item.status)}>
                {STATUS_LABELS[item.status]}
              </span>
            </div>
            {item.description && (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
            )}
            {editSuccess && <div className="alert-success mt-2 text-xs">{editSuccess}</div>}
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatTimelineRange(item)}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                className="btn-ghost text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                onClick={() => {
                  loadEditState();
                  setEditError('');
                  setEditSuccess('');
                  setEditing(true);
                }}
              >
                Edit
              </button>
              <button
                className="btn-ghost text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => onDelete(item.id)}
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
