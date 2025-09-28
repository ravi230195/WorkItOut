import type {
  CardioFocus,
  CardioKpi,
  CardioProgressSnapshot,
  CardioSeriesResponse,
  CardioWorkoutSummary,
  SeriesPoint,
  TimeRange,
} from "../../progress/Progress.types";
import { logger } from "../../../utils/logging";

const LOG_PREFIX = "[cardioProgess]";

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

const kmFormatter = new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const calorieFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const stepFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

const MIN_MS = 60_000;

type DateInput = string | number | Date | undefined | null;

function toUtcDate(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds(),
    ),
  );
}

function toLocalDateTime(value: DateInput): Date | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  const valueIsString = typeof value === "string";
  const hasExplicitOffset = valueIsString && /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);

  if (valueIsString && !hasExplicitOffset) {
    return new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    );
  }

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

function toLocalDate(value: DateInput): Date | undefined {
  const date = toLocalDateTime(value);
  if (!date) {
    return undefined;
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const SERIES_FOCUSES: CardioFocus[] = ["activeMinutes", "distance", "calories", "steps"];

function normalizeActivityName(activity: string | undefined): string {
  if (!activity) return "Workout";
  const key = activity.trim().toLowerCase();
  return ACTIVITY_LABELS[key] ?? activity;
}

function createEmptyTotals(): BucketTotals {
  return { minutes: 0, distanceKm: 0, calories: 0, steps: 0, heartRateSum: 0, heartRateCount: 0 };
}

function createBucket(start: Date, end: Date): Bucket {
  return { start, end, totals: createEmptyTotals(), workouts: [] };
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
  logger.debug("🔍 DGB [CARDIO_PROGRESS] Today:", today.toDateString());
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
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function minutesToDisplay(value: number) {
  const totalMinutes = Math.max(0, Math.round(value));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const hoursText = String(hours).padStart(2, "0");
  const minutesText = String(minutes).padStart(2, "0");

  return `${hoursText}h ${minutesText}m`;
}
function kilometersToDisplay(value: number) { return `${kmFormatter.format(Math.max(0, value))}`; }
function caloriesToDisplay(value: number) { return `${calorieFormatter.format(Math.max(0, value))}`; }
function stepsToDisplay(value: number) {
  const safeValue = Math.max(0, value);
  if (safeValue > 10_000) {
    return `${Math.round(safeValue / 1_000)}K`;
  }
  return `${stepFormatter.format(Math.round(safeValue))}`;
}

function averageHeartRate(bucket: Bucket): number | undefined {
  if (bucket.totals.heartRateCount <= 0) {
    return undefined;
  }
  return bucket.totals.heartRateSum / bucket.totals.heartRateCount;
}

function collectWorkouts(data: AggregatedData): CardioWorkoutSummary[] {
  return [...data.previous, ...data.current].flatMap((bucket) => bucket.workouts);
}

function groupWorkoutsByDate(workouts: CardioWorkoutSummary[]): Record<string, CardioWorkoutSummary[]> {
  const grouped: Record<string, CardioWorkoutSummary[]> = {};
  for (const workout of workouts) {
    const date = toLocalDateTime(workout.start) ?? toLocalDateTime(workout.end);
    if (!date || Number.isNaN(date.getTime())) {
      continue;
    }
  
    const key = formatDateKey(date);
    grouped[key] = grouped[key] || [];
    grouped[key].push(workout);
  }

  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => {
      const aStart = toLocalDateTime(a.start);
      const bStart = toLocalDateTime(b.start);

      return (bStart?.getTime() ?? 0) - (aStart?.getTime() ?? 0);
    });
  }

  return grouped;
}

function seriesUnavailableFromBuckets(
  focus: CardioFocus,
  buckets: ReturnType<typeof buildBucketSets>,
  options?: { compare?: boolean },
): CardioSeriesResponse {
  const includePrevious = options?.compare !== false;
  const mapBucket = (bucket: Bucket): SeriesPoint => ({ date: new Date(bucket.start.getTime()), value: 0 });
  return {
    focus,
    current: buckets.current.map(mapBucket),
    previous: includePrevious ? buckets.previous.map(mapBucket) : undefined,
  };
}

function kpisUnavailable(): CardioKpi[] {
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


function snapshotUnavailable(range: TimeRange): CardioProgressSnapshot {
  const buckets = buildBucketSets(range);
  const series = SERIES_FOCUSES.reduce<Record<CardioFocus, CardioSeriesResponse>>((acc, focus) => {
    acc[focus] = seriesUnavailableFromBuckets(focus, buckets);
    return acc;
  }, {} as Record<CardioFocus, CardioSeriesResponse>);

  return {
    range,
    series,
    kpis: kpisUnavailable(),
    workouts: {},
  };
}

class CardioProgressProvider {
  private cache = new Map<TimeRange, Promise<AggregatedData>>();

  private platformPromise?: Promise<string>;

  async snapshot(range: TimeRange): Promise<CardioProgressSnapshot> {
    logger.debug(`${LOG_PREFIX} snapshot`, { range });

    try {
      const result = await this.snapshotNative(range);
      logger.debug(`${LOG_PREFIX} snapshot.success`, { 
        range: range,
        kpis: JSON.stringify(result.kpis, null, 2),
        workoutDays: Object.keys(result.workouts ?? {}).length,
      });
      return result;
    } catch (error) {
      logger.debug(`${LOG_PREFIX} snapshot.failed`, { range, error });
      return snapshotUnavailable(range);
    }
  }

  async series(
    range: TimeRange,
    focus: CardioFocus,
  ): Promise<CardioSeriesResponse> {
    try {
      const data = await this.ensure(range);
      return this.seriesFromAggregated(range, data, focus);
    } catch (error) {
      logger.debug(`${LOG_PREFIX} series.failed`, { range, focus, error });
      return seriesUnavailableFromBuckets(focus, buildBucketSets(range));
    }
  }

  async kpis(range: TimeRange): Promise<CardioKpi[]> {
    try {
      const data = await this.ensure(range);
      return this.kpisFromAggregated(range, data);
    } catch (error) {
      logger.debug(`${LOG_PREFIX} kpis.failed`, { range, error });
      return kpisUnavailable();
    }
  }

  async recentWorkouts(range: TimeRange): Promise<CardioWorkoutSummary[]> {
    try {
      const data = await this.ensure(range);
      return this.recentWorkoutsFromAggregated(range, data);
    } catch (error) {
      logger.debug(`${LOG_PREFIX} workouts.failed`, { range, error });
      return [];
    }
  }


  private seriesFromAggregated(
    range: TimeRange,
    data: AggregatedData,
    focus: CardioFocus,
  ): CardioSeriesResponse {
    const selector = METRIC_SELECTORS[focus];
  
    const previous: SeriesPoint[] = data.previous.map((bucket) => ({ 
      date: new Date(bucket.start.getTime()), 
      value: selector(bucket) 
    }));
  
    const current = data.current.map((bucket) => {
      const value = selector(bucket);
      return { date: new Date(bucket.start.getTime()), value };
    });
  
    logger.debug(`${LOG_PREFIX} series`, {
      range,
      focus,
      currentPoints: current.length,
      previousPoints: previous.length,
    });
  
    return { focus, current, previous };
  }

  private kpisFromAggregated(_range: TimeRange, data: AggregatedData): CardioKpi[] {
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

    logger.debug(`${LOG_PREFIX} kpis`, {
      range: _range,
      minutesCurrent,
      distanceCurrent,
      caloriesCurrent,
      stepsCurrent,
    });

    return kpis;
  }

  private recentWorkoutsFromAggregated(range: TimeRange, data: AggregatedData): CardioWorkoutSummary[] {
    const allWorkouts = collectWorkouts(data);
    const currentStart = data.current[0]?.start ?? new Date();
    const currentEnd = data.current[data.current.length - 1]?.end ?? new Date();

    const filtered = allWorkouts.filter((workout) => {
      const endDate = toLocalDateTime(workout.end);
      return !!endDate && endDate >= currentStart && endDate <= currentEnd;
    });

    filtered.sort(
      (a, b) => (toLocalDateTime(b.end)?.getTime() ?? 0) - (toLocalDateTime(a.end)?.getTime() ?? 0),
    );
    const result = filtered.slice(0, 6);

    logger.debug(`${LOG_PREFIX} workouts`, {
      range,
      total: allWorkouts.length,
      returned: result.length,
    });

    return result;
  }


  private async snapshotNative(range: TimeRange): Promise<CardioProgressSnapshot> {
    const data = await this.ensure(range);

    const minutesSeries = this.seriesFromAggregated(range, data, "activeMinutes");
    const distanceSeries = this.seriesFromAggregated(range, data, "distance");
    const caloriesSeries = this.seriesFromAggregated(range, data, "calories");
    const stepsSeries = this.seriesFromAggregated(range, data, "steps");

    const kpis = this.kpisFromAggregated(range, data);
    const workouts = collectWorkouts(data);
    const workoutsByDay = groupWorkoutsByDate(workouts);

    logger.debug(`${LOG_PREFIX} snapshotNative`, {
      range,
      workoutCount: workouts.length,
      workoutDays: Object.keys(workoutsByDay).length,
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
    };
  }

  private async ensure(range: TimeRange): Promise<AggregatedData> {
    if (!this.cache.has(range)) {
      const loadPromise = this.fetchAggregated(range).catch((error) => {
        this.cache.delete(range);
        throw error;
      });
      this.cache.set(range, loadPromise);
    }
    return this.cache.get(range)!;
  }

  private async fetchAggregated(range: TimeRange): Promise<AggregatedData> {
    logger.debug(`${LOG_PREFIX} fetchAggregated.start`, { range });

    const { current, previous } = buildBucketSets(range);
    for (const bucket of previous) {
      logger.debug("🔍 DGB [CARDIO_PROGRESS] " + range + 
        " Previous Bucket Start: ", bucket.start.toDateString(), " " + bucket.start.toTimeString(), 
        " Previous Bucket End: ", bucket.end.toDateString(), " " + bucket.end.toTimeString());
    }

    for (const bucket of current) {
      logger.debug("🔍 DGB [CARDIO_PROGRESS] " + range +
        " Current Bucket Start: " + bucket.start.toDateString(), " " + bucket.start.toTimeString(), 
        " Current Bucket End: ", bucket.end.toDateString(), " " + bucket.end.toTimeString());
    }
    const allBuckets = [...previous, ...current];

    if (allBuckets.length === 0) {
      logger.debug(`${LOG_PREFIX} fetchAggregated.noBuckets`, { range });
      return { range, current, previous };
    }

    const earliest = allBuckets[0].start;
    const latest = allBuckets[allBuckets.length - 1].end;

    const platform = await this.getPlatform();
    logger.debug(`${LOG_PREFIX} fetchAggregated.platform`, {
      range,
      platform,
      start: earliest.toISOString(),
      end: latest.toISOString(),
    });

    if (platform === "ios") {
      await this.populateFromIos(allBuckets, earliest, latest);
    } else if (platform === "android") {
      await this.populateFromAndroid(allBuckets, earliest, latest);
    } else {
      logger.warn(`${LOG_PREFIX} fetchAggregated.unsupportedPlatform`, { platform });
    }

    logger.debug(`${LOG_PREFIX} fetchAggregated.complete`, {
      range,
      platform,
      workoutCount: allBuckets.reduce((sum, bucket) => sum + bucket.workouts.length, 0),
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
          logger.debug(`${LOG_PREFIX} platform.webFallback`, { error });
          return "web";
        }
      })();
    }
    return this.platformPromise;
  }

  private async populateFromIos(
    buckets: Bucket[],
    startLocal: Date,
    endLocal: Date,
  ): Promise<void> {
    try {
      const { Health } = await import("capacitor-health");
      logger.debug("🔍 DGB [CARDIO_PROGRESS] Start Local:", startLocal.toDateString() + " " + startLocal.toTimeString());
      logger.debug("🔍 DGB [CARDIO_PROGRESS] End Local:", endLocal.toDateString() + " " + endLocal.toTimeString());
      const startUtc = startLocal.toISOString();
      const endUtc = endLocal.toISOString();

      logger.debug(`${LOG_PREFIX} ios.populate.start`, {
        start: startUtc,
        end: endUtc,
        startLocal: startLocal.toDateString() + " " + startLocal.toTimeString(),
        endLocal: endLocal.toDateString() + " " + endLocal.toTimeString(),
        bucketCount: buckets.length,
      });

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

      const workoutResponse: any = await Health.queryWorkouts({
        startDate: startUtc,
        endDate: endUtc,
        includeHeartRate: true,
        includeRoute: false,
        includeSteps: true,
      });

      const fallbackCalories = new Map<Bucket, number>();
      const fallbackSteps = new Map<Bucket, number>();

      const workoutSamples: any[] = Array.isArray(workoutResponse?.workouts) ? workoutResponse.workouts : [];

      const count = workoutSamples.length;
      for (const sample of workoutSamples) {
        logger.debug("🔍 DGB [CARDIO_PROGRESS] ======================= WORKOUT START ======================= ");
        const sampleIndex = workoutSamples.indexOf(sample);
        logger.debug("🔍 DGB [CARDIO_PROGRESS] Sample: #(" + (sampleIndex + 1) + ")/(" + count + ")");// sampleDbg - heart rate in array
        
        // Log sample data without heartbeat details JUST FOR LOGGING remove it after testing
        const { heartRate, ...sampleWithoutHeartRate } = sample;
        logger.debug("🔍 DGB [CARDIO_PROGRESS] Sample: ", JSON.stringify(sampleWithoutHeartRate, null, 2));

        const startDate = toLocalDateTime(sample?.startDate ?? sample?.startTime);
        const endDate = toLocalDateTime(sample?.endDate ?? sample?.endTime);        
        if (!startDate || !endDate) {
          continue;
        }

        const bucket = findBucket(buckets, endDate);
        if (!bucket) {
          logger.debug("🔍 DGB [CARDIO_PROGRESS] Bucket not found for sample: ", sample?.id);
          continue;
        }
        logger.debug("🔍 DGB [CARDIO_PROGRESS] Bucket start date:", bucket.start.toDateString() + " " + bucket.start.toTimeString(),
        " Bucket end date:", bucket.end.toDateString() + " " + bucket.end.toTimeString());


        // calculate duration
        const rawDuration = safeNumber(sample?.duration);
        const calculatedDuration = Math.max(0, (endDate.getTime() - startDate.getTime()) / MIN_MS);
        const durationMinutes = rawDuration > 0 ? rawDuration / 60 : calculatedDuration;

        // calculate distance
        const distanceMeters = safeNumber(sample?.distance);
        const distanceKm = distanceMeters > 0 ? distanceMeters / 1000 : undefined;
        
        // calculate calories
        const calories = safeNumber(sample?.calories ?? sample?.totalEnergyBurned);

        // calculate steps
        const steps = safeNumber(sample?.steps);

        bucket.totals.minutes += durationMinutes;
        if (distanceKm && distanceKm > 0) {
          bucket.totals.distanceKm += distanceKm;
        }

        if (calories > 0) {
          fallbackCalories.set(bucket, (fallbackCalories.get(bucket) ?? 0) + calories);
        }

        if (steps > 0) {
          fallbackSteps.set(bucket, (fallbackSteps.get(bucket) ?? 0) + steps);
        }

        let workoutHeartRateSum = 0;
        let workoutHeartRateCount = 0;
        if (Array.isArray(sample?.heartRate)) {
          for (const reading of sample.heartRate) {
            const bpm = safeNumber(reading?.bpm ?? reading?.beatsPerMinute);
            if (bpm > 0) {
              bucket.totals.heartRateSum += bpm;
              bucket.totals.heartRateCount += 1;
              workoutHeartRateSum += bpm;
              workoutHeartRateCount += 1;
            }
          }
        }

        const workoutSummary: CardioWorkoutSummary = {
          id: sample?.id ?? `ios-${endDate.getTime()}`,
          activity: normalizeActivityName(sample?.workoutType ?? sample?.activityName),
          start: new Date(startDate.getTime()),
          end: new Date(endDate.getTime()),
          durationMinutes,
          distanceKm,
          calories: calories > 0 ? calories : undefined,
          steps: steps > 0 ? steps : undefined,
          averageHeartRate: workoutHeartRateCount > 0
              ? workoutHeartRateSum / workoutHeartRateCount : undefined,
          source: sample?.sourceName,
        };
      
        //print workoutSummary
        logger.debug("🔍 DGB [CARDIO_PROGRESS] workoutSummary ", workoutSummary.id);
        logger.debug("🔍 DGB [CARDIO_PROGRESS] workoutSummary ", workoutSummary.start.toDateString() + " " + workoutSummary.start.toTimeString());
        logger.debug("🔍 DGB [CARDIO_PROGRESS] workoutSummary ", workoutSummary.end.toDateString() + " " + workoutSummary.end.toTimeString());
        logger.debug("🔍 DGB [CARDIO_PROGRESS] workoutSummary ", workoutSummary.durationMinutes);
        logger.debug("🔍 DGB [CARDIO_PROGRESS] workoutSummary ", workoutSummary.distanceKm);
        logger.debug("🔍 DGB [CARDIO_PROGRESS] workoutSummary ", workoutSummary.calories);
        logger.debug("🔍 DGB [CARDIO_PROGRESS] workoutSummary ", workoutSummary.steps);
        logger.debug("🔍 DGB [CARDIO_PROGRESS] workoutSummary ", workoutSummary.averageHeartRate);
        logger.debug("🔍 DGB [CARDIO_PROGRESS] workoutSummary ", workoutSummary.source);
        bucket.workouts.push(workoutSummary);
        logger.debug("🔍 DGB [CARDIO_PROGRESS] ======================= WORKOUT END ======================= ");
      }

      const applyAggregated = async (
        dataType: string,
        apply: (bucket: Bucket, value: number) => void,
      ) => {
        const response: any = await Health.queryAggregated({
          startDate: startUtc,
          endDate: endUtc,
          dataType: dataType as "steps" | "active-calories",
          bucket: "day",
        });

        const rows: any[] = Array.isArray(response?.aggregatedData) ? response.aggregatedData : [];

        for (const row of rows) {
          const rwoIndex = rows.indexOf(row);
          logger.debug("🔍 DGB [CARDIO_PROGRESS] queryAggregated ", dataType, rwoIndex + 1 + "/" + rows.length)
          
          const rowDate = toLocalDate(row?.startDate ?? row?.date);
          if (!rowDate) {
            logger.debug("🔍 DGB [CARDIO_PROGRESS] rowDate not found", row?.startDate.toDateString() + " " + row?.startDate.toTimeString(), 
            row?.date.toDateString() + " " + row?.date.toTimeString());
            continue;
          }
          const bucket = findBucket(buckets, rowDate)
          if (!bucket){
            logger.debug("🔍 DGB [CARDIO_PROGRESS] bucket not found", row?.startDate.toDateString() + " " + row?.startDate.toTimeString(), 
            row?.date.toDateString() + " " + row?.date.toTimeString());
            continue;
          }

          const value = safeNumber(row?.value);
          logger.debug("🔍 DGB [CARDIO_PROGRESS] queryAggregated Date: ", 
            rowDate.toDateString() + " " + rowDate.toTimeString(), " Value: ", row.value);
          if (value > 0) {
            apply(bucket, value);
          }
        }
      };

      logger.debug("🔍 DGB [CARDIO_PROGRESS] ======================= APPLY AGGREGATED START STEPS======================= ");
      await applyAggregated("steps", (bucket, value) => { bucket.totals.steps += value; });
      logger.debug("🔍 DGB [CARDIO_PROGRESS] ======================= APPLY AGGREGATED END STEPS======================= ");

      logger.debug("🔍 DGB [CARDIO_PROGRESS] ======================= APPLY AGGREGATED START CALORIES======================= ");
      await applyAggregated("active-calories", (bucket, value) => { bucket.totals.calories += value;});
      logger.debug("🔍 DGB [CARDIO_PROGRESS] ======================= APPLY AGGREGATED END CALORIES======================= ");

      for (const bucket of buckets) {
        if (bucket.totals.calories <= 0 && fallbackCalories.has(bucket)) {
          bucket.totals.calories = fallbackCalories.get(bucket) ?? 0;
        }
        if (bucket.totals.steps <= 0 && fallbackSteps.has(bucket)) {
          bucket.totals.steps = fallbackSteps.get(bucket) ?? 0;
        }
        logger.debug("🔍 DGB [CARDIO_PROGRESS] Bucket start:", bucket.start.toDateString() + " " + bucket.start.toTimeString(), 
        "Bucket end:", bucket.end.toDateString() + " " + bucket.end.toTimeString());
        logger.debug("🔍 DGB [CARDIO_PROGRESS] Bucket workouts:", bucket.workouts.length);
        //logger.debug("🔍 DGB [CARDIO_PROGRESS] Bucket workouts:", JSON.stringify(bucket.workouts, null, 2));
        logger.debug("🔍 DGB [CARDIO_PROGRESS] Bucket totals:", JSON.stringify(bucket.totals, null, 2));
      }

      logger.debug(`${LOG_PREFIX} ios.populate.complete`, {
        workouts: workoutSamples.length,
        bucketsWithWorkouts: buckets.filter((bucket) => bucket.workouts.length > 0).length,
      });
    } catch (error) {
      logger.warn(`${LOG_PREFIX} ios.populate.error`, { error });
      throw error;
    }
  }

  private async populateFromAndroid(
    buckets: Bucket[],
    startLocal: Date,
    endLocal: Date,
  ): Promise<void> {
    try {
      const { HealthConnect } = await import("@kiwi-health/capacitor-health-connect");
      const startUtc = toUtcDate(startLocal);
      const endUtc = toUtcDate(endLocal);

      logger.debug(`${LOG_PREFIX} android.populate.start`, {
        start: startUtc.toISOString(),
        end: endUtc.toISOString(),
        bucketCount: buckets.length,
      });

      await HealthConnect.requestHealthPermissions({
        read: ["Steps", "Distance", "ActiveCaloriesBurned", "HeartRateSeries"],
        write: [],
      });

      const timeRangeFilter = { type: "between", startTime: startUtc, endTime: endUtc } as const;

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

      const stepRecords = await readAllRecords("Steps");
      for (const record of stepRecords) {
        const bucketDate = toLocalDate(record?.endTime ?? record?.startTime);
        if (!bucketDate) continue;
        const bucket = findBucket(buckets, bucketDate);
        if (!bucket) continue;

        const steps = safeNumber(record?.count);
        if (steps > 0) {
          bucket.totals.steps += steps;
        }
      }

      const distanceRecords = await readAllRecords("Distance");
      for (const record of distanceRecords) {
        const startDate = toLocalDateTime(record?.startTime);
        const endDate = toLocalDateTime(record?.endTime);
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

        bucket.totals.minutes += durationMinutes;
        if (distanceKm && distanceKm > 0) {
          bucket.totals.distanceKm += distanceKm;
        }

        const workoutSummary: CardioWorkoutSummary = {
          id: record?.metadata?.id ?? `android-distance-${endDate.getTime()}`,
          activity: normalizeActivityName("Distance"),
          start: new Date(startDate.getTime()),
          end: new Date(endDate.getTime()),
          durationMinutes,
          distanceKm,
          source: record?.metadata?.dataOrigin,
        };

        bucket.workouts.push(workoutSummary);
      }

      const calorieRecords = await readAllRecords("ActiveCaloriesBurned");
      for (const record of calorieRecords) {
        const bucketDate = toLocalDate(record?.endTime ?? record?.startTime);
        if (!bucketDate) continue;
        const bucket = findBucket(buckets, bucketDate);
        if (!bucket) continue;

        const energy = safeNumber(record?.energy?.value);
        if (energy > 0) {
          bucket.totals.calories += energy;
        }
      }

      const heartRateRecords = await readAllRecords("HeartRateSeries");
      for (const record of heartRateRecords) {
        const bucketDate = toLocalDate(record?.endTime ?? record?.startTime);
        if (!bucketDate) continue;
        const bucket = findBucket(buckets, bucketDate);
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

      for (const bucket of buckets) {
        const avg = averageHeartRate(bucket);
        if (avg !== undefined) {
          bucket.workouts = bucket.workouts.map((workout) =>
            workout.averageHeartRate ? workout : { ...workout, averageHeartRate: avg },
          );
        }
      }

      logger.debug(`${LOG_PREFIX} android.populate.complete`, {
        workouts: buckets.reduce((total, bucket) => total + bucket.workouts.length, 0),
        bucketsWithWorkouts: buckets.filter((bucket) => bucket.workouts.length > 0).length,
      });
    } catch (error) {
      logger.warn(`${LOG_PREFIX} android.populate.error`, { error });
      throw error;
    }
  }

  public getUnavailableSnapshot(range: TimeRange): CardioProgressSnapshot {
    return snapshotUnavailable(range);
  }
}

export { CardioProgressProvider };
