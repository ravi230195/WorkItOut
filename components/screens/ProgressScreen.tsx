import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import AppScreen from "../layouts/AppScreen";
import type { TimeRange } from "../../src/types/progress";
import type { HistoryEntry, KpiDatum, ProgressDomain } from "../progress/Progress.types";
import { PROGRESS_MOCK_SNAPSHOTS } from "./progress/MockData";
import { TrendChart } from "./progress/TrendChart";
import {
  PROGRESS_THEME,
  KPI_COLORS,
  estimateRoutineDurationMinutes,
  calculateTotalWeight,
  formatDuration,
  formatWeight,
  getEncouragement,
  extractFirstName,
  getKpiFormatter,
} from "./progress/util";
import { HistorySection } from "./progress/HistorySection";
import { KpiTiles } from "./progress/KpiTiles";
import { useAuth } from "../AuthContext";

import { supabaseAPI, SAMPLE_ROUTINE_USER_ID } from "../../utils/supabase/supabase-api";
import { loadRoutineExercisesWithSets } from "../../utils/routineLoader";
import { RoutineAccess } from "../../hooks/useAppNavigation";
import { Stack } from "../layouts";
import Spacer from "../layouts/Spacer";

interface ProgressScreenProps {
  bottomBar?: React.ReactNode;
  onSelectRoutine?: (routineId: number, routineName: string, access?: RoutineAccess) => void;
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

const DOMAIN_BUTTON_STYLE: CSSProperties & { ["--tw-ring-color"]?: string } = {
  backgroundColor: "transparent",
  border: `1px solid ${PROGRESS_THEME.accentPrimary}`,
  boxShadow: PROGRESS_THEME.domainButtonShadow,
  color: PROGRESS_THEME.accentPrimary,
  ["--tw-ring-color"]: PROGRESS_THEME.accentPrimaryFocusRing,
};

const DOMAIN_MENU_STYLE: CSSProperties = {
  borderColor: PROGRESS_THEME.cardBorder,
  boxShadow: PROGRESS_THEME.cardShadow,
};

const RANGE_BUTTON_STYLE = (isActive: boolean): CSSProperties => ({
  backgroundColor: isActive ? PROGRESS_THEME.accentSecondary : "transparent",
  color: isActive ? "#ffffff" : PROGRESS_THEME.accentSecondary,
  border: `1px solid ${PROGRESS_THEME.accentSecondary}`,
  boxShadow: isActive ? PROGRESS_THEME.rangeButtonShadowActive : PROGRESS_THEME.rangeButtonShadow,
  transform: isActive ? "scale(1.05)" : "scale(1)",
  transition: "all 0.28s cubic-bezier(0.22, 0.61, 0.36, 1)",
  minWidth: 86,
});

const DOMAIN_OPTION_HOVER_CLASS = "hover:bg-[rgba(226,125,96,0.08)]" as const;

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
  const shouldShowHistory =
    domain !== "measurement" && (snapshot.history.length > 0 || (domain === "strength" && strengthHistoryLoading));
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
            className="flex w-full items-center justify-between rounded-2xl px-5 py-3 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={DOMAIN_BUTTON_STYLE}
          >
            <span>{DOMAIN_OPTIONS.find((opt) => opt.value === domain)?.label ?? "Select"}</span>
            <span className="ml-3 text-base" aria-hidden>
              {domainMenuOpen ? "▲" : "▼"}
            </span>
          </button>
          {domainMenuOpen ? (
            <ul
              role="listbox"
              className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border bg-white"
              style={DOMAIN_MENU_STYLE}
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
                      className={`flex w-full items-center justify-between px-5 py-3 text-sm font-semibold transition focus:outline-none ${
                        isActive ? "" : DOMAIN_OPTION_HOVER_CLASS
                      }`}
                      style={{
                        backgroundColor: isActive ? PROGRESS_THEME.accentPrimarySurface : "transparent",
                        color: isActive ? PROGRESS_THEME.accentPrimary : PROGRESS_THEME.textMuted,
                      }}
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
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setRange(option.value)}
                aria-pressed={isActive}
                className="rounded-full px-4 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[rgba(30,36,50,0.2)] sm:text-sm"
                style={RANGE_BUTTON_STYLE(isActive)}
              >
                {option.label}
              </button>
            );
          })}
        </section>
        <section
          className="rounded-3xl border bg-white p-5"
          style={{ borderColor: PROGRESS_THEME.cardBorder, boxShadow: PROGRESS_THEME.cardShadow }}
        >
          <header className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div
                className="text-xs font-semibold uppercase tracking-[0.14em]"
                style={{ color: PROGRESS_THEME.textMuted }}
              >
                {DOMAIN_OPTIONS.find((opt) => opt.value === domain)?.label ?? "Select"}
              </div>
              <h2 className="text-xl font-semibold text-[#111111]">
                {snapshot.kpis[selectedKpiIndex]?.title ?? snapshot.kpis[0]?.title ?? ""}
              </h2>
              <p className="text-xs font-medium" style={{ color: PROGRESS_THEME.textMuted }}>
                {RANGE_OPTIONS.find((opt) => opt.value === range)?.label ?? ""} overview
              </p>
            </div>
            <div
              className="rounded-full border bg-[#F7F6F3] px-3 py-1 text-xs font-semibold"
              style={{ borderColor: PROGRESS_THEME.borderSubtle, color: PROGRESS_THEME.textSubtle }}
            >
              {DOMAIN_OPTIONS.find((opt) => opt.value === domain)?.label ?? ""}
            </div>
          </header>
          <TrendChart data={trendSeries} color={trendColor} range={range} formatter={valueFormatter} />
        </section>
        <KpiTiles domain={domain} kpis={snapshot.kpis} selectedIndex={selectedKpiIndex} onSelect={setSelectedKpiIndex} />
        <Spacer y="sm" />
        {shouldShowHistory ? (
          <HistorySection
            entries={snapshot.history}
            showLoading={showHistoryLoading}
            onSelectStrength={domain === "strength" ? handleStrengthHistorySelect : undefined}
          />
        ) : null}
      </Stack>
    </AppScreen>
  );
}

export default ProgressScreen;

