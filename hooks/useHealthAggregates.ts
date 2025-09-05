import { logger } from "../utils/logging";

type Platform = 'ios' | 'android' | 'web' | string;

const getPlatform = async (): Promise<Platform> => {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.getPlatform();
  } catch {
    return 'web';
  }
};

export type DayKey = string; // e.g., "9/5" (M/D)

export interface StepsDayEntry { steps: number }
export interface WorkoutDayEntry { count: number; minutes: number }

export async function fetchStepsByDay(start: Date, end: Date): Promise<Record<DayKey, StepsDayEntry>> {
  const platform = await getPlatform();
  if (platform !== 'ios') return {};

  try {
    const { Health } = await import('capacitor-health');
    const avail = await Health.isHealthAvailable();
    if (!avail?.available) return {};

    const res: any = await Health.queryAggregated({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      dataType: 'steps',
      bucket: 'day',
    });
    const rows: any[] = Array.isArray(res?.aggregatedData) ? res.aggregatedData : [];
    const out: Record<DayKey, StepsDayEntry> = {};
    rows.forEach((r) => {
      const d = new Date(r.startDate);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      out[key] = { steps: Math.round(Number(r?.value) || 0) };
    });
    return out;
  } catch (e) {
    logger.warn('[healthAgg] fetchStepsByDay failed:', e);
    return {};
  }
}

export async function fetchWorkoutsByDay(start: Date, end: Date): Promise<Record<DayKey, WorkoutDayEntry>> {
  const platform = await getPlatform();
  if (platform !== 'ios') return {};

  try {
    const { Health } = await import('capacitor-health');
    const avail = await Health.isHealthAvailable();
    if (!avail?.available) return {};

    await Health.requestHealthPermissions({ permissions: ['READ_WORKOUTS'] });

    let samples: any[] = [];
    try {
      const res: any = await (Health as any).querySamples?.({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        dataType: 'workouts',
      });
      if (Array.isArray(res?.samples)) samples = res.samples;
    } catch (e) {
      logger.debug('[healthAgg] workouts querySamples failed, fallback to aggregated:', e);
    }

    const out: Record<DayKey, WorkoutDayEntry> = {};
    const toMs = (v: any) => (typeof v === 'number' ? v : Date.parse(String(v)));
    if (samples.length) {
      for (const s of samples) {
        const sd = new Date(toMs(s?.startDate ?? s?.startTime));
        const ed = new Date(toMs(s?.endDate ?? s?.endTime));
        const key = `${sd.getMonth() + 1}/${sd.getDate()}`;
        const minutes = Math.max(0, (ed.getTime() - sd.getTime()) / 60000);
        out[key] = out[key] || { count: 0, minutes: 0 };
        out[key].count += 1;
        out[key].minutes += minutes;
      }
      // round minutes
      for (const k of Object.keys(out)) out[k].minutes = Math.round(out[k].minutes);
      return out;
    }

    // Fallback: try aggregated count
    try {
      const agg: any = await Health.queryAggregated({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        dataType: 'workouts',
        bucket: 'day',
      });
      const rows: any[] = Array.isArray(agg?.aggregatedData) ? agg.aggregatedData : [];
      rows.forEach((r) => {
        const d = new Date(r.startDate);
        const key = `${d.getMonth() + 1}/${d.getDate()}`;
        const count = Number(r?.count ?? r?.value) || 0;
        out[key] = { count, minutes: 0 };
      });
      return out;
    } catch (e) {
      logger.warn('[healthAgg] workouts aggregated fallback failed:', e);
      return {};
    }
  } catch (e) {
    logger.warn('[healthAgg] fetchWorkoutsByDay failed:', e);
    return {};
  }
}

export function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}
export function monthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}
export function weekStart(date: Date) { // Sunday start to match existing code
  const d = new Date(date);
  const diff = d.getDay();
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
export function weekEnd(date: Date) {
  const s = weekStart(date);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}
