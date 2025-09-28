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
