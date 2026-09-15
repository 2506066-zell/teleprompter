'use client';

import { useState, useEffect, useCallback } from 'react';

export function useWakeLock(enabled: boolean = false) {
  const [isLocked, setIsLocked] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(typeof window !== 'undefined' && 'wakeLock' in navigator);
  }, []);

  const requestLock = useCallback(async () => {
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) return;
    try {
      const sentinel = await (navigator as any).wakeLock.request('screen');
      setIsLocked(true);

      sentinel.addEventListener('release', () => {
        setIsLocked(false);
      });

      return sentinel;
    } catch {
      setIsLocked(false);
    }
  }, []);

  useEffect(() => {
    let sentinelPromise: Promise<any> | undefined;

    if (enabled && isSupported) {
      sentinelPromise = requestLock();
    }

    return () => {
      if (sentinelPromise) {
        sentinelPromise.then((sentinel) => {
          if (sentinel && !sentinel.released) {
            sentinel.release().catch(() => {});
          }
        });
      }
    };
  }, [enabled, isSupported, requestLock]);

  return { isLocked, isSupported };
}
