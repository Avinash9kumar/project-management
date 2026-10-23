import { appPath } from '@/lib/config';

const ENABLED_KEY = 'ptt_notices_enabled';
const VIBRATE_PATTERN = [400, 150, 400, 150, 700];

let ringContext: AudioContext | null = null;

function ringAudio(): AudioContext | null {
  const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!ringContext) ringContext = new Ctx();
  return ringContext;
}

/** Four loud bursts of the classic telephone ring (440 Hz + 480 Hz). */
export function playTelephoneRing(): boolean {
  const ctx = ringAudio();
  if (!ctx) return false;
  const play = () => {
    const master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    const burst = (at: number) => {
      [440, 480].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.9, at + 0.02);
        gain.gain.setValueAtTime(0.9, at + 0.42);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.48);
        osc.connect(gain);
        gain.connect(master);
        osc.start(at);
        osc.stop(at + 0.5);
      });
    };
    const start = ctx.currentTime + 0.02;
    burst(start);
    burst(start + 0.62);
    burst(start + 1.24);
    burst(start + 1.86);
  };
  if (ctx.state === 'suspended') {
    ctx.resume().then(play).catch(() => undefined);
    return true;
  }
  play();
  return true;
}

function vibrateDevice(): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(VIBRATE_PATTERN);
  }
}

export function notificationsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (localStorage.getItem(ENABLED_KEY) === '0') return false;
  return notificationPermission() === 'granted';
}

export function setNotificationsEnabled(on: boolean): void {
  localStorage.setItem(ENABLED_KEY, on ? '1' : '0');
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function registerNotificationWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  const scope = appPath('/');
  const registration = await navigator.serviceWorker.register(appPath('/sw.js'), { scope });
  await registration.update().catch(() => undefined);
  return registration;
}

function assetUrl(path: string): string {
  return new URL(appPath(path), window.location.origin).href;
}

function notificationOptions(title: string, body: string, tag?: string): NotificationOptions {
  return {
    body,
    tag: tag || title,
    renotify: true,
    icon: assetUrl('/icon.png?v=4'),
    badge: assetUrl('/badge.png?v=4'),
    silent: true,
    vibrate: VIBRATE_PATTERN,
    data: { url: assetUrl('/report/') },
  } as NotificationOptions;
}

async function showSystemNotification(title: string, body: string, tag?: string): Promise<void> {
  const options = notificationOptions(title, body, tag);
  if ('serviceWorker' in navigator) {
    try {
      await registerNotificationWorker();
      const ready = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<ServiceWorkerRegistration>((_, reject) => {
          window.setTimeout(() => reject(new Error('notification worker not ready')), 4000);
        }),
      ]);
      await ready.showNotification(title, options);
      return;
    } catch {
      // Fall through to a page notification when the worker is unavailable.
    }
  }
  new Notification(title, options);
}

export async function enableNotifications(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    setNotificationsEnabled(true);
    try {
      await registerNotificationWorker();
    } catch {
      // The page can still show a notification without the worker.
    }
    showAppNotification(
      'Notifications on',
      'Alerts use the same times as reminder emails: check-ins, then hourly once overdue.'
    );
  }
  return permission;
}

export function showAppNotification(title: string, body: string, _quietPoll = false, tag?: string): void {
  if (typeof window === 'undefined') return;
  if (!notificationsEnabled()) return;
  playTelephoneRing();
  vibrateDevice();

  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  showSystemNotification(title, body, tag).catch(() => undefined);
}
