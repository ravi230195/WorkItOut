import type { TimeRange } from "@/types/progress";
import type { DomainSnapshotMap, ProgressDomain, TrendPoint } from "../../progress/Progress.types";

const RANGE_POINTS: Record<TimeRange, number> = { week: 7, threeMonths: 12, sixMonths: 6 };
const RANGE_STEPS: Record<TimeRange, number> = { week: 1, threeMonths: 7, sixMonths: 30 };

const PROGRESS_MOCK_SNAPSHOTS: DomainSnapshotMap = {
  strength: {
    week: {
      series: [
        generateTrend("strength", "week", 1050, 0.32, 0),
        generateTrend("strength", "week", 860, 0.28, 1),
        generateTrend("strength", "week", 1340, 0.3, 2),
        generateTrend("strength", "week", 620, 0.26, 3),
      ],
      kpis: [
        { title: "Duration", unit: "hours", value: "3h 18m", currentNumeric: 198, previous: 172 },
        { title: "Workouts", value: "5", currentNumeric: 5, previous: 4 },
        { title: "Total Weight", unit: "kg", value: "82,640", currentNumeric: 82640, previous: 79320 },
        { title: "Streak", unit: "days", value: "6", currentNumeric: 6, previous: 4 },
      ],
      history: [
        { type: "strength", id: "s1", name: "Upper Power", date: daysAgoISO(1), duration: "52 min", totalWeight: "28,450 kg" },
        { type: "strength", id: "s2", name: "Posterior Chain", date: daysAgoISO(3), duration: "47 min", totalWeight: "30,120 kg" },
        { type: "strength", id: "s3", name: "Power Pull", date: daysAgoISO(5), duration: "41 min", totalWeight: "24,360 kg" },
      ],
    },
    threeMonths: {
      series: [
        generateTrend("strength", "threeMonths", 1220, 0.24, 0),
        generateTrend("strength", "threeMonths", 940, 0.22, 1),
        generateTrend("strength", "threeMonths", 1480, 0.25, 2),
        generateTrend("strength", "threeMonths", 680, 0.21, 3),
      ],
      kpis: [
        { title: "Duration", unit: "hours", value: "12h 42m", currentNumeric: 762, previous: 708 },
        { title: "Workouts", value: "18", currentNumeric: 18, previous: 16 },
        { title: "Total Weight", unit: "kg", value: "322,130", currentNumeric: 322130, previous: 304980 },
        { title: "Streak", unit: "days", value: "12", currentNumeric: 12, previous: 9 },
      ],
      history: [],
    },
    sixMonths: {
      series: [
        generateTrend("strength", "sixMonths", 1380, 0.18, 0),
        generateTrend("strength", "sixMonths", 980, 0.17, 1),
        generateTrend("strength", "sixMonths", 1620, 0.2, 2),
        generateTrend("strength", "sixMonths", 720, 0.15, 3),
      ],
      kpis: [
        { title: "Duration", unit: "hours", value: "156", currentNumeric: 9360, previous: 9020 },
        { title: "Workouts", value: "182", currentNumeric: 182, previous: 178 },
        { title: "Total Weight", unit: "kg", value: "3.4M", currentNumeric: 3400000, previous: 3320000 },
        { title: "Streak", unit: "days", value: "21", currentNumeric: 21, previous: 18 },
      ],
      history: [],
    },
  },
  cardio: {
    week: {
      series: [
        generateTrend("cardio", "week", 8, 0.32, 0),
        generateTrend("cardio", "week", 6.4, 0.28, 1),
        generateTrend("cardio", "week", 9.8, 0.3, 2),
        generateTrend("cardio", "week", 5.2, 0.26, 3),
      ],
      kpis: [
        { title: "Total Time", unit: "hours", value: "4h 05m", currentNumeric: 245, previous: 203 },
        { title: "Distance", unit: "km", value: "42.5", currentNumeric: 42.5, previous: 38.2 },
        { title: "Calories", unit: "kcal", value: "3,420", currentNumeric: 3420, previous: 3150 },
        { title: "Steps", value: "64,210", currentNumeric: 64210, previous: 60890 },
      ],
      history: [
        {
          type: "cardio",
          id: "c1",
          activity: "Outdoor Run",
          date: daysAgoISO(1),
          duration: "00:42:10",
          distance: "7.4 km",
          calories: "612 kcal",
          time: "6:30 AM",
          steps: 7420,
        },
        {
          type: "cardio",
          id: "c1b",
          activity: "Interval Sprints",
          date: daysAgoISO(1),
          duration: "00:18:24",
          distance: "3.1 km",
          calories: "284 kcal",
          time: "12:15 PM",
          steps: 3140,
        },
        {
          type: "cardio",
          id: "c1c",
          activity: "Evening Walk",
          date: daysAgoISO(1),
          duration: "00:35:48",
          distance: "3.9 km",
          calories: "236 kcal",
          time: "7:20 PM",
          steps: 4680,
        },
        {
          type: "cardio",
          id: "c2",
          activity: "Indoor Run",
          date: daysAgoISO(2),
          duration: "00:35:05",
          distance: "5.6 km",
          calories: "438 kcal",
          time: "6:10 PM",
          steps: 5120,
        },
        {
          type: "cardio",
          id: "c2b",
          activity: "Rowing Intervals",
          date: daysAgoISO(2),
          duration: "00:28:52",
          distance: "4.2 km",
          calories: "312 kcal",
          time: "7:05 AM",
          steps: 0,
        },
        {
          type: "cardio",
          id: "c3",
          activity: "Cycling",
          date: daysAgoISO(3),
          duration: "00:48:44",
          distance: "18.2 km",
          calories: "502 kcal",
          time: "9:00 AM",
          steps: 1860,
        },
        {
          type: "cardio",
          id: "c3b",
          activity: "Hill Repeats",
          date: daysAgoISO(3),
          duration: "00:24:16",
          distance: "2.1 km",
          calories: "198 kcal",
          time: "6:10 AM",
          steps: 2840,
        },
        {
          type: "cardio",
          id: "c3c",
          activity: "Lunch Walk",
          date: daysAgoISO(3),
          duration: "00:22:33",
          distance: "2.7 km",
          calories: "176 kcal",
          time: "12:35 PM",
          steps: 3210,
        },
        {
          type: "cardio",
          id: "c3d",
          activity: "Evening Spin",
          date: daysAgoISO(3),
          duration: "00:31:08",
          distance: "10.5 km",
          calories: "286 kcal",
          time: "7:45 PM",
          steps: 960,
        },
        {
          type: "cardio",
          id: "c4",
          activity: "Trail Run",
          date: daysAgoISO(4),
          duration: "01:05:12",
          distance: "9.6 km",
          calories: "684 kcal",
          time: "8:10 AM",
          steps: 8120,
        },
      ],
    },
    threeMonths: {
      series: [
        generateTrend("cardio", "threeMonths", 28, 0.22, 0),
        generateTrend("cardio", "threeMonths", 21, 0.2, 1),
        generateTrend("cardio", "threeMonths", 34, 0.23, 2),
        generateTrend("cardio", "threeMonths", 17, 0.19, 3),
      ],
      kpis: [
        { title: "Total Time", unit: "hours", value: "15h 38m", currentNumeric: 938, previous: 902 },
        { title: "Distance", unit: "km", value: "168", currentNumeric: 168, previous: 160 },
        { title: "Calories", unit: "kcal", value: "13,420", currentNumeric: 13420, previous: 12680 },
        { title: "Steps", value: "262,410", currentNumeric: 262410, previous: 254000 },
      ],
      history: [],
    },
    sixMonths: {
      series: [
        generateTrend("cardio", "sixMonths", 52, 0.18, 0),
        generateTrend("cardio", "sixMonths", 38, 0.16, 1),
        generateTrend("cardio", "sixMonths", 58, 0.19, 2),
        generateTrend("cardio", "sixMonths", 32, 0.15, 3),
      ],
      kpis: [
        { title: "Total Time", unit: "hours", value: "168", currentNumeric: 10080, previous: 9980 },
        { title: "Distance", unit: "km", value: "1,932", currentNumeric: 1932, previous: 1870 },
        { title: "Calories", unit: "kcal", value: "124,650", currentNumeric: 124650, previous: 123200 },
        { title: "Steps", value: "2.9M", currentNumeric: 2900000, previous: 2840000 },
      ],
      history: [],
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
      history: [],
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
      history: [],
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
      history: [],
    },
  },
};

export { PROGRESS_MOCK_SNAPSHOTS };

function daysAgoISO(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function generateTrend(domain: ProgressDomain, range: TimeRange, seed: number, variance: number, metric: number): TrendPoint[] {
  const today = new Date();
  const points = RANGE_POINTS[range];
  const stepDays = RANGE_STEPS[range];
  const rng = createRng(`${domain}-${range}-${seed}-${variance}-${metric}`);

  let current = domain === "measurement" ? seed : seed * 0.55;
  if (domain === "strength") {
    current *= 1 + metric * 0.08;
  } else if (domain === "cardio") {
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

    if (domain === "strength") {
      const push = seed * variance * (0.12 + rng() * 0.18 + metric * 0.04);
      const plateauChance = rng();
      if (plateauChance > 0.75) {
        current += push * 0.15 + noise;
      } else {
        current += push + noise;
      }
    } else if (domain === "cardio") {
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
      x: date.toISOString(),
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

function mulberry32(a: number) {
  return function rng() {
    a += 0x6d2b79f5;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
