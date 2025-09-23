import { useEffect, useMemo, useRef, useState } from "react";
import * as shape from "d3-shape";
import { scaleLinear, scalePoint } from "d3-scale";

import AppScreen from "../layouts/AppScreen";
import type { TimeRange } from "../../src/types/progress";
import type { HistoryEntry, KpiDatum, ProgressDomain, TrendPoint } from "../progress/Progress.types";
import { PROGRESS_MOCK_SNAPSHOTS } from "../progress/progressScreen.mockData";
import { useAuth } from "../AuthContext";

import { supabaseAPI, SAMPLE_ROUTINE_USER_ID } from "../../utils/supabase/supabase-api";
import type { Profile } from "../../utils/supabase/supabase-types";
import { loadRoutineExercisesWithSets, type LoadedExercise } from "../../utils/routineLoader";
import { RoutineAccess } from "../../hooks/useAppNavigation";
import { Stack } from "../layouts";
import Spacer from "../layouts/Spacer";
import ProgressDetailSection from "../../src/components/progress/ProgressDetailSection";

interface ProgressScreenProps {
  bottomBar?: React.ReactNode;
  onSelectRoutine?: (routineId: number, routineName: string, access?: RoutineAccess) => void;
}

interface TrendChartProps {
  data: TrendPoint[];
  color: string;
  range: TimeRange;
  formatter: (value: number) => string;
}

const DOMAIN_OPTIONS: Array<{ value: ProgressDomain; label: string }> = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "measurement", label: "Measurement" },
];

const RANGE_OPTIONS: Array<{ value: TimeRange; label: string }> = [
  { value: "week", label: "Week" },
  { value: "threeMonths", label: "3 Month" },
  { value: "sixMonths", label: "6 Month" },
];

const KPI_COLORS = ["#7FD1AE", "#FFB38A", "#FFE08A", "#8FC5FF"] as const;
const CHART_HEIGHT = 240;

export function ProgressScreen({ bottomBar, onSelectRoutine }: ProgressScreenProps) {
  const [domain, setDomain] = useState<ProgressDomain>("cardio");
  const [range, setRange] = useState<TimeRange>("week");
  const [selectedKpiIndex, setSelectedKpiIndex] = useState(0);
  const [domainMenuOpen, setDomainMenuOpen] = useState(false);
  const domainMenuRef = useRef<HTMLDivElement | null>(null);
  const { userToken } = useAuth();
  const [firstName, setFirstName] = useState<string | null>(null);
  const [strengthHistory, setStrengthHistory] = useState<HistoryEntry[]>([]);
  const [strengthHistoryLoading, setStrengthHistoryLoading] = useState(false);

  const baseSnapshot = useMemo(() => PROGRESS_MOCK_SNAPSHOTS[domain][range], [domain, range]);
  const snapshot = useMemo(() => {
    if (domain === "strength" && strengthHistory.length > 0) {
      return { ...baseSnapshot, history: strengthHistory };
    }
    return baseSnapshot;
  }, [baseSnapshot, domain, strengthHistory]);
  const valueFormatter = useMemo(() => getKpiFormatter(domain, selectedKpiIndex), [domain, selectedKpiIndex]);
  const trendSeries = snapshot.series[selectedKpiIndex] ?? snapshot.series[0] ?? [];
  const isCardioDomain = domain === "cardio";
  const shouldShowHistory =
    !isCardioDomain &&
    domain !== "measurement" &&
    (snapshot.history.length > 0 || (domain === "strength" && strengthHistoryLoading));
  const showHistoryLoading = domain === "strength" && strengthHistoryLoading && snapshot.history.length === 0;

  useEffect(() => {
    setSelectedKpiIndex(0);
  }, [domain, range]);

  useEffect(() => {
    if (!domainMenuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (domainMenuRef.current && !domainMenuRef.current.contains(event.target as Node)) {
        setDomainMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [domainMenuOpen]);

  useEffect(() => {
    let cancelled = false;
    if (!userToken) {
      setFirstName(null);
      setStrengthHistory([]);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const profile = await supabaseAPI.getMyProfile();
        if (!cancelled) {
          setFirstName(extractFirstName(profile));
        }
      } catch (error) {
        if (!cancelled) {
          setFirstName(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userToken]);

  useEffect(() => {
    let cancelled = false;
    setStrengthHistoryLoading(true);
    (async () => {
      try {
        const routines = await supabaseAPI.getSampleRoutines();
        const entries: HistoryEntry[] = [];
        for (const routine of routines.slice(0, 5)) {
          if (cancelled) break;
          try {
            const exercises = await loadRoutineExercisesWithSets(routine.routine_template_id, {
              userIdOverride: SAMPLE_ROUTINE_USER_ID,
            });
            const durationMinutes = estimateRoutineDurationMinutes(exercises.length);
            const totalWeightKg = calculateTotalWeight(exercises);
            entries.push({
              type: "strength",
              id: String(routine.routine_template_id),
              routineTemplateId: routine.routine_template_id,
              name: routine.name,
              date: routine.created_at ?? new Date().toISOString(),
              duration: formatDuration(durationMinutes),
              totalWeight: formatWeight(totalWeightKg),
            });
          } catch (error) {
            // Ignore routines that fail to load
          }
        }

        if (!cancelled) {
          entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setStrengthHistory(entries);
        }
      } catch (error) {
        if (!cancelled) {
          setStrengthHistory([]);
        }
      } finally {
        if (!cancelled) {
          setStrengthHistoryLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userToken]);

  const trendColor = KPI_COLORS[selectedKpiIndex % KPI_COLORS.length];

  const encouragement = getEncouragement(firstName);

  const handleStrengthHistorySelect = (entry: HistoryEntry) => {
    if (entry.type !== "strength") return;
    if (!onSelectRoutine) return;
    const { routineTemplateId } = entry;
    if (typeof routineTemplateId !== "number") return;
    onSelectRoutine(routineTemplateId, entry.name, RoutineAccess.ReadOnly);
  };

  return (
    <AppScreen
      header={null}
      bottomBar={bottomBar}
      bottomBarSticky
      showHeaderBorder={false}
      showBottomBarBorder={false}
      maxContent="responsive"
      contentClassName=""
    >
      <Stack gap="fluid">
        <Spacer y="sm" />
        <section className="relative" ref={domainMenuRef}>
          <h1 className="mb-3 text-2xl font-semibold tracking-tight text-[#111111]">{encouragement}</h1>
          <button
            type="button"
            onClick={() => setDomainMenuOpen((open) => !open)}
            aria-haspopup="listbox"
            aria-expanded={domainMenuOpen}
            className="flex w-full items-center justify-between rounded-2xl px-5 py-3 text-sm font-semibold text-[#E27D60] shadow-[0_12px_24px_-16px_rgba(30,36,50,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{
              backgroundColor: "transparent",
              border: "1px solid #E27D60",
            }}
          >
            <span>{DOMAIN_OPTIONS.find((opt) => opt.value === domain)?.label ?? "Select"}</span>
            <span className="ml-3 text-base" aria-hidden>
              {domainMenuOpen ? "▲" : "▼"}
            </span>
          </button>
          {domainMenuOpen ? (
            <ul
              role="listbox"
              className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-[rgba(30,36,50,0.08)] bg-white shadow-[0_16px_32px_-18px_rgba(30,36,50,0.35)]"
            >
              {DOMAIN_OPTIONS.map((option) => {
                const isActive = option.value === domain;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => {
                        setDomain(option.value);
                        setDomainMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-5 py-3 text-sm font-semibold transition ${
                        isActive
                          ? "bg-[rgba(226,125,96,0.15)] text-[#E27D60]"
                          : "text-[rgba(34,49,63,0.75)] hover:bg-[rgba(226,125,96,0.08)]"
                      }`}
                    >
                      <span>{option.label}</span>
                      {isActive ? <span aria-hidden>✓</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
        <section className="flex flex-wrap items-center justify-center gap-2 px-1 py-1">
          {RANGE_OPTIONS.map((option) => {
            const isActive = option.value === range;
            const accent = "#68A691";
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setRange(option.value)}
                aria-pressed={isActive}
                className="rounded-full px-4 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[rgba(30,36,50,0.2)] sm:text-sm"
                style={{
                  backgroundColor: isActive ? accent : "transparent",
                  color: isActive ? "#ffffff" : accent,
                  border: `1px solid ${accent}`,
                  boxShadow: isActive ? "0 12px 22px -16px rgba(30,36,50,0.35)" : "0 2px 6px -4px rgba(30,36,50,0.18)",
                  transform: isActive ? "scale(1.05)" : "scale(1)",
                  transition: "all 0.28s cubic-bezier(0.22, 0.61, 0.36, 1)",
                  minWidth: 86,
                }}
              >
                {option.label}
              </button>
            );
          })}
        </section>
        {isCardioDomain ? (
          <ProgressDetailSection category="cardio" timeRange={range} cardioFocus="all" />
        ) : (
          <>
            <section className="rounded-3xl border border-[rgba(30,36,50,0.08)] bg-white p-5 shadow-[0_18px_36px_-20px_rgba(30,36,50,0.4)]">
              <header className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgba(34,49,63,0.65)]">{DOMAIN_OPTIONS.find((opt) => opt.value === domain)?.label ?? "Select"}</div>
                  <h2 className="text-xl font-semibold text-[#111111]">
                    {snapshot.kpis[selectedKpiIndex]?.title ?? snapshot.kpis[0]?.title ?? ""}
                  </h2>
                  <p className="text-xs font-medium text-[rgba(34,49,63,0.65)]">
                    {RANGE_OPTIONS.find((opt) => opt.value === range)?.label ?? ""} overview
                  </p>
                </div>
                <div className="rounded-full border border-[rgba(30,36,50,0.12)] bg-[#F7F6F3] px-3 py-1 text-xs font-semibold text-[rgba(34,49,63,0.7)]">
                  {DOMAIN_OPTIONS.find((opt) => opt.value === domain)?.label ?? ""}
                </div>
              </header>
              <TrendChart data={trendSeries} color={trendColor} range={range} formatter={valueFormatter} />
            </section>
            <section className="mt-8 grid grid-cols-2 gap-4">
              {snapshot.kpis.map((kpi, index) => {
                const isActive = index === selectedKpiIndex;
                const tileColor = KPI_COLORS[index] ?? KPI_COLORS[0];
                const formatter = getKpiFormatter(domain, index);
                const previous = kpi.previous ?? null;
                const currentNumeric = kpi.currentNumeric ?? null;
                const trend = determineTrend(currentNumeric, previous);
                const displayUnit = kpi.unit && kpi.unit.toLowerCase() !== "sessions" ? kpi.unit : undefined;
                return (
                  <button
                    key={`${domain}-${range}-${kpi.title}`}
                    type="button"
                    onClick={() => setSelectedKpiIndex(index)}
                    className={`rounded-2xl px-5 py-4 text-left shadow-[0_16px_28px_-18px_rgba(30,36,50,0.35)] transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      isActive ? "ring-0" : "ring-0"
                    }`}
                    style={{
                      backgroundColor: isActive ? tileColor : "#FFFFFF",
                      border: isActive ? "none" : "1px solid rgba(30,36,50,0.08)",
                    }}
                    aria-pressed={isActive}
                    aria-label={`${kpi.title} ${kpi.value}`}
                  >
                    <header
                      className={`text-xs font-semibold uppercase tracking-wide ${
                        isActive ? "text-[#22313F]" : "text-[rgba(34,49,63,0.65)]"
                      }`}
                    >
                      {displayUnit ? `${kpi.title} (${displayUnit})` : kpi.title}
                    </header>
                    <div className={`mt-3 text-3xl font-semibold ${isActive ? "text-[#111111]" : "text-[#111111]"}`}>
                      {kpi.value}
                    </div>
                    {previous !== null && currentNumeric !== null ? (
                      <p
                        className={`mt-2 flex items-center gap-1 text-xs font-medium ${
                          isActive ? trend.colorActive : trend.color
                        }`}
                      >
                        <span>{trend.icon}</span>
                        <span>
                          {trend.text} {formatter(Math.abs(trend.delta))}
                        </span>
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </section>
            <Spacer y="sm" />
            {shouldShowHistory ? (
              <section className="rounded-3xl border border-[rgba(30,36,50,0.08)] bg-white p-5 shadow-[0_18px_36px_-20px_rgba(30,36,50,0.4)]">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#111111]">History</h2>
                  <span className="text-xs font-medium text-[rgba(34,49,63,0.6)]">Latest to oldest</span>
                </div>
                {showHistoryLoading ? (
                  <div className="mt-4 text-sm font-medium text-[rgba(34,49,63,0.65)]">Loading sample routines...</div>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {[...snapshot.history]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((entry) => {
                        if (entry.type === "strength") {
                          const content = (
                            <>
                              <div>
                                <p className="text-sm font-semibold text-[#111111]">{entry.name}</p>
                                <p className="text-xs text-[rgba(34,49,63,0.65)]">
                                  {formatHistoryDate(entry.date)} · {entry.duration}
                                </p>
                              </div>
                              <p className="text-sm font-semibold text-[#111111]">{entry.totalWeight}</p>
                            </>
                          );

                          const canNavigate = typeof entry.routineTemplateId === "number" && !!onSelectRoutine;

                          return (
                            <li key={entry.id}>
                              {canNavigate ? (
                                <button
                                  type="button"
                                  onClick={() => handleStrengthHistorySelect(entry)}
                                  className="flex w-full items-center justify-between rounded-2xl bg-[#F8F6F3] px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[rgba(226,125,96,0.35)]"
                                >
                                  {content}
                                </button>
                              ) : (
                                <div className="flex items-center justify-between rounded-2xl bg-[#F8F6F3] px-4 py-3">
                                  {content}
                                </div>
                              )}
                            </li>
                          );
                        }
                        return (
                          <li
                            key={entry.id}
                            className="flex items-center justify-between rounded-2xl bg-[#F8F6F3] px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-semibold text-[#111111]">{normalizeActivity(entry.activity)}</p>
                              <p className="text-xs text-[rgba(34,49,63,0.65)]">
                                {formatHistoryDate(entry.date)} · {entry.duration}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-[#111111]">{entry.distance}</p>
                              {entry.calories ? (
                                <p className="text-xs text-[rgba(34,49,63,0.65)]">{entry.calories}</p>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </section>
            ) : null}
          </>
        )}
      </Stack>
    </AppScreen>
  );
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

function formatHistoryDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function estimateRoutineDurationMinutes(exerciseCount: number) {
  if (!Number.isFinite(exerciseCount) || exerciseCount <= 0) return 30;
  return exerciseCount * 10;
}

function calculateTotalWeight(exercises: LoadedExercise[]) {
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

function formatDuration(minutes: number) {
  const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : 0;
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  if (hours > 0) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  return `${Math.max(remainingMinutes, 1)} min`;
}

function formatWeight(weightKg: number) {
  const safeWeight = Number.isFinite(weightKg) && weightKg > 0 ? weightKg : 0;
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Math.round(safeWeight))} kg`;
}

function formatDayLabel(range: TimeRange, iso: string, index: number, total: number) {
  const date = new Date(iso);
  if (range === "week") {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }

  if (range === "threeMonths") {
    const month = date.toLocaleDateString(undefined, { month: "short" });
    const weekInMonth = getWeekOfMonth(date);
    return `${month} W${weekInMonth}`;
  }

  // six months
  return date.toLocaleDateString(undefined, { month: "short" });
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

function getWeekOfMonth(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  return Math.floor((date.getDate() + offset - 1) / 7) + 1;
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

const TREND_ICONS = {
  up: "▲",
  down: "▼",
  flat: "=",
} as const;

const integerFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const decimalOneFormatter = new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const decimalTwoFormatter = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

function getKpiFormatter(domain: ProgressDomain, index: number): (value: number) => string {
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

function determineTrend(currentValue: number | null, previousValue: number | null) {
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

const TrendChart: React.FC<TrendChartProps> = ({ data, color, range, formatter }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const gradientId = useMemo(() => `grad-${Math.random().toString(36).slice(2, 10)}`, []);
  const inset = useMemo(() => {
    if (range === "threeMonths") {
      return { top: 16, bottom: 12, left: 28, right: 36 } as const;
    }
    if (range === "sixMonths") {
      return { top: 16, bottom: 12, left: 24, right: 28 } as const;
    }
    return { top: 16, bottom: 12, left: 18, right: 18 } as const;
  }, [range]);

  useEffect(() => {
    const current = containerRef.current;
    if (!current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(current);
    return () => observer.disconnect();
  }, []);

  const { areaPath, linePath, dots, ticks, yPosition, averageY, averageValue } = useMemo(() => {
    if (!width || data.length === 0) {
      return {
        areaPath: "",
        linePath: "",
        dots: [] as Array<{ cx: number; cy: number; label: string }>,
        ticks: [] as number[],
        yPosition: (value: number) => value,
        averageY: inset.top,
        averageValue: 0,
      };
    }

    const values = data.map((point) => point.y);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const paddedMax = maxValue === 0 ? 1 : maxValue * 1.12;
    const paddedMin = minValue === maxValue ? minValue * 0.9 : minValue * 0.9;

    const xScale = scalePoint<number>()
      .domain(data.map((_, index) => index))
      .range([inset.left, width - inset.right])
      .padding(data.length === 1 ? 1 : 0.4);

    const yScale = scaleLinear()
      .domain([paddedMin, paddedMax])
      .range([CHART_HEIGHT - inset.bottom, inset.top])
      .nice();

    const line = shape
      .line<TrendPoint>()
      .x((_, index) => xScale(index) ?? inset.left)
      .y((point) => yScale(point.y))
      .curve(shape.curveCatmullRom.alpha(0.5));

    const area = shape
      .area<TrendPoint>()
      .x((_, index) => xScale(index) ?? inset.left)
      .y0(CHART_HEIGHT - inset.bottom)
      .y1((point) => yScale(point.y))
      .curve(shape.curveCatmullRom.alpha(0.5));

    const dots = data.map((point, index) => ({
      cx: xScale(index) ?? inset.left,
      cy: yScale(point.y),
      label: point.x,
    }));

    const tickCount = range === "week" ? 3 : range === "threeMonths" ? 4 : 5;
    const ticks = generateTicks(yScale.domain() as [number, number], tickCount);
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;

    return {
      areaPath: area(data) ?? "",
      linePath: line(data) ?? "",
      dots,
      ticks,
      yPosition: (value: number) => yScale(value),
      averageY: yScale(average),
      averageValue: average,
    };
  }, [data, inset.bottom, inset.left, inset.right, inset.top, range, width]);

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{ height: CHART_HEIGHT }}
      onMouseLeave={() => setHoverIndex(null)}
    >
      {width > 0 && data.length > 0 ? (
        <svg
          key={`${range}-${data.length}-${color}`}
          width={width}
          height={CHART_HEIGHT}
          role="img"
          aria-label="Progress trend"
          className="transition-opacity duration-300"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {ticks.map((tick) => (
            <line
              key={`grid-${tick}`}
              x1={inset.left}
              x2={width - inset.right}
              y1={yPosition(tick)}
              y2={yPosition(tick)}
              stroke="rgba(30,36,50,0.08)"
              strokeDasharray="4 6"
            />
          ))}
          <line
            x1={inset.left}
            x2={width - inset.right}
            y1={averageY}
            y2={averageY}
            stroke={color}
            strokeOpacity={0.45}
            strokeWidth={2}
            strokeDasharray="4 6"
          />
          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
          {dots.map((dot, index) => (
            <g key={dot.label}>
              <circle
                cx={dot.cx}
                cy={dot.cy}
                r={3.5}
                stroke={color}
                strokeWidth={1}
                fill="#FFFFFF"
                style={{ cursor: "pointer" }}
                tabIndex={0}
                onMouseEnter={() => setHoverIndex(index)}
                onMouseLeave={() => setHoverIndex(null)}
                onFocus={() => setHoverIndex(index)}
                onBlur={() => setHoverIndex(null)}
              />
              <rect
                x={dot.cx - Math.max(20, (width - inset.left - inset.right) / Math.max(dots.length, 1) / 2)}
                width={Math.max(40, (width - inset.left - inset.right) / Math.max(dots.length, 1))}
                y={inset.top}
                height={CHART_HEIGHT - inset.top - inset.bottom}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(index)}
                onMouseLeave={() => setHoverIndex(null)}
              />
            </g>
          ))}
          {data.map((point, index) => {
            const label = formatDayLabel(range, point.x, index, data.length);
            if (!label) return null;
            const labelY = range === "threeMonths" ? CHART_HEIGHT - 20 : CHART_HEIGHT - 4;
            return (
              <text
                key={`x-${point.x}`}
                x={dots[index]?.cx ?? inset.left}
                y={labelY}
                textAnchor={range === "threeMonths" ? "end" : "middle"}
                fontSize={range === "threeMonths" ? 9 : 10}
                fill="rgba(30,36,50,0.4)"
                transform={
                  range === "threeMonths"
                    ? `rotate(-35, ${dots[index]?.cx ?? inset.left}, ${labelY})`
                    : undefined
                }
              >
                {label}
              </text>
            );
          })}
          {dots.length > 0 ? (
            <line
              x1={dots[dots.length - 1].cx}
              x2={dots[dots.length - 1].cx}
              y1={inset.top}
              y2={CHART_HEIGHT - inset.bottom}
              stroke="rgba(30,36,50,0.15)"
              strokeDasharray="2 4"
            />
          ) : null}
          {ticks.map((tick) => (
            <text
              key={`y-${tick}`}
              x={width - inset.right + 6}
              y={yPosition(tick)}
              textAnchor="start"
              fontSize={11}
              fill="rgba(30,36,50,0.25)"
            >
              {formatTickValue(tick)}
            </text>
          ))}
          {hoverIndex !== null && dots[hoverIndex] ? (
            <g transform={`translate(${dots[hoverIndex].cx},${dots[hoverIndex].cy})`} pointerEvents="none">
              <line
                x1={0}
                x2={0}
                y1={0}
                y2={CHART_HEIGHT - dots[hoverIndex].cy - inset.bottom}
                stroke={color}
                strokeOpacity={0.18}
                strokeDasharray="2 4"
              />
              <circle r={6} fill={color} fillOpacity={0.18} />
              <circle r={3.5} stroke={color} strokeWidth={1.5} fill="#FFFFFF" />
              <foreignObject x={-70} y={-60} width={140} height={52}>
                <div className="rounded-2xl border border-[rgba(30,36,50,0.08)] bg-white px-3 py-2 text-[10px] font-semibold text-[#111111] shadow-[0_12px_20px_-16px_rgba(30,36,50,0.45)]">
                  <p className="text-[11px] font-semibold text-[#111111]">
                    {formatter(data[hoverIndex].y)}
                  </p>
                  <p className="text-[10px] font-medium text-[rgba(30,36,50,0.55)]">
                    {new Date(data[hoverIndex].x).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </foreignObject>
            </g>
          ) : null}
          <text
            x={width - inset.right}
            y={averageY - 8}
            textAnchor="end"
            fontSize={10}
            fill="rgba(30,36,50,0.45)"
          >
            {`Avg ${formatter(averageValue)}`}
          </text>
        </svg>
      ) : (
        <div className="h-full w-full" />
      )}
    </div>
  );
};

export default ProgressScreen;

