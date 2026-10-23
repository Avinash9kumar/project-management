'use client';

import { useEffect } from 'react';

const IDLE_MS = 15 * 60 * 1000;

/** Reload the page after 15 minutes with no clicks, typing, scrolling, or pointer movement. */
export function useIdleRefresh(idleMs = IDLE_MS) {
  useEffect(() => {
    let timer = window.setTimeout(() => window.location.reload(), idleMs);
    let lastMove = 0;

    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => window.location.reload(), idleMs);
    };

    const onMove = () => {
      const now = Date.now();
      if (now - lastMove < 5000) return;
      lastMove = now;
      arm();
    };

    const events = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const;
    events.forEach((event) => window.addEventListener(event, arm, { passive: true }));
    window.addEventListener('scroll', arm, { capture: true, passive: true });
    window.addEventListener('mousemove', onMove, { passive: true });

    return () => {
      window.clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, arm));
      window.removeEventListener('scroll', arm, { capture: true });
      window.removeEventListener('mousemove', onMove);
    };
  }, [idleMs]);
}
