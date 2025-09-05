import { useState, useEffect, useRef, useCallback } from 'react';
import { supabaseAPI } from '../utils/supabase/supabase-api';
import { useAuth } from '../components/AuthContext';
import { logger } from '../utils/logging';

/** Types */
interface StepData {
  steps: number;
  lastUpdated: number;
  goal: number;
}

interface UseStepTrackingReturn {
  steps: number;
  goal: number;
  progressPercentage: number;
  isLoading: boolean;
  refreshStepGoal: () => Promise<void>;
  forceRefreshStepData: () => Promise<void>;
}

/** Time window: local midnight → NOW */
function todayWindow() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0); // local 00:00
  const end = now; // ✅ Option 2: end at "now" (not 23:59:59.999)
  return { start, end };
}

/**
 * Read today's steps from native sources.
 * - iOS: capacitor-health (Apple Health)
 * - Android: @kiwi-health/capacitor-health-connect (Health Connect)
 * - Web/unsupported: 0
 * Uses dynamic imports so web bundles don’t include native libs.
 */
async function readTodayStepsNative(): Promise<number> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    const platform = Capacitor.getPlatform();

    // Web and other platforms → 0
    if (platform !== 'ios' && platform !== 'android') return 0;

    const { start, end } = todayWindow();

    if (platform === 'ios') {
      try {
        const { Health } = await import('capacitor-health');

        const avail = await Health.isHealthAvailable();
        if (!avail?.available) return 0;

        await Health.requestHealthPermissions({ permissions: ['READ_STEPS'] });

        // Debug: Log what we're sending to HealthKit
        logger.debug('[steps] Sending to HealthKit:', {
          startDate: start.toISOString(),
          endDate: end.toISOString(), // ✅ now
          startLocal: start.toLocaleString(),
          endLocal: end.toLocaleString()
        });

        const res: any = await Health.queryAggregated({
          startDate: start.toISOString(),
          endDate: end.toISOString(), // ✅ now
          dataType: 'steps',
          bucket: 'day',
        });

        // Debug: Log what HealthKit returned
        logger.debug('[steps] HealthKit response:', res);

        const rows: any[] = Array.isArray(res?.aggregatedData) ? res.aggregatedData : [];
        
        // Debug: Log each data row with proper time formatting
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const fmtLocal = (ms: number) =>
          new Date(ms).toLocaleString('en-GB', { timeZone: tz, hour12: false });
        
        rows.forEach((r, index) => {
          logger.debug(
            `[steps] Row ${index}:`,
            fmtLocal(r.startDate),
            '→',
            fmtLocal(r.endDate),
            'Steps:', r.value,
            'tz:', tz
          );
        });

        const total = rows.reduce((sum, row) => sum + (Number(row?.value) || 0), 0);
        return Math.round(total);
      } catch (e) {
        logger.warn('[steps] iOS Health read failed:', e);
        return 0;
      }
    }

    if (platform === 'android') {
      try {
        const { HealthConnect } = await import('@kiwi-health/capacitor-health-connect');

        const avail: any = await HealthConnect.checkAvailability();
        if (avail?.availability !== 'Available') return 0;

        const perm: any = await HealthConnect.requestHealthPermissions({
          read: ['Steps'],
          write: [],
        });
        if (!perm?.hasAllPermissions) return 0;

        const res: any = await HealthConnect.readRecords({
          type: 'Steps',
          timeRangeFilter: {
            type: 'between',
            startTime: start, // plugin accepts Date
            endTime: end,     // ✅ now
          },
        });

        // Debug: Log what Health Connect returned
        logger.debug('[steps] Health Connect response:', res);

        const records: any[] = Array.isArray(res?.records) ? res.records : [];
        
        // Debug: Log each record
        records.forEach((r, index) => {
          logger.debug(
            `[steps] Record ${index}:`,
            'Steps:', r?.count,
            'Time:', r?.startTime
          );
        });

        const total = records.reduce((sum, r) => sum + (Number(r?.count) || 0), 0);
        return Math.round(total);
      } catch (e) {
        logger.warn('[steps] Android Health Connect read failed:', e);
        return 0;
      }
    }

    return 0;
  } catch (err) {
    logger.warn('[steps] readTodayStepsNative fallback to 0:', err);
    return 0;
  }
}

/** Hook */
export function useStepTracking(isOnDashboard: boolean): UseStepTrackingReturn {
  const [stepData, setStepData] = useState<StepData>({
    steps: 0,
    lastUpdated: 0,
    goal: 10000,
  });
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastReadRef = useRef<number>(0);
  const { userToken } = useAuth();

  // Foreground check
  const isAppInForeground = useCallback(() => !document.hidden, []);

  // Read only every 10 minutes unless forced
  const shouldReadStepData = useCallback(() => {
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    return now - lastReadRef.current >= tenMinutes;
  }, []);

  // Load goal from Supabase (no health calls)
  const refreshStepGoal = useCallback(async () => {
    if (!userToken) return;
    try {
      const goal = await supabaseAPI.getUserStepGoal();
      setStepData(prev => ({ ...prev, goal }));
    } catch (error) {
      logger.error('❌ [steps] Error loading step goal:', error);
    }
  }, [userToken]);

  // Read steps from native
  const readStepData = useCallback(
    async (forceRead: boolean = false) => {
      if (!forceRead && (!isOnDashboard || !isAppInForeground() || !shouldReadStepData())) return;

      setIsLoading(true);
      lastReadRef.current = Date.now();

      try {
        const steps = await readTodayStepsNative();
        setStepData(prev => ({
          steps,
          lastUpdated: Date.now(),
          goal: prev.goal,
        }));
      } catch (error) {
        logger.error('❌ [steps] Error during read:', error);
        setStepData(prev => ({
          steps: 0,
          lastUpdated: Date.now(),
          goal: prev.goal,
        }));
      } finally {
        setIsLoading(false);
      }
    },
    [isOnDashboard, isAppInForeground, shouldReadStepData]
  );

  // Force refresh (bypass 10-minute rule)
  const forceRefreshStepData = useCallback(async () => {
    await readStepData(true);
  }, [readStepData]);

  // Init: load goal once when authed
  useEffect(() => {
    if (userToken) refreshStepGoal();
  }, [userToken, refreshStepGoal]);

  // Poll: check conditions every minute, read if 10+ mins passed
  useEffect(() => {
    if (isOnDashboard && userToken) {
      readStepData(); // initial
      intervalRef.current = setInterval(() => readStepData(), 60000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [isOnDashboard, userToken, readStepData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const progressRaw = stepData.goal > 0 ? (stepData.steps / stepData.goal) * 100 : 0;
  const progressPercentage = Math.min(Math.max(progressRaw, 0), 100);

  return {
    steps: stepData.steps,
    goal: stepData.goal,
    progressPercentage,
    isLoading,
    refreshStepGoal,
    forceRefreshStepData,
  };
}
