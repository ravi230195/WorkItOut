export type ActivityCategory = 'strength' | 'cardio' | 'body';
export type TimeRange = 'week' | 'threeMonths' | 'sixMonths';
export type MuscleGroup = 'all' | 'chest' | 'back' | 'legs' | 'arms';

export interface SeriesPoint {
  date: string; // ISO
  value: number; // main metric (volume/minutes/weight)
  isPR?: boolean; // highlight in chart
}

export interface KPI {
  icon: string; // SF/SVG name; for now use emoji/text
  label: string;
  value: string;
  deltaPct?: number | null; // positive=good, negative=bad
}

export interface WorkoutSummary {
  id: string;
  date: string; // ISO
  title: string; // e.g., "Upper Body" / "5k Run"
  subtitle: string; // e.g., "Chest/Back · 52 min"
  highlight: string; // e.g., "2,850 kg" / "4.8 km" / "-0.3 kg"
  hasPR?: boolean;
}

export interface BestRecord {
  label: string;
  value: string;
  date: string; // ISO
}

export interface ProgressDataProvider {
  series(params: { category: ActivityCategory; range: TimeRange; muscle?: MuscleGroup }): SeriesPoint[];
  previousSeries(params: { category: ActivityCategory; range: TimeRange; muscle?: MuscleGroup }): SeriesPoint[];
  kpis(params: { category: ActivityCategory; range: TimeRange }): KPI[];
  recentWorkouts(params: { category: ActivityCategory; range: TimeRange; limit?: number }): WorkoutSummary[];
  bestsAllTime(params: { category: ActivityCategory }): BestRecord[];
  bestsInPeriod(params: { category: ActivityCategory; range: TimeRange }): BestRecord[];
  targetLine?(params: { category: ActivityCategory; range: TimeRange }): number | undefined;
}

