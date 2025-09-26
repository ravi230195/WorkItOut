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
  endIso: string;
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

function normalizeActivityName(activity: string | undefined): string {
  if (!activity) return "Workout";
  const key = activity.trim().toLowerCase();
  return ACTIVITY_LABELS[key] ?? activity;
}

function createEmptyTotals(): BucketTotals {
  return { minutes: 0, distanceKm: 0, calories: 0, steps: 0, heartRateSum: 0, heartRateCount: 0 };
}

function pad(value: number, length = 2): string {
  return value.toString().padStart(length, "0");
}

function formatLocalDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatLocalIso(date: Date): string {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const milliseconds = pad(date.getMilliseconds(), 3);

  const offsetMinutesTotal = -date.getTimezoneOffset();
  const offsetSign = offsetMinutesTotal >= 0 ? "+" : "-";
  const offsetMinutesAbsolute = Math.abs(offsetMinutesTotal);
  const offsetHours = pad(Math.floor(offsetMinutesAbsolute / 60));
  const offsetMinutes = pad(offsetMinutesAbsolute % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${offsetSign}${offsetHours}:${offsetMinutes}`;
}

function createBucket(start: Date, end: Date): Bucket {
  return {
    start,
    end,
    iso: formatLocalIso(start),
    endIso: formatLocalIso(end),
    totals: createEmptyTotals(),
    workouts: [],
  };
}

function cloneDate(date: Date) {
  return new Date(date.getTime());
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
      ? data.previous.map((bucket) => ({ iso: bucket.iso, endIso: bucket.endIso, value: selector(bucket) }))
      : undefined;

    const current = data.current.map((bucket) => {
      const value = selector(bucket);
      const isPersonalBest = value > historicalMax && value > 0;
      return { iso: bucket.iso, endIso: bucket.endIso, value, isPersonalBest };
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


  private seriesUnavailableFromBuckets(
    focus: CardioFocus,
    buckets: ReturnType<typeof buildBucketSets>,
    options?: { compare?: boolean },
  ): CardioSeriesResponse {
    const includePrevious = options?.compare !== false;
    const mapBucket = (bucket: Bucket): SeriesPoint => ({ iso: bucket.iso, endIso: bucket.endIso, value: 0 });
    return {
      focus,
      current: buckets.current.map(mapBucket),
      previous: includePrevious ? buckets.previous.map(mapBucket) : undefined,
    };
  }

  private kpisUnavailable(_range: TimeRange): CardioKpi[] {
    return [
      {
        key: "activeMinutes",
        title: "Total Time",
        unit: "minutes",
        value: "N/A",
      },
      {
        key: "distance",
        title: "Distance",
        unit: "km",
        value: "N/A",
      },
      {
        key: "calories",
        title: "Calories",
        unit: "kcal",
        value: "N/A",
      },
      {
        key: "steps",
        title: "Steps",
        value: "N/A",
      },
    ];
  }

  private targetLineUnavailable(focus: CardioFocus): CardioTargetLine | null {
    if (focus !== "activeMinutes") {
      return null;
    }
    return { focus, value: TARGET_MINUTES, unit: "minutes" };
  }

  private snapshotUnavailable(range: TimeRange): CardioProgressSnapshot {
    const buckets = buildBucketSets(range);
    return {
      range,
      series: {
        activeMinutes: this.seriesUnavailableFromBuckets("activeMinutes", buckets),
        distance: this.seriesUnavailableFromBuckets("distance", buckets),
        calories: this.seriesUnavailableFromBuckets("calories", buckets),
        steps: this.seriesUnavailableFromBuckets("steps", buckets),
      },
      kpis: this.kpisUnavailable(range),
      workouts: {},
      targetLine: this.targetLineUnavailable("activeMinutes"),
    };
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
      const start = new Date(workout.start);
      if (Number.isNaN(start.getTime())) {
        continue;
      }
      const key = formatLocalDayKey(start);
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(workout);
    }

    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
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
        endIso: bucket.endIso,
        totals: bucket.totals,
        workouts: bucket.workouts.length
      })),
      previousBucketTotals: previous.map(bucket => ({
        iso: bucket.iso,
        endIso: bucket.endIso,
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
      const start = startRaw.toISOString();
      const end = endRaw.toISOString();
      // ADD: Enhanced permission request logging
      logger.debug("[cardio] iOS populateFromIos: Starting", { start, end, bucketCount: buckets.length, dateRange: `${start} to ${end}`});
      logger.debug("[cardio] iOS request permissions", { start, end});

      const permissionResult = await Health.requestHealthPermissions({
        permissions: [
          "READ_WORKOUTS",
          "READ_ACTIVE_CALORIES",
          "READ_TOTAL_CALORIES",
          "READ_DISTANCE",
          "READ_HEART_RATE",
          "READ_STEPS",
        ],
      });
      
      logger.debug("[cardio] iOS permissions result", {  permissions: permissionResult, granted: Object.values(permissionResult).every(Boolean)});

      // ADD: Enhanced workout query logging
      logger.debug("[cardio] iOS queryWorkouts: Request", {start, end, includeHeartRate: true, includeRoute: false, includeSteps: true});
      const workoutResponse: any = await Health.queryWorkouts({ startDate: start, endDate: end, includeHeartRate: true, includeRoute: false, includeSteps: true});
      
      // ADD: Basic workout response logging
      logger.debug("[cardio] iOS queryWorkouts: Response", {
        hasWorkouts: !!workoutResponse?.workouts,
        workoutCount: Array.isArray(workoutResponse?.workouts) ? workoutResponse.workouts.length : 0,
        responseKeys: Object.keys(workoutResponse || {})
      });
      
      // ADD: Print all workouts one by one in readable format
      const workoutSamples: any[] = Array.isArray(workoutResponse?.workouts) ? workoutResponse.workouts : [];
      logger.debug("[cardio] iOS queryWorkouts: Detailed workout breakdown", { 
        totalWorkouts: workoutSamples.length 
      });
      
      const printWorkout = (workout: any, i: number) => {
        logger.debug(`[cardio] iOS Workout #${i + 1}/${workoutSamples.length}`, {
          id: workout?.id || 'N/A',
          workoutType: workout?.workoutType || 'N/A',
          startDate: workout?.startDate || 'N/A',
          endDate: workout?.endDate || 'N/A',
          duration: workout?.duration || 'N/A',
          distance: workout?.distance || 'N/A',
          calories: workout?.calories || 'N/A',
          steps: workout?.steps || 'N/A',
          sourceName: workout?.sourceName || 'N/A',
          heartRateCount: Array.isArray(workout?.heartRate) ? workout.heartRate.length : 0,
          heartRateSample: Array.isArray(workout?.heartRate) && workout.heartRate.length > 0 ? {
            firstBpm: workout.heartRate[0]?.bpm || 'N/A',
            lastBpm: workout.heartRate[workout.heartRate.length - 1]?.bpm || 'N/A',
            totalReadings: workout.heartRate.length
          } : null,
          allKeys: Object.keys(workout || {})
        });
      }
      
      logger.debug("[cardio] iOS workouts fetched", { count: workoutSamples.length });

      const fallbackCalories = new Map<Bucket, number>();
      const fallbackSteps = new Map<Bucket, number>();
      const collectedWorkouts: CardioWorkoutSummary[] = [];

      for (let i = 0; i < workoutSamples.length; i++) {
        printWorkout(workoutSamples[i], i);

        const sample = workoutSamples[i];
        const startDate = new Date(sample?.startDate ?? sample?.startTime ?? 0);
        const endDate = new Date(sample?.endDate ?? sample?.endTime ?? 0);
        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) continue;
        const bucket = findBucket(buckets, startDate);
        if (!bucket) continue;

        const rawDuration = safeNumber(sample?.duration);
        const durationMinutes = rawDuration > 0 ? rawDuration / 60 : Math.max(0, (endDate.getTime() - startDate.getTime()) / MIN_MS);
        const distanceMeters = safeNumber(sample?.distance);
        const distanceKm = distanceMeters > 0 ? distanceMeters / 1000 : undefined;
        const calories = safeNumber(sample?.calories);
        const steps = safeNumber(sample?.steps);

        bucket.totals.minutes += durationMinutes;
        if (distanceKm) bucket.totals.distanceKm += distanceKm;
        if (calories) {
          const existing = fallbackCalories.get(bucket) ?? 0;
          fallbackCalories.set(bucket, existing + calories);
        }

        if (steps) {
          const existingSteps = fallbackSteps.get(bucket) ?? 0;
          fallbackSteps.set(bucket, existingSteps + steps);
        }

        let workoutHeartRateSum = 0;
        let workoutHeartRateCount = 0;
        if (Array.isArray(sample?.heartRate)) {
          for (const reading of sample.heartRate) {
            const bpm = safeNumber(reading?.bpm);
            if (bpm > 0) {
              bucket.totals.heartRateSum += bpm;
              bucket.totals.heartRateCount += 1;
              workoutHeartRateSum += bpm;
              workoutHeartRateCount += 1;
            }
          }
        }

        const workoutSummary: CardioWorkoutSummary = {
          id: sample?.id ?? `ios-${startDate.getTime()}`,
          activity: normalizeActivityName(sample?.workoutType),
          start: formatLocalIso(startDate),
          end: formatLocalIso(endDate),
          durationMinutes,
          distanceKm,
          calories: calories || undefined,
          steps: steps || undefined,
          averageHeartRate: workoutHeartRateCount > 0 ? workoutHeartRateSum / workoutHeartRateCount : undefined,
          source: sample?.sourceName,
        };
        //logger.debug("[cardio] iOS workout summary", { workoutSummary });
        bucket.workouts.push(workoutSummary);
        collectedWorkouts.push(workoutSummary);
      }
      for (const workout of collectedWorkouts) {
        logger.debug("🔍 DGB [CARDIO_PROGRESS] Workout:", JSON.stringify(workout, null, 2));
      }
      try {
        // ADD: Enhanced steps aggregation logging
        logger.debug("[cardio] iOS queryAggregated steps: Request", { start, end, dataType: "steps", bucket: "day"});
        
        const stepsAggregated: any = await Health.queryAggregated({startDate: start, endDate: end, dataType: "steps", bucket: "day"});
        
        // ADD: Enhanced steps response logging
        logger.debug("[cardio] iOS queryAggregated steps: Response", {
          hasAggregatedData: !!stepsAggregated?.aggregatedData,
          dataCount: Array.isArray(stepsAggregated?.aggregatedData) ? stepsAggregated.aggregatedData.length : 0,
          responseKeys: Object.keys(stepsAggregated || {}),
          sampleData: Array.isArray(stepsAggregated?.aggregatedData) && stepsAggregated.aggregatedData.length > 0 ? {
            startDate: stepsAggregated.aggregatedData[0]?.startDate,
            date: stepsAggregated.aggregatedData[0]?.date,
            value: stepsAggregated.aggregatedData[0]?.value
          } : null
        });
        
        const stepRows: any[] = Array.isArray(stepsAggregated?.aggregatedData) ? stepsAggregated.aggregatedData : [];
        let processedSteps = 0;
        let totalSteps = 0;
        
        // ADD: Print all step data one by one in readable format
        logger.debug("[cardio] iOS queryAggregated steps: Detailed step breakdown", { totalStepRows: stepRows.length });
        
        const printStep = (row: any, i: number) => {
          logger.debug(`[cardio] iOS Step Row #${i + 1}/${stepRows.length}`, {
            startDate: row?.startDate || 'N/A',
            date: row?.date || 'N/A',
            value: row?.value || 'N/A',
            allKeys: Object.keys(row || {})
          });
        }
        
        for (let i = 0; i < stepRows.length; i++) {
          const row = stepRows[i];
          printStep(row, i);
          const rowDate = new Date(row?.startDate ?? row?.date ?? 0);
          const bucket = findBucket(buckets, rowDate);
          if (!bucket) continue;
          const stepValue = safeNumber(row?.value);
          bucket.totals.steps += stepValue;
          totalSteps += stepValue;
          processedSteps++;
        }
        
        logger.debug("[cardio] iOS steps processed", {
          processedRows: processedSteps,
          totalSteps,
          bucketsWithSteps: buckets.filter(b => b.totals.steps > 0).length
        });
      } catch (error) {
        logger.debug("[cardio] iOS step aggregation failed", error);
      }

      try {
        // ADD: Enhanced calories aggregation logging
        logger.debug("[cardio] iOS queryAggregated active calories: Request", { start, end, dataType: "active-calories", bucket: "day"});
        
        const caloriesAggregated: any = await Health.queryAggregated({startDate: start, endDate: end, dataType: "active-calories", bucket: "day"});
        
        // ADD: Enhanced calories response logging
        logger.debug("[cardio] iOS queryAggregated active calories: Response", {
          hasAggregatedData: !!caloriesAggregated?.aggregatedData,
          dataCount: Array.isArray(caloriesAggregated?.aggregatedData) ? caloriesAggregated.aggregatedData.length : 0,
          responseKeys: Object.keys(caloriesAggregated || {}),
          sampleData: Array.isArray(caloriesAggregated?.aggregatedData) && caloriesAggregated.aggregatedData.length > 0 ? {
            startDate: caloriesAggregated.aggregatedData[0]?.startDate,
            date: caloriesAggregated.aggregatedData[0]?.date,
            value: caloriesAggregated.aggregatedData[0]?.value
          } : null
        });
        
        const calorieRows: any[] = Array.isArray(caloriesAggregated?.aggregatedData) ? caloriesAggregated.aggregatedData : [];
        let processedCalories = 0;
        let totalCalories = 0;
        
        // ADD: Print all calorie data one by one in readable format
        logger.debug("[cardio] iOS queryAggregated calories: Detailed calorie breakdown", { totalCalorieRows: calorieRows.length });
        
        const printCalorie = (row: any, i: number) => {
          logger.debug(`[cardio] iOS Calorie Row #${i + 1}/${calorieRows.length}`, {
            startDate: row?.startDate || 'N/A',
            date: row?.date || 'N/A',
            value: row?.value || 'N/A',
            allKeys: Object.keys(row || {})
          });
        }
        
        for (let i = 0; i < calorieRows.length; i++) {
          const row = calorieRows[i];
          printCalorie(row, i);
          const rowDate = new Date(row?.startDate ?? row?.date ?? 0);
          const bucket = findBucket(buckets, rowDate);
          if (!bucket) continue;
          const value = safeNumber(row?.value);
          if (value > 0) {
            bucket.totals.calories += value;
            totalCalories += value;
            processedCalories++;
          }
        }
        
        logger.debug("[cardio] iOS calories processed", {
          processedRows: processedCalories, 
          totalCalories,
          bucketsWithCalories: buckets.filter(b => b.totals.calories > 0).length});

      } catch (error) {
        logger.debug("[cardio] iOS calorie aggregation failed", error);
      }

      for (const bucket of buckets) {
        if (bucket.totals.calories <= 0 && fallbackCalories.has(bucket)) {
          bucket.totals.calories = fallbackCalories.get(bucket) ?? 0;
        }
        if (bucket.totals.steps <= 0 && fallbackSteps.has(bucket)) {
          bucket.totals.steps = fallbackSteps.get(bucket) ?? 0;
        }
      }
      
      // ADD: Final summary logging
      logger.debug("[cardio] iOS populateFromIos: Final summary", {
        totalWorkouts: collectedWorkouts.length,
        totalBuckets: buckets.length,
        bucketsWithData: buckets.filter(b =>
          b.totals.minutes > 0 ||
          b.totals.distanceKm > 0 ||
          b.totals.calories > 0 ||
          b.totals.steps > 0
        ).length,
        totalMinutes: buckets.reduce((sum, b) => sum + b.totals.minutes, 0),
        totalDistance: buckets.reduce((sum, b) => sum + b.totals.distanceKm, 0),
        totalCalories: buckets.reduce((sum, b) => sum + b.totals.calories, 0),
        totalSteps: buckets.reduce((sum, b) => sum + b.totals.steps, 0),
        fallbackCaloriesUsed: fallbackCalories.size,
        fallbackStepsUsed: fallbackSteps.size
      });
    } catch (error) {
      logger.warn("[cardio] Failed to populate iOS cardio data", error);
      throw error;
    }
  }

  private async populateFromAndroid(
    buckets: Bucket[],
    start: Date,
    end: Date,
  ): Promise<void> {
    try {
      const { HealthConnect } = await import("@kiwi-health/capacitor-health-connect");
      logger.debug("[cardio] Android request permissions", { start: start.toISOString(), end: end.toISOString() });
      await HealthConnect.requestHealthPermissions({
        read: ["Steps", "Distance", "ActiveCaloriesBurned", "HeartRateSeries"],
        write: [],
      });

      const timeRangeFilter = { type: "between", startTime: start, endTime: end } as const;

      const readAllRecords = async (type: string) => {
        const records: any[] = [];
        let pageToken: string | undefined;
        do {
          logger.debug("[cardio] Android readRecords", { type, pageToken });
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

      const stepRecords = await readAllRecords("Steps");
      for (const record of stepRecords) {
        const startDate = new Date(record?.startTime ?? 0);
        const bucket = findBucket(buckets, startDate);
        if (!bucket) continue;
        bucket.totals.steps += safeNumber(record?.count);
      }

      const distanceRecords = await readAllRecords("Distance");
      const collectedWorkouts: CardioWorkoutSummary[] = [];
      for (const record of distanceRecords) {
        const startDate = new Date(record?.startTime ?? 0);
        const endDate = new Date(record?.endTime ?? 0);
        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) continue;
        const bucket = findBucket(buckets, startDate);
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

        const workoutSummary: CardioWorkoutSummary = {
          id: record?.metadata?.id ?? `android-distance-${startDate.getTime()}`,
          activity: normalizeActivityName("Distance"),
          start: formatLocalIso(startDate),
          end: formatLocalIso(endDate),
          durationMinutes,
          distanceKm,
          source: record?.metadata?.dataOrigin,
        };
        bucket.workouts.push(workoutSummary);
        collectedWorkouts.push(workoutSummary);
      }

      const calorieRecords = await readAllRecords("ActiveCaloriesBurned");
      for (const record of calorieRecords) {
        const startDate = new Date(record?.startTime ?? 0);
        const bucket = findBucket(buckets, startDate);
        if (!bucket) continue;
        const energy = safeNumber(record?.energy?.value);
        if (energy > 0) {
          bucket.totals.calories += energy;
        }
      }

      const heartRateRecords = await readAllRecords("HeartRateSeries");
      for (const record of heartRateRecords) {
        const startDate = new Date(record?.startTime ?? 0);
        const bucket = findBucket(buckets, startDate);
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
      logger.debug("[cardio] Android populateFromAndroid: Final summary", {
        totalWorkouts: collectedWorkouts.length,
        totalBuckets: buckets.length,
        bucketsWithData: buckets.filter(b =>
          b.totals.minutes > 0 ||
          b.totals.distanceKm > 0 ||
          b.totals.calories > 0 ||
          b.totals.steps > 0
        ).length,
        totalMinutes: buckets.reduce((sum, b) => sum + b.totals.minutes, 0),
        totalDistance: buckets.reduce((sum, b) => sum + b.totals.distanceKm, 0),
        totalCalories: buckets.reduce((sum, b) => sum + b.totals.calories, 0),
        totalSteps: buckets.reduce((sum, b) => sum + b.totals.steps, 0)
      });
    } catch (error) {
      logger.warn("[cardio] Failed to populate Android cardio data", error);
      throw error;
    }
  }
}

export { CardioProgressProvider };
