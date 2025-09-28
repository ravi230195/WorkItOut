import type { TimeRange } from "@/types/progress";
import type { ProgressDomain } from "../../progress/Progress.types";
import type { Profile } from "../../../utils/supabase/supabase-types";

const PROGRESS_THEME = {
  accentPrimary: "#E27D60",
  accentPrimarySurface: "rgba(226,125,96,0.15)",
  accentPrimarySurfaceHover: "rgba(226,125,96,0.08)",
  accentPrimaryFocusRing: "rgba(226,125,96,0.35)",
  accentSecondary: "#68A691",
  textPrimary: "#111111",
  textMuted: "rgba(34,49,63,0.65)",
  textSubtle: "rgba(34,49,63,0.6)",
  textFaint: "rgba(34,49,63,0.55)",
  cardBorder: "rgba(30,36,50,0.08)",
  borderSubtle: "rgba(30,36,50,0.12)",
  cardBackground: "#FFFFFF",
  historyBackground: "#F8F6F3",
  domainButtonShadow: "0 12px 24px -16px rgba(30,36,50,0.4)",
  cardShadow: "0 18px 36px -20px rgba(30,36,50,0.4)",
  rangeButtonShadow: "0 2px 6px -4px rgba(30,36,50,0.18)",
  rangeButtonShadowActive: "0 12px 22px -16px rgba(30,36,50,0.35)",
  tooltipShadow: "0 12px 20px -16px rgba(30,36,50,0.45)",
} as const;

const KPI_COLORS = ["#FFB38A", "#7FD1AE", "#FFE08A", "#8FC5FF"] as const;

const TREND_ICONS = {
  up: "▲",
  down: "▼",
  flat: "=",
} as const;

const integerFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const decimalOneFormatter = new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const decimalTwoFormatter = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export type TrendSummary = {
  icon: string;
  color: string;
  colorActive: string;
  text: string;
  delta: number;
};

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

function formatTickValue(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }
  return value.toFixed(0);
}

function generateTicks(domain: [number, number], count: number) {
  const [min, max] = domain;
  if (min === max) {
    return [Number(min.toFixed(2))];
  }
  const step = (max - min) / Math.max(count - 1, 1);
  return Array.from({ length: count }, (_, index) => Number((min + index * step).toFixed(2)));
}

function formatDayLabel(range: TimeRange, value: Date) {
  const date = new Date(value.getTime());
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

function normalizeActivity(activity: string) {
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

function formatHistoryDate(value: Date) {
  const date = new Date(value.getTime());
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getEncouragement(firstName?: string | null) {
  const suffix = firstName ? `, ${firstName}` : "";
  return `You’ve got this${suffix}`;
}

function extractFirstName(profile: Profile | null): string | null {
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

function getKpiFormatter(domain: ProgressDomain, index: number): (value: number) => string {
  switch (domain) {
    case "workouts":
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

function determineTrend(currentValue: number | null, previousValue: number | null): TrendSummary {
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

export {
  PROGRESS_THEME,
  KPI_COLORS,
  normalizeActivity,
  formatHistoryDate,
  formatDayLabel,
  formatTickValue,
  generateTicks,
  getEncouragement,
  extractFirstName,
  getKpiFormatter,
  determineTrend,
};
