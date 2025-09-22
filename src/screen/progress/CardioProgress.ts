import { MockProgressProvider } from './MockData';
import type {
  ActivityCategory,
  TimeRange,
  SeriesPoint,
  KPI,
  WorkoutSummary,
  BestRecord,
  ProgressDataProvider,
} from '../../types/progress';
import { logger } from '../../../utils/logging';

type CardioFocus =
  | 'all'
  | 'running'
  | 'cycling'
  | 'walking'
  | 'rowing'
  | 'swimming'
  | 'elliptical'
  | 'hiit';

type FocusMetric = 'minutes' | 'distance' | 'calories';

type RangeConfig = { points: number; stepDays: number };

const RANGE_CONFIG: Record<TimeRange, RangeConfig> = {
  week: { points: 7, stepDays: 1 },
  threeMonths: { points: 12, stepDays: 7 },
  sixMonths: { points: 24, stepDays: 7 },
};

const CARDIO_PERMISSIONS = [
  'READ_WORKOUTS',
  'READ_DISTANCE',
  'READ_ACTIVE_CALORIES',
  'READ_TOTAL_CALORIES',
  'READ_HEART_RATE',
] as const;

const FOCUS_CONFIG: Record<CardioFocus, { metric: FocusMetric }> = {
  all: { metric: 'minutes' },
  running: { metric: 'distance' },
  cycling: { metric: 'distance' },
  walking: { metric: 'distance' },
  rowing: { metric: 'distance' },
  swimming: { metric: 'distance' },
  elliptical: { metric: 'minutes' },
  hiit: { metric: 'calories' },
};

const TARGET_LINES: Record<CardioFocus, number> = {
  all: 40,
  running: 5,
  cycling: 18,
  walking: 7,
  rowing: 4,
  swimming: 2,
  elliptical: 35,
  hiit: 450,
};

interface NormalizedWorkout {
  id: string;
  start: Date;
  end: Date;
  durationMinutes: number;
  distanceKm: number;
  calories: number;
  avgHeartRate: number | null;
  heartRateSampleCount: number;
  focus: CardioFocus | 'other';
  rawType: string;
  source?: string;
  title?: string;
}

interface WorkoutBundle {
  current: NormalizedWorkout[];
  previous: NormalizedWorkout[];
  rangeEnd: Date;
  previousRangeEnd: Date;
}

interface AggregatedStats {
  metric: FocusMetric;
  series: SeriesPoint[];
  totalMinutes: number;
  totalDistanceKm: number;
  totalCalories: number;
  avgHeartRate: number | null;
  workouts: NormalizedWorkout[];
}

interface CardioSnapshot {
  current: AggregatedStats;
  previous: AggregatedStats;
  allWorkouts: NormalizedWorkout[];
}

const workoutCache = new Map<TimeRange, Promise<WorkoutBundle | null>>();

function normalizeCardioFocus(focus?: string): CardioFocus {
  const key = (focus ?? '').toLowerCase();
  if (key === 'running' || key === 'cycling' || key === 'walking' || key === 'rowing') {
    return key;
  }
  if (key === 'swimming' || key === 'elliptical' || key === 'hiit') {
    return key;
  }
  return 'all';
}

function startOfTomorrow(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
}

function getRangeBounds(range: TimeRange) {
  const config = RANGE_CONFIG[range];
  const end = startOfTomorrow();
  const start = new Date(end);
  start.setDate(end.getDate() - config.points * config.stepDays);
  start.setHours(0, 0, 0, 0);

  const previousEnd = new Date(start);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - config.points * config.stepDays);
  previousStart.setHours(0, 0, 0, 0);

  return {
    start,
    end,
    previousStart,
    previousEnd,
  };
}

function mapFocusFromType(raw: string): CardioFocus | 'other' {
  const value = raw?.toLowerCase?.() ?? '';
  if (!value) return 'other';
  if (value.includes('run') || value.includes('treadmill')) return 'running';
  if (value.includes('bike') || value.includes('cycle')) return 'cycling';
  if (value.includes('walk') || value.includes('hike')) return 'walking';
  if (value.includes('row')) return 'rowing';
  if (value.includes('swim')) return 'swimming';
  if (value.includes('ellipt')) return 'elliptical';
  if (
    value.includes('hiit') ||
    value.includes('interval') ||
    value.includes('boot') ||
    value.includes('mixedcardio') ||
    value.includes('mixedcardio') ||
    value.includes('mixedmetabolic')
  ) {
    return 'hiit';
  }
  if (value.includes('stair') || value.includes('step')) return 'elliptical';
  if (value.includes('cardio')) return 'hiit';
  return 'other';
}

function normalizeWorkout(raw: any): NormalizedWorkout | null {
  const startIso = raw?.startDate ?? raw?.startTime ?? raw?.start ?? raw?.start_date;
  const endIso = raw?.endDate ?? raw?.endTime ?? raw?.end ?? raw?.end_date;
  if (!startIso || !endIso) return null;
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  let durationSeconds: number;
  if (typeof raw?.duration === 'number' && Number.isFinite(raw.duration)) {
    durationSeconds = raw.duration;
  } else {
    durationSeconds = Math.max(0, (end.getTime() - start.getTime()) / 1000);
  }

  const distanceRaw = raw?.distance;
  let distanceKm = 0;
  if (typeof distanceRaw === 'number' && Number.isFinite(distanceRaw)) {
    distanceKm = distanceRaw / 1000;
  } else if (distanceRaw && typeof distanceRaw === 'object') {
    const unit = String(distanceRaw.unit ?? distanceRaw.Unit ?? '').toLowerCase();
    const val = Number(distanceRaw.value ?? distanceRaw.Value ?? 0);
    if (Number.isFinite(val)) {
      if (unit === 'meter' || unit === 'meters' || unit === 'm') {
        distanceKm = val / 1000;
      } else if (unit === 'kilometer' || unit === 'kilometers' || unit === 'km') {
        distanceKm = val;
      } else if (unit === 'mile' || unit === 'miles' || unit === 'mi') {
        distanceKm = val * 1.60934;
      }
    }
  }

  const caloriesRaw = raw?.calories ?? raw?.energy ?? raw?.totalCalories ?? raw?.activeCalories;
  const calories = Number(caloriesRaw ?? 0);

  const heartRateSamples = Array.isArray(raw?.heartRate) ? raw.heartRate : [];
  const heartRateValues = heartRateSamples
    .map((sample: any) => Number(sample?.bpm ?? sample?.beatsPerMinute ?? sample?.value))
    .filter((value) => Number.isFinite(value) && value > 0);
  const avgHeartRate = heartRateValues.length
    ? heartRateValues.reduce((sum, value) => sum + value, 0) / heartRateValues.length
    : null;

  const focus = mapFocusFromType(String(raw?.workoutType ?? raw?.exerciseType ?? raw?.type ?? ''));

  return {
    id: String(raw?.id ?? raw?.uuid ?? `${start.toISOString()}-${raw?.workoutType ?? 'cardio'}`),
    start,
    end,
    durationMinutes: durationSeconds > 0 ? durationSeconds / 60 : 0,
    distanceKm: distanceKm > 0 ? distanceKm : 0,
    calories: calories > 0 ? calories : 0,
    avgHeartRate: avgHeartRate && Number.isFinite(avgHeartRate) ? avgHeartRate : null,
    heartRateSampleCount: heartRateValues.length,
    focus,
    rawType: String(raw?.workoutType ?? raw?.exerciseType ?? raw?.type ?? 'other'),
    source: raw?.sourceName ?? raw?.sourceBundleId ?? raw?.source ?? undefined,
    title: raw?.title,
  };
}

async function fetchNormalizedWorkouts(start: Date, end: Date, includeHeartRate: boolean): Promise<NormalizedWorkout[]> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    const platform = Capacitor.getPlatform();
    if (platform !== 'ios' && platform !== 'android') {
      return [];
    }

    const { Health } = await import('capacitor-health');
    const available = await Health.isHealthAvailable();
    if (!available?.available) {
      return [];
    }

    try {
      await Health.requestHealthPermissions({ permissions: [...CARDIO_PERMISSIONS] });
    } catch (err) {
      logger.warn('[cardio] Permission request failed', err);
    }

    const response: any = await Health.queryWorkouts({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      includeHeartRate,
      includeRoute: false,
      includeSteps: false,
    });

    const workouts: any[] = Array.isArray(response?.workouts) ? response.workouts : [];
    const normalized: NormalizedWorkout[] = [];
    workouts.forEach((raw) => {
      const workout = normalizeWorkout(raw);
      if (workout) normalized.push(workout);
    });
    return normalized;
  } catch (err) {
    logger.warn('[cardio] fetchNormalizedWorkouts failed', err);
    return [];
  }
}

async function getWorkoutBundle(range: TimeRange): Promise<WorkoutBundle | null> {
  if (workoutCache.has(range)) {
    return workoutCache.get(range)!;
  }

  const promise = (async () => {
    const bounds = getRangeBounds(range);
    const [current, previous] = await Promise.all([
      fetchNormalizedWorkouts(bounds.start, bounds.end, true),
      fetchNormalizedWorkouts(bounds.previousStart, bounds.previousEnd, false),
    ]);

    if (!current.length && !previous.length) {
      return null;
    }

    return {
      current,
      previous,
      rangeEnd: bounds.end,
      previousRangeEnd: bounds.previousEnd,
    };
  })().catch((err) => {
    logger.warn('[cardio] getWorkoutBundle failed', err);
    return null;
  });

  workoutCache.set(range, promise);
  return promise;
}

function filterByFocus(workouts: NormalizedWorkout[], focus: CardioFocus): NormalizedWorkout[] {
  if (focus === 'all') return workouts.slice();
  return workouts.filter((workout) => workout.focus === focus);
}

function createBuckets(range: TimeRange, end: Date) {
  const config = RANGE_CONFIG[range];
  const buckets: { start: number; end: number; iso: string }[] = [];
  const baseStart = new Date(end);
  baseStart.setDate(end.getDate() - config.points * config.stepDays);
  baseStart.setHours(0, 0, 0, 0);

  for (let index = 0; index < config.points; index += 1) {
    const bucketStart = new Date(baseStart);
    bucketStart.setDate(baseStart.getDate() + index * config.stepDays);
    const bucketEnd = new Date(bucketStart);
    bucketEnd.setDate(bucketEnd.getDate() + config.stepDays);
    buckets.push({ start: bucketStart.getTime(), end: bucketEnd.getTime(), iso: bucketStart.toISOString() });
  }

  return buckets;
}

function buildSeries(
  range: TimeRange,
  focus: CardioFocus,
  workouts: NormalizedWorkout[],
  end: Date,
  metric: FocusMetric,
): SeriesPoint[] {
  const buckets = createBuckets(range, end);
  const values = buckets.map((bucket) => {
    const bucketWorkouts = workouts.filter(
      (workout) => workout.start.getTime() >= bucket.start && workout.start.getTime() < bucket.end,
    );
    let total = 0;
    bucketWorkouts.forEach((workout) => {
      if (metric === 'minutes') total += workout.durationMinutes;
      else if (metric === 'distance') total += workout.distanceKm;
      else total += workout.calories;
    });
    return { date: bucket.iso, value: metric === 'distance' ? Number(total.toFixed(2)) : Math.round(total) };
  });

  const max = values.reduce((acc, point) => (point.value > acc ? point.value : acc), 0);
  if (max > 0) {
    const index = values.findIndex((point) => point.value === max);
    if (index >= 0) {
      values[index] = { ...values[index], isPR: true };
    }
  }

  return values;
}

function averageHeartRate(workouts: NormalizedWorkout[]): number | null {
  const stats = workouts.reduce(
    (acc, workout) => {
      if (workout.avgHeartRate && workout.heartRateSampleCount > 0) {
        acc.sum += workout.avgHeartRate * workout.heartRateSampleCount;
        acc.count += workout.heartRateSampleCount;
      }
      return acc;
    },
    { sum: 0, count: 0 },
  );

  if (stats.count === 0) return null;
  return Math.round(stats.sum / stats.count);
}

function aggregateStats(
  range: TimeRange,
  focus: CardioFocus,
  workouts: NormalizedWorkout[],
  end: Date,
): AggregatedStats {
  const metric = FOCUS_CONFIG[focus].metric;
  const filtered = filterByFocus(workouts, focus);
  const series = buildSeries(range, focus, filtered, end, metric);
  const totalMinutes = filtered.reduce((sum, workout) => sum + workout.durationMinutes, 0);
  const totalDistanceKm = filtered.reduce((sum, workout) => sum + workout.distanceKm, 0);
  const totalCalories = filtered.reduce((sum, workout) => sum + workout.calories, 0);
  const avgHeartRate = averageHeartRate(filtered);

  return {
    metric,
    series,
    totalMinutes,
    totalDistanceKm,
    totalCalories,
    avgHeartRate,
    workouts: filtered,
  };
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = Math.round(minutes % 60);
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

function formatDistance(km: number): string {
  if (km === 0) return '0 km';
  if (km >= 100) return `${Math.round(km)} km`;
  if (km >= 10) return `${km.toFixed(1)} km`;
  return `${km.toFixed(2)} km`;
}

function formatCalories(calories: number): string {
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Math.round(calories))} kcal`;
}

function computeDelta(current: number, previous: number | null | undefined): number | null {
  if (!previous || previous === 0) return null;
  return (current - previous) / previous;
}

function buildKpis(current: AggregatedStats, previous: AggregatedStats): KPI[] {
  const distanceDelta = computeDelta(current.totalDistanceKm, previous.totalDistanceKm);
  const minutesDelta = computeDelta(current.totalMinutes, previous.totalMinutes);
  const caloriesDelta = computeDelta(current.totalCalories, previous.totalCalories);
  const hrDelta =
    current.avgHeartRate && previous.avgHeartRate
      ? (current.avgHeartRate - previous.avgHeartRate) / previous.avgHeartRate
      : null;

  return [
    { icon: '🏃', label: 'Distance', value: formatDistance(current.totalDistanceKm), deltaPct: distanceDelta },
    { icon: '⏱️', label: 'Active Minutes', value: formatMinutes(current.totalMinutes), deltaPct: minutesDelta },
    {
      icon: '❤️',
      label: 'Avg HR',
      value: current.avgHeartRate ? `${current.avgHeartRate} bpm` : '—',
      deltaPct: hrDelta,
    },
    { icon: '🔥', label: 'Calories', value: formatCalories(current.totalCalories), deltaPct: caloriesDelta },
  ];
}

function titleFromWorkout(workout: NormalizedWorkout): string {
  const raw = workout.title ?? workout.rawType;
  const spaced = raw.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function highlightForWorkout(workout: NormalizedWorkout): string {
  if (workout.distanceKm >= 0.1) return formatDistance(workout.distanceKm);
  if (workout.calories >= 20) return formatCalories(workout.calories);
  return formatMinutes(workout.durationMinutes);
}

function computeRecentWorkouts(workouts: NormalizedWorkout[], limit: number): WorkoutSummary[] {
  return workouts
    .slice()
    .sort((a, b) => b.start.getTime() - a.start.getTime())
    .slice(0, limit)
    .map((workout) => ({
      id: workout.id,
      date: workout.start.toISOString(),
      title: titleFromWorkout(workout),
      subtitle: `${Math.round(workout.durationMinutes)} min · ${formatCalories(workout.calories)}`,
      highlight: highlightForWorkout(workout),
      hasPR: false,
    }));
}

function bestRecords(workouts: NormalizedWorkout[]): BestRecord[] {
  if (!workouts.length) return [];
  const longest = workouts.reduce<NormalizedWorkout | null>((acc, workout) => {
    if (!acc || workout.distanceKm > acc.distanceKm) return workout;
    return acc;
  }, null);
  const calories = workouts.reduce<NormalizedWorkout | null>((acc, workout) => {
    if (!acc || workout.calories > acc.calories) return workout;
    return acc;
  }, null);
  const duration = workouts.reduce<NormalizedWorkout | null>((acc, workout) => {
    if (!acc || workout.durationMinutes > acc.durationMinutes) return workout;
    return acc;
  }, null);

  const records: BestRecord[] = [];
  if (longest && longest.distanceKm > 0) {
    records.push({ label: 'Longest Session', value: formatDistance(longest.distanceKm), date: longest.start.toISOString() });
  }
  if (calories && calories.calories > 0) {
    records.push({ label: 'Top Calorie Burn', value: formatCalories(calories.calories), date: calories.start.toISOString() });
  }
  if (duration && duration.durationMinutes > 0 && records.length < 2) {
    records.push({ label: 'Longest Duration', value: formatMinutes(duration.durationMinutes), date: duration.start.toISOString() });
  }
  return records.slice(0, 2);
}

function bestRecordsForPeriod(workouts: NormalizedWorkout[]): BestRecord[] {
  if (!workouts.length) return [];
  const top = workouts.reduce<NormalizedWorkout | null>((acc, workout) => {
    if (!acc || workout.distanceKm + workout.calories / 100 > acc.distanceKm + acc.calories / 100) return workout;
    return acc;
  }, null);
  if (!top) return [];
  return [
    {
      label: 'Standout Session',
      value: `${formatDistance(top.distanceKm)} · ${formatCalories(top.calories)}`,
      date: top.start.toISOString(),
    },
  ];
}

async function getSnapshot(range: TimeRange, focus: CardioFocus): Promise<CardioSnapshot | null> {
  const bundle = await getWorkoutBundle(range);
  if (!bundle) return null;
  const current = aggregateStats(range, focus, bundle.current, bundle.rangeEnd);
  const previous = aggregateStats(range, focus, bundle.previous, bundle.previousRangeEnd);
  const allWorkouts = [...bundle.current, ...bundle.previous];
  return { current, previous, allWorkouts };
}

function targetForFocus(focus: CardioFocus): number {
  return TARGET_LINES[focus];
}

export const CardioProgressProvider: ProgressDataProvider = {
  async series(params) {
    if (params.category !== 'cardio') {
      return MockProgressProvider.series(params as any);
    }
    const focus = normalizeCardioFocus(params.cardioFocus);
    const snapshot = await getSnapshot(params.range, focus);
    if (!snapshot) {
      return MockProgressProvider.series({ ...params, category: 'cardio' } as any);
    }
    return snapshot.current.series;
  },
  async previousSeries(params) {
    if (params.category !== 'cardio') {
      return MockProgressProvider.previousSeries(params as any);
    }
    const focus = normalizeCardioFocus(params.cardioFocus);
    const snapshot = await getSnapshot(params.range, focus);
    if (!snapshot) {
      return MockProgressProvider.previousSeries({ ...params, category: 'cardio' } as any);
    }
    return snapshot.previous.series;
  },
  async kpis(params) {
    if (params.category !== 'cardio') {
      return MockProgressProvider.kpis(params as any);
    }
    const focus = normalizeCardioFocus(params.cardioFocus);
    const snapshot = await getSnapshot(params.range, focus);
    if (!snapshot) {
      return MockProgressProvider.kpis({ ...params, category: 'cardio' } as any);
    }
    return buildKpis(snapshot.current, snapshot.previous);
  },
  async recentWorkouts(params) {
    if (params.category !== 'cardio') {
      return MockProgressProvider.recentWorkouts(params as any);
    }
    const focus = normalizeCardioFocus(params.cardioFocus);
    const snapshot = await getSnapshot(params.range, focus);
    if (!snapshot) {
      return MockProgressProvider.recentWorkouts({ ...params, category: 'cardio' } as any);
    }
    return computeRecentWorkouts(snapshot.current.workouts, params.limit ?? 6);
  },
  async bestsAllTime(params) {
    if (params.category !== 'cardio') {
      return MockProgressProvider.bestsAllTime(params as any);
    }
    const focus = normalizeCardioFocus(params.cardioFocus);
    const snapshot = await getSnapshot(params.range, focus);
    if (!snapshot) {
      return MockProgressProvider.bestsAllTime({ ...params, category: 'cardio' } as any);
    }
    return bestRecords(snapshot.allWorkouts);
  },
  async bestsInPeriod(params) {
    if (params.category !== 'cardio') {
      return MockProgressProvider.bestsInPeriod(params as any);
    }
    const focus = normalizeCardioFocus(params.cardioFocus);
    const snapshot = await getSnapshot(params.range, focus);
    if (!snapshot) {
      return MockProgressProvider.bestsInPeriod({ ...params, category: 'cardio' } as any);
    }
    return bestRecordsForPeriod(snapshot.current.workouts);
  },
  async targetLine(params) {
    if (params.category !== 'cardio') {
      return MockProgressProvider.targetLine?.(params as any);
    }
    const focus = normalizeCardioFocus(params.cardioFocus);
    return targetForFocus(focus);
  },
};

