import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from "react";
import {
  Activity,
  Calendar,
  Clock,
  Dumbbell,
  Flame,
  Footprints,
  MapPin,
  Trophy,
} from "lucide-react";

import { PROGRESS_THEME } from "./util";
import type { CardioWorkoutSummary } from "@/types/progress";
import { logger } from "../../../utils/logging";

const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

export type CardioWeekHistoryWorkout = {
  id: number | string;
  name: string;
  source?: string;
  duration?: ReactNode;
  time?: string;
  calories?: ReactNode;
  distance?: ReactNode;
  steps?: ReactNode;
  exercises?: number;
  sets?: number;
  rounds?: number;
  volume?: ReactNode;
  personalRecords?: number;
  type?: string;
};

export type CardioWeekHistoryDay = {
  key: string;
  label?: string;
  weekIndex: number;
  dateLabel: string;
  dailyTotals: {
    calories?: ReactNode;
    time?: ReactNode;
    distance?: ReactNode;
    steps?: ReactNode;
  };
  workouts: CardioWeekHistoryWorkout[];
};

type StyleWithRing = CSSProperties & { ["--tw-ring-color"]?: string };

type AggregatedTotals = {
  calories?: number;
  distance?: number;
  steps?: number;
  time?: number;
};

const SECTION_STYLE: CSSProperties = {
  borderColor: PROGRESS_THEME.cardBorder,
  boxShadow: PROGRESS_THEME.cardShadow,
};

const WEEK_STRIP_STYLE: CSSProperties = {
  borderColor: PROGRESS_THEME.borderSubtle,
  backgroundColor: PROGRESS_THEME.cardBackground,
};

const DIVIDER_STYLE: CSSProperties = {
  backgroundColor: PROGRESS_THEME.borderSubtle,
};

const WORKOUT_ACCENTS: Record<string, string> = {
  workouts: PROGRESS_THEME.accentPrimary,
  strength: PROGRESS_THEME.accentPrimary,
  cardio: PROGRESS_THEME.accentSecondary,
  hiit: PROGRESS_THEME.accentSecondary,
  mobility: PROGRESS_THEME.accentSecondary,
};

const integerFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const distanceFormatter = new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  const isShort = normalized.length === 3;
  const r = isShort ? ((value >> 8) & 0xf) * 17 : (value >> 16) & 0xff;
  const g = isShort ? ((value >> 4) & 0xf) * 17 : (value >> 8) & 0xff;
  const b = isShort ? (value & 0xf) * 17 : value & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getAccentColor(type?: string) {
  return WORKOUT_ACCENTS[type ?? ""] ?? PROGRESS_THEME.accentPrimary;
}

class Workout {
  id: number | string;
  type: string;
  name: string;
  source?: string;
  duration?: ReactNode;
  time?: string;
  calories?: ReactNode;
  distance?: ReactNode;
  steps?: ReactNode;
  exercises?: number;
  sets?: number;
  rounds?: number;
  volume?: ReactNode;
  personalRecords?: number;
  accent: string;

  constructor(data: CardioWeekHistoryWorkout) {
    this.id = data.id;
    this.type = data.type ?? "cardio";
    this.name = data.name;
    this.source = data.source;
    this.duration = data.duration;
    this.time = data.time;
    this.calories = data.calories;
    this.distance = data.distance;
    this.steps = data.steps;
    this.exercises = data.exercises;
    this.sets = data.sets;
    this.rounds = data.rounds;
    this.volume = data.volume;
    this.personalRecords = data.personalRecords;
    this.accent = getAccentColor(this.type);
    logger.debug("🔍 DGB [CARDIO_WEEK_HISTORY] Workout data:", data);
    logger.debug("🔍 DGB [CARDIO_WEEK_HISTORY] Workout accent:",this);
  }

  static from(raw: CardioWeekHistoryWorkout) {
    return new Workout(raw);
  }

  get isStrength() {
    return (
      this.type === "strength" ||
      this.type === "workouts" ||
      this.sets !== undefined ||
      this.exercises !== undefined ||
      this.volume !== undefined
    );
  }

  private formatMetric(value: ReactNode) {
    if (typeof value === "number") {
      return value.toLocaleString();
    }
    return value ?? "N/A";
  }

  get metricOne() { return { label: "Duration", value: this.formatMetric(this.duration) };}
  get metricTwo() { return { label: "Distance", value: this.formatMetric(this.distance)};}
  get metricThree() {return { label: "Steps", value: this.formatMetric(this.steps)};}
  get metricFour() { return { label: "Calories", value: this.formatMetric(this.calories)};}
}

export function buildCardioWeekHistory(groups: Record<string, CardioWorkoutSummary[]>): CardioWeekHistoryDay[] {
  const entries = Object.entries(groups);
  //logger.debug("🔍 DGB [CARDIO_WEEK_HISTORY] Entries:", JSON.stringify(entries, null, 2));

  const startOfCurrentWeek = getStartOfWeek(new Date());
  const endOfCurrentWeek = addDays(startOfCurrentWeek, 7);
  const today = toLocalDate(new Date());

  logger.debug("🔍 DGB [CARDIO_WEEK_HISTORY] Start of current week:", startOfCurrentWeek);
  logger.debug("🔍 DGB [CARDIO_WEEK_HISTORY] End of current week:", endOfCurrentWeek);

  const grouped = entries.reduce<
    Map<
      string,
      {
        date: Date;
        workouts: CardioWeekHistoryDay["workouts"];
        totals: AggregatedTotals;
        label?: string;
      }
    >
  >((acc, [isoDate, workouts]) => {
    logger.debug("🔍 DGB [CARDIO_WEEK_HISTORY] ISO Date:", isoDate);
    logger.debug("🔍 DGB [CARDIO_WEEK_HISTORY] Workouts:", JSON.stringify(workouts, null, 2));
    if (!Array.isArray(workouts) || workouts.length === 0) {
      return acc;
    }

    const reference = toLocalDate(isoDate);
    const fallback = workouts[0] ? toLocalDate(workouts[0].start) : new Date(NaN);
    const date = !Number.isNaN(reference.getTime()) ? reference : fallback;

    if (Number.isNaN(date.getTime())) {
      return acc;
    }

    if (!isWithinRange(date, startOfCurrentWeek, endOfCurrentWeek)) {
      return acc;
    }

    const key = date.toISOString().split("T")[0];
    if (!acc.has(key)) {
      acc.set(key, {
        date,
        workouts: [],
        totals: {},
        label: getWeekdayLabel(date),
      });
    }

    const group = acc.get(key)!;
    const sorted = [...workouts].sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());

    for (const workout of sorted) {
      group.workouts.push({
        id: workout.id,
        type: "cardio",
        name: workout.activity,
        source: workout.source,
        duration: formatHistoryDuration(workout.durationMinutes),
        distance:
          typeof workout.distanceKm === "number"
            ? `${distanceFormatter.format(Math.max(0, workout.distanceKm))} km`
            : undefined,
        calories:
          typeof workout.calories === "number"
            ? `${integerFormatter.format(Math.round(Math.max(0, workout.calories)))} kcal`
            : undefined,
        time: formatHistoryTime(workout.start),
        steps: sanitizeSteps(workout.steps),
      });

      if (typeof workout.calories === "number" && Number.isFinite(workout.calories)) {
        group.totals.calories = (group.totals.calories ?? 0) + workout.calories;
      }
      if (typeof workout.distanceKm === "number" && Number.isFinite(workout.distanceKm)) {
        group.totals.distance = (group.totals.distance ?? 0) + workout.distanceKm;
      }
      if (typeof workout.steps === "number" && Number.isFinite(workout.steps)) {
        group.totals.steps = (group.totals.steps ?? 0) + workout.steps;
      }
      if (typeof workout.durationMinutes === "number" && Number.isFinite(workout.durationMinutes)) {
        group.totals.time = (group.totals.time ?? 0) + workout.durationMinutes;
      }
    }
    return acc;
  }, new Map());

  const result = Array.from(grouped.values())
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map(({ date, workouts, totals, label }) => {
      const weekIndex = getWeekIndex(date);
      const formattedTotals: CardioWeekHistoryDay["dailyTotals"] = {
        calories: typeof totals.calories === "number" ? Math.round(totals.calories) : totals.calories,
        distance: typeof totals.distance === "number" ? `${totals.distance.toFixed(1)} km` : totals.distance,
        steps: typeof totals.steps === "number" ? Math.round(totals.steps) : totals.steps,
        time: typeof totals.time === "number" ? formatMinutes(totals.time) : totals.time,
      };

      return {
        key: date.toISOString().split("T")[0],
        label,
        weekIndex,
        dateLabel: formatDateLabel(date),
        dailyTotals: formattedTotals,
        workouts,
      } satisfies CardioWeekHistoryDay;
    });

  const existingByIndex = new Map(result.map((day) => [day.weekIndex, day]));
  const todayIndex = Math.min(getWeekIndex(today), 6);

  for (let offset = 0; offset <= todayIndex; offset += 1) {
    if (existingByIndex.has(offset)) {
      continue;
    }

    const date = addDays(startOfCurrentWeek, offset);
    if (!isWithinRange(date, startOfCurrentWeek, endOfCurrentWeek)) {
      continue;
    }

    const placeholder: CardioWeekHistoryDay = {
      key: date.toISOString().split("T")[0],
      label: getWeekdayLabel(date),
      weekIndex: offset,
      dateLabel: formatDateLabel(date),
      dailyTotals: {},
      workouts: [],
    };

    result.push(placeholder);
    existingByIndex.set(offset, placeholder);
  }

  result.sort((a, b) => new Date(b.key).getTime() - new Date(a.key).getTime());

  for (const day of result) {
    logger.debug("🔍 DGB [CARDIO_WEEK_HISTORY] Day:", JSON.stringify(day, null, 2));
  }
  return result;
}

function formatHistoryDuration(minutes?: number) {
  if (!Number.isFinite(minutes) || (minutes ?? 0) <= 0) {
    return "00:00:00";
  }
  const totalSeconds = Math.max(0, Math.round((minutes ?? 0) * 60));
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatHistoryTime(iso?: string) {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function sanitizeSteps(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  const normalized = Math.round(value);
  return normalized >= 0 ? normalized : undefined;
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function getWeekIndex(date: Date) {
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function toLocalDate(value: string | Date | undefined | null) {
  if (!value) {
    return new Date(NaN);
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date(NaN);
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getStartOfWeek(date: Date) {
  const local = toLocalDate(date);
  if (Number.isNaN(local.getTime())) {
    return new Date(date);
  }
  const jsDay = local.getDay();
  const diff = jsDay === 0 ? -6 : 1 - jsDay;
  local.setDate(local.getDate() + diff);
  return local;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isWithinRange(date: Date, start: Date, end: Date) {
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

function getWeekdayLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 1).toUpperCase();
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

type WeekStripProps = {
  value: string;
  days: CardioWeekHistoryDay[];
  onChange: (value: string) => void;
};

function WeekStrip({ value, days, onChange }: WeekStripProps) {
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  const clickable = useMemo(() => {
    return days.reduce<Record<number, CardioWeekHistoryDay>>((acc, day) => {
      const index = Math.min(Math.max(day.weekIndex ?? 0, 0), 6);
      acc[index] = day;
      return acc;
    }, {});
  }, [days]);

  const currentEntry = Object.entries(clickable).find(([, day]) => day.key === value);
  const currentIndex = currentEntry ? Number(currentEntry[0]) : undefined;

  return (
    <div className="rounded-2xl border px-3 py-2" style={WEEK_STRIP_STYLE}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase" style={{ color: PROGRESS_THEME.textMuted }}>
          Week so far
        </span>
        <div className="flex items-center gap-1">
          {labels.map((label, index) => {
            const day = clickable[index];
            const isEnabled = Boolean(day);
            const isActive = currentIndex === index;
            const buttonLabel = day?.label ?? label;
            const baseStyle: CSSProperties = {
              borderColor: PROGRESS_THEME.borderSubtle,
              color: PROGRESS_THEME.textSubtle,
            };
            const activeStyle: CSSProperties = isActive
              ? {
                  backgroundColor: hexToRgba(PROGRESS_THEME.accentPrimary, 0.16),
                  borderColor: PROGRESS_THEME.accentPrimary,
                  color: PROGRESS_THEME.accentPrimary,
                }
              : {};

            return (
              <button
                key={`${buttonLabel}-${index}`}
                type="button"
                onClick={() => day && onChange(day.key)}
                disabled={!isEnabled}
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full border text-sm font-semibold transition",
                  isEnabled
                    ? "hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    : "cursor-default opacity-40",
                )}
                style={{ ...baseStyle, ...activeStyle }}
              >
                {buttonLabel}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type DailyWorkoutCardProps = {
  days: CardioWeekHistoryDay[];
  dayKey: string;
  setDayKey: (value: string) => void;
};

function DailyWorkoutCard({ days, dayKey, setDayKey }: DailyWorkoutCardProps) {
  const day = useMemo(() => days.find((entry) => entry.key === dayKey) ?? days[0], [dayKey, days]);

  if (!day) {
    return null;
  }

  const totals = [
    { Icon: Flame, label: "Calories", value: day.dailyTotals.calories ?? "N/A" },
    { Icon: Clock, label: "Duration", value: day.dailyTotals.time ?? "N/A" },
    { Icon: MapPin, label: "Distance", value: day.dailyTotals.distance ?? "N/A" },
    { Icon: Footprints, label: "Steps", value: day.dailyTotals.steps ?? "N/A" },
  ];

  return (
    <section className="w-full rounded-3xl border bg-white p-5" style={SECTION_STYLE}>
      <div className="flex flex-col gap-5">
        <WeekStrip value={day.key} days={days} onChange={setDayKey} />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-2 text-sm font-medium" style={{ color: PROGRESS_THEME.textPrimary }}>
            <Calendar className="h-4 w-4" style={{ color: PROGRESS_THEME.accentPrimary }} />
            <span>{day.dateLabel}</span>
          </div>
          <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(60px,1fr))]">
            {totals.map(({ Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="h-3 w-3" style={{ color: PROGRESS_THEME.textMuted }} />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-center" style={{ color: PROGRESS_THEME.textPrimary }}>
                    {typeof value === "number" ? value.toLocaleString() : value}
                  </span>
                  <span className="text-xs uppercase tracking-[0.01em]" style={{ color: PROGRESS_THEME.textMuted }}>
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px" style={DIVIDER_STYLE} />

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" style={{ color: PROGRESS_THEME.textMuted }} />
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: PROGRESS_THEME.textSubtle }}>
              Workouts
            </h4>
          </div>

          <div className="space-y-3">
            {day.workouts.length > 0 ? (
              day.workouts.map((rawWorkout) => {
                const workout = Workout.from(rawWorkout);
                const cardStyle: StyleWithRing = {
                  borderColor: hexToRgba(workout.accent, 0.28),
                  backgroundColor: hexToRgba(workout.accent, 0.12),
                  ["--tw-ring-color"]: hexToRgba(workout.accent, 0.3),
                };

                const iconWrapperStyle: CSSProperties = {
                  borderColor: hexToRgba(workout.accent, 0.4),
                  backgroundColor: hexToRgba(workout.accent, 0.2),
                  color: workout.accent,
                };

                const badgeStyle: CSSProperties = {
                  borderColor: hexToRgba(workout.accent, 0.35),
                  backgroundColor: hexToRgba(workout.accent, 0.15),
                  color: workout.accent,
                };

                return (
                  <article
                    key={workout.id}
                    className="w-full rounded-2xl border px-4 py-3 transition hover:shadow-sm"
                    style={cardStyle}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full border"
                          style={iconWrapperStyle}
                        >
                          {workout.isStrength ? <Dumbbell className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h5 className="text-sm font-semibold" style={{ color: PROGRESS_THEME.textPrimary }}>
                              {workout.name}
                            </h5>
                            {workout.source ? (
                              <span
                                className="text-xs font-medium"
                                style={{ color: PROGRESS_THEME.textMuted }}
                              >
                                • {workout.source}
                              </span>
                            ) : null}
                            {workout.personalRecords ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
                                style={badgeStyle}
                              >
                                <Trophy className="h-3 w-3" />
                                {workout.personalRecords}
                              </span>
                            ) : null}
                          </div>
                          {workout.time ? (
                            <p className="text-xs" style={{ color: PROGRESS_THEME.textMuted }}>
                              {workout.time}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex text-center" style={{ gap: "clamp(0.25rem, 2vw, 1rem)" }}>
                        <div className="flex-1">
                          <Metric value={workout.metricOne.value} label={workout.metricOne.label} align="center" />
                        </div>
                        <div className="flex-1">
                          <Metric value={workout.metricTwo.value} label={workout.metricTwo.label} align="center" />
                        </div>
                        <div className="flex-1">
                          <Metric value={workout.metricThree.value} label={workout.metricThree.label} align="center" />
                        </div>
                        <div className="flex-1">
                          <Metric value={workout.metricFour.value} label={workout.metricFour.label} align="center" />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div
                className="rounded-2xl border border-dashed px-4 py-3 text-center text-sm font-medium"
                style={{
                  borderColor: PROGRESS_THEME.borderSubtle,
                  color: PROGRESS_THEME.textSubtle,
                  backgroundColor: hexToRgba(PROGRESS_THEME.borderSubtle, 0.12),
                }}
              >
                No data avaliable please enable permisions
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

type MetricAlignment = "start" | "center" | "end";

type MetricProps = {
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  value: ReactNode;
  label: string;
  iconColor?: string;
  align?: MetricAlignment;
};

const METRIC_ALIGN_CLASSES: Record<MetricAlignment, string> = {
  start: "items-start text-left",
  center: "items-center text-center",
  end: "items-end text-right",
};

function Metric({ icon: Icon, value, label, iconColor, align = "center" }: MetricProps) {
  return (
    <div
      className={cn("flex flex-col", METRIC_ALIGN_CLASSES[align])}
      style={{ gap: "clamp(0.125rem, 0.5vw, 0.5rem)" }}
    >
      {Icon && (
        <Icon
          className="h-4 w-4"
          style={{
            color: iconColor ?? PROGRESS_THEME.textMuted,
            width: "clamp(0.75rem, 2vw, 1.25rem)",
            height: "clamp(0.75rem, 2vw, 1.25rem)",
          }}
        />
      )}
      <span
        className="text-sm font-semibold"
        style={{
          color: PROGRESS_THEME.textPrimary,
          fontSize: "clamp(0.75rem, 1.5vw, 1rem)",
          fontWeight: "clamp(500, 1vw + 400, 700)",
        }}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
      <span
        className="text-[11px] uppercase tracking-[0.08em]"
        style={{
          color: PROGRESS_THEME.textMuted,
          fontSize: "clamp(0.625rem, 1vw, 0.75rem)",
          letterSpacing: "clamp(0.06em, 0.1vw, 0.1em)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

type CardioWeekHistoryProps = {
  days: CardioWeekHistoryDay[];
  initialDayKey?: string;
};

export function CardioWeekHistory({ days, initialDayKey }: CardioWeekHistoryProps) {
  const [dayKey, setDayKey] = useState<string>(() => initialDayKey ?? days[0]?.key ?? "");

  useEffect(() => {
    if (days.length === 0) {
      return;
    }
    if (!days.some((day) => day.key === dayKey)) {
      setDayKey((previous) => {
        if (days.some((day) => day.key === previous)) {
          return previous;
        }
        return days[0]?.key ?? "";
      });
    }
  }, [dayKey, days]);

  if (days.length === 0) {
    return null;
  }

  return <DailyWorkoutCard days={days} dayKey={dayKey} setDayKey={setDayKey} />;
}

export default CardioWeekHistory;
