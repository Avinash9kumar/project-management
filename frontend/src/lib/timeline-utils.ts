import { TimelineItem } from './types';

export type TimelineAssignSource = Pick<TimelineItem, 'title' | 'custom_fields'>;

export type TimelineMode = 'date' | 'same_day';

export type DateEndSlot = 'SOD' | 'MID' | 'EOD';

export const DATE_END_SLOT_OPTIONS: ReadonlyArray<{
  value: DateEndSlot;
  label: string;
  short: string;
}> = [
  { value: 'SOD', label: 'SOD', short: '6 PM' },
  { value: 'MID', label: 'MID', short: '9:30 PM' },
  { value: 'EOD', label: 'EOD', short: 'Next day 3 AM' },
];

export const DEFAULT_DATE_END_SLOT: DateEndSlot = 'SOD';

export function normalizeDateEndSlot(value: unknown): DateEndSlot {
  const slot = String(value ?? '').toUpperCase();
  if (slot === 'SOD' || slot === 'MID' || slot === 'EOD') return slot;
  return DEFAULT_DATE_END_SLOT;
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function resolveDateModeEnd(
  dueDateISO: string,
  slot: DateEndSlot
): { endDate: string; endTime: string } {
  switch (slot) {
    case 'SOD':
      return { endDate: dueDateISO, endTime: '18:00' };
    case 'MID':
      return { endDate: dueDateISO, endTime: '21:30' };
    case 'EOD':
      return { endDate: addDaysISO(dueDateISO, 1), endTime: '03:00' };
  }
}

export function parseScheduleDateTime(dateStr: string, timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(dateStr + 'T00:00:00');
  d.setHours(h || 0, m || 0, 0, 0);
  return d.getTime();
}

export function getDateEndSlot(item: TimelineItem): DateEndSlot | null {
  const slot = String(item.custom_fields?.date_end_slot ?? '').toUpperCase();
  if (slot === 'SOD' || slot === 'MID' || slot === 'EOD') return slot;
  return null;
}

export function getDateModeEndPoint(
  endDate: string,
  slot: DateEndSlot | null | undefined
): { endDate: string; endTime: string } {
  if (slot === 'SOD' || slot === 'MID' || slot === 'EOD') {
    return resolveDateModeEnd(endDate, slot);
  }
  return { endDate, endTime: '23:59' };
}

export function getDateModeScheduleWindow(
  startDate: string,
  endDate: string,
  slot: DateEndSlot | null | undefined
): { startMs: number; endMs: number; resolvedEndDate: string; endTime: string } | null {
  if (!startDate || !endDate) return null;
  const { endDate: resolvedEndDate, endTime } = getDateModeEndPoint(endDate, slot);
  const startMs = parseScheduleDateTime(startDate, '00:00');
  const endMs = parseScheduleDateTime(resolvedEndDate, endTime);
  if (endMs <= startMs) return null;
  return { startMs, endMs, resolvedEndDate, endTime };
}

export function formatDateEndSlotLabel(slot: DateEndSlot): string {
  const opt = DATE_END_SLOT_OPTIONS.find((o) => o.value === slot);
  return opt ? `${opt.label} (${opt.short})` : slot;
}

export const MAX_END_DURATION_HOURS = 24;

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function currentTimeSlot(): string {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function currentHourSlot(): string {
  const h = String(new Date().getHours()).padStart(2, '0');
  return `${h}:00`;
}

export function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return options;
}

export function ensureTimeInOptions(time: string, options: string[]): string[] {
  if (!time || options.includes(time)) return options;
  return [...options, time].sort();
}

export function generateHourOptions(): string[] {
  return Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);
}

export function addHoursToTime(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalMins = h * 60 + (m || 0) + hours * 60;
  const nh = Math.floor(totalMins / 60) % 24;
  const nm = totalMins % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

export function addHoursToDateTime(
  dayISO: string,
  startTime: string,
  hours: number
): { endDate: string; endTime: string; crossesDay: boolean } {
  const [h, m] = startTime.split(':').map(Number);
  const start = new Date(
    `${dayISO}T${String(h).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}:00`
  );
  const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
  const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
  const endTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
  return { endDate, endTime, crossesDay: endDate !== dayISO };
}

export function formatShortDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export interface EndDurationOption {
  value: number;
  hoursLabel: string;
  endTime: string;
  endDate: string;
  crossesDay: boolean;
}

export function formatEndDurationDetail(opt: EndDurationOption): string {
  const time = formatTime12(opt.endTime);
  return opt.crossesDay ? `${time} · ${formatShortDate(opt.endDate)}` : time;
}

export function getEndDurationOption(
  options: EndDurationOption[],
  hours: number
): EndDurationOption | undefined {
  return options.find((opt) => opt.value === hours);
}

export function getEndDurationOptions(startTime: string, dayISO?: string): EndDurationOption[] {
  const day = dayISO || todayISO();
  const time = startTime || currentTimeSlot();

  return Array.from({ length: MAX_END_DURATION_HOURS }, (_, i) => {
    const hours = i + 1;
    const { endTime, endDate, crossesDay } = addHoursToDateTime(day, time, hours);
    const hoursLabel = hours === 1 ? 'Next 1 hour' : `Next ${hours} hours`;

    return {
      value: hours,
      hoursLabel,
      endTime,
      endDate,
      crossesDay,
    };
  });
}

export function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function getTimelineMode(item: TimelineItem): TimelineMode {
  const mode = item.custom_fields?.timeline_mode;
  if (mode === 'same_day') return 'same_day';
  if (mode === 'date') return 'date';
  if (item.custom_fields?.start_time) return 'same_day';
  return 'date';
}

export function parseAssignTo(value: string | undefined | null): string[] {
  if (!value || !value.trim()) return [];
  return value.split(',').map((e) => e.trim()).filter(Boolean);
}

export function joinAssignTo(emails: string[]): string {
  return emails.join(', ');
}

export function getAssignTo(item: TimelineAssignSource): string {
  const main = item.custom_fields?.assign_main;
  const cc = item.custom_fields?.assign_cc;
  if (typeof main === 'string' && main.trim()) {
    const ccStr = typeof cc === 'string' ? cc.trim() : '';
    return ccStr ? `${main.trim()} (CC: ${ccStr})` : main.trim();
  }

  const fromCustom = item.custom_fields?.assign_to;
  if (typeof fromCustom === 'string' && fromCustom.trim()) return fromCustom;
  return item.title || '';
}

export function getAssignMain(item: TimelineAssignSource): string {
  const main = item.custom_fields?.assign_main;
  if (typeof main === 'string' && main.trim()) return main.trim();

  const list = parseAssignTo(
    typeof item.custom_fields?.assign_to === 'string'
      ? item.custom_fields.assign_to
      : item.title || ''
  );
  return list[0] || '';
}

export function getAssignCcList(item: TimelineAssignSource): string[] {
  const cc = item.custom_fields?.assign_cc;
  if (typeof cc === 'string' && cc.trim()) {
    return parseAssignTo(cc).filter((email) => email !== getAssignMain(item));
  }

  const list = parseAssignTo(
    typeof item.custom_fields?.assign_to === 'string'
      ? item.custom_fields.assign_to
      : item.title || ''
  );
  if (list.length <= 1) return [];
  return list.slice(1);
}

export function getAssignToList(item: TimelineAssignSource): string[] {
  const main = getAssignMain(item);
  if (!main) return parseAssignTo(getAssignTo(item));
  const cc = getAssignCcList(item);
  return [main, ...cc];
}

export type EmployeeAssignRole = 'main' | 'cc';

function assigneeIdentityVariants(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.toLowerCase() === 'self') {
    return ['avinash@ae-research.com'];
  }

  return [trimmed];
}

export function assigneesMatch(a: string, b: string): boolean {
  const left = assigneeIdentityVariants(a).map((v) => v.toLowerCase());
  const right = assigneeIdentityVariants(b).map((v) => v.toLowerCase());
  return left.some((v) => right.includes(v));
}

export function getEmployeeAssignRole(
  item: TimelineAssignSource,
  assignee: string
): EmployeeAssignRole | null {
  if (!assignee.trim()) return null;

  const main = getAssignMain(item);
  if (main && assigneesMatch(main, assignee)) return 'main';

  const ccList = getAssignCcList(item);
  if (ccList.some((cc) => assigneesMatch(cc, assignee))) return 'cc';

  return null;
}

export function isAssignedToEmployee(item: TimelineAssignSource, assignee: string): boolean {
  return getEmployeeAssignRole(item, assignee) !== null;
}

export function isMainAssigneeForEmployee(item: TimelineAssignSource, assignee: string): boolean {
  return getEmployeeAssignRole(item, assignee) === 'main';
}

export function itemToAssignState(item: TimelineItem) {
  return {
    assign_main: getAssignMain(item),
    assign_cc: joinAssignTo(getAssignCcList(item)),
  };
}

export interface TimelineItemInput {
  timeline_mode: TimelineMode;
  assign_main: string;
  assign_cc: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_duration_hours?: number;
  date_end_slot?: DateEndSlot;
  reminder_percents?: number[];
}

export const MANDATORY_REMINDER_PERCENTS: number[] = [75];
export const OVERDUE_REMINDER_PERCENT = 100;
export const REMINDER_PERCENT_OPTIONS = [50, 70, 80, 90, 95] as const;
export const DEFAULT_OPTIONAL_REMINDER_PERCENTS: number[] = [];

/** @deprecated use DEFAULT_OPTIONAL_REMINDER_PERCENTS */
export const DEFAULT_REMINDER_PERCENTS = DEFAULT_OPTIONAL_REMINDER_PERCENTS;

const OPTIONAL_REMINDER_SET = new Set<number>(REMINDER_PERCENT_OPTIONS);

export function normalizeOptionalReminderPercents(value: unknown): number[] {
  if (value === undefined || value === null) {
    return [];
  }

  const raw: number[] = Array.isArray(value)
    ? value.map((v) => (typeof v === 'number' ? v : parseInt(String(v ?? ''), 10)))
    : [typeof value === 'number' ? value : parseInt(String(value ?? ''), 10)];

  const normalized = raw
    .filter((n) => Number.isFinite(n) && OPTIONAL_REMINDER_SET.has(n))
    .filter((n) => !MANDATORY_REMINDER_PERCENTS.includes(n));

  return Array.from(new Set(normalized)).sort((a, b) => a - b);
}

export function mergeEffectiveReminderPercents(optionalPercents: number[]): number[] {
  const merged = [...MANDATORY_REMINDER_PERCENTS, ...normalizeOptionalReminderPercents(optionalPercents)];
  return Array.from(new Set(merged)).sort((a, b) => a - b);
}

/** @deprecated use normalizeOptionalReminderPercents */
export function normalizeReminderPercents(value: unknown): number[] {
  return mergeEffectiveReminderPercents(normalizeOptionalReminderPercents(value));
}

/** @deprecated use normalizeOptionalReminderPercents */
export function normalizeReminderPercent(value: unknown): number {
  return mergeEffectiveReminderPercents(normalizeOptionalReminderPercents(value))[0]
    ?? MANDATORY_REMINDER_PERCENTS[0];
}

export function getOptionalReminderPercents(item: TimelineItem): number[] {
  const custom = item.custom_fields;
  if (custom?.reminder_percents !== undefined) {
    return normalizeOptionalReminderPercents(custom.reminder_percents);
  }
  if (custom?.reminder_percent !== undefined) {
    const single = typeof custom.reminder_percent === 'number'
      ? custom.reminder_percent
      : parseInt(String(custom.reminder_percent ?? ''), 10);
    if (Number.isFinite(single) && single === MANDATORY_REMINDER_PERCENTS[0]) {
      return [];
    }
    return normalizeOptionalReminderPercents(single);
  }
  return [];
}

export function getEffectiveReminderPercents(item: TimelineItem): number[] {
  return mergeEffectiveReminderPercents(getOptionalReminderPercents(item));
}

export function getReminderPercents(item: TimelineItem): number[] {
  return getEffectiveReminderPercents(item);
}

/** @deprecated use getEffectiveReminderPercents */
export function getReminderPercent(item: TimelineItem): number {
  return getEffectiveReminderPercents(item)[0] ?? MANDATORY_REMINDER_PERCENTS[0];
}

export function computeReminderTriggerMs(input: {
  timeline_mode: TimelineMode;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_duration_hours?: number;
  date_end_slot?: DateEndSlot;
  reminder_percent: number;
}): { triggerMs: number | null; endMs: number | null; remainingMsAtTrigger: number | null } {
  const percent = input.reminder_percent;
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
    return { triggerMs: null, endMs: null, remainingMsAtTrigger: null };
  }

  if (input.timeline_mode === 'same_day') {
    const day = input.start_date;
    if (!day) return { triggerMs: null, endMs: null, remainingMsAtTrigger: null };

    const startTime = input.start_time || '00:00';
    const duration = Math.min(Math.max(input.end_duration_hours || 1, 1), MAX_END_DURATION_HOURS);
    const { endDate, endTime } = addHoursToDateTime(day, startTime, duration);

    const parseAt = (dateStr: string, timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      const d = new Date(dateStr + 'T00:00:00');
      d.setHours(h || 0, m || 0, 0, 0);
      return d.getTime();
    };

    const startMs = parseAt(day, startTime);
    const endMs = parseAt(endDate, endTime);
    if (endMs <= startMs) return { triggerMs: null, endMs: null, remainingMsAtTrigger: null };

    const triggerMs = startMs + (endMs - startMs) * (percent / 100);
    return { triggerMs, endMs, remainingMsAtTrigger: endMs - triggerMs };
  }

  if (!input.start_date || !input.end_date) {
    return { triggerMs: null, endMs: null, remainingMsAtTrigger: null };
  }

  const window = getDateModeScheduleWindow(
    input.start_date,
    input.end_date,
    input.date_end_slot ?? null
  );
  if (!window) return { triggerMs: null, endMs: null, remainingMsAtTrigger: null };

  const { startMs, endMs } = window;
  const triggerMs = startMs + (endMs - startMs) * (percent / 100);
  return { triggerMs, endMs, remainingMsAtTrigger: endMs - triggerMs };
}

function formatDurationMs(ms: number): string {
  const abs = Math.abs(ms);
  const mins = Math.floor(abs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const h = hours % 24;
    return h > 0 ? `${days}d ${h}h` : `${days}d`;
  }
  if (hours > 0) {
    const m = mins % 60;
    return m > 0 ? `${hours}h ${m}m` : `${hours}h`;
  }
  return `${Math.max(mins, 1)}m`;
}

export function formatReminderTriggerPreview(input: {
  timeline_mode: TimelineMode;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_duration_hours?: number;
  date_end_slot?: DateEndSlot;
  reminder_percent: number;
}): { ready: boolean; summary: string; detail: string } {
  const percent = input.reminder_percent;
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
    return {
      ready: false,
      summary: 'Set the schedule above to preview when the reminder fires.',
      detail: '',
    };
  }

  const { triggerMs, remainingMsAtTrigger } = computeReminderTriggerMs(input);

  if (triggerMs === null || remainingMsAtTrigger === null) {
    return {
      ready: false,
      summary: 'Set the schedule above to preview when the reminder fires.',
      detail: '',
    };
  }

  const triggerDate = new Date(triggerMs);
  const when = triggerDate.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return {
    ready: true,
    summary: `${percent}% · ${formatDurationMs(remainingMsAtTrigger)} before due`,
    detail: `Triggers around ${when}`,
  };
}

export function formatReminderTriggersPreview(input: {
  timeline_mode: TimelineMode;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_duration_hours?: number;
  date_end_slot?: DateEndSlot;
  reminder_percents: number[];
}): {
  ready: boolean;
  optionalCount: number;
  totalCount: number;
  items: Array<{ percent: number; summary: string; detail: string; ready: boolean; mandatory?: boolean }>;
  emptyMessage: string;
} {
  const optional = normalizeOptionalReminderPercents(input.reminder_percents);
  const effective = mergeEffectiveReminderPercents(optional);

  const progressItems = effective.map((percent) => {
    const preview = formatReminderTriggerPreview({ ...input, reminder_percent: percent });
    return {
      percent,
      ...preview,
      mandatory: MANDATORY_REMINDER_PERCENTS.includes(percent),
    };
  });

  const overduePreview = formatReminderTriggerPreview({
    ...input,
    reminder_percent: OVERDUE_REMINDER_PERCENT,
  });
  const overdueItem = {
    percent: OVERDUE_REMINDER_PERCENT,
    summary: overduePreview.ready
      ? `${OVERDUE_REMINDER_PERCENT}% · Overdue when schedule ends`
      : `${OVERDUE_REMINDER_PERCENT}% · Overdue (hourly until done)`,
    detail: overduePreview.ready ? overduePreview.detail.replace('Triggers', 'Overdue email triggers') : 'First email when the schedule ends, then every hour until completed or hold.',
    ready: overduePreview.ready,
    mandatory: true,
  };

  const items = [...progressItems, overdueItem];
  const ready = items.some((item) => item.ready);

  return {
    ready,
    optionalCount: optional.length,
    totalCount: effective.length + 1,
    items,
    emptyMessage: '',
  };
}

export function validateTimelineItemInput(data: TimelineItemInput): string | null {
  if (!data.assign_main.trim()) {
    return 'Main assign is required';
  }
  if (!data.status) {
    return 'Status is required';
  }

  if (data.timeline_mode === 'date') {
    if (!data.start_date) return 'Start date is required';
    if (!data.end_date) return 'End date is required';
    if (data.start_date > data.end_date) return 'End date must be on or after start date';
  } else {
    if (!data.start_date) return 'Day is required';
    if (!data.start_time) return 'Start time is required';
    if (!data.end_duration_hours || data.end_duration_hours < 1) {
      return 'End duration is required';
    }
  }

  return null;
}

export const LAUNCH_END_DATE_MESSAGE = 'Project end date must be filled';

export const PROGRAMMING_QUESTIONNAIRE_MESSAGE =
  'Please share the questionnaire with the Bangalore team.';

export function showLaunchEndDateReminder(timelineType: string): void {
  if (timelineType === 'launch') {
    window.alert(LAUNCH_END_DATE_MESSAGE);
  }
}

export function showProgrammingQuestionnaireReminder(timelineType: string): void {
  if (timelineType === 'programming') {
    window.alert(PROGRAMMING_QUESTIONNAIRE_MESSAGE);
  }
}

export function toApiPayload(data: TimelineItemInput) {
  const main = data.assign_main.trim();
  const cc = data.assign_cc.trim();
  const assignToDisplay = cc ? `${main} (CC: ${cc})` : main;
  const base: Record<string, string | number | number[]> = {
    timeline_mode: data.timeline_mode,
    assign_main: main,
    assign_cc: cc,
    assign_to: assignToDisplay,
    reminder_percents: normalizeOptionalReminderPercents(data.reminder_percents),
  };

  if (data.timeline_mode === 'same_day') {
    const day = data.start_date || todayISO();
    const startTime = data.start_time || currentTimeSlot();
    const duration = Math.min(
      Math.max(data.end_duration_hours || 1, 1),
      MAX_END_DURATION_HOURS
    );
    const { endDate, endTime } = addHoursToDateTime(day, startTime, duration);

    return {
      title: main,
      description: data.description.trim(),
      status: data.status,
      start_date: day,
      due_date: endDate,
      custom_fields: {
        ...base,
        start_time: startTime,
        end_duration_hours: duration,
        end_time: endTime,
      },
    };
  }

  const slot = normalizeDateEndSlot(data.date_end_slot);
  const { endTime } = resolveDateModeEnd(data.end_date, slot);

  return {
    title: main,
    description: data.description.trim(),
    status: data.status,
    start_date: data.start_date,
    due_date: data.end_date,
    custom_fields: {
      ...base,
      date_end_slot: slot,
      end_time: endTime,
    },
  };
}

export function formatTimelineRange(item: TimelineItem): string {
  const mode = getTimelineMode(item);

  if (mode === 'same_day') {
    const startDay = item.start_date
      ? new Date(item.start_date + 'T00:00:00').toLocaleDateString()
      : '—';
    const endDay = item.due_date && item.due_date !== item.start_date
      ? new Date(item.due_date + 'T00:00:00').toLocaleDateString()
      : null;
    const startTime = String(item.custom_fields?.start_time || '');
    const endTime = String(item.custom_fields?.end_time || '');
    if (startTime && endTime) {
      const range = `${formatTime12(startTime)} → ${formatTime12(endTime)}`;
      if (endDay) return `${startDay} · ${range} (ends ${endDay})`;
      return `${startDay} · ${range}`;
    }
    return startDay;
  }

  const fmt = (d: string | null) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString() : '—';
  const due = item.due_date;
  if (!due) return fmt(item.start_date);

  const slot = getDateEndSlot(item);
  if (!slot) {
    return `${fmt(item.start_date)} → ${fmt(due)}`;
  }

  const { endDate: resolvedEndDate, endTime } = getDateModeEndPoint(due, slot);
  const slotOpt = DATE_END_SLOT_OPTIONS.find((o) => o.value === slot);
  const timePart = formatTime12(endTime);
  if (resolvedEndDate !== due) {
    return `${fmt(item.start_date)} → ${fmt(due)} · ${slotOpt?.label ?? slot} ${timePart} (${formatShortDate(resolvedEndDate)})`;
  }
  return `${fmt(item.start_date)} → ${fmt(due)} · ${slotOpt?.label ?? slot} ${timePart}`;
}

export function itemToFormState(item: TimelineItem) {
  const mode = getTimelineMode(item);
  return {
    timeline_mode: mode,
    start_date: item.start_date || todayISO(),
    end_date: item.due_date || '',
    start_time: String(item.custom_fields?.start_time || currentTimeSlot()),
    end_duration_hours: Number(item.custom_fields?.end_duration_hours || 1),
    date_end_slot: getDateEndSlot(item) ?? DEFAULT_DATE_END_SLOT,
    reminder_percents: getOptionalReminderPercents(item),
  };
}

/** Start timestamp for Gantt sort (earliest first). */
export function getItemScheduleStartMs(item: TimelineItem): number | null {
  const date = item.start_date || item.due_date;
  if (!date) return null;

  if (getTimelineMode(item) === 'same_day') {
    const time = String(item.custom_fields?.start_time || '00:00');
    const [h, m] = time.split(':').map(Number);
    const d = new Date(date + 'T00:00:00');
    d.setHours(h || 0, m || 0, 0, 0);
    return d.getTime();
  }

  return new Date(date + 'T00:00:00').getTime();
}

/** End timestamp for Gantt bars. */
export function getItemScheduleEndMs(item: TimelineItem): number | null {
  const date = item.due_date || item.start_date;
  if (!date) return null;

  if (getTimelineMode(item) === 'date') {
    const startDate = item.start_date || date;
    const window = getDateModeScheduleWindow(startDate, date, getDateEndSlot(item));
    return window?.endMs ?? new Date(date + 'T23:59:59').getTime();
  }

  if (getTimelineMode(item) === 'same_day') {
    const endTime = String(item.custom_fields?.end_time || item.custom_fields?.start_time || '23:59');
    const [h, m] = endTime.split(':').map(Number);
    const d = new Date(date + 'T00:00:00');
    d.setHours(h || 23, m || 59, 0, 0);
    return d.getTime();
  }

  return null;
}

export function getItemDurationMs(item: TimelineItem): number {
  const start = getItemScheduleStartMs(item);
  const end = getItemScheduleEndMs(item);
  if (start === null || end === null) return Number.MAX_SAFE_INTEGER;
  return Math.max(end - start, 60_000);
}

/** Sort: earliest start first, then shortest duration. */
export function sortItemsForGantt(items: TimelineItem[]): TimelineItem[] {
  return [...items].sort((a, b) => {
    const startA = getItemScheduleStartMs(a) ?? Number.MAX_SAFE_INTEGER;
    const startB = getItemScheduleStartMs(b) ?? Number.MAX_SAFE_INTEGER;
    if (startA !== startB) return startA - startB;
    return getItemDurationMs(a) - getItemDurationMs(b);
  });
}

export function getItemRemainingMs(item: TimelineItem): number | null {
  const end = getItemScheduleEndMs(item);
  if (end === null) return null;
  return end - Date.now();
}

export function formatTimeRemaining(remainingMs: number | null, status?: string): string {
  if (status === 'completed') return 'Completed';
  if (status === 'hold') return 'On hold';

  if (remainingMs === null) return 'No schedule';

  const absMs = Math.abs(remainingMs);
  const mins = Math.floor(absMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  let label: string;
  if (days > 0) {
    const h = hours % 24;
    label = h > 0 ? `${days}d ${h}h` : `${days}d`;
  } else if (hours > 0) {
    const m = mins % 60;
    label = m > 0 ? `${hours}h ${m}m` : `${hours}h`;
  } else {
    label = `${Math.max(mins, 1)}m`;
  }

  if (remainingMs < 0) {
    return `Overdue ${label}`;
  }
  if (remainingMs === 0) {
    return 'Due now';
  }

  return `${label} left`;
}

export function remainingUrgencyClass(remainingMs: number | null, status?: string): string {
  if (status === 'completed') return 'bg-slate-100 text-slate-500';
  if (status === 'hold') return 'bg-violet-50 text-violet-700 ring-1 ring-violet-200/60';
  if (remainingMs === null) return 'bg-slate-100 text-slate-500';
  if (remainingMs < 0) return 'bg-rose-100 text-rose-700 ring-1 ring-rose-200';
  if (remainingMs <= 3600000) return 'bg-orange-100 text-orange-800 ring-1 ring-orange-200';
  if (remainingMs <= 86400000) return 'bg-amber-100 text-amber-800 ring-1 ring-amber-200';
  return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
}
