import type {
  AggregatedData,
  Bucket,
  CardioFocus,
  CardioKpi,
  CardioProgressSnapshot,
  CardioSeriesResponse,
  CardioWorkoutSummary,
  SeriesPoint,
  TimeRange,
} from "../../progress/Progress.types";
import {
  averageHeartRate,
  buildBucketSets,
  caloriesToDisplay,
  collectWorkouts,
  findBucket,
  formatDateKey,
  groupWorkoutsByDate,
  kilometersToDisplay,
  minutesToDisplay,
  normalizeActivityName,
  safeNumber,
  seriesUnavailableFromBuckets,
  snapshotUnavailable,
  stepsToDisplay,
  getDateString,
  toLocalBucketDate,
  toLocalDateTime,
} from "./util";
import { logger } from "../../../utils/logging";

const LOG_PREFIX = "[cardioProgess]";

type MetricSelector = (bucket: Bucket) => number;

const METRIC_SELECTORS: Record<CardioFocus, MetricSelector> = {
  activeMinutes: (bucket) => bucket.totals.minutes,
  distance: (bucket) => bucket.totals.distanceKm,
  calories: (bucket) => bucket.totals.calories,
  steps: (bucket) => bucket.totals.steps,
};

const SERIES_FOCUSES: CardioFocus[] = ["activeMinutes", "distance", "calories", "steps"];

const MIN_MS = 60_000;

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
      logger.debug(
        "🔍 DGB [CARDIO_PROGRESS] " + range,
        " Previous Bucket Start:",
        getDateString(bucket.start),
        " Previous Bucket End:",
        getDateString(bucket.end),
      );
    }

    for (const bucket of current) {
      logger.debug(
        "🔍 DGB [CARDIO_PROGRESS] " + range,
        " Current Bucket Start:",
        getDateString(bucket.start),
        " Current Bucket End:",
        getDateString(bucket.end),
      );
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
      logger.debug("🔍 DGB [CARDIO_PROGRESS] Start Local:", getDateString(startLocal));
      logger.debug("🔍 DGB [CARDIO_PROGRESS] End Local:", getDateString(endLocal));
      const startUtc = startLocal.toISOString();
      const endUtc = endLocal.toISOString();

      logger.debug(`${LOG_PREFIX} ios.populate.start`, {
        start: startUtc,
        end: endUtc,
        startLocal: getDateString(startLocal),
        endLocal: getDateString(endLocal),
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

        const bucket = findBucket(buckets, startDate);
        if (!bucket) {
          logger.debug("🔍 DGB [CARDIO_PROGRESS] Bucket not found for sample: ", sample?.id);
          continue;
        }
        logger.debug(
          "🔍 DGB [CARDIO_PROGRESS] Bucket start date:",
          getDateString(bucket.start),
          " Bucket end date:",
          getDateString(bucket.end),
        );


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
        logger.debug("🔍 DGB [CARDIO_PROGRESS] workoutSummary ", getDateString(workoutSummary.start));
        logger.debug("🔍 DGB [CARDIO_PROGRESS] workoutSummary ", getDateString(workoutSummary.end));
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
          
          const rowDate = toLocalBucketDate(row?.startDate ?? row?.date);
          if (!rowDate) {
            logger.debug(
              "🔍 DGB [CARDIO_PROGRESS] rowDate not found",
              row?.startDate ? getDateString(new Date(row.startDate)) : "Unknown start",
              row?.date ? getDateString(new Date(row.date)) : "Unknown date",
            );
            continue;
          }
          const bucket = findBucket(buckets, rowDate)
          if (!bucket){
            logger.debug(
              "🔍 DGB [CARDIO_PROGRESS] bucket not found",
              row?.startDate ? getDateString(new Date(row.startDate)) : "Unknown start",
              row?.date ? getDateString(new Date(row.date)) : "Unknown date",
            );
            continue;
          }

          const value = safeNumber(row?.value);
          logger.debug(
            "🔍 DGB [CARDIO_PROGRESS] queryAggregated Date: ",
            getDateString(rowDate),
            " Value: ",
            row.value,
          );
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
        logger.debug(
          "🔍 DGB [CARDIO_PROGRESS] Bucket start:",
          getDateString(bucket.start),
          "Bucket end:",
          getDateString(bucket.end),
        );
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
      const startUtc = startLocal.toISOString();
      const endUtc = endLocal.toISOString();

      logger.debug(`${LOG_PREFIX} android.populate.start`, {
        start: startUtc,
        end: endUtc,
        startLocal: getDateString(startLocal),
        endLocal: getDateString(endLocal),
        bucketCount: buckets.length,
      });

      await HealthConnect.requestHealthPermissions({
        read: [
          "Steps",
          "Distance",
          "ActiveCaloriesBurned",
          "HeartRateSeries",
          "ExerciseSession" as any,
        ],
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

      const addToMap = (map: Map<Bucket, number>, bucket: Bucket, value: number) => {
        map.set(bucket, (map.get(bucket) ?? 0) + value);
      };

      const fallbackCalories = new Map<Bucket, number>();
      const fallbackSteps = new Map<Bucket, number>();
      const aggregatedCalories = new Map<Bucket, number>();
      const aggregatedSteps = new Map<Bucket, number>();

      const workoutIndex = new WeakMap<Bucket, Map<string, CardioWorkoutSummary>>();
      const WORKOUT_MATCH_WINDOW_MS = 5 * MIN_MS;

      const getWorkoutMap = (bucket: Bucket) => {
        let map = workoutIndex.get(bucket);
        if (!map) {
          map = new Map();
          workoutIndex.set(bucket, map);
        }
        return map;
      };

      const registerWorkout = (bucket: Bucket, workout: CardioWorkoutSummary) => {
        getWorkoutMap(bucket).set(workout.id, workout);
        bucket.workouts.push(workout);
        return workout;
      };

      const findWorkoutById = (bucket: Bucket, id?: string) => {
        if (!id) return undefined;
        return getWorkoutMap(bucket).get(id);
      };

      const findWorkoutByTime = (bucket: Bucket, start: Date, end: Date) => {
        const startMs = start.getTime();
        const endMs = end.getTime();
        return bucket.workouts.find((workout) => {
          const workoutStart = workout.start.getTime();
          const workoutEnd = workout.end.getTime();
          const startDiff = Math.abs(workoutStart - startMs);
          const endDiff = Math.abs(workoutEnd - endMs);
          const overlaps =
            startMs <= workoutEnd + WORKOUT_MATCH_WINDOW_MS &&
            endMs >= workoutStart - WORKOUT_MATCH_WINDOW_MS;
          return startDiff <= WORKOUT_MATCH_WINDOW_MS || endDiff <= WORKOUT_MATCH_WINDOW_MS || overlaps;
        });
      };

      const ensureWorkout = (
        bucket: Bucket,
        id: string,
        start: Date,
        end: Date,
        activity: string,
        source: string | undefined,
        durationMinutes: number,
      ) => {
        const existingById = findWorkoutById(bucket, id);
        if (existingById) {
          existingById.start = new Date(Math.min(existingById.start.getTime(), start.getTime()));
          existingById.end = new Date(Math.max(existingById.end.getTime(), end.getTime()));
          existingById.durationMinutes = Math.max(existingById.durationMinutes, durationMinutes);
          if (source && !existingById.source) {
            existingById.source = source;
          }
          return existingById;
        }

        const existingByTime = findWorkoutByTime(bucket, start, end);
        if (existingByTime) {
          existingByTime.start = new Date(Math.min(existingByTime.start.getTime(), start.getTime()));
          existingByTime.end = new Date(Math.max(existingByTime.end.getTime(), end.getTime()));
          existingByTime.durationMinutes = Math.max(existingByTime.durationMinutes, durationMinutes);
          if (source && !existingByTime.source) {
            existingByTime.source = source;
          }
          if (!existingByTime.activity) {
            existingByTime.activity = activity;
          }
          return existingByTime;
        }

        const workout: CardioWorkoutSummary = {
          id,
          activity,
          start: new Date(start.getTime()),
          end: new Date(end.getTime()),
          durationMinutes,
          source,
        };

        if (durationMinutes > 0) {
          bucket.totals.minutes += durationMinutes;
        }

        return registerWorkout(bucket, workout);
      };

      let exerciseSessions: any[] = [];
      try {
        exerciseSessions = await readAllRecords("ExerciseSession");
      } catch (error) {
        logger.debug(`${LOG_PREFIX} android.workouts.sessions_unavailable`, { error });
      }

      for (const record of exerciseSessions) {
        const startDate = toLocalDateTime(record?.startTime);
        const endDate = toLocalDateTime(record?.endTime);
        if (!startDate || !endDate) continue;

        const bucket = findBucket(buckets, startDate);
        if (!bucket) continue;

        const durationMinutes = Math.max(0, (endDate.getTime() - startDate.getTime()) / MIN_MS);
        const activityName = normalizeActivityName(record?.exerciseType ?? record?.activityType ?? "Workout");
        const id = String(record?.metadata?.id ?? `android-session-${endDate.getTime()}`);
        const workout = ensureWorkout(
          bucket,
          id,
          startDate,
          endDate,
          activityName,
          record?.metadata?.dataOrigin,
          durationMinutes,
        );

        workout.activity = activityName;
        workout.start = new Date(startDate.getTime());
        workout.end = new Date(endDate.getTime());
        workout.durationMinutes = Math.max(workout.durationMinutes, durationMinutes);
      }

      const hasExerciseSessions = exerciseSessions.length > 0;

      const stepRecords = await readAllRecords("Steps");
      for (const record of stepRecords) {
        const bucketDate = toLocalBucketDate(record?.endTime ?? record?.startTime);
        if (!bucketDate) continue;
        const bucket = findBucket(buckets, bucketDate);
        if (!bucket) continue;

        const steps = safeNumber(record?.count);
        if (steps > 0) {
          addToMap(aggregatedSteps, bucket, steps);
          addToMap(fallbackSteps, bucket, steps);
        }
      }

      const distanceRecords = await readAllRecords("Distance");
      for (const record of distanceRecords) {
        const startDate = toLocalDateTime(record?.startTime);
        const endDate = toLocalDateTime(record?.endTime);
        if (!startDate || !endDate) continue;

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

        const workoutId = String(record?.metadata?.id ?? `android-distance-${endDate.getTime()}`);
        const workout = ensureWorkout(
          bucket,
          workoutId,
          startDate,
          endDate,
          normalizeActivityName(record?.activityType ?? "Distance"),
          record?.metadata?.dataOrigin,
          durationMinutes,
        );

        if (distanceKm && distanceKm > 0) {
          bucket.totals.distanceKm += distanceKm;
          workout.distanceKm = (workout.distanceKm ?? 0) + distanceKm;
        }

        if (!hasExerciseSessions) {
          workout.durationMinutes = Math.max(workout.durationMinutes, durationMinutes);
        }
      }

      const calorieRecords = await readAllRecords("ActiveCaloriesBurned");
      for (const record of calorieRecords) {
        const bucketDate = toLocalBucketDate(record?.startTime ?? record?.endTime);
        if (!bucketDate) continue;
        const bucket = findBucket(buckets, bucketDate);
        if (!bucket) continue;

        const energy = safeNumber(record?.energy?.value);
        if (energy > 0) {
          addToMap(aggregatedCalories, bucket, energy);
          addToMap(fallbackCalories, bucket, energy);

          const startDate = toLocalDateTime(record?.startTime ?? record?.endTime);
          const endDate = toLocalDateTime(record?.endTime ?? record?.startTime);
          if (startDate && endDate) {
            const workout = findWorkoutByTime(bucket, startDate, endDate);
            if (workout) {
              workout.calories = (workout.calories ?? 0) + energy;
            }
          }
        }
      }

      const heartRateRecords = await readAllRecords("HeartRateSeries");
      for (const record of heartRateRecords) {
        const bucketDate = toLocalBucketDate(record?.startTime ?? record?.endTime);
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

      const applyAggregated = (
        aggregated: Map<Bucket, number>,
        fallback: Map<Bucket, number>,
        apply: (bucket: Bucket, value: number) => void,
      ) => {
        for (const bucket of buckets) {
          const aggregatedValue = aggregated.get(bucket);
          if (aggregatedValue && aggregatedValue > 0) {
            apply(bucket, aggregatedValue);
          } else if (fallback.has(bucket)) {
            apply(bucket, fallback.get(bucket) ?? 0);
          }
        }
      };

      applyAggregated(aggregatedSteps, fallbackSteps, (bucket, value) => {
        bucket.totals.steps += value;
      });

      applyAggregated(aggregatedCalories, fallbackCalories, (bucket, value) => {
        bucket.totals.calories += value;
      });

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
        exerciseSessions: exerciseSessions.length,
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
