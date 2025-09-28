import type {
  AggregatedData,
  AggregatedTotals,
  Bucket,
  BucketTotals,
  CardioFocus,
  CardioKpi,
  CardioProgressSnapshot,
  CardioSeriesResponse,
  CardioWeekHistoryDay,
  CardioWeekHistoryWorkout,
  CardioWorkoutSummary,
  DateInput,
  ProgressDomain,
  TimeRange,
  TrendSummary,
} from "../../progress/Progress.types";
import type { Profile } from "../../../utils/supabase/supabase-types";

export const PROGRESS_THEME = {
  accentPrimary: "#E27D60",
  accentPrimarySurface: "rgba(226,125,96,0.15)",
  accentPrimarySurfaceHover: "rgba(226,125,96,0.08)",
  accentPrimaryFocusRing: "rgba(226,125,96,0.35)",
  accentSecondary: "#68A691",
  textPrimary: "#111111",
  textMuted: "#111111",
  textSubtle: "#111111",
  textFaint: "#111111",
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

export const KPI_COLORS = ["#FFB38A", "#7FD1AE", "#FFE08A", "#8FC5FF"] as const;

const TREND_ICONS = {
  up: "▲",
  down: "▼",
  flat: "=",
} as const;

const ACTIVITY_LABELS: Record<string, string> = {
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

const WORKOUT_ACCENTS: Record<string, string> = {
  workouts: PROGRESS_THEME.accentPrimary,
  strength: PROGRESS_THEME.accentPrimary,
  cardio: PROGRESS_THEME.accentSecondary,
  hiit: PROGRESS_THEME.accentSecondary,
  mobility: PROGRESS_THEME.accentSecondary,
};

const integerFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const decimalOneFormatter = new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const decimalTwoFormatter = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const kmFormatter = new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const calorieFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const stepFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

export function getDateString(date: Date): string {
  return `${date.toDateString()} ${date.toTimeString()}`;
}

function clampNonNegative(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function formatDurationMinutes(value: number) {
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

export function formatKilometers(value: number) {
  return `${decimalOneFormatter.format(clampNonNegative(value))} km`;
}

export function formatCalories(value: number) {
  return `${integerFormatter.format(Math.round(clampNonNegative(value)))} kcal`;
}

export function formatSteps(value: number) {
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

export function formatDayLabel(range: TimeRange, value: Date) {
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

export function normalizeActivityName(activity?: string) {
  if (!activity) return "Workout";
  return ACTIVITY_LABELS[activity.trim().toLowerCase()] ?? activity;
}

export function formatHistoryDate(value: Date) {
  const date = new Date(value.getTime());
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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

export function determineTrend(currentValue: number | null, previousValue: number | null): TrendSummary {
  if (currentValue === null || previousValue === null) {
    return {
      icon: TREND_ICONS.flat,
      color: "text-[#111111]",
      colorActive: "text-[#111111]",
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
      color: "text-[#111111]",
      colorActive: "text-[#111111]",
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

export function toLocalDateTime(value: DateInput): Date | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  const valueIsString = typeof value === "string";
  const hasExplicitOffset = valueIsString && /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);

  if (valueIsString && !hasExplicitOffset) {
    return new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    );
  }

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

export function toLocalBucketDate(value: DateInput): Date | undefined {
  const date = toLocalDateTime(value);
  if (!date) {
    return undefined;
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

export function toLocalCalendarDate(value?: string | Date | null): Date {
  if (!value) return new Date(NaN);

  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const trimmed = value.trim();
  const m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return new Date(NaN);

  const yyyy = +m[1], mm = +m[2], dd = +m[3];
  return new Date(yyyy, mm - 1, dd);
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatLocalDateKey(date: Date) {
  return formatDateKey(date);
}

export function createEmptyTotals(): BucketTotals {
  return { minutes: 0, distanceKm: 0, calories: 0, steps: 0, heartRateSum: 0, heartRateCount: 0 };
}

export function createBucket(start: Date, end: Date): Bucket {
  return { start, end, totals: createEmptyTotals(), workouts: [] };
}

export function cloneDate(date: Date) {
  return new Date(date.getTime());
}

export function buildBuckets(range: TimeRange, inclusiveEnd: Date): Bucket[] {
  if (range === "sixMonths") {
    const endMonthStart = new Date(inclusiveEnd.getFullYear(), inclusiveEnd.getMonth(), 1, 0, 0, 0, 0);
    const startMonth = new Date(endMonthStart);
    startMonth.setMonth(startMonth.getMonth() - 5);
    const buckets: Bucket[] = [];
    for (let index = 0; index < 6; index += 1) {
      const monthStart = new Date(startMonth.getFullYear(), startMonth.getMonth() + index, 1, 0, 0, 0, 0);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59, 999);
      buckets.push(createBucket(monthStart, monthEnd));
    }
    return buckets;
  }

  const bucketCount = range === "week" ? 7 : 12;
  const stepDays = range === "week" ? 1 : 7;
  const buckets: Bucket[] = [];
  const end = cloneDate(inclusiveEnd);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(end.getDate() - stepDays * (bucketCount - 1));
  start.setHours(0, 0, 0, 0);

  for (let index = 0; index < bucketCount; index += 1) {
    const bucketStart = new Date(start);
    bucketStart.setDate(start.getDate() + index * stepDays);
    const bucketEnd = new Date(bucketStart);
    bucketEnd.setDate(bucketStart.getDate() + stepDays - 1);
    bucketEnd.setHours(23, 59, 59, 999);
    buckets.push(createBucket(bucketStart, bucketEnd));
  }

  return buckets;
}

export function buildBucketSets(range: TimeRange): { current: Bucket[]; previous: Bucket[] } {
  const today = new Date();
  const current = buildBuckets(range, today);
  const firstCurrent = current[0];
  if (!firstCurrent) {
    return { current: [], previous: [] };
  }
  const previousEnd = new Date(firstCurrent.start);
  previousEnd.setDate(previousEnd.getDate() - 1);
  previousEnd.setHours(23, 59, 59, 999);
  const previous = buildBuckets(range, previousEnd);
  return { current, previous };
}

export function findBucket(buckets: Bucket[], date: Date): Bucket | undefined {
  for (const bucket of buckets) {
    if (date >= bucket.start && date <= bucket.end) {
      return bucket;
    }
  }
  return undefined;
}

export function safeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

export function minutesToDisplay(value: number) {
  const totalMinutes = Math.max(0, Math.round(value));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const hoursText = String(hours).padStart(2, "0");
  const minutesText = String(minutes).padStart(2, "0");

  return `${hoursText}h ${minutesText}m`;
}

export function kilometersToDisplay(value: number) {
  return `${kmFormatter.format(Math.max(0, value))}`;
}

export function caloriesToDisplay(value: number) {
  return `${calorieFormatter.format(Math.max(0, value))}`;
}

export function stepsToDisplay(value: number) {
  const safeValue = Math.max(0, value);
  if (safeValue > 10_000) {
    return `${Math.round(safeValue / 1_000)}K`;
  }
  return `${stepFormatter.format(Math.round(safeValue))}`;
}

export function averageHeartRate(bucket: Bucket): number | undefined {
  if (bucket.totals.heartRateCount <= 0) {
    return undefined;
  }
  return bucket.totals.heartRateSum / bucket.totals.heartRateCount;
}

export function collectWorkouts(data: AggregatedData): CardioWorkoutSummary[] {
  return [...data.previous, ...data.current].flatMap((bucket) => bucket.workouts);
}

export function groupWorkoutsByDate(workouts: CardioWorkoutSummary[]): Record<string, CardioWorkoutSummary[]> {
  const grouped: Record<string, CardioWorkoutSummary[]> = {};
  for (const workout of workouts) {
    const date = toLocalDateTime(workout.start) ?? toLocalDateTime(workout.end);
    if (!date || Number.isNaN(date.getTime())) {
      continue;
    }

    const key = formatDateKey(date);
    grouped[key] = grouped[key] || [];
    grouped[key].push(workout);
  }

  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => {
      const aStart = toLocalDateTime(a.start);
      const bStart = toLocalDateTime(b.start);

      return (bStart?.getTime() ?? 0) - (aStart?.getTime() ?? 0);
    });
  }

  return grouped;
}

export function seriesUnavailableFromBuckets(
  focus: CardioFocus,
  buckets: ReturnType<typeof buildBucketSets>,
  options?: { compare?: boolean },
): CardioSeriesResponse {
  const includePrevious = options?.compare !== false;
  const mapBucket = (bucket: Bucket): { date: Date; value: number } => ({
    date: new Date(bucket.start.getTime()),
    value: 0,
  });
  return {
    focus,
    current: buckets.current.map(mapBucket),
    previous: includePrevious ? buckets.previous.map(mapBucket) : undefined,
  };
}

export function kpisUnavailable(): CardioKpi[] {
  return [
    {
      key: "activeMinutes",
      title: "Total Time",
      unit: "minutes",
      value: "N/A",
    },
    {
      key: "distance",
      title: "Distance",
      unit: "km",
      value: "N/A",
    },
    {
      key: "calories",
      title: "Calories",
      unit: "kcal",
      value: "N/A",
    },
    {
      key: "steps",
      title: "Steps",
      value: "N/A",
    },
  ];
}

export function snapshotUnavailable(range: TimeRange): CardioProgressSnapshot {
  const buckets = buildBucketSets(range);
  const series = (["activeMinutes", "distance", "calories", "steps"] as CardioFocus[]).reduce<
    Record<CardioFocus, CardioSeriesResponse>
  >((acc, focus) => {
    acc[focus] = seriesUnavailableFromBuckets(focus, buckets);
    return acc;
  }, {} as Record<CardioFocus, CardioSeriesResponse>);

  return {
    range,
    series,
    kpis: kpisUnavailable(),
    workouts: {},
  };
}

export function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  const isShort = normalized.length === 3;
  const r = isShort ? ((value >> 8) & 0xf) * 17 : (value >> 16) & 0xff;
  const g = isShort ? ((value >> 4) & 0xf) * 17 : (value >> 8) & 0xff;
  const b = isShort ? (value & 0xf) * 17 : value & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getAccentColor(type?: string) {
  return WORKOUT_ACCENTS[type ?? ""] ?? PROGRESS_THEME.accentPrimary;
}

export function formatHistoryDuration(minutes?: number) {
  if (!Number.isFinite(minutes) || (minutes ?? 0) <= 0) {
    return "00:00:00";
  }
  const totalSeconds = Math.max(0, Math.round((minutes ?? 0) * 60));
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatHistoryTime(value?: Date | string) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function sanitizeSteps(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  const normalized = Math.round(value);
  return normalized >= 0 ? normalized : undefined;
}

export function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function getWeekIndex(date: Date) {
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function getStartOfWeek(date: Date) {
  const local = toLocalCalendarDate(date);
  if (Number.isNaN(local.getTime())) {
    return new Date(date);
  }
  const jsDay = local.getDay();
  const diff = jsDay === 0 ? -6 : 1 - jsDay;
  local.setDate(local.getDate() + diff);
  return local;
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function isWithinRange(date: Date, start: Date, end: Date) {
  const dateTime = date.getTime();
  const startTime = start.getTime();
  const endTime = end.getTime();

  if (Number.isNaN(dateTime) || Number.isNaN(startTime) || Number.isNaN(endTime)) {
    return false;
  }

  if (dateTime < startTime || dateTime > endTime) {
    return false;
  }

  const dateDay = toLocalCalendarDate(date).getTime();
  const startDay = toLocalCalendarDate(start).getTime();
  const endDay = toLocalCalendarDate(end).getTime();

  if (endDay > startDay && dateDay === endDay) {
    return false;
  }

  return true;
}

export function getWeekdayLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 1).toUpperCase();
}

export function formatDateLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function summarizeDayTotals(workouts: CardioWeekHistoryWorkout[]): AggregatedTotals {
  return workouts.reduce<AggregatedTotals>((totals, workout) => {
    const cardio = workout.type === "cardio" || workout.type === "workouts";
    if (cardio) {
      const distance = sanitizeSteps(Number(workout.distance));
      if (distance) totals.distance = (totals.distance ?? 0) + distance;
    }
    return totals;
  }, {});
}

export function sortWeekHistoryDays(days: CardioWeekHistoryDay[]) {
  return [...days].sort((a, b) => toLocalCalendarDate(b.key).getTime() - toLocalCalendarDate(a.key).getTime());
}
