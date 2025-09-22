import {
  ActivityCategory,
  TimeRange,
  MuscleGroup,
  SeriesPoint,
  KPI,
  WorkoutSummary,
  BestRecord,
  ProgressDataProvider,
} from '../../types/progress';

const today = new Date();
const iso = (d: Date) => d.toISOString();

const POINTS: Record<TimeRange, number> = {
  week: 7,
  threeMonths: 12,
  sixMonths: 24,
};

const STEP_DAYS: Record<TimeRange, number> = {
  week: 1,
  threeMonths: 7,
  sixMonths: 7,
};

const BASE_MAP: Record<ActivityCategory, { week: number; threeMonths: number; sixMonths: number }> = {
  strength: { week: 2400, threeMonths: 12000, sixMonths: 11000 },
  cardio: { week: 35, threeMonths: 210, sixMonths: 185 },
  body: { week: 0, threeMonths: 0, sixMonths: 0 },
};

const JITTER: Record<TimeRange, number> = {
  week: 0.35,
  threeMonths: 0.25,
  sixMonths: 0.25,
};

function genSeries(range: TimeRange, base: number, jitter = 0.25, withPR = true): SeriesPoint[] {
  const points = POINTS[range];
  const step = STEP_DAYS[range];
  const out: SeriesPoint[] = [];

  for (let i = points - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i * step);
    const value = Math.max(0, base * (1 + (Math.random() - 0.5) * jitter));
    out.push({ date: iso(d), value: Math.round(value), isPR: false });
  }

  if (withPR && out.length > 0) {
    const ix = Math.max(0, Math.floor(out.length * 0.7));
    out[ix] = { ...out[ix], value: Math.round(out[ix].value * 1.35), isPR: true };
  }

  return out;
}

const workoutDate = (daysAgo: number) => iso(new Date(today.getTime() - daysAgo * 86400000));

function genBodySeries(range: TimeRange): SeriesPoint[] {
  const points = POINTS[range];
  const step = STEP_DAYS[range];
  const out: SeriesPoint[] = [];
  const trend = range === 'week' ? -0.1 : range === 'threeMonths' ? -0.6 : -1.2;

  for (let i = points - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i * step);
    const progress = (points - 1 - i) / Math.max(points - 1, 1);
    const value = trend * progress + (Math.random() - 0.5) * 0.4;
    out.push({ date: iso(d), value: Number(value.toFixed(1)) });
  }

  return out;
}

export const MockProgressProvider: ProgressDataProvider = {
  series: ({ category, range }) =>
    category === 'body'
      ? genBodySeries(range)
      : genSeries(range, BASE_MAP[category][range], JITTER[range], true),

  previousSeries: ({ category, range }) =>
    category === 'body'
      ? genBodySeries(range).map((point) => ({ ...point, value: Number((point.value * 0.85).toFixed(1)) }))
      : genSeries(range, BASE_MAP[category][range] * 0.92, JITTER[range] * 0.85, false),

  kpis: ({ category, range }): KPI[] => {
    if (category === 'strength') {
      return [
        { icon: '🏋️', label: 'Total Volume', value: '12,350 kg', deltaPct: 0.12 },
        { icon: '📆', label: 'Sessions', value: '7', deltaPct: 0.17 },
        { icon: '🧱', label: 'Avg Sets/Session', value: '14.2', deltaPct: 0.06 },
        { icon: '🏆', label: 'PRs Hit', value: '2', deltaPct: 0 },
      ];
    }
    if (category === 'cardio') {
      return [
        { icon: '🏃', label: 'Distance', value: '24.3 km', deltaPct: 0.08 },
        { icon: '⏱️', label: 'Active Minutes', value: range === 'week' ? '236 m' : '1,120 m', deltaPct: -0.04 },
        { icon: '❤️', label: 'Avg HR', value: '142 bpm', deltaPct: -0.02 },
        { icon: '🔥', label: 'Calories', value: '3,450', deltaPct: 0.15 },
      ];
    }
    return [
      { icon: '⚖️', label: 'Weight Δ', value: '-0.8 kg', deltaPct: 0 },
      { icon: '📉', label: 'Body Fat %', value: '18.6%', deltaPct: -0.03 },
      { icon: '📏', label: 'Waist Δ', value: '-1.2 cm', deltaPct: -0.05 },
      { icon: '🔥', label: 'Best Streak', value: '6 days', deltaPct: 0.2 },
    ];
  },

  recentWorkouts: ({ category }) => {
    if (category === 'strength') {
      return [
        { id: 'w1', date: workoutDate(0), title: 'Upper Body', subtitle: 'Chest/Back · 52 m', highlight: '2,850 kg', hasPR: true },
        { id: 'w2', date: workoutDate(1), title: 'Lower Body', subtitle: 'Legs · 48 m', highlight: '3,120 kg' },
        { id: 'w3', date: workoutDate(2), title: 'Arms/Core', subtitle: 'Arms · 36 m', highlight: '1,640 kg' },
        { id: 'w4', date: workoutDate(3), title: 'Full Body', subtitle: 'Mixed · 41 m', highlight: '2,210 kg' },
      ];
    }
    if (category === 'cardio') {
      return [
        { id: 'c1', date: workoutDate(0), title: '5k Run', subtitle: 'Road · 31 m', highlight: '5.0 km', hasPR: true },
        { id: 'c2', date: workoutDate(1), title: 'Zone 2', subtitle: 'Treadmill · 42 m', highlight: '6.3 km' },
        { id: 'c3', date: workoutDate(2), title: 'HIIT', subtitle: 'Intervals · 20 m', highlight: '310 kcal' },
      ];
    }
    return [
      { id: 'b1', date: workoutDate(0), title: 'Measurements', subtitle: 'Weight · AM', highlight: '-0.3 kg' },
      { id: 'b2', date: workoutDate(1), title: 'Measurements', subtitle: 'Waist · AM', highlight: '-0.8 cm' },
    ];
  },

  bestsAllTime: ({ category }): BestRecord[] => (
    category === 'strength'
      ? [
          { label: 'Bench', value: '100kg × 8', date: '2025-02-14' },
          { label: 'Squat', value: '160kg × 5', date: '2025-03-03' },
        ]
      : category === 'cardio'
      ? [
          { label: 'Fastest 5k', value: '24:15', date: '2025-02-02' },
          { label: 'Longest Run', value: '12.2 km', date: '2024-11-21' },
        ]
      : [
          { label: 'Lowest BF%', value: '15.2%', date: '2024-07-08' },
          { label: 'Best WHR', value: '0.82', date: '2024-09-10' },
        ]
  ),

  bestsInPeriod: ({ category }): BestRecord[] => (
    category === 'strength'
      ? [{ label: 'Top Volume Day', value: '7,430 kg', date: iso(today) }]
      : category === 'cardio'
      ? [{ label: 'Max Distance', value: '7.8 km', date: iso(today) }]
      : [{ label: 'Largest Δ Weight', value: '-0.6 kg', date: iso(today) }]
  ),

  targetLine: ({ category }) => (category === 'cardio' ? 40 : category === 'strength' ? 2500 : 0),
};
