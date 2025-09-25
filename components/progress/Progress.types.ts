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

export type WorkoutsHistoryEntry = {
  type: "cardio" | "strength";
  id: string;
  activity: string;
  date: string;
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
  history: HistoryEntry[];
};

export type DomainSnapshotMap = Record<ProgressDomain, Record<TimeRange, Snapshot>>;
