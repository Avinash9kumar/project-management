'use client';

import { useEffect, useState } from 'react';
import {
  TimelineItem,
  TimelineReportItem,
  TimelineType,
  ProjectStatus,
  STATUS_LABELS,
  TIMELINE_TAB_LABELS,
} from '@/lib/types';
import {
  getAssignToList,
  joinAssignTo,
  itemToFormState,
  toApiPayload,
  TimelineMode,
  TimelineItemInput,
  validateTimelineItemInput,
  showLaunchEndDateReminder,
} from '@/lib/timeline-utils';
import AssignToSelect from '@/components/AssignToSelect';
import TimelineScheduleFields from '@/components/TimelineScheduleFields';

function reportItemToTimelineItem(item: TimelineReportItem): TimelineItem {
  return {
    id: item.id,
    project_id: item.project_id,
    timeline_type: item.timeline_type,
    title: item.title,
    description: item.description,
    status: item.status,
    start_date: item.start_date,
    due_date: item.due_date,
    sort_order: 0,
    custom_fields: item.custom_fields,
  };
}

interface Props {
  item: TimelineReportItem | null;
  onClose: () => void;
  onSave: (
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
}

export default function ReportTimelineEditModal({ item, onClose, onSave }: Props) {
  const timelineItem = item ? reportItemToTimelineItem(item) : null;
  const timelineType = item?.timeline_type as TimelineType;

  const [assignees, setAssignees] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('pending');
  const [timelineMode, setTimelineMode] = useState<TimelineMode>('date');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDurationHours, setEndDurationHours] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!timelineItem) return;
    const s = itemToFormState(timelineItem);
    setAssignees(getAssignToList(timelineItem));
    setDescription(timelineItem.description || '');
    setStatus(timelineItem.status);
    setTimelineMode(s.timeline_mode);
    setStartDate(s.start_date);
    setEndDate(s.end_date);
    setStartTime(s.start_time);
    setEndDurationHours(s.end_duration_hours);
    setError('');
    setSuccess('');
  }, [timelineItem, item?.id]);

  if (!item || !timelineItem) return null;

  const tabLabel = TIMELINE_TAB_LABELS[timelineType] || timelineType;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const input: TimelineItemInput = {
      timeline_mode: timelineMode,
      assign_to: joinAssignTo(assignees),
      description: description.trim(),
      status,
      start_date: startDate,
      end_date: endDate,
      start_time: startTime,
      end_duration_hours: endDurationHours,
    };

    const validationError = validateTimelineItemInput(input);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (timelineType === 'launch' && status !== item.status) {
      showLaunchEndDateReminder(timelineType);
    }

    const payload = toApiPayload(input);
    setSaving(true);
    try {
      const result = await onSave(item.id, {
        title: payload.title,
        description: payload.description,
        status: payload.status,
        start_date: payload.start_date,
        due_date: payload.due_date,
        custom_fields: payload.custom_fields,
      });
      if (result?.emailSent && result.emailSent > 0) {
        setSuccess(`Update email sent to ${result.emailSent} assignee${result.emailSent === 1 ? '' : 's'}.`);
        setTimeout(onClose, 1200);
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel max-h-[90vh] max-w-lg overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">Edit timeline item</h2>
          <p className="mt-1 text-sm text-slate-500">
            {item.project_title} · {item.project_code} · {tabLabel}
          </p>
        </div>

        {error && <div className="alert-error mb-4">{error}</div>}
        {success && <div className="alert-success mb-4">{success}</div>}

        <form onSubmit={handleSave} className="space-y-4 overflow-visible">
          <div className="relative z-20 overflow-visible">
            <label className="mb-1 block text-xs font-semibold text-slate-600">Assign to *</label>
            <AssignToSelect value={assignees} onChange={setAssignees} />
          </div>

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
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            >
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Description</label>
            <textarea
              className="input-field min-h-[72px] text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
