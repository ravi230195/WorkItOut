import type { ActivityCategory, SeriesPoint, TimeRange } from '../../types/progress';

type RangeMap<T> = Record<TimeRange, T>;
type CategoryRangeMap = Record<ActivityCategory, RangeMap<number>>;

type SeriesOptions = {
  includePersonalRecord?: boolean;
  referenceDate?: Date;
};

type BodySeriesOptions = {
  referenceDate?: Date;
};

type WorkoutDateGenerator = (daysAgo: number) => string;

type GenerateSeries = (
  range: TimeRange,
  base: number,
  jitter?: number,
  options?: SeriesOptions,
) => SeriesPoint[];

type GenerateBodySeries = (range: TimeRange, options?: BodySeriesOptions) => SeriesPoint[];

type CreateWorkoutDateGenerator = (referenceDate?: Date) => WorkoutDateGenerator;

type RangeHelpers = {
  generateSeries: GenerateSeries;
  generateBodySeries: GenerateBodySeries;
  createWorkoutDateGenerator: CreateWorkoutDateGenerator;
};

type RangeValues = {
  POINTS_BY_RANGE: RangeMap<number>;
  STEP_DAYS_BY_RANGE: RangeMap<number>;
  BASE_ACTIVITY_MAP: CategoryRangeMap;
  JITTER_BY_RANGE: RangeMap<number>;
};

export const DEFAULT_REFERENCE_DATE = new Date();

export const isoDate = (date: Date) => date.toISOString();

export const RANGE_VALUES: RangeValues = {
  POINTS_BY_RANGE: {
    week: 7,
    threeMonths: 12,
    sixMonths: 24,
  },
  STEP_DAYS_BY_RANGE: {
    week: 1,
    threeMonths: 7,
    sixMonths: 7,
  },
  BASE_ACTIVITY_MAP: {
    strength: { week: 2400, threeMonths: 12000, sixMonths: 11000 },
    cardio: { week: 35, threeMonths: 210, sixMonths: 185 },
    body: { week: 0, threeMonths: 0, sixMonths: 0 },
  },
  JITTER_BY_RANGE: {
    week: 0.35,
    threeMonths: 0.25,
    sixMonths: 0.25,
  },
};

const createSteppedDate = (reference: Date, stepDays: number, stepIndex: number) => {
  const date = new Date(reference);
  date.setDate(reference.getDate() - stepIndex * stepDays);
  return date;
};

const createSeriesHelpers = (): RangeHelpers => {
  const generateSeries: GenerateSeries = (
    range,
    base,
    jitter = 0.25,
    options = {},
  ) => {
    const { includePersonalRecord = true, referenceDate = DEFAULT_REFERENCE_DATE } = options;

    const points = RANGE_VALUES.POINTS_BY_RANGE[range];
    const stepDays = RANGE_VALUES.STEP_DAYS_BY_RANGE[range];
    const series: SeriesPoint[] = [];

    for (let index = points - 1; index >= 0; index -= 1) {
      const date = createSteppedDate(referenceDate, stepDays, index);
      const value = Math.max(0, base * (1 + (Math.random() - 0.5) * jitter));
      series.push({ date: isoDate(date), value: Math.round(value), isPR: false });
    }

    if (includePersonalRecord && series.length > 0) {
      const highlightIndex = Math.max(0, Math.floor(series.length * 0.7));
      const point = series[highlightIndex];
      series[highlightIndex] = {
        ...point,
        value: Math.round(point.value * 1.35),
        isPR: true,
      };
    }

    return series;
  };

  const generateBodySeries: GenerateBodySeries = (range, options = {}) => {
    const { referenceDate = DEFAULT_REFERENCE_DATE } = options;

    const points = RANGE_VALUES.POINTS_BY_RANGE[range];
    const stepDays = RANGE_VALUES.STEP_DAYS_BY_RANGE[range];
    const series: SeriesPoint[] = [];

    const trend = range === 'week' ? -0.1 : range === 'threeMonths' ? -0.6 : -1.2;

    for (let index = points - 1; index >= 0; index -= 1) {
      const date = createSteppedDate(referenceDate, stepDays, index);
      const progress = (points - 1 - index) / Math.max(points - 1, 1);
      const value = trend * progress + (Math.random() - 0.5) * 0.4;
      series.push({ date: isoDate(date), value: Number(value.toFixed(1)) });
    }

    return series;
  };

  const createWorkoutDateGenerator: CreateWorkoutDateGenerator = (referenceDate = DEFAULT_REFERENCE_DATE) =>
    (daysAgo) => {
      const millisPerDay = 86400000;
      return isoDate(new Date(referenceDate.getTime() - daysAgo * millisPerDay));
    };

  return { generateSeries, generateBodySeries, createWorkoutDateGenerator };
};

export const { generateSeries, generateBodySeries, createWorkoutDateGenerator } = createSeriesHelpers();

export const getBaseForRange = (category: ActivityCategory, range: TimeRange) =>
  RANGE_VALUES.BASE_ACTIVITY_MAP[category][range];

export const getJitterForRange = (range: TimeRange) => RANGE_VALUES.JITTER_BY_RANGE[range];
