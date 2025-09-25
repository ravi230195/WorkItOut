import {
  useMemo,
  useState,
  type CSSProperties,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from "react";
import {
  Activity,
  BarChart3,
  Calendar,
  ChevronDown,
  Clock,
  Dumbbell,
  Flame,
  Footprints,
  MapPin,
  Target,
  Timer,
  Trophy,
  Zap,
} from "lucide-react";

import { PROGRESS_THEME } from "./util";

const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

type Day = (typeof DATA.days)[number];
type DayKey = Day["key"];

type Workout = Day["workouts"][number];

type StyleWithRing = CSSProperties & { ["--tw-ring-color"]?: string };

const DATA = {
  days: [
    {
      key: "today",
      dateLabel: "Today, Dec 15",
      dailyTotals: { calories: 450, time: "1h 23m", distance: "2.3 km", steps: 3420 },
      workouts: [
        {
          id: 1,
          type: "strength",
          name: "Upper Push",
          time: "6:30 AM",
          duration: "45 min",
          exercises: 6,
          sets: 18,
          calories: 320,
          volume: "2,450 kg",
          personalRecords: 2,
        },
        {
          id: 2,
          type: "cardio",
          name: "Cardio Walk",
          time: "2:15 PM",
          duration: "38 min",
          distance: "2.3 km",
          steps: 3420,
          calories: 130,
        },
        {
          id: 7,
          type: "cardio",
          name: "Zone 2 Ride",
          time: "7:45 PM",
          duration: "30 min",
          distance: "8.0 km",
          calories: 210,
        },
      ],
    },
    {
      key: "mon",
      dateLabel: "Mon, Dec 16",
      dailyTotals: { calories: 1040, time: "1h 46m", distance: "6.1 km", steps: 8920 },
      workouts: [
        {
          id: 3,
          type: "strength",
          name: "Lower Body — Legs",
          time: "6:10 AM",
          duration: "48 min",
          exercises: 8,
          sets: 22,
          calories: 620,
          volume: "5,600 kg",
        },
        {
          id: 4,
          type: "hiit",
          name: "Evening HIIT",
          time: "7:20 PM",
          duration: "28 min",
          calories: 420,
          avgHR: 164,
          rpe: "3/5",
        },
      ],
    },
    {
      key: "sun",
      dateLabel: "Sun, Dec 14",
      dailyTotals: { calories: 1385, time: "2h 12m", distance: "14.8 km", steps: 17430 },
      workouts: [
        {
          id: 5,
          type: "cardio",
          name: "Long Run",
          time: "9:00 AM",
          duration: "1h 22m",
          distance: "12.1 km",
          calories: 860,
        },
        {
          id: 6,
          type: "mobility",
          name: "Mobility & Core",
          time: "6:30 PM",
          duration: "50 min",
          exercises: 9,
          rounds: 3,
          calories: 525,
        },
      ],
    },
  ],
} as const;

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

const KPI_CARD_STYLE: CSSProperties = {
  borderColor: PROGRESS_THEME.borderSubtle,
  backgroundColor: PROGRESS_THEME.cardBackground,
};

const DETAIL_CARD_STYLE: CSSProperties = {
  borderColor: PROGRESS_THEME.borderSubtle,
  backgroundColor: PROGRESS_THEME.historyBackground,
};

const WORKOUT_ACCENTS: Record<string, string> = {
  strength: PROGRESS_THEME.accentPrimary,
  cardio: PROGRESS_THEME.accentSecondary,
  hiit: PROGRESS_THEME.accentSecondary,
  mobility: PROGRESS_THEME.accentSecondary,
};

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  const isShort = normalized.length === 3;
  const r = isShort ? ((value >> 8) & 0xf) * 17 : (value >> 16) & 0xff;
  const g = isShort ? ((value >> 4) & 0xf) * 17 : (value >> 8) & 0xff;
  const b = isShort ? (value & 0xf) * 17 : value & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getAccentColor(workout: Workout) {
  return WORKOUT_ACCENTS[workout.type ?? ""] ?? PROGRESS_THEME.accentPrimary;
}

type WeekStripProps = {
  value: DayKey;
  onChange: (value: DayKey) => void;
};

function WeekStrip({ value, onChange }: WeekStripProps) {
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  const clickable: Record<number, DayKey> = { 0: "mon", 2: "today", 6: "sun" };
  const currentEntry = Object.entries(clickable).find(([, key]) => key === value);
  const currentIndex = currentEntry ? Number(currentEntry[0]) : undefined;

  return (
    <div className="rounded-2xl border px-3 py-2" style={WEEK_STRIP_STYLE}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase" style={{ color: PROGRESS_THEME.textMuted }}>
          Week so far
        </span>
        <div className="flex items-center gap-1">
          {labels.map((label, index) => {
            const isEnabled = index in clickable;
            const isActive = currentIndex === index;
            const dayKey = clickable[index];
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
                key={`${label}-${index}`}
                type="button"
                onClick={() => isEnabled && dayKey && onChange(dayKey)}
                disabled={!isEnabled}
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full border text-sm font-semibold transition",
                  isEnabled
                    ? "hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    : "cursor-default opacity-40",
                )}
                style={{ ...baseStyle, ...activeStyle }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type DailyWorkoutCardProps = {
  dayKey: DayKey;
  setDayKey: (value: DayKey) => void;
};

function DailyWorkoutCard({ dayKey, setDayKey }: DailyWorkoutCardProps) {
  const day = useMemo(() => DATA.days.find((entry) => entry.key === dayKey) ?? DATA.days[0], [dayKey]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  return (
    <section className="w-full rounded-3xl border bg-white p-5" style={{ ...SECTION_STYLE, border: "1px solid red" }}>
      <div className="flex flex-col gap-5">
        <WeekStrip value={day.key} onChange={setDayKey} />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-2 text-sm font-medium" style={{ color: PROGRESS_THEME.textPrimary }}>
            <Calendar className="h-4 w-4" style={{ color: PROGRESS_THEME.accentPrimary }} />
            <span>{day.dateLabel}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { Icon: Flame, label: "Calories", value: day.dailyTotals.calories },
              { Icon: Clock, label: "Duration", value: day.dailyTotals.time },
              { Icon: MapPin, label: "Distance", value: day.dailyTotals.distance },
              { Icon: Footprints, label: "Steps", value: day.dailyTotals.steps },
            ].map(({ Icon, label, value }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-2xl border px-3 py-2"
                style={KPI_CARD_STYLE}
              >
                <Icon className="h-4 w-4" style={{ color: PROGRESS_THEME.textMuted }} />
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold" style={{ color: PROGRESS_THEME.textPrimary }}>
                    {value}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.08em]" style={{ color: PROGRESS_THEME.textMuted }}>
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

          <div className={cn("space-y-3", day.workouts.length > 2 && "max-h-64 overflow-y-auto")}>
            {day.workouts.map((workout) => {
              const accent = getAccentColor(workout);
              const isStrength = workout.type === "strength" || "sets" in workout;
              const isOpen = Boolean(expanded[workout.id]);
              const metricTwo = isStrength
                ? (workout as { exercises: number }).exercises
                : (workout as { distance?: string }).distance;
              const labelTwo = isStrength ? "Exercises" : "Distance";
              const metricThree = isStrength
                ? (workout as { sets: number }).sets
                : ("steps" in workout ? (workout as { steps: number }).steps : "—");
              const labelThree = isStrength ? "Sets" : "Steps";

              const buttonStyle: StyleWithRing = {
                borderColor: hexToRgba(accent, 0.28),
                backgroundColor: hexToRgba(accent, 0.12),
                ["--tw-ring-color"]: hexToRgba(accent, 0.3),
              };

              const iconWrapperStyle: CSSProperties = {
                borderColor: hexToRgba(accent, 0.4),
                backgroundColor: hexToRgba(accent, 0.2),
                color: accent,
              };

              const badgeStyle: CSSProperties = {
                borderColor: hexToRgba(accent, 0.35),
                backgroundColor: hexToRgba(accent, 0.15),
                color: accent,
              };

              return (
                <button
                  key={workout.id}
                  type="button"
                  onClick={() =>
                    setExpanded((previous) => ({ ...previous, [workout.id]: !previous[workout.id] }))
                  }
                  className={cn(
                    "flex w-full flex-col gap-3 rounded-2xl border px-4 py-3 text-left transition",
                    "hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                  )}
                  style={buttonStyle}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="flex items-start gap-3 sm:min-w-0">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full border"
                          style={iconWrapperStyle}
                        >
                          {isStrength ? (
                            <Dumbbell className="h-4 w-4" />
                          ) : (
                            <Activity className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h5 className="text-sm font-semibold" style={{ color: PROGRESS_THEME.textPrimary }}>
                              {workout.name}
                            </h5>
                            {"personalRecords" in workout && workout.personalRecords ? (
                              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium" style={badgeStyle}>
                                <Trophy className="h-3 w-3" />
                                {workout.personalRecords}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs" style={{ color: PROGRESS_THEME.textMuted }}>
                            {workout.time}
                          </p>
                        </div>
                      </div>

                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 self-start transition-transform",
                          isOpen && "rotate-180",
                        )}
                        style={{ color: PROGRESS_THEME.textMuted }}
                      />
                    </div>

                    <div
                      className={cn(
                        "grid grid-cols-2 gap-3 rounded-2xl border px-3 py-2",
                        "sm:grid-cols-4",
                      )}
                      style={{ borderColor: hexToRgba(accent, 0.24), backgroundColor: hexToRgba(accent, 0.08) }}
                    >
                      <Metric icon={Timer} value={workout.duration} label="Duration" align="center" />
                      <Metric icon={Target} value={metricTwo ?? "—"} label={labelTwo} align="center" />
                      <Metric icon={BarChart3} value={metricThree ?? "—"} label={labelThree} align="center" />
                      <Metric icon={Zap} value={workout.calories} label="Calories" iconColor={accent} align="center" />
                    </div>
                  </div>

                  <div
                    className={cn(
                      "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="rounded-2xl border px-4 py-3 text-sm" style={DETAIL_CARD_STYLE}>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <Detail label="Duration" value={workout.duration} />
                          <Detail label={labelTwo} value={metricTwo ?? "—"} />
                          <Detail label={labelThree} value={metricThree ?? "—"} />
                          <Detail label="Calories" value={workout.calories} />
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

type DetailProps = {
  label: string;
  value: ReactNode;
};

function Detail({ label, value }: DetailProps) {
  return (
    <p>
      <span className="font-medium" style={{ color: PROGRESS_THEME.textSubtle }}>
        {label}:
      </span>{" "}
      <span className="font-semibold" style={{ color: PROGRESS_THEME.textPrimary }}>
        {value}
      </span>
    </p>
  );
}

type MetricAlignment = "start" | "center" | "end";

type MetricProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
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
      className={cn(
        "flex flex-col gap-1",
        METRIC_ALIGN_CLASSES[align],
      )}
    >
      <Icon className="h-4 w-4" style={{ color: iconColor ?? PROGRESS_THEME.textMuted }} />
      <span className="text-sm font-semibold" style={{ color: PROGRESS_THEME.textPrimary }}>
        {value}
      </span>
      <span className="text-[11px] uppercase tracking-[0.08em]" style={{ color: PROGRESS_THEME.textMuted }}>
        {label}
      </span>
    </div>
  );
}

export function CardioWeekHistory() {
  const [dayKey, setDayKey] = useState<DayKey>("today");

  return <DailyWorkoutCard dayKey={dayKey} setDayKey={setDayKey} />;
}

export default CardioWeekHistory;
