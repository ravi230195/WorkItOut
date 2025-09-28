import { logger, Logger } from "utils/logging";

export type TimeRange = "week" | "threeMonths" | "sixMonths";

export type CardioFocus = "activeMinutes" | "distance" | "calories" | "steps";

export type SeriesPoint = {
  date: Date;
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
  start: Date;
  end: Date;
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

export function printCardioProgressSnapshot(snapshot: CardioProgressSnapshot, logger: Logger): void {
  logger.debug("🔍 DGB [CARDIO_PROGRESS_SNAPSHOT] Range:", snapshot.range);
  
  logger.debug("🔍 DGB [CARDIO_PROGRESS_SNAPSHOT] Series:");
  for (const [focus, seriesData] of Object.entries(snapshot.series)) {
    logger.debug(`  Focus: ${focus}`);
    logger.debug(`    Current points: ${seriesData.current.length}`);
    logger.debug(`    Previous points: ${seriesData.previous?.length || 0}`);
    logger.debug(`    Personal best: ${seriesData.personalBest || 'N/A'}`);
  }
  
  logger.debug("🔍 DGB [CARDIO_PROGRESS_SNAPSHOT] KPIs:");
  snapshot.kpis.forEach((kpi, index) => {
    logger.debug(`  KPI ${index + 1}: ${kpi.title} = ${kpi.value} ${kpi.unit || ''}`);
  });
  
  logger.debug("🔍 DGB [CARDIO_PROGRESS_SNAPSHOT] Workouts:");
  for (const [date, workouts] of Object.entries(snapshot.workouts)) {
    logger.debug(`  Date: ${date} (${workouts.length} workouts)`);
    workouts.forEach((workout, index) => {
      logger.debug(`    Workout ${index + 1}: ${workout.activity} - ${workout.durationMinutes}min`);
    });
  }
  

  if (snapshot.targetLine) {
    logger.debug("🔍 DGB [CARDIO_PROGRESS_SNAPSHOT] Target Line:", 
      `${snapshot.targetLine.focus} = ${snapshot.targetLine.value} ${snapshot.targetLine.unit}`);
  } else {
    logger.debug("🔍 DGB [CARDIO_PROGRESS_SNAPSHOT] Target Line: None");
  }
}
