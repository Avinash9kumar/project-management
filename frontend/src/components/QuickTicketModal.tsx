'use client';

import { useEffect, useRef, useState } from 'react';
import { ProjectStatus, STATUS_LABELS, statusOptionsForSelect } from '@/lib/types';
import { createQuickTicket } from '@/lib/api';
import {
  todayISO,
  joinAssignTo,
  currentTimeSlot,
  TimelineItemInput,
  validateTimelineItemInput,
  toApiPayload,
  DEFAULT_DATE_END_SLOT,
  DateEndSlot,
  DEFAULT_OPTIONAL_REMINDER_PERCENTS,
} from '@/lib/timeline-utils';
import AssignEmailFields from '@/components/AssignEmailFields';
import TimelineScheduleFields from '@/components/TimelineScheduleFields';
import ReminderTriggerFields from '@/components/ReminderTriggerFields';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}

export default function QuickTicketModal({ open, onClose, onCreated }: Props) {
  const [mainAssign, setMainAssign] = useState('');
  const [ccAssign, setCcAssign] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('in_progress');
  const [timelineMode, setTimelineMode] = useState<'date' | 'same_day'>('date');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDurationHours, setEndDurationHours] = useState(1);
  const [endDateSlot, setEndDateSlot] = useState<DateEndSlot>(DEFAULT_DATE_END_SLOT);
  const [reminderPercents, setReminderPercents] = useState<number[]>([...DEFAULT_OPTIONAL_REMINDER_PERCENTS]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const resetForm = () => {
    setMainAssign('');
    setCcAssign([]);
    setDescription('');
    setStatus('in_progress');
    setTimelineMode('date');
    const today = todayISO();
    setStartDate(today);
    setEndDate(today);
    setStartTime(currentTimeSlot());
    setEndDurationHours(1);
    setEndDateSlot(DEFAULT_DATE_END_SLOT);
    setReminderPercents([...DEFAULT_OPTIONAL_REMINDER_PERCENTS]);
    setError('');
  };

  useEffect(() => {
    if (open) resetForm();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  const showValidationError = (message: string) => {
    setError(message);
    const root = formRef.current;
    const field =
      message.includes('End date') ? 'end-date' :
      message.includes('Start date') || message.includes('Day') ? 'start-date' :
      message.includes('Start time') ? 'start-time' :
      message.includes('Main assign') ? 'main-assign' :
      '';
    const target = field ? root?.querySelector<HTMLElement>(`[data-field="${field}"]`) : null;
    target?.scrollIntoView({ block: 'center' });
    target?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
      date_end_slot: endDateSlot,
      reminder_percents: reminderPercents,
    };

    const validationError = validateTimelineItemInput(input);
    if (validationError) {
      showValidationError(validationError);
      return;
    }

    const payload = toApiPayload(input);
    setLoading(true);
    try {
      await createQuickTicket({
        title: payload.title,
        description: payload.description,
        status: payload.status,
        start_date: payload.start_date,
        due_date: payload.due_date,
        custom_fields: payload.custom_fields,
      });
      try {
        await onCreated();
      } catch {
        // The ticket is already saved. Closing still shows it on the next load.
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add quick ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel modal-sheet max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">Quick ticket</h2>
            <p className="text-xs text-slate-500">Adds a ticket. No email is sent.</p>
          </div>
          <button type="button" className="btn-ghost shrink-0 px-3 py-2 text-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="modal-sheet-body">
            <TimelineScheduleFields
              mode={timelineMode}
              onModeChange={setTimelineMode}
              startDate={startDate}
              endDate={endDate}
              endDateSlot={endDateSlot}
              startTime={startTime}
              endDurationHours={endDurationHours}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onEndDateSlotChange={setEndDateSlot}
              onStartTimeChange={setStartTime}
              onEndDurationChange={setEndDurationHours}
            />
            <ReminderTriggerFields
              timelineMode={timelineMode}
              startDate={startDate}
              endDate={endDate}
              startTime={startTime}
              endDurationHours={endDurationHours}
              endDateSlot={endDateSlot}
              reminderPercents={reminderPercents}
            onReminderPercentsChange={setReminderPercents}
            alertsOnly
          />
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Status *</label>
              <select
                className="input-field h-11 w-full appearance-auto"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              >
                {statusOptionsForSelect(status).map((value) => (
                  <option key={value} value={value}>{STATUS_LABELS[value]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Description</label>
              <textarea
                className="input-field min-h-[72px] resize-y"
                placeholder="Add details about this task..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <AssignEmailFields
              mainAssign={mainAssign}
              ccAssign={ccAssign}
              onMainChange={setMainAssign}
            onCcChange={setCcAssign}
            emailNote={false}
          />
          </div>
          <div className="modal-sheet-bar flex-col sm:flex-row sm:items-center">
            {error && <div className="alert-error w-full text-xs sm:mr-auto sm:w-auto">{error}</div>}
            <div className="flex w-full gap-2 sm:w-auto">
              <button type="button" className="btn-secondary flex-1 sm:flex-none" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary flex-1 sm:flex-none" disabled={loading}>
                {loading ? 'Saving...' : 'Add quick ticket'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
