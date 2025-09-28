import type { CardioWorkoutSummary, TimeRange } from "@/types/progress";
import type { DomainSnapshotMap, ProgressDomain, TrendPoint } from "../../progress/Progress.types";

const RANGE_POINTS: Record<TimeRange, number> = { week: 7, threeMonths: 12, sixMonths: 6 };
const RANGE_STEPS: Record<TimeRange, number> = { week: 1, threeMonths: 7, sixMonths: 30 };

const MOCK_WORKOUTS_WEEK = groupWorkoutsByDate([
  createCardioWorkout("c1", "Outdoor Run", 1, 6, 30, 42.17, 7.4, 612, 7420),
  createCardioWorkout("c1b", "Interval Sprints", 1, 12, 15, 18.4, 3.1, 284, 3140),
  createCardioWorkout("c1c", "Evening Walk", 1, 19, 20, 35.8, 3.9, 236, 4680),
  createCardioWorkout("c2", "Indoor Run", 2, 18, 10, 35.1, 5.6, 438, 5120),
  createCardioWorkout("c2b", "Rowing Intervals", 2, 7, 5, 28.9, 4.2, 312, 0),
  createCardioWorkout("c3", "Cycling", 3, 9, 0, 48.7, 18.2, 502, 1860),
  createCardioWorkout("c3b", "Hill Repeats", 3, 6, 10, 24.3, 2.1, 198, 2840),
  createCardioWorkout("c3c", "Lunch Walk", 3, 12, 35, 22.6, 2.7, 176, 3210),
  createCardioWorkout("c3d", "Evening Spin", 3, 19, 45, 31.1, 10.5, 286, 960),
  createCardioWorkout("c4", "Trail Run", 4, 8, 10, 65.2, 9.6, 684, 8120),
]);

const PROGRESS_MOCK_SNAPSHOTS: DomainSnapshotMap = {
  workouts: {
    week: {
      series: [
        generateTrend("workouts", "week", 8, 0.32, 0),
        generateTrend("workouts", "week", 6.4, 0.28, 1),
        generateTrend("workouts", "week", 9.8, 0.3, 2),
        generateTrend("workouts", "week", 5.2, 0.26, 3),
      ],
      kpis: [
        { title: "Total Time", unit: "hours", value: "4h 05m", currentNumeric: 245, previous: 203 },
        { title: "Distance", unit: "km", value: "42.5", currentNumeric: 42.5, previous: 38.2 },
        { title: "Calories", unit: "kcal", value: "3,420", currentNumeric: 3420, previous: 3150 },
        { title: "Steps", value: "64,210", currentNumeric: 64210, previous: 60890 },
      ],
      workouts: MOCK_WORKOUTS_WEEK,
    },
    threeMonths: {
      series: [
        generateTrend("workouts", "threeMonths", 28, 0.22, 0),
        generateTrend("workouts", "threeMonths", 21, 0.2, 1),
        generateTrend("workouts", "threeMonths", 34, 0.23, 2),
        generateTrend("workouts", "threeMonths", 17, 0.19, 3),
      ],
      kpis: [
        { title: "Total Time", unit: "hours", value: "15h 38m", currentNumeric: 938, previous: 902 },
        { title: "Distance", unit: "km", value: "168", currentNumeric: 168, previous: 160 },
        { title: "Calories", unit: "kcal", value: "13,420", currentNumeric: 13420, previous: 12680 },
        { title: "Steps", value: "262,410", currentNumeric: 262410, previous: 254000 },
      ],
      workouts: {},
    },
    sixMonths: {
      series: [
        generateTrend("workouts", "sixMonths", 52, 0.18, 0),
        generateTrend("workouts", "sixMonths", 38, 0.16, 1),
        generateTrend("workouts", "sixMonths", 58, 0.19, 2),
        generateTrend("workouts", "sixMonths", 32, 0.15, 3),
      ],
      kpis: [
        { title: "Total Time", unit: "hours", value: "168", currentNumeric: 10080, previous: 9980 },
        { title: "Distance", unit: "km", value: "1,932", currentNumeric: 1932, previous: 1870 },
        { title: "Calories", unit: "kcal", value: "124,650", currentNumeric: 124650, previous: 123200 },
        { title: "Steps", value: "2.9M", currentNumeric: 2900000, previous: 2840000 },
      ],
      workouts: {},
    },
  },
  measurement: {
    week: {
      series: [
        generateTrend("measurement", "week", 101.2, 0.03, 0),
        generateTrend("measurement", "week", 36.4, 0.025, 1),
        generateTrend("measurement", "week", 58.8, 0.024, 2),
        generateTrend("measurement", "week", 96.7, 0.028, 3),
      ],
      kpis: [
        { title: "Chest", unit: "cm", value: "101.2", currentNumeric: 101.2, previous: 101.5 },
        { title: "Arms", unit: "cm", value: "36.4", currentNumeric: 36.4, previous: 36.1 },
        { title: "Legs", unit: "cm", value: "58.8", currentNumeric: 58.8, previous: 58.6 },
        { title: "Back", unit: "cm", value: "96.7", currentNumeric: 96.7, previous: 97.1 },
      ],
      workouts: {},
    },
    threeMonths: {
      series: [
        generateTrend("measurement", "threeMonths", 101.4, 0.03, 0),
        generateTrend("measurement", "threeMonths", 36.2, 0.024, 1),
        generateTrend("measurement", "threeMonths", 59.1, 0.022, 2),
        generateTrend("measurement", "threeMonths", 96.9, 0.027, 3),
      ],
      kpis: [
        { title: "Chest", unit: "cm", value: "101.4", currentNumeric: 101.4, previous: 102.0 },
        { title: "Arms", unit: "cm", value: "36.2", currentNumeric: 36.2, previous: 36.0 },
        { title: "Legs", unit: "cm", value: "59.1", currentNumeric: 59.1, previous: 58.9 },
        { title: "Back", unit: "cm", value: "96.9", currentNumeric: 96.9, previous: 97.3 },
      ],
      workouts: {},
    },
    sixMonths: {
      series: [
        generateTrend("measurement", "sixMonths", 102.8, 0.032, 0),
        generateTrend("measurement", "sixMonths", 36.0, 0.022, 1),
        generateTrend("measurement", "sixMonths", 59.6, 0.02, 2),
        generateTrend("measurement", "sixMonths", 97.2, 0.026, 3),
      ],
      kpis: [
        { title: "Chest", unit: "cm", value: "102.8", currentNumeric: 102.8, previous: 103.6 },
        { title: "Arms", unit: "cm", value: "36.0", currentNumeric: 36.0, previous: 35.8 },
        { title: "Legs", unit: "cm", value: "59.6", currentNumeric: 59.6, previous: 59.2 },
        { title: "Back", unit: "cm", value: "97.2", currentNumeric: 97.2, previous: 97.9 },
      ],
      workouts: {},
    },
  },
};

export { PROGRESS_MOCK_SNAPSHOTS };

function generateTrend(domain: ProgressDomain, range: TimeRange, seed: number, variance: number, metric: number): TrendPoint[] {
  const today = new Date();
  const points = RANGE_POINTS[range];
  const stepDays = RANGE_STEPS[range];
  const rng = createRng(`${domain}-${range}-${seed}-${variance}-${metric}`);

  let current = domain === "measurement" ? seed : seed * 0.55;
  if (domain === "workouts") {
    current *= 1 + metric * 0.05;
  } else {
    current *= 1 + metric * 0.02;
  }
  const values: TrendPoint[] = [];

  for (let index = 0; index < points; index += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - (points - 1 - index) * stepDays);
    const progress = points > 1 ? index / (points - 1) : 1;

    const noise = (rng() - 0.5) * variance * seed * 0.18;

    if (domain === "workouts") {
      const burst = seed * variance * (0.08 + rng() * 0.22 + metric * 0.03);
      current += burst + noise;
      if (rng() > 0.82) {
        current -= seed * variance * 0.12;
      }
    } else {
      const downwardDrift = seed * variance * (0.04 + progress * 0.06 + metric * 0.015);
      current -= downwardDrift;
      current += noise;
    }

    const baseFloor = domain === "measurement" ? seed * 0.75 : seed * 0.35;
    const baseCeiling = domain === "measurement" ? seed * 1.05 : seed * (range === "sixMonths" ? 1.45 : 1.25);
    const floor = domain === "measurement" ? baseFloor * (1 - metric * 0.02) : baseFloor * (1 + metric * 0.03);
    const ceiling = baseCeiling * (1 + metric * 0.08);
    current = Math.min(ceiling, Math.max(floor, current));

    values.push({
      x: new Date(date.getTime()),
      y: Number(current.toFixed(2)),
      isPersonalBest: index === points - 2,
    });
  }

  return values;
}

function createRng(key: string) {
  let seed = 0;
  for (let index = 0; index < key.length; index += 1) {
    seed = (seed << 5) - seed + key.charCodeAt(index);
    seed |= 0;
  }
  return mulberry32(seed >>> 0);
}

function createCardioWorkout(
  id: string,
  activity: string,
  daysAgo: number,
  startHour: number,
  startMinute: number,
  durationMinutes: number,
  distanceKm?: number,
  calories?: number,
  steps?: number,
): CardioWorkoutSummary {
  const start = new Date();
  start.setDate(start.getDate() - daysAgo);
  start.setHours(startHour, startMinute, 0, 0);
  const durationMs = Math.max(0, Math.round(durationMinutes * 60 * 1000));
  const end = new Date(start.getTime() + durationMs);
  return {
    id,
    activity,
    start: new Date(start.getTime()),
    end: new Date(end.getTime()),
    durationMinutes,
    distanceKm,
    calories,
    steps,
  };
}

function groupWorkoutsByDate(workouts: CardioWorkoutSummary[]): Record<string, CardioWorkoutSummary[]> {
  const grouped: Record<string, CardioWorkoutSummary[]> = {};
  for (const workout of workouts) {
    const date = workout.start instanceof Date ? workout.start : new Date(workout.start);
    if (Number.isNaN(date.getTime())) {
      continue;
    }
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(workout);
  }

  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => {
      const aTime = a.start instanceof Date ? a.start.getTime() : new Date(a.start).getTime();
      const bTime = b.start instanceof Date ? b.start.getTime() : new Date(b.start).getTime();
      return bTime - aTime;
    });
  }

  return grouped;
}

function mulberry32(a: number) {
  return function rng() {
    a += 0x6d2b79f5;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
