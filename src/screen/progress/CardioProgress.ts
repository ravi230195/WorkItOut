import type {
  CardioBest,
  CardioFocus,
  CardioKpi,
  CardioProgressSnapshot,
  CardioSeriesResponse,
  CardioTargetLine,
  CardioWorkoutSummary,
  ProgressDataProvider,
  SeriesPoint,
  TimeRange,
} from "@/types/progress";
import { logger } from "../../../utils/logging";

const TARGET_MINUTES = 40;
const CARDIO_FOCUS_LIST: CardioFocus[] = ["activeMinutes", "distance", "calories", "steps"];

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
};

type AggregatedData = {
  range: TimeRange;
  current: Bucket[];
  previous: Bucket[];
  workouts: CardioWorkoutSummary[];
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

function createBucket(start: Date, end: Date): Bucket {
  return { start, end, iso: start.toISOString(), totals: createEmptyTotals() };
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

function parseDurationLabel(raw: unknown): number {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : 0;
  }
  if (typeof raw !== "string") return 0;
  const trimmed = raw.trim();
  if (!trimmed) return 0;

  const colonParts = trimmed.split(":").map((part) => Number.parseFloat(part));
  if (colonParts.every((part) => Number.isFinite(part))) {
    if (colonParts.length === 3) {
      const [hours, minutes, seconds] = colonParts;
      return hours * 60 + minutes + seconds / 60;
    }
    if (colonParts.length === 2) {
      const [minutes, seconds] = colonParts;
      return minutes + seconds / 60;
    }
  }

  const numberMatch = trimmed.match(/(-?\d+(?:\.\d+)?)/);
  if (!numberMatch) return 0;
  const value = Number.parseFloat(numberMatch[1]);
  if (!Number.isFinite(value)) return 0;
  if (/h/i.test(trimmed) && !/min/i.test(trimmed)) {
    return value * 60;
  }
  return value;
}

function parseDistanceValue(raw: unknown): number | undefined {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : undefined;
  }
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const numberMatch = trimmed.match(/(-?\d+(?:\.\d+)?)/);
  if (!numberMatch) return undefined;
  const value = Number.parseFloat(numberMatch[1]);
  if (!Number.isFinite(value)) return undefined;
  if (/mile/i.test(trimmed)) {
    return value * 1.60934;
  }
  if (/meter/i.test(trimmed) && !/kilometer/i.test(trimmed)) {
    return value / 1000;
  }
  return value;
}

function parseCaloriesValue(raw: unknown): number | undefined {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : undefined;
  }
  if (typeof raw !== "string") return undefined;
  const numberMatch = raw.match(/(-?\d+(?:\.\d+)?)/);
  if (!numberMatch) return undefined;
  const value = Number.parseFloat(numberMatch[1]);
  return Number.isFinite(value) ? value : undefined;
}

function kilometersToDisplay(value: number) {
  return `${kmFormatter.format(Math.max(0, value))} km`;
}

function caloriesToDisplay(value: number) {
  return `${calorieFormatter.format(Math.max(0, value))}`;
}

function stepsToDisplay(value: number) {
  return `${stepFormatter.format(Math.max(0, value))}`;
}

class CardioProgressProvider implements ProgressDataProvider {
  private cache = new Map<TimeRange, Promise<AggregatedData>>();

  private platformPromise?: Promise<string>;

  async series(range: TimeRange, focus: CardioFocus, options?: { compare?: boolean }): Promise<CardioSeriesResponse> {
    try {
      return await this.seriesNative(range, focus, options);
    } catch (error) {
      logger.debug("[cardio] Unable to load cardio series", { range, focus, error });
      return this.seriesUnavailable(range, focus, options);
    }
  }

  async kpis(range: TimeRange): Promise<CardioKpi[]> {
    try {
      return await this.kpisNative(range);
    } catch (error) {
      logger.debug("[cardio] Unable to load cardio KPIs", { range, error });
      return this.kpisUnavailable(range);
    }
  }

  async recentWorkouts(range: TimeRange): Promise<CardioWorkoutSummary[]> {
    try {
      return await this.recentWorkoutsNative(range);
    } catch (error) {
      logger.debug("[cardio] Unable to load cardio workouts", { range, error });
      return [];
    }
  }

  async bests(range: TimeRange): Promise<CardioBest[]> {
    try {
      return await this.bestsNative(range);
    } catch (error) {
      logger.debug("[cardio] Unable to load cardio bests", { range, error });
      return [];
    }
  }

  async targetLine(range: TimeRange, focus: CardioFocus): Promise<CardioTargetLine | null> {
    try {
      return await this.targetLineNative(range, focus);
    } catch (error) {
      logger.debug("[cardio] Unable to load cardio target line", { range, focus, error });
      return this.targetLineUnavailable(focus);
    }
  }

  async snapshot(range: TimeRange): Promise<CardioProgressSnapshot> {
    try {
      return await this.snapshotNative(range);
    } catch (error) {
      logger.debug("[cardio] Unable to load cardio snapshot", { range, error });
      return this.snapshotUnavailable(range);
    }
  }

  private async seriesNative(
    range: TimeRange,
    focus: CardioFocus,
    options?: { compare?: boolean },
  ): Promise<CardioSeriesResponse> {
    const data = await this.ensure(range);
    const selector = METRIC_SELECTORS[focus];
    const previousValues = data.previous.map((bucket) => selector(bucket));
    const historicalMax = previousValues.length ? Math.max(...previousValues) : 0;
    const includePrevious = options?.compare !== false;
    const previous: SeriesPoint[] | undefined = includePrevious && data.previous.length
      ? data.previous.map((bucket) => ({ iso: bucket.iso, value: selector(bucket) }))
      : undefined;

    const current = data.current.map((bucket) => {
      const value = selector(bucket);
      const isPersonalBest = value > historicalMax && value > 0;
      return { iso: bucket.iso, value, isPersonalBest };
    });

    const personalBest = Math.max(historicalMax, ...current.map((point) => point.value));
    return { focus, current, previous, personalBest: personalBest > 0 ? personalBest : undefined };
  }

  private async kpisNative(range: TimeRange): Promise<CardioKpi[]> {
    const data = await this.ensure(range);
    const minutesCurrent = data.current.reduce((sum, bucket) => sum + bucket.totals.minutes, 0);
    const minutesPrevious = data.previous.reduce((sum, bucket) => sum + bucket.totals.minutes, 0);
    const distanceCurrent = data.current.reduce((sum, bucket) => sum + bucket.totals.distanceKm, 0);
    const distancePrevious = data.previous.reduce((sum, bucket) => sum + bucket.totals.distanceKm, 0);
    const caloriesCurrent = data.current.reduce((sum, bucket) => sum + bucket.totals.calories, 0);
    const caloriesPrevious = data.previous.reduce((sum, bucket) => sum + bucket.totals.calories, 0);
    const stepsCurrent = data.current.reduce((sum, bucket) => sum + bucket.totals.steps, 0);
    const stepsPrevious = data.previous.reduce((sum, bucket) => sum + bucket.totals.steps, 0);

    return [
      {
        key: "activeMinutes",
        title: "Total Time",
        unit: "minutes",
        value: minutesToDisplay(minutesCurrent),
        currentNumeric: minutesCurrent,
        previous: minutesPrevious,
      },
      {
        key: "distance",
        title: "Distance",
        unit: "km",
        value: `${kilometersToDisplay(distanceCurrent)} km`,
        currentNumeric: distanceCurrent,
        previous: distancePrevious,
      },
      {
        key: "calories",
        title: "Calories",
        unit: "kcal",
        value: `${caloriesToDisplay(caloriesCurrent)} kcal`,
        currentNumeric: caloriesCurrent,
        previous: caloriesPrevious,
      },
      {
        key: "steps",
        title: "Steps",
        value: `${stepsToDisplay(stepsCurrent)}`,
        currentNumeric: stepsCurrent,
        previous: stepsPrevious,
      },
    ];
  }

  private async recentWorkoutsNative(range: TimeRange): Promise<CardioWorkoutSummary[]> {
    const data = await this.ensure(range);
    const currentStart = data.current[0]?.start ?? new Date();
    const currentEnd = data.current[data.current.length - 1]?.end ?? new Date();
    const filtered = data.workouts.filter((workout) => {
      const startDate = new Date(workout.start);
      return startDate >= currentStart && startDate <= currentEnd;
    });
    filtered.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
    return filtered.slice(0, 6);
  }

  private async bestsNative(range: TimeRange): Promise<CardioBest[]> {
    const workouts = await this.recentWorkoutsNative(range);
    return this.computeBestsFromWorkouts(workouts);
  }

  private async targetLineNative(_range: TimeRange, focus: CardioFocus): Promise<CardioTargetLine | null> {
    if (focus !== "activeMinutes") return null;
    return { focus, value: TARGET_MINUTES, unit: "minutes" };
  }

  private async snapshotNative(range: TimeRange): Promise<CardioProgressSnapshot> {
    const [minutesSeries, distanceSeries, caloriesSeries, stepsSeries, kpis, workouts, bests, targetLine] = await Promise.all([
      this.seriesNative(range, "activeMinutes"),
      this.seriesNative(range, "distance"),
      this.seriesNative(range, "calories"),
      this.seriesNative(range, "steps"),
      this.kpisNative(range),
      this.recentWorkoutsNative(range),
      this.bestsNative(range),
      this.targetLineNative(range, "activeMinutes"),
    ]);

    return {
      range,
      series: {
        activeMinutes: minutesSeries,
        distance: distanceSeries,
        calories: caloriesSeries,
        steps: stepsSeries,
      },
      kpis,
      workouts,
      bests,
      targetLine,
    };
  }

  private seriesUnavailable(
    range: TimeRange,
    focus: CardioFocus,
    options?: { compare?: boolean },
  ): CardioSeriesResponse {
    const buckets = buildBucketSets(range);
    return this.seriesUnavailableFromBuckets(focus, buckets, options);
  }

  private seriesUnavailableFromBuckets(
    focus: CardioFocus,
    buckets: ReturnType<typeof buildBucketSets>,
    options?: { compare?: boolean },
  ): CardioSeriesResponse {
    const includePrevious = options?.compare !== false;
    const mapBucket = (bucket: Bucket): SeriesPoint => ({ iso: bucket.iso, value: 0 });
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
      workouts: [],
      bests: [],
      targetLine: this.targetLineUnavailable("activeMinutes"),
    };
  }

  public getUnavailableSnapshot(range: TimeRange): CardioProgressSnapshot {
    return this.snapshotUnavailable(range);
  }

  private computeBestsFromWorkouts(workouts: CardioWorkoutSummary[]): CardioBest[] {
    if (workouts.length === 0) return [];

    const longestDistance = workouts.reduce<CardioWorkoutSummary | null>((best, workout) => {
      if (!workout.distanceKm) return best;
      if (!best || (best.distanceKm ?? 0) < workout.distanceKm) {
        return workout;
      }
      return best;
    }, null);

    const topCalories = workouts.reduce<CardioWorkoutSummary | null>((best, workout) => {
      if (!workout.calories) return best;
      if (!best || (best.calories ?? 0) < workout.calories) {
        return workout;
      }
      return best;
    }, null);

    const longestDuration = workouts.reduce<CardioWorkoutSummary | null>((best, workout) => {
      if (!best || best.durationMinutes < workout.durationMinutes) {
        return workout;
      }
      return best;
    }, null);

    const bests: CardioBest[] = [];
    if (longestDistance) {
      bests.push({
        id: `${longestDistance.id}-distance`,
        label: "Longest Distance",
        metric: "distance",
        value: kilometersToDisplay(longestDistance.distanceKm ?? 0),
        date: longestDistance.start,
        detail: normalizeActivityName(longestDistance.activity),
      });
    }
    if (topCalories) {
      bests.push({
        id: `${topCalories.id}-calories`,
        label: "Highest Calorie Burn",
        metric: "calories",
        value: `${caloriesToDisplay(topCalories.calories ?? 0)} kcal`,
        date: topCalories.start,
        detail: normalizeActivityName(topCalories.activity),
      });
    }
    if (longestDuration) {
      bests.push({
        id: `${longestDuration.id}-duration`,
        label: "Longest Session",
        metric: "activeMinutes",
        value: minutesToDisplay(longestDuration.durationMinutes),
        date: longestDuration.start,
        detail: normalizeActivityName(longestDuration.activity),
      });
    }
    return bests;
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
    const { current, previous } = buildBucketSets(range);
    const allBuckets = [...previous, ...current];
    if (allBuckets.length === 0) {
      return { range, current, previous, workouts: [] };
    }
    const earliest = allBuckets[0].start;
    const latest = allBuckets[allBuckets.length - 1].end;

    const workouts: CardioWorkoutSummary[] = [];
    const platform = await this.getPlatform();
    if (platform === "ios") {
      await this.populateFromIos(allBuckets, earliest, latest, workouts);
    } else if (platform === "android") {
      await this.populateFromAndroid(allBuckets, earliest, latest, workouts);
    } else {
      throw new Error(`Unsupported platform for cardio provider: ${platform}`);
    }

    return { range, current, previous, workouts };
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
    start: Date,
    end: Date,
    workouts: CardioWorkoutSummary[],
  ): Promise<void> {
    try {
      const { Health } = await import("capacitor-health");
      logger.debug("[cardio] iOS request permissions", { start: start.toISOString(), end: end.toISOString() });
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

      logger.debug("[cardio] iOS queryWorkouts", { start: start.toISOString(), end: end.toISOString() });
      const workoutResponse: any = await Health.queryWorkouts({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        includeHeartRate: true,
        includeRoute: false,
        includeSteps: true,
      });
      const workoutSamples: any[] = Array.isArray(workoutResponse?.workouts) ? workoutResponse.workouts : [];
      logger.debug("[cardio] iOS workouts fetched", { count: workoutSamples.length });

      const fallbackCalories = new Map<Bucket, number>();
      const fallbackSteps = new Map<Bucket, number>();

      for (const sample of workoutSamples) {
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
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          durationMinutes,
          distanceKm,
          calories: calories || undefined,
          steps: steps || undefined,
          averageHeartRate: workoutHeartRateCount > 0 ? workoutHeartRateSum / workoutHeartRateCount : undefined,
          source: sample?.sourceName,
        };
        workouts.push(workoutSummary);
      }

      try {
        logger.debug("[cardio] iOS queryAggregated steps", { start: start.toISOString(), end: end.toISOString() });
        const stepsAggregated: any = await Health.queryAggregated({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          dataType: "steps",
          bucket: "day",
        });
        const stepRows: any[] = Array.isArray(stepsAggregated?.aggregatedData) ? stepsAggregated.aggregatedData : [];
        for (const row of stepRows) {
          const rowDate = new Date(row?.startDate ?? row?.date ?? 0);
          const bucket = findBucket(buckets, rowDate);
          if (!bucket) continue;
          bucket.totals.steps += safeNumber(row?.value);
        }
      } catch (error) {
        logger.debug("[cardio] iOS step aggregation failed", error);
      }

      try {
        logger.debug("[cardio] iOS queryAggregated active calories", { start: start.toISOString(), end: end.toISOString() });
        const caloriesAggregated: any = await Health.queryAggregated({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          dataType: "active-calories",
          bucket: "day",
        });
        const calorieRows: any[] = Array.isArray(caloriesAggregated?.aggregatedData) ? caloriesAggregated.aggregatedData : [];
        for (const row of calorieRows) {
          const rowDate = new Date(row?.startDate ?? row?.date ?? 0);
          const bucket = findBucket(buckets, rowDate);
          if (!bucket) continue;
          const value = safeNumber(row?.value);
          if (value > 0) {
            bucket.totals.calories += value;
          }
        }
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
    } catch (error) {
      logger.warn("[cardio] Failed to populate iOS cardio data", error);
      throw error;
    }
  }

  private async populateFromAndroid(
    buckets: Bucket[],
    start: Date,
    end: Date,
    workouts: CardioWorkoutSummary[],
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
            type,
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

        workouts.push({
          id: record?.metadata?.id ?? `android-distance-${startDate.getTime()}`,
          activity: normalizeActivityName("Distance"),
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          durationMinutes,
          distanceKm,
          source: record?.metadata?.dataOrigin,
        });
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
    } catch (error) {
      logger.warn("[cardio] Failed to populate Android cardio data", error);
      throw error;
    }
  }
}

export { CardioProgressProvider };
