import type { ReactNode } from "react";

export type TrendPoint = {
  x: Date; // Local date
  y: number; // value
  isPersonalBest?: boolean;
};

export type ProgressDomain = "workouts" | "measurement";

export type KpiDatum = {
  title: string;
  value: string;
  unit?: string;
  previous?: number;
  currentNumeric?: number;
};

export type WorkoutsHistoryEntry = {
  type: "cardio" | "strength";
  id: string;
  activity: string;
  date: Date;
  duration: string;
  distance?: string;
  calories?: string;
  time?: string;
  steps?: number;
  totalWeight?: string;
  routineTemplateId?: number;
};

export type HistoryEntry = WorkoutsHistoryEntry;

export type Snapshot = {
  series: TrendPoint[][];
  kpis: KpiDatum[];
  workouts: Record<string, CardioWorkoutSummary[]>;
};

export type DomainSnapshotMap = Record<ProgressDomain, Record<TimeRange, Snapshot>>;

export type TimeRange = "week" | "threeMonths" | "sixMonths";

export type CardioFocus = "activeMinutes" | "distance" | "calories" | "steps";

export type SeriesPoint = {
  date: Date;
  value: number;
};

export type CardioSeriesResponse = {
  focus: CardioFocus;
  current: SeriesPoint[];
  previous?: SeriesPoint[];
};

export type CardioKpi = {
  key: CardioFocus;
  title: string;
  value: string;
  unit?: string;
  currentNumeric?: number;
  previous?: number;
};

export type CardioWorkoutSummary = {
  id: string;
  activity: string;
  start: Date;
  end: Date;
  durationMinutes: number;
  distanceKm?: number;
  calories?: number;
  steps?: number;
  averageHeartRate?: number;
  source?: string;
};

export type CardioProgressSnapshot = {
  range: TimeRange;
  series: Record<CardioFocus, CardioSeriesResponse>;
  kpis: CardioKpi[];
  workouts: Record<string, CardioWorkoutSummary[]>;
};

export type TrendSummary = {
  icon: string;
  color: string;
  colorActive: string;
  text: string;
  delta: number;
};

export type DateInput = string | number | Date | undefined | null;

export type BucketTotals = {
  minutes: number;
  distanceKm: number;
  calories: number;
  steps: number;
  heartRateSum: number;
  heartRateCount: number;
};

export type Bucket = {
  start: Date;
  end: Date;
  totals: BucketTotals;
  workouts: CardioWorkoutSummary[];
};

export type AggregatedData = {
  range: TimeRange;
  current: Bucket[];
  previous: Bucket[];
};

export type AggregatedTotals = {
  calories?: number;
  distance?: number;
  steps?: number;
  time?: number;
};

export type CardioWeekHistoryWorkout = {
  id: number | string;
  name: string;
  source?: string;
  duration?: ReactNode;
  time?: string;
  calories?: ReactNode;
  distance?: ReactNode;
  steps?: ReactNode;
  exercises?: number;
  sets?: number;
  rounds?: number;
  volume?: ReactNode;
  personalRecords?: number;
  type?: string;
  start?: Date;
  end?: Date;
};

export type CardioWeekHistoryDay = {
  key: string;
  label?: string;
  weekIndex: number;
  dateLabel: string;
  dailyTotals: {
    calories?: ReactNode;
    time?: ReactNode;
    distance?: ReactNode;
    steps?: ReactNode;
  };
  workouts: CardioWeekHistoryWorkout[];
};
