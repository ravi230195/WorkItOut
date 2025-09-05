import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '../utils/logging';

export interface WorkoutSummary {
  count: number;
  totalMinutes: number;
  lastUpdated: number;
}

function todayWindow() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return { start, end: now };
}

async function readTodayWorkoutsNative(): Promise<WorkoutSummary> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    const platform = Capacitor.getPlatform();

    if (platform !== 'ios') {
      // Apple Fitness/HealthKit are iOS; return 0 on others for now
      return { count: 0, totalMinutes: 0, lastUpdated: Date.now() };
    }

    const { start, end } = todayWindow();
    try {
      const { Health } = await import('capacitor-health');

      const avail = await Health.isHealthAvailable();
      if (!avail?.available) return { count: 0, totalMinutes: 0, lastUpdated: Date.now() };

      // Request read permission for workouts
      // Permission key mirrors steps style; plugin accepts strings
      await Health.requestHealthPermissions({ permissions: ['READ_WORKOUTS'] });

      // Attempt to read workout samples first
      let samples: any[] = [];
      try {
        const res: any = await (Health as any).querySamples?.({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          dataType: 'workouts',
        });
        if (Array.isArray(res?.samples)) samples = res.samples;
      } catch (e) {
        logger.debug('[workouts] querySamples not available or failed, will try aggregated:', e);
      }

      // Fallback to aggregated count if samples not available
      if (!samples.length) {
        try {
          const agg: any = await Health.queryAggregated({
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            dataType: 'workouts',
            bucket: 'day',
          });
          const rows: any[] = Array.isArray(agg?.aggregatedData) ? agg.aggregatedData : [];
          const count = rows.reduce((sum, r) => sum + (Number(r?.count ?? r?.value) || 0), 0);
          return { count, totalMinutes: 0, lastUpdated: Date.now() };
        } catch (e) {
          logger.warn('[workouts] Aggregated read failed:', e);
        }
      }

      // Compute duration from samples
      let count = 0;
      let totalMinutes = 0;
      const toMs = (v: any) => (typeof v === 'number' ? v : Date.parse(String(v)));
      for (const s of samples) {
        const sd = toMs(s?.startDate ?? s?.startTime);
        const ed = toMs(s?.endDate ?? s?.endTime);
        if (!sd || !ed) continue;
        const minutes = Math.max(0, (ed - sd) / 60000);
        totalMinutes += minutes;
        count += 1;
      }
      return { count, totalMinutes: Math.round(totalMinutes), lastUpdated: Date.now() };
    } catch (e) {
      logger.warn('[workouts] iOS Health read failed:', e);
      return { count: 0, totalMinutes: 0, lastUpdated: Date.now() };
    }
  } catch (err) {
    logger.warn('[workouts] readTodayWorkoutsNative fallback to 0:', err);
    return { count: 0, totalMinutes: 0, lastUpdated: Date.now() };
  }
}

export function useWorkoutTracking(): {
  count: number;
  totalMinutes: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
} {
  const [summary, setSummary] = useState<WorkoutSummary>({ count: 0, totalMinutes: 0, lastUpdated: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const lastReadRef = useRef<number>(0);

  const shouldRead = useCallback(() => {
    const now = Date.now();
    return now - lastReadRef.current >= 10 * 60 * 1000; // 10 minutes
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    lastReadRef.current = Date.now();
    try {
      const s = await readTodayWorkoutsNative();
      setSummary(s);
    } catch (e) {
      logger.error('❌ [workouts] Error during read:', e);
      setSummary({ count: 0, totalMinutes: 0, lastUpdated: Date.now() });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial read
    refresh();
    const id = setInterval(() => { if (shouldRead()) refresh(); }, 60000);
    return () => clearInterval(id);
  }, [refresh, shouldRead]);

  return { count: summary.count, totalMinutes: summary.totalMinutes, isLoading, refresh };
}

