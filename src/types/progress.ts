export type TimeRange = "week" | "threeMonths" | "sixMonths";

export type CardioFocus = "activeMinutes" | "distance" | "calories" | "steps";

export type SeriesPoint = {
  iso: string;
  value: number;
  isPersonalBest?: boolean;
};

export type CardioSeriesResponse = {
  focus: CardioFocus;
  current: SeriesPoint[];
  previous?: SeriesPoint[];
  personalBest?: number;
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
  start: string;
  end: string;
  durationMinutes: number;
  distanceKm?: number;
  calories?: number;
  steps?: number;
  averageHeartRate?: number;
  source?: string;
};

export type CardioTargetLine = {
  focus: CardioFocus;
  value: number;
  unit?: string;
};

export type CardioProgressSnapshot = {
  range: TimeRange;
  series: Record<CardioFocus, CardioSeriesResponse>;
  kpis: CardioKpi[];
  workouts: Record<string, CardioWorkoutSummary[]>;
  targetLine?: CardioTargetLine | null;
};
