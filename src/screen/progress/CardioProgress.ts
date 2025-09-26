import type {
  CardioFocus,
  CardioKpi,
  CardioProgressSnapshot,
  CardioSeriesResponse,
  CardioTargetLine,
  CardioWorkoutSummary,
  SeriesPoint,
  TimeRange,
} from "../../types/progress";
import { logger } from "../../../utils/logging";

const TARGET_MINUTES = 40;
const CARDIO_FOCUSES: readonly CardioFocus[] = [
  "activeMinutes",
  "distance",
  "calories",
  "steps",
];
const ACTIVITY_LABELS: Record<string, string> = {
  "outdoor walk": "Outdoor Walk",
  "indoor walk": "Indoor Walk",
  "outdoor run": "Outdoor Run",
  "indoor run": "Indoor Run",
  cycling: "Cycling",
  elliptical: "Elliptical",
  rowing: "Rowing",
  "stair stepper": "Stair Stepper",
  swimming: "Swimming",
};

type BucketTotals = {
  minutes: number;
  distanceKm: number;
  calories: number;
  steps: number;
  heartRateSum: number;
  heartRateCount: number;
};

type Bucket = {
  start: Date;
  end: Date;
  iso: string;
  totals: BucketTotals;
  workouts: CardioWorkoutSummary[];
};

type AggregatedData = {
  range: TimeRange;
  current: Bucket[];
  previous: Bucket[];
};

type MetricSelector = (bucket: Bucket) => number;

const METRIC_SELECTORS: Record<CardioFocus, MetricSelector> = {
  activeMinutes: (bucket) => bucket.totals.minutes,
  distance: (bucket) => bucket.totals.distanceKm,
  calories: (bucket) => bucket.totals.calories,
  steps: (bucket) => bucket.totals.steps,
};

const minuteFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const kmFormatter = new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const calorieFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const stepFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

const MIN_MS = 60_000;

function toUtcIso(date: Date): string {
  return new Date(date).toISOString();
}

function toLocalDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? new Date(value) : new Date(value as any);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date;
}

function normalizeActivityName(activity: string | undefined): string {
  if (!activity) return "Workout";
  const key = activity.trim().toLowerCase();
  return ACTIVITY_LABELS[key] ?? activity;
}

function createEmptyTotals(): BucketTotals {
  return { minutes: 0, distanceKm: 0, calories: 0, steps: 0, heartRateSum: 0, heartRateCount: 0 };
}

function createBucket(start: Date, end: Date): Bucket {
  return { start, end, iso: start.toISOString(), totals: createEmptyTotals(), workouts: [] };
}

function cloneDate(date: Date) {
  return new Date(date.getTime());
}

function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildBuckets(range: TimeRange, inclusiveEnd: Date): Bucket[] {
  if (range === "sixMonths") {
    const endMonthStart = new Date(inclusiveEnd.getFullYear(), inclusiveEnd.getMonth(), 1, 0, 0, 0, 0);
    const startMonth = new Date(endMonthStart);
    startMonth.setMonth(startMonth.getMonth() - 5);
    const buckets: Bucket[] = [];
    for (let index = 0; index < 6; index += 1) {
      const monthStart = new Date(startMonth.getFullYear(), startMonth.getMonth() + index, 1, 0, 0, 0, 0);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59, 999);
      buckets.push(createBucket(monthStart, monthEnd));
    }
    return buckets;
  }

  const bucketCount = range === "week" ? 7 : 12;
  const stepDays = range === "week" ? 1 : 7;
  const buckets: Bucket[] = [];
  const end = cloneDate(inclusiveEnd);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(end.getDate() - stepDays * (bucketCount - 1));
  start.setHours(0, 0, 0, 0);

  for (let index = 0; index < bucketCount; index += 1) {
    const bucketStart = new Date(start);
    bucketStart.setDate(start.getDate() + index * stepDays);
    const bucketEnd = new Date(bucketStart);
    bucketEnd.setDate(bucketStart.getDate() + stepDays - 1);
    bucketEnd.setHours(23, 59, 59, 999);
    buckets.push(createBucket(bucketStart, bucketEnd));
  }

  return buckets;
}

function buildBucketSets(range: TimeRange): { current: Bucket[]; previous: Bucket[] } {
  const today = new Date();
  const current = buildBuckets(range, today);
  const firstCurrent = current[0];
  if (!firstCurrent) {
    return { current: [], previous: [] };
  }
  const previousEnd = new Date(firstCurrent.start);
  previousEnd.setDate(previousEnd.getDate() - 1);
  previousEnd.setHours(23, 59, 59, 999);
  const previous = buildBuckets(range, previousEnd);
  return { current, previous };
}

function findBucket(buckets: Bucket[], date: Date): Bucket | undefined {
  for (const bucket of buckets) {
    if (date >= bucket.start && date <= bucket.end) {
      return bucket;
    }
  }
  return undefined;
}

function safeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function minutesToDisplay(value: number) {
  const totalMinutes = Math.max(0, value);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minuteFormatter.format(minutes)}m`;
}

function kilometersToDisplay(value: number) { return `${kmFormatter.format(Math.max(0, value))} km`; }

function caloriesToDisplay(value: number) { return `${calorieFormatter.format(Math.max(0, value))}`;}

function stepsToDisplay(value: number) { return `${stepFormatter.format(Math.max(0, value))}`; }

/**
 * The provider is the single entry point that the progress screen calls via
 * {@link useWorkoutsProgressSnapshot}.  Each public method (series/kpis…)
 * funnels into {@link CardioProgressProvider.ensure}, which caches the
 * aggregated buckets for the requested range.  `ensure` delegates to
 * `fetchAggregated`, which asks Capacitor for the active platform and then
 * populates the buckets with native readings by calling
 * {@link CardioProgressProvider.populateFromIos} or
 * {@link CardioProgressProvider.populateFromAndroid}.  Those helpers are where
 * we invoke the HealthKit (via `capacitor-health`) and Health Connect (via
 * `@kiwi-health/capacitor-health-connect`) bridges to pull workouts, samples,
 * and aggregate totals directly from the phone before shaping them into the UI
 * friendly structures.
 */
class CardioProgressProvider {
  private cache = new Map<TimeRange, AggregatedData>();

  private platformPromise?: Promise<string>;

  async snapshot(range: TimeRange): Promise<CardioProgressSnapshot> {
    logger.debug("[cardio] CardioProgressProvider.snapshot: Called", { range });
    
    try {
      const result = await this.snapshotNative(range);
      
      // ADD: Log successful snapshot creation
      logger.debug("[cardio] CardioProgressProvider.snapshot: Success", {
        range,
        seriesKeys: Object.keys(result.series || {}),
        kpiCount: result.kpis?.length || 0,
        workoutDays: Object.keys(result.workouts || {}).length,
        workoutCount: Object.values(result.workouts || {}).reduce((total, day) => total + day.length, 0),
        hasTargetLine: !!result.targetLine
      });

      return result;
    } catch (error) {
      logger.debug("[cardio] CardioProgressProvider.snapshot: Failed", { range, error });
      return this.snapshotUnavailable(range);
    }
  }

  private seriesFromAggregated(
    range: TimeRange,
    data: AggregatedData,
    focus: CardioFocus,
    options?: { compare?: boolean },
  ): CardioSeriesResponse {
    const selector = METRIC_SELECTORS[focus];

    logger.debug("[cardio] CardioProgressProvider.seriesFromAggregated: Data retrieved", {
      range,
      focus,
      currentBuckets: data.current.length,
      previousBuckets: data.previous.length,
      selector: focus,
    });

    const previousValues = data.previous.map((bucket) => selector(bucket));
    const historicalMax = previousValues.length ? Math.max(...previousValues) : 0;
    const includePrevious = options?.compare !== false;

    logger.debug("[cardio] CardioProgressProvider.seriesFromAggregated: Historical analysis", {
      range,
      focus,
      previousValues: previousValues.slice(0, 5), // Show first 5 values
      historicalMax,
      includePrevious,
    });

    const previous: SeriesPoint[] | undefined = includePrevious && data.previous.length
      ? data.previous.map((bucket) => ({ iso: bucket.iso, value: selector(bucket) }))
      : undefined;

    const current = data.current.map((bucket) => {
      const value = selector(bucket);
      const isPersonalBest = value > historicalMax && value > 0;
      return { iso: bucket.iso, value, isPersonalBest };
    });

    const personalBest = Math.max(historicalMax, ...current.map((point) => point.value));

    logger.debug("[cardio] CardioProgressProvider.seriesFromAggregated: Series calculated", {
      range,
      focus,
      currentPoints: current.length,
      previousPoints: previous?.length || 0,
      personalBest,
      currentValues: current.slice(0, 3).map(p => ({ iso: p.iso, value: p.value, isPersonalBest: p.isPersonalBest })) // Show first 3 points
    });

    return { focus, current, previous, personalBest: personalBest > 0 ? personalBest : undefined };
  }


  private kpisFromAggregated(range: TimeRange, data: AggregatedData): CardioKpi[] {
    const workoutCount = this.collectWorkouts(data).length;

    // ADD: Log aggregated data totals
    logger.debug("[cardio] CardioProgressProvider.kpisNative: Aggregated data totals", {
      range,
      currentBuckets: data.current.length,
      previousBuckets: data.previous.length,
      workoutCount,
      currentTotals: data.current.reduce((acc, bucket) => ({
        minutes: acc.minutes + bucket.totals.minutes,
        distanceKm: acc.distanceKm + bucket.totals.distanceKm,
        calories: acc.calories + bucket.totals.calories,
        steps: acc.steps + bucket.totals.steps
      }), { minutes: 0, distanceKm: 0, calories: 0, steps: 0 }),
      previousTotals: data.previous.reduce((acc, bucket) => ({
        minutes: acc.minutes + bucket.totals.minutes,
        distanceKm: acc.distanceKm + bucket.totals.distanceKm,
        calories: acc.calories + bucket.totals.calories,
        steps: acc.steps + bucket.totals.steps
      }), { minutes: 0, distanceKm: 0, calories: 0, steps: 0 })
    });

    const minutesCurrent = data.current.reduce((sum, bucket) => sum + bucket.totals.minutes, 0);
    const minutesPrevious = data.previous.reduce((sum, bucket) => sum + bucket.totals.minutes, 0);
    const distanceCurrent = data.current.reduce((sum, bucket) => sum + bucket.totals.distanceKm, 0);
    const distancePrevious = data.previous.reduce((sum, bucket) => sum + bucket.totals.distanceKm, 0);
    const caloriesCurrent = data.current.reduce((sum, bucket) => sum + bucket.totals.calories, 0);
    const caloriesPrevious = data.previous.reduce((sum, bucket) => sum + bucket.totals.calories, 0);
    const stepsCurrent = data.current.reduce((sum, bucket) => sum + bucket.totals.steps, 0);
    const stepsPrevious = data.previous.reduce((sum, bucket) => sum + bucket.totals.steps, 0);

    const kpis: CardioKpi[] = [
      {
        key: "activeMinutes" as CardioFocus,
        title: "Total Time",
        unit: "minutes",
        value: minutesToDisplay(minutesCurrent),
        currentNumeric: minutesCurrent,
        previous: minutesPrevious,
      },
      {
        key: "distance" as CardioFocus,
        title: "Distance",
        unit: "km",
        value: `${kilometersToDisplay(distanceCurrent)} km`,
        currentNumeric: distanceCurrent,
        previous: distancePrevious,
      },
      {
        key: "calories" as CardioFocus,
        title: "Calories",
        unit: "kcal",
        value: `${caloriesToDisplay(caloriesCurrent)} kcal`,
        currentNumeric: caloriesCurrent,
        previous: caloriesPrevious,
      },
      {
        key: "steps" as CardioFocus,
        title: "Steps",
        value: `${stepsToDisplay(stepsCurrent)}`,
        currentNumeric: stepsCurrent,
        previous: stepsPrevious,
      },
    ];

    // ADD: Log final KPIs
    logger.debug("[cardio] CardioProgressProvider.kpisNative: Final KPIs", {
      range,
      kpis: kpis.map((kpi: any) => ({
        key: kpi.key,
        title: kpi.title,
        value: kpi.value,
        currentNumeric: kpi.currentNumeric,
        previous: kpi.previous
      }))
    });

    return kpis;
  }

  private recentWorkoutsFromAggregated(range: TimeRange, data: AggregatedData): CardioWorkoutSummary[] {
    const allWorkouts = this.collectWorkouts(data);
    const currentStart = data.current[0]?.start ?? new Date();
    const currentEnd = data.current[data.current.length - 1]?.end ?? new Date();

    logger.debug("[cardio] CardioProgressProvider.recentWorkoutsNative: Date range", {
      range,
      currentStart: currentStart.toISOString(),
      currentEnd: currentEnd.toISOString(),
      totalWorkouts: allWorkouts.length
    });

    const filtered = allWorkouts.filter((workout) => {
      const startDate = new Date(workout.start);
      return startDate >= currentStart && startDate <= currentEnd;
    });

    logger.debug("[cardio] CardioProgressProvider.recentWorkoutsNative: Filtered workouts", {
      range,
      totalWorkouts: allWorkouts.length,
      filteredCount: filtered.length,
      sampleWorkouts: filtered.slice(0, 3).map(w => ({
        id: w.id,
        activity: w.activity,
        start: w.start,
        durationMinutes: w.durationMinutes,
        distanceKm: w.distanceKm,
        calories: w.calories
      }))
    });

    filtered.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
    const result = filtered.slice(0, 6);

    logger.debug("[cardio] CardioProgressProvider.recentWorkoutsNative: Final result", {
      range,
      resultCount: result.length,
      workouts: result.map(w => ({
        id: w.id,
        activity: w.activity,
        start: w.start,
        durationMinutes: w.durationMinutes
      }))
    });

    return result;
  }

  private async targetLineNative(_range: TimeRange, focus: CardioFocus): Promise<CardioTargetLine | null> {
    logger.debug("[cardio] CardioProgressProvider.targetLineNative: Starting", { range: _range, focus });
    
    if (focus !== "activeMinutes") {
      logger.debug("[cardio] CardioProgressProvider.targetLineNative: No target line for focus", { focus });
      return null;
    }
    
    const result = { focus, value: TARGET_MINUTES, unit: "minutes" };
    
    logger.debug("[cardio] CardioProgressProvider.targetLineNative: Target line created", {
      range: _range,
      focus,
      targetLine: result
    });
    
    return result;
  }

  private async snapshotNative(range: TimeRange): Promise<CardioProgressSnapshot> {
    logger.debug("[cardio] CardioProgressProvider.snapshotNative: Starting", { range });
    
    const data = await this.ensure(range);

    const minutesSeries = this.seriesFromAggregated(range, data, "activeMinutes");
    const distanceSeries = this.seriesFromAggregated(range, data, "distance");
    const caloriesSeries = this.seriesFromAggregated(range, data, "calories");
    const stepsSeries = this.seriesFromAggregated(range, data, "steps");
    const kpis = this.kpisFromAggregated(range, data);
    const workouts = this.recentWorkoutsFromAggregated(range, data);
    const workoutsByDay = this.groupWorkoutsByDate(workouts);
    const targetLine = await this.targetLineNative(range, "activeMinutes");

    // ADD: Log each component result
    logger.debug("[cardio] CardioProgressProvider.snapshotNative: Series data", {
      range,
      activeMinutes: { pointCount: minutesSeries.current?.length || 0, personalBest: minutesSeries.personalBest },
      distance: { pointCount: distanceSeries.current?.length || 0, personalBest: distanceSeries.personalBest },
      calories: { pointCount: caloriesSeries.current?.length || 0, personalBest: caloriesSeries.personalBest },
      steps: { pointCount: stepsSeries.current?.length || 0, personalBest: stepsSeries.personalBest }
    });

    logger.debug("[cardio] CardioProgressProvider.snapshotNative: KPIs calculated", {
      range,
      kpis: kpis.map((kpi: any) => ({
        key: kpi.key,
        title: kpi.title,
        value: kpi.value,
        currentNumeric: kpi.currentNumeric,
        previous: kpi.previous
      }))
    });

    logger.debug("[cardio] CardioProgressProvider.snapshotNative: Workouts", {
      range,
      workoutDays: Object.keys(workoutsByDay).length,
      workoutCount: workouts.length,
      hasTargetLine: !!targetLine
    });

    return {
      range,
      series: {
        activeMinutes: minutesSeries,
        distance: distanceSeries,
        calories: caloriesSeries,
        steps: stepsSeries,
      },
      kpis,
      workouts: workoutsByDay,
      targetLine,
    };
  }


  private snapshotUnavailable(range: TimeRange): CardioProgressSnapshot {
    const buckets = buildBucketSets(range);
    const unavailableSeries = Object.fromEntries(
      CARDIO_FOCUSES.map((focus) => [
        focus,
        {
          focus,
          current: buckets.current.map((bucket) => ({ iso: bucket.iso, value: 0 })),
          previous: buckets.previous.length
            ? buckets.previous.map((bucket) => ({ iso: bucket.iso, value: 0 }))
            : undefined,
        } satisfies CardioSeriesResponse,
      ]),
    ) as Record<CardioFocus, CardioSeriesResponse>;

    const kpis: CardioKpi[] = [
      { key: "activeMinutes", title: "Total Time", unit: "minutes", value: "N/A" },
      { key: "distance", title: "Distance", unit: "km", value: "N/A" },
      { key: "calories", title: "Calories", unit: "kcal", value: "N/A" },
      { key: "steps", title: "Steps", value: "N/A" },
    ];

    const targetLine: CardioTargetLine | null = {
      focus: "activeMinutes",
      value: TARGET_MINUTES,
      unit: "minutes",
    };

    return { range, series: unavailableSeries, kpis, workouts: {}, targetLine };
  }

  public getUnavailableSnapshot(range: TimeRange): CardioProgressSnapshot {
    return this.snapshotUnavailable(range);
  }

  private collectWorkouts(data: AggregatedData): CardioWorkoutSummary[] {
    return [...data.previous, ...data.current].flatMap((bucket) => bucket.workouts);
  }

  private groupWorkoutsByDate(workouts: CardioWorkoutSummary[]): Record<string, CardioWorkoutSummary[]> {
    const grouped: Record<string, CardioWorkoutSummary[]> = {};
    for (const workout of workouts) {
      const end = toLocalDate(workout.end) ?? toLocalDate(workout.start);
      if (!end) {
        continue;
      }
      const key = formatLocalDateKey(end);
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(workout);
    }

    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime());
    }

    return grouped;
  }

  private async ensure(range: TimeRange): Promise<AggregatedData> {
    if (!this.cache.has(range)) {
      const loadPromise = this.fetchAggregated(range)
        .then((result) => result)
        .catch((error) => {
          this.cache.delete(range);
          throw error;
        });
      this.cache.set(range, loadPromise);
    }
    return this.cache.get(range)!;
  }

  private async fetchAggregated(range: TimeRange): Promise<AggregatedData> {
    logger.debug("[cardio] CardioProgressProvider.fetchAggregated: Starting", { range });
    
    const { current, previous } = buildBucketSets(range);
    const allBuckets = [...previous, ...current];
    
    logger.debug("[cardio] CardioProgressProvider.fetchAggregated: Buckets created", {
      range,
      currentBucketCount: current.length,
      previousBucketCount: previous.length,
      totalBucketCount: allBuckets.length,
      dateRange: allBuckets.length > 0 ? {
        start: allBuckets[0].start.toISOString(),
        end: allBuckets[allBuckets.length - 1].end.toISOString()
      } : null
    });

    if (allBuckets.length === 0) {
      logger.debug("[cardio] CardioProgressProvider.fetchAggregated: No buckets, returning empty data", { range });
      return { range, current, previous };
    }

    const earliest = allBuckets[0].start;
    const latest = allBuckets[allBuckets.length - 1].end;

    const platform = await this.getPlatform();

    logger.debug("[cardio] CardioProgressProvider.fetchAggregated: Platform detected", {
      range,
      platform,
      dateRange: { start: earliest.toISOString(), end: latest.toISOString() }
    });

    if (platform === "ios") {
      await this.populateFromIos(allBuckets, earliest, latest);
    } else if (platform === "android") {
      await this.populateFromAndroid(allBuckets, earliest, latest);
    } else {
      throw new Error(`Unsupported platform for cardio provider: ${platform}`);
    }

    // ADD: Log final aggregated data
    logger.debug("[cardio] CardioProgressProvider.fetchAggregated: Data populated", {
      range,
      platform,
      workoutCount: allBuckets.reduce((sum, bucket) => sum + bucket.workouts.length, 0),
      currentBucketTotals: current.map(bucket => ({
        iso: bucket.iso,
        totals: bucket.totals,
        workouts: bucket.workouts.length
      })),
      previousBucketTotals: previous.map(bucket => ({
        iso: bucket.iso,
        totals: bucket.totals,
        workouts: bucket.workouts.length
      }))
    });

    return { range, current, previous };
  }

  private async getPlatform(): Promise<string> {
    if (!this.platformPromise) {
      this.platformPromise = (async () => {
        try {
          const { Capacitor } = await import("@capacitor/core");
          return Capacitor.getPlatform();
        } catch (error) {
          logger.debug("[cardio] Unable to resolve platform, defaulting to web", error);
          return "web";
        }
      })();
    }
    return this.platformPromise;
  }

  private async populateFromIos(
    buckets: Bucket[],
    startRaw: Date,
    endRaw: Date,
  ): Promise<void> {
    try {
      const { Health } = await import("capacitor-health");
      const start = toUtcIso(startRaw);
      const end = toUtcIso(endRaw);

      await Health.requestHealthPermissions({
        permissions: [
          "READ_WORKOUTS",
          "READ_ACTIVE_CALORIES",
          "READ_TOTAL_CALORIES",
          "READ_DISTANCE",
          "READ_HEART_RATE",
          "READ_STEPS",
        ],
      });

      const { workouts = [] } = await Health.queryWorkouts({
        startDate: start,
        endDate: end,
        includeHeartRate: true,
        includeRoute: false,
        includeSteps: true,
      });

      const fallbackCalories = new Map<Bucket, number>();
      const fallbackSteps = new Map<Bucket, number>();

      for (const sample of workouts as any[]) {
        const startDate = toLocalDate(sample?.startDate ?? sample?.startTime);
        const endDate = toLocalDate(sample?.endDate ?? sample?.endTime);
        if (!startDate || !endDate) continue;

        const bucket = findBucket(buckets, endDate);
        if (!bucket) continue;

        const rawDuration = safeNumber(sample?.duration);
        const durationMinutes = rawDuration > 0
          ? rawDuration / 60
          : Math.max(0, (endDate.getTime() - startDate.getTime()) / MIN_MS);
        const distanceMeters = safeNumber(sample?.distance);
        const distanceKm = distanceMeters > 0 ? distanceMeters / 1000 : undefined;
        const calories = safeNumber(sample?.calories);
        const steps = safeNumber(sample?.steps);

        bucket.totals.minutes += durationMinutes;
        if (distanceKm) bucket.totals.distanceKm += distanceKm;
        if (calories) fallbackCalories.set(bucket, (fallbackCalories.get(bucket) ?? 0) + calories);
        if (steps) fallbackSteps.set(bucket, (fallbackSteps.get(bucket) ?? 0) + steps);

        let heartRateSum = 0;
        let heartRateCount = 0;
        if (Array.isArray(sample?.heartRate)) {
          for (const reading of sample.heartRate) {
            const bpm = safeNumber(reading?.bpm);
            if (bpm > 0) {
              bucket.totals.heartRateSum += bpm;
              bucket.totals.heartRateCount += 1;
              heartRateSum += bpm;
              heartRateCount += 1;
            }
          }
        }

        bucket.workouts.push({
          id: sample?.id ?? `ios-${startDate.getTime()}`,
          activity: normalizeActivityName(sample?.workoutType),
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          durationMinutes,
          distanceKm,
          calories: calories || undefined,
          steps: steps || undefined,
          averageHeartRate: heartRateCount > 0 ? heartRateSum / heartRateCount : undefined,
          source: sample?.sourceName,
        });
      }

      const applyAggregate = async (dataType: string, assign: (bucket: Bucket, value: number) => void) => {
        const response: any = await Health.queryAggregated({
          startDate: start,
          endDate: end,
          dataType,
          bucket: "day",
        });

        for (const row of Array.isArray(response?.aggregatedData) ? response.aggregatedData : []) {
          const date = toLocalDate(row?.endDate ?? row?.startDate ?? row?.date);
          if (!date) continue;
          const bucket = findBucket(buckets, date);
          if (!bucket) continue;
          const value = safeNumber(row?.value);
          if (value > 0) assign(bucket, value);
        }
      };

      await applyAggregate("steps", (bucket, value) => {
        bucket.totals.steps += value;
      });

      await applyAggregate("activeEnergyBurned", (bucket, value) => {
        bucket.totals.calories += value;
      });

      for (const bucket of buckets) {
        if (bucket.totals.calories <= 0 && fallbackCalories.has(bucket)) {
          bucket.totals.calories = fallbackCalories.get(bucket) ?? 0;
        }
        if (bucket.totals.steps <= 0 && fallbackSteps.has(bucket)) {
          bucket.totals.steps = fallbackSteps.get(bucket) ?? 0;
        }
      }
    } catch (error) {
      logger.warn("[cardio] Failed to populate iOS cardio data", error);
      throw error;
    }
  }

  private async populateFromAndroid(
    buckets: Bucket[],
    startRaw: Date,
    endRaw: Date,
  ): Promise<void> {
    try {
      const { HealthConnect } = await import("@kiwi-health/capacitor-health-connect");
      const start = new Date(toUtcIso(startRaw));
      const end = new Date(toUtcIso(endRaw));

      await HealthConnect.requestHealthPermissions({
        read: ["Steps", "Distance", "ActiveCaloriesBurned", "HeartRateSeries"],
        write: [],
      });

      const timeRangeFilter = { type: "between", startTime: start, endTime: end } as const;

      const readAllRecords = async (type: string) => {
        const records: any[] = [];
        let pageToken: string | undefined;
        do {
          const response: any = await HealthConnect.readRecords({
            type: type as any,
            timeRangeFilter,
            pageToken,
            pageSize: 500,
          });
          if (Array.isArray(response?.records)) {
            records.push(...response.records);
          }
          pageToken = response?.pageToken;
        } while (pageToken);
        return records;
      };

      for (const record of await readAllRecords("Steps")) {
        const endDate = toLocalDate(record?.endTime ?? record?.startTime);
        if (!endDate) continue;
        const bucket = findBucket(buckets, endDate);
        if (!bucket) continue;
        bucket.totals.steps += safeNumber(record?.count);
      }

      const distanceRecords = await readAllRecords("Distance");
      for (const record of distanceRecords) {
        const startDate = toLocalDate(record?.startTime);
        const endDate = toLocalDate(record?.endTime ?? record?.startTime);
        if (!startDate || !endDate) continue;
        const bucket = findBucket(buckets, endDate);
        if (!bucket) continue;

        const durationMinutes = Math.max(0, (endDate.getTime() - startDate.getTime()) / MIN_MS);
        const distanceValue = safeNumber(record?.distance?.value);
        const unit = (record?.distance?.unit ?? "meter").toLowerCase();
        let distanceKm: number | undefined;
        if (unit === "meter") {
          distanceKm = distanceValue / 1000;
        } else if (unit === "kilometer") {
          distanceKm = distanceValue;
        } else if (unit === "mile") {
          distanceKm = distanceValue * 1.60934;
        }
        if (distanceKm) bucket.totals.distanceKm += distanceKm;
        bucket.totals.minutes += durationMinutes;

        bucket.workouts.push({
          id: record?.metadata?.id ?? `android-distance-${startDate.getTime()}`,
          activity: normalizeActivityName("Distance"),
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          durationMinutes,
          distanceKm,
          source: record?.metadata?.dataOrigin,
        });
      }

      for (const record of await readAllRecords("ActiveCaloriesBurned")) {
        const endDate = toLocalDate(record?.endTime ?? record?.startTime);
        if (!endDate) continue;
        const bucket = findBucket(buckets, endDate);
        if (!bucket) continue;
        const energy = safeNumber(record?.energy?.value);
        if (energy > 0) {
          bucket.totals.calories += energy;
        }
      }

      for (const record of await readAllRecords("HeartRateSeries")) {
        const endDate = toLocalDate(record?.endTime ?? record?.startTime);
        if (!endDate) continue;
        const bucket = findBucket(buckets, endDate);
        if (!bucket) continue;
        if (Array.isArray(record?.samples)) {
          for (const sample of record.samples) {
            const bpm = safeNumber(sample?.beatsPerMinute);
            if (bpm > 0) {
              bucket.totals.heartRateSum += bpm;
              bucket.totals.heartRateCount += 1;
            }
          }
        }
      }
    } catch (error) {
      logger.warn("[cardio] Failed to populate Android cardio data", error);
      throw error;
    }
  }

}

export { CardioProgressProvider };
