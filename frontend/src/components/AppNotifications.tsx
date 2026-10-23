'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getEmployeeReport, getTimelineReport } from '@/lib/api';
import {
  enableNotifications,
  notificationsEnabled,
  registerNotificationWorker,
  setNotificationsEnabled,
  showAppNotification,
} from '@/lib/notify';
import { getEffectiveReminderPercents } from '@/lib/timeline-utils';
import { TimelineItem, TimelineReportItem } from '@/lib/types';

/** Same cadence as the overdue assignee email. */
const OVERDUE_REPEAT_MS = 60 * 60 * 1000;

type SnapshotEntry = {
  notified: number[];
  overdueAt: number | null;
};

type Snapshot = Record<string, SnapshotEntry>;

function snapshotKey(scope: string): string {
  return `ptt_notice_snapshot_v2_${scope}`;
}

function reminderItem(item: TimelineReportItem): TimelineItem {
  return item as unknown as TimelineItem;
}

function isInactive(item: TimelineReportItem): boolean {
  return item.status === 'completed' || item.status === 'hold';
}

function isOverdue(item: TimelineReportItem): boolean {
  return !isInactive(item) && item.progress_percent !== null && item.progress_percent >= 100;
}

function reachedThresholds(item: TimelineReportItem): number[] {
  if (isInactive(item) || item.progress_percent === null || item.progress_percent >= 100) return [];
  const progress = item.progress_percent;
  return getEffectiveReminderPercents(reminderItem(item)).filter((percent) => progress >= percent);
}

function readSnapshot(key: string): Snapshot | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Snapshot;
    if (!parsed || typeof parsed !== 'object') return null;
    const first = Object.values(parsed)[0];
    if (first && !Array.isArray(first.notified)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSnapshot(key: string, snapshot: Snapshot) {
  localStorage.setItem(key, JSON.stringify(snapshot));
}

function ticketBody(item: TimelineReportItem): string {
  return `${item.project_title} · ${item.assign_to || 'Assigned'}`;
}

export function NotificationBell({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(notificationsEnabled());
  }, []);

  const toggle = async () => {
    if (on) {
      setNotificationsEnabled(false);
      setOn(false);
      return;
    }
    const next = await enableNotifications();
    const enabled = next === 'granted';
    setNotificationsEnabled(enabled);
    setOn(enabled);
  };

  const light = variant === 'light';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={toggle}
      title={on ? 'Notifications on. Tap to turn off.' : 'Notifications off. Tap to turn on.'}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg p-1.5 transition ${
        light
          ? on
            ? 'bg-indigo-50 text-indigo-700'
            : 'border border-slate-200 text-slate-400 hover:bg-slate-50'
          : on
            ? 'bg-white/15 text-white'
            : 'text-white/50 hover:bg-white/10 hover:text-white'
      }`}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 11-6 0"
        />
        {!on && <path strokeLinecap="round" d="M5 5l14 14" />}
      </svg>
    </button>
  );
}

export function NotificationToasts() {
  const [toasts, setToasts] = useState<Array<{ id: number; title: string; body: string }>>([]);

  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<{ title: string; body: string }>).detail;
      if (!detail?.title) return;
      const id = Date.now() + Math.random();
      setToasts((current) => [...current.slice(-2), { id, title: detail.title, body: detail.body }]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 6000);
    };
    window.addEventListener('ptt-toast', onToast);
    return () => window.removeEventListener('ptt-toast', onToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex flex-col gap-2 p-3 pt-[max(4.5rem,env(safe-area-inset-top))] sm:inset-x-auto sm:right-4 sm:w-80">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-xl shadow-slate-400/30 ring-1 ring-slate-200/70 backdrop-blur">
          <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
          <div className="p-3">
            <p className="text-sm font-semibold text-slate-950">{toast.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{toast.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationWatcher() {
  const { user } = useAuth();
  const pathname = usePathname();
  const onAssigneeLink = pathname?.includes('/employee/view') ?? false;

  useEffect(() => {
    const linkToken = new URLSearchParams(window.location.search).get('token') || '';
    if (!user) return;
    if (onAssigneeLink && !linkToken) return;
    if (!onAssigneeLink && user.role === 'employee') return;

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      registerNotificationWorker().catch(() => undefined);
    }

    const key = snapshotKey(onAssigneeLink ? `link_${user.username}_${linkToken.slice(0, 16)}` : `admin_${user.username}`);
    let stopped = false;

    const check = async () => {
      try {
        const data = onAssigneeLink
          ? await getEmployeeReport(linkToken)
          : await getTimelineReport();
        if (stopped) return;
        if (!notificationsEnabled()) return;
        const items = data.items;
        const now = Date.now();
        const previous = readSnapshot(key) ?? {};

        const next: Snapshot = {};
        const reminders: Array<{ item: TimelineReportItem; percent: number }> = [];
        const overdue: TimelineReportItem[] = [];

        for (const item of items) {
          const id = String(item.id);
          const stored = previous[id];
          const prior: SnapshotEntry =
            stored && Array.isArray(stored.notified)
              ? stored
              : { notified: [], overdueAt: null };

          const progress = item.progress_percent;
          const configured = new Set(getEffectiveReminderPercents(reminderItem(item)));
          let notified = prior.notified.filter(
            (percent) => configured.has(percent) && progress !== null && progress >= percent
          );

          if (!isInactive(item) && progress !== null && progress < 100) {
            const due = reachedThresholds(item).filter((percent) => !notified.includes(percent));
            if (due.length > 0) {
              const highest = Math.max(...due);
              reminders.push({ item, percent: highest });
              notified = [...notified, ...due];
            }
          }

          let overdueAt = prior.overdueAt;
          if (!isOverdue(item)) {
            overdueAt = null;
          } else if (overdueAt === null || now - overdueAt >= OVERDUE_REPEAT_MS) {
            overdue.push(item);
            overdueAt = now;
            notified = Array.from(configured);
          }

          next[id] = { notified, overdueAt };
        }

        writeSnapshot(key, next);

        if (reminders.length === 1) {
          const hit = reminders[0];
          showAppNotification(
            `Reminder — ${hit.percent}% check-in`,
            ticketBody(hit.item),
            false,
            `reminder-${hit.item.id}-${hit.percent}`
          );
        } else if (reminders.length > 1) {
          showAppNotification('Reminders', `${reminders.length} tickets reached a check-in.`, false, `reminders-${now}`);
        }

        if (overdue.length === 1) {
          showAppNotification('Schedule ended', ticketBody(overdue[0]), false, `overdue-${overdue[0].id}-${now}`);
        } else if (overdue.length > 1) {
          showAppNotification('Schedule ended', `${overdue.length} tickets are overdue.`, false, `overdue-${now}`);
        }
      } catch {
        // Keep the current page usable if a background check fails.
      }
    };

    check();
    const timer = window.setInterval(check, 45000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [user, onAssigneeLink]);

  return null;
}
