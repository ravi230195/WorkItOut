import type { TimeRange } from "@/types/progress";

export type TrendPoint = {
  x: string; // ISO date
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

export type WorkoutHistoryEntry = {
  type: "workouts";
  id: string;
  name: string;
  date: string;
  duration: string;
  totalWeight: string;
  routineTemplateId?: number;
};

export type CardioHistoryEntry = {
  type: "cardio";
  id: string;
  activity: string;
  date: string;
  duration: string;
  distance: string;
  calories?: string;
  time?: string;
  steps?: number;
  routineTemplateId?: number;
};

export type HistoryEntry = WorkoutHistoryEntry | CardioHistoryEntry;

export type Snapshot = {
  series: TrendPoint[][];
  kpis: KpiDatum[];
  history: HistoryEntry[];
};

export type DomainSnapshotMap = Record<ProgressDomain, Record<TimeRange, Snapshot>>;
