'use client';

import { useEffect, useState } from 'react';
import { ProjectStatus, STATUS_LABELS, TimelineType } from '@/lib/types';
import {
  todayISO,
  joinAssignTo,
  currentTimeSlot,
  TimelineItemInput,
  validateTimelineItemInput,
  showLaunchEndDateReminder,
} from '@/lib/timeline-utils';
import { getTimelineFormDefaults } from '@/lib/timeline-tab-defaults';
import AssignToSelect from '@/components/AssignToSelect';
import TimelineScheduleFields from '@/components/TimelineScheduleFields';

interface Props {
  timelineType: TimelineType;
  timelineLabel: string;
  onSubmit: (data: TimelineItemInput) => Promise<{ emailSent?: number } | void>;
}

export default function AddTimelineItemForm({ timelineType, timelineLabel, onSubmit }: Props) {
  const tabDefaults = getTimelineFormDefaults(timelineType);

  const [assignees, setAssignees] = useState<string[]>(tabDefaults.assignees);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>(tabDefaults.status);
  const [timelineMode, setTimelineMode] = useState(tabDefaults.timelineMode);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDurationHours, setEndDurationHours] = useState(tabDefaults.endDurationHours);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const applyTabDefaults = () => {
    const defaults = getTimelineFormDefaults(timelineType);
    setAssignees(defaults.assignees);
    setDescription('');
    setStatus(defaults.status);
    setTimelineMode(defaults.timelineMode);
    setStartDate(todayISO());
    setEndDate('');
    setStartTime(currentTimeSlot());
    setEndDurationHours(defaults.endDurationHours);
  };

  useEffect(() => {
    applyTabDefaults();
  }, [timelineType]);

  const handleSubmit = async (e: React.FormEvent) => {
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

    showLaunchEndDateReminder(timelineType);

    setLoading(true);
    try {
      const result = await onSubmit(input);
      applyTabDefaults();
      if (result?.emailSent && result.emailSent > 0) {
        setSuccess(`Email invite sent to ${result.emailSent} assignee${result.emailSent === 1 ? '' : 's'}.`);
      } else {
        setSuccess('Timeline item added successfully.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-panel lg:sticky lg:top-24">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">Add new item</p>
          <p className="text-xs text-slate-500">{timelineLabel}</p>
        </div>
      </div>

      {error && <div className="alert-error mb-4 text-xs">{error}</div>}
      {success && <div className="alert-success mb-4 text-xs">{success}</div>}

      <div className="space-y-4 overflow-visible">
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

        <div className="relative z-10">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Status *</label>
          <select
            className="input-field h-10 w-full appearance-auto text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Description</label>
          <textarea
            className="input-field min-h-[72px] resize-y text-sm"
            placeholder="Add details about this task..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <button type="submit" className="btn-primary mt-5 w-full" disabled={loading}>
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Adding...
          </span>
        ) : (
          'Add timeline item'
        )}
      </button>
    </form>
  );
}
