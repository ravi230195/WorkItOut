import type {
  ActivityCategory,
  BestRecord,
  KPI,
  ProgressDataProvider,
  TimeRange,
  WorkoutSummary,
} from '../../types/progress';
import {
  DEFAULT_REFERENCE_DATE,
  createWorkoutDateGenerator,
  generateBodySeries,
  generateSeries,
  getBaseForRange,
  getJitterForRange,
} from './utils';

const referenceDate = DEFAULT_REFERENCE_DATE;
const referenceIso = referenceDate.toISOString();
const workoutDate = createWorkoutDateGenerator(referenceDate);

const createSeries = (category: ActivityCategory, range: TimeRange) => {
  if (category === 'body') {
    return generateBodySeries(range, { referenceDate });
  }

  const base = getBaseForRange(category, range);
  const jitter = getJitterForRange(range);
  return generateSeries(range, base, jitter, { referenceDate });
};

const createPreviousSeries = (category: ActivityCategory, range: TimeRange) => {
  if (category === 'body') {
    return generateBodySeries(range, { referenceDate }).map((point) => ({
      ...point,
      value: Number((point.value * 0.85).toFixed(1)),
    }));
  }

  const base = getBaseForRange(category, range) * 0.92;
  const jitter = getJitterForRange(range) * 0.85;
  return generateSeries(range, base, jitter, { includePersonalRecord: false, referenceDate });
};

const getKpis = (category: ActivityCategory, range: TimeRange): KPI[] => {
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
};

const getWorkouts = (category: ActivityCategory): WorkoutSummary[] => {
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
};

const BEST_ALL_TIME: Record<ActivityCategory, BestRecord[]> = {
  strength: [
    { label: 'Bench', value: '100kg × 8', date: '2025-02-14' },
    { label: 'Squat', value: '160kg × 5', date: '2025-03-03' },
  ],
  cardio: [
    { label: 'Fastest 5k', value: '24:15', date: '2025-02-02' },
    { label: 'Longest Run', value: '12.2 km', date: '2024-11-21' },
  ],
  body: [
    { label: 'Lowest BF%', value: '15.2%', date: '2024-07-08' },
    { label: 'Best WHR', value: '0.82', date: '2024-09-10' },
  ],
};

const BEST_IN_PERIOD: Record<ActivityCategory, BestRecord[]> = {
  strength: [{ label: 'Top Volume Day', value: '7,430 kg', date: referenceIso }],
  cardio: [{ label: 'Max Distance', value: '7.8 km', date: referenceIso }],
  body: [{ label: 'Largest Δ Weight', value: '-0.6 kg', date: referenceIso }],
};

export const MockProgressProvider: ProgressDataProvider = {
  series: ({ category, range }) => createSeries(category, range),
  previousSeries: ({ category, range }) => createPreviousSeries(category, range),
  kpis: ({ category, range }) => getKpis(category, range),
  recentWorkouts: ({ category }) => getWorkouts(category),
  bestsAllTime: ({ category }) => BEST_ALL_TIME[category],
  bestsInPeriod: ({ category }) => BEST_IN_PERIOD[category],
  targetLine: ({ category }) => (category === 'cardio' ? 40 : category === 'strength' ? 2500 : 0),
};
