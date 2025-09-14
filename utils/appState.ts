import { App } from '@capacitor/app';
import { useEffect, useRef } from 'react';
import { localCache } from './cache/localCache';

interface Saver<T = unknown> {
  key: string;
  save: () => T;
  restore: (value: T) => void;
}

const savers: Saver[] = [];

export function registerAppStateSaver<T>(
  key: string,
  save: () => T,
  restore: (value: T) => void
) {
  savers.push({ key, save, restore });
  return () => {
    const i = savers.findIndex(
      (s) => s.key === key && s.save === save && s.restore === restore
    );
    if (i >= 0) savers.splice(i, 1);
  };
}

function handleStateChange(isActive: boolean) {
  if (!isActive) {
    savers.forEach(({ key, save }) => {
      try {
        const data = save();
        localCache.set(`appstate:${key}`, data);
      } catch {
        /* ignore */
      }
    });
  } else {
    savers.forEach(({ key, restore }) => {
      const data = localCache.get(`appstate:${key}`, Number.MAX_SAFE_INTEGER);
      if (data !== null) {
        try {
          restore(data);
        } finally {
          localCache.remove(`appstate:${key}`);
        }
      }
    });
  }
}

export function useAppStateSaver<T>(key: string, data: T, setData: (value: T) => void) {
  const ref = useRef(data);
  useEffect(() => {
    ref.current = data;
  }, [data]);
  useEffect(() => registerAppStateSaver(key, () => ref.current, setData), [key, setData]);
}

App.addListener('appStateChange', ({ isActive }) => handleStateChange(isActive));

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () =>
    handleStateChange(document.visibilityState === 'visible')
  );
}
