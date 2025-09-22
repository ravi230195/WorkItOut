import type { TimeRange } from "../../../src/types/progress";
import type { LoadedExercise } from "../../../utils/routineLoader";
import type { ProgressDomain, TrendPoint } from "./types";

export const RANGE_POINTS: Record<TimeRange, number> = { week: 7, threeMonths: 12, sixMonths: 6 };
export const RANGE_STEPS: Record<TimeRange, number> = { week: 1, threeMonths: 7, sixMonths: 30 };

const TREND_ICONS = {
  up: "▲",
  down: "▼",
  flat: "=",
} as const;

const integerFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const decimalOneFormatter = new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const decimalTwoFormatter = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function normalizeActivity(activity: string) {
  const mapping: Record<string, string> = {
    "outdoor walk": "Outdoor Walk",
    "indoor walk": "Indoor Walk",
    "outdoor run": "Outdoor Run",
    "indoor run": "Indoor Run",
    cycling: "Cycling",
    elliptical: "Elliptical",
    rowing: "Rowing",
    "stair stepper": "Stair Stepper",
    swimming: "Swimming",
  };
  return mapping[activity.trim().toLowerCase()] ?? activity;
}

export function daysAgoISO(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export function formatHistoryDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function estimateRoutineDurationMinutes(exerciseCount: number) {
  if (!Number.isFinite(exerciseCount) || exerciseCount <= 0) return 30;
  return exerciseCount * 10;
}

export function calculateTotalWeight(exercises: LoadedExercise[]) {
  return exercises.reduce((total, exercise) => {
    return (
      total +
      exercise.sets.reduce((setTotal, set) => {
        const reps = Number.parseFloat(set.reps);
        const weight = Number.parseFloat(set.weight);
        if (!Number.isFinite(reps) || !Number.isFinite(weight)) return setTotal;
        if (reps <= 0 || weight <= 0) return setTotal;
        return setTotal + reps * weight;
      }, 0)
    );
  }, 0);
}

export function formatDuration(minutes: number) {
  const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : 0;
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  if (hours > 0) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  return `${Math.max(remainingMinutes, 1)} min`;
}

export function formatWeight(weightKg: number) {
  const safeWeight = Number.isFinite(weightKg) && weightKg > 0 ? weightKg : 0;
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Math.round(safeWeight))} kg`;
}

export function generateTrend(
  domain: ProgressDomain,
  range: TimeRange,
  seed: number,
  variance: number,
  metric: number,
): TrendPoint[] {
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

export function formatDayLabel(range: TimeRange, iso: string, index: number, total: number) {
  const date = new Date(iso);
  if (range === "week") {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }

  if (range === "threeMonths") {
    const month = date.toLocaleDateString(undefined, { month: "short" });
    const weekInMonth = getWeekOfMonth(date);
    return `${month} W${weekInMonth}`;
  }

  return date.toLocaleDateString(undefined, { month: "short" });
}

export function formatTickValue(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }
  return value.toFixed(0);
}

export function generateTicks(domain: [number, number], count: number) {
  const [min, max] = domain;
  if (min === max) {
    return [Number(min.toFixed(2))];
  }
  const step = (max - min) / Math.max(count - 1, 1);
  return Array.from({ length: count }, (_, index) => Number((min + index * step).toFixed(2)));
}

export function getKpiFormatter(domain: ProgressDomain, index: number): (value: number) => string {
  switch (domain) {
    case "strength":
      return [
        formatDurationMinutes,
        formatWorkouts,
        formatKilograms,
        formatDays,
      ][index] ?? ((value) => integerFormatter.format(Math.round(value)));
    case "cardio":
      return [
        formatDurationMinutes,
        formatKilometers,
        formatCalories,
        formatSteps,
      ][index] ?? ((value) => integerFormatter.format(Math.round(value)));
    case "measurement":
    default:
      return [formatCentimeters, formatCentimeters, formatCentimeters, formatCentimeters][index] ??
        ((value) => decimalTwoFormatter.format(clampNonNegative(value)));
  }
}

export function determineTrend(currentValue: number | null, previousValue: number | null) {
  if (currentValue === null || previousValue === null) {
    return {
      icon: TREND_ICONS.flat,
      color: "text-[rgba(34,49,63,0.55)]",
      colorActive: "text-[#22313F]",
      text: "No change",
      delta: 0,
    } as const;
  }
  const current = clampNonNegative(currentValue);
  const previous = clampNonNegative(previousValue);
  const difference = current - previous;
  if (Math.abs(difference) < 0.01) {
    return {
      icon: TREND_ICONS.flat,
      color: "text-[rgba(34,49,63,0.45)]",
      colorActive: "text-[#22313F]",
      text: "Same as prior",
      delta: 0,
    } as const;
  }
  if (difference > 0) {
    return {
      icon: TREND_ICONS.up,
      color: "text-[rgba(46,125,102,0.85)]",
      colorActive: "text-[rgba(46,125,102,1)]",
      text: "Up",
      delta: difference,
    } as const;
  }
  return {
    icon: TREND_ICONS.down,
    color: "text-[rgba(226,125,96,0.85)]",
    colorActive: "text-[rgba(226,125,96,1)]",
    text: "Down",
    delta: Math.abs(difference),
  } as const;
}

export function getEncouragement(firstName?: string | null) {
  const suffix = firstName ? `, ${firstName}` : "";
  return `You’ve got this${suffix}`;
}

export function extractFirstName(profile: { first_name?: string | null; display_name?: string | null } | null): string | null {
  if (!profile) return null;
  const direct = profile.first_name?.trim();
  if (direct) {
    return direct.split(/\s+/)[0];
  }
  const display = profile.display_name?.trim();
  if (display) {
    const [first] = display.split(/\s+/);
    if (first) {
      return first;
    }
  }
  return null;
}

export function createRng(key: string) {
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

function formatDurationMinutes(value: number) {
  const totalMinutes = clampNonNegative(value);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes}m`;
}

function formatKilograms(value: number) {
  return `${integerFormatter.format(Math.round(clampNonNegative(value)))} kg`;
}

function formatDays(value: number) {
  return `${integerFormatter.format(Math.round(clampNonNegative(value)))} days`;
}

function formatWorkouts(value: number) {
  return `${integerFormatter.format(Math.round(clampNonNegative(value)))} workouts`;
}

function formatKilometers(value: number) {
  return `${decimalOneFormatter.format(clampNonNegative(value))} km`;
}

function formatCalories(value: number) {
  return `${integerFormatter.format(Math.round(clampNonNegative(value)))} kcal`;
}

function formatSteps(value: number) {
  return `${integerFormatter.format(Math.round(clampNonNegative(value)))} steps`;
}

function formatCentimeters(value: number) {
  return `${decimalTwoFormatter.format(clampNonNegative(value))} cm`;
}

function clampNonNegative(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function getWeekOfMonth(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  return Math.floor((date.getDate() + offset - 1) / 7) + 1;
}
