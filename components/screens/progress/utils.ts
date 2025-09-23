import type { TimeRange } from "../../../src/types/progress";
import type { ProgressDomain } from "../../progress/Progress.types";
import type { LoadedExercise } from "../../../utils/routineLoader";
import type { Profile } from "../../../utils/supabase/supabase-types";

const TREND_ICONS = {
  up: "▲",
  down: "▼",
  flat: "=",
} as const;

const integerFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const decimalOneFormatter = new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const decimalTwoFormatter = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const weightFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

export interface TrendSummary {
  icon: string;
  color: string;
  colorActive: string;
  text: string;
  delta: number;
}

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
  return `${weightFormatter.format(Math.round(safeWeight))} kg`;
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

export function getEncouragement(firstName?: string | null) {
  const suffix = firstName ? `, ${firstName}` : "";
  return `You’ve got this${suffix}`;
}

export function extractFirstName(profile: Profile | null): string | null {
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

export function determineTrend(currentValue: number | null, previousValue: number | null): TrendSummary {
  if (currentValue === null || previousValue === null) {
    return {
      icon: TREND_ICONS.flat,
      color: "text-[rgba(34,49,63,0.55)]",
      colorActive: "text-[#22313F]",
      text: "No change",
      delta: 0,
    };
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
    };
  }
  if (difference > 0) {
    return {
      icon: TREND_ICONS.up,
      color: "text-[rgba(46,125,102,0.85)]",
      colorActive: "text-[rgba(46,125,102,1)]",
      text: "Up",
      delta: difference,
    };
  }
  return {
    icon: TREND_ICONS.down,
    color: "text-[rgba(226,125,96,0.85)]",
    colorActive: "text-[rgba(226,125,96,1)]",
    text: "Down",
    delta: Math.abs(difference),
  };
}

function clampNonNegative(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
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

function getWeekOfMonth(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  return Math.floor((date.getDate() + offset - 1) / 7) + 1;
}
