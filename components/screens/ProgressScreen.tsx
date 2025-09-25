import { useEffect, useMemo, useState } from "react";

import AppScreen from "../layouts/AppScreen";
import type { TimeRange } from "../../src/types/progress";
import type { CardioHistoryEntry, HistoryEntry, ProgressDomain } from "../progress/Progress.types";
import { CARDIO_WEEK_HISTORY_MOCK, PROGRESS_MOCK_SNAPSHOTS } from "./progress/MockData";
import { TrendOverview } from "./progress/TrendOverview";
import { KPI_COLORS, getEncouragement, getKpiFormatter } from "./progress/util";
import { HistorySection } from "./progress/HistorySection";
import { CardioWeekHistory, type CardioWeekHistoryDay } from "./progress/CardioWeekHistory";
import { KpiTiles } from "./progress/KpiTiles";
import { useAuth } from "../AuthContext";
import { logger } from "../../utils/logging";

import { RoutineAccess } from "../../hooks/useAppNavigation";
import { Stack } from "../layouts";
import Spacer from "../layouts/Spacer";
import { DomainSelector } from "./progress/DomainSelector";
import { RangeSelector } from "./progress/RangeSelector";
import { DOMAIN_LABELS, DOMAIN_OPTIONS, RANGE_LABELS, RANGE_OPTIONS } from "./progress/constants";
import { useCardioProgressSnapshot, useStrengthHistory, useUserFirstName } from "./progress/hooks";

const USE_CARDIO_WEEK_HISTORY_MOCK = true;

type AggregatedTotals = {
  calories?: number;
  distance?: number;
  steps?: number;
  time?: number;
};

interface ProgressScreenProps {
  bottomBar?: React.ReactNode;
  onSelectRoutine?: (routineId: number, routineName: string, access?: RoutineAccess) => void;
}

export function ProgressScreen({ bottomBar, onSelectRoutine }: ProgressScreenProps) {
  const [domain, setDomain] = useState<ProgressDomain>("cardio");
  const [range, setRange] = useState<TimeRange>("week");
  const [selectedKpiIndex, setSelectedKpiIndex] = useState(0);
  const { userToken } = useAuth();
  const firstName = useUserFirstName(userToken);
  const { history: strengthHistory, loading: strengthHistoryLoading } = useStrengthHistory(userToken);
  const { snapshot: cardioSnapshot, loading: cardioLoading } = useCardioProgressSnapshot(range);

  const baseSnapshot = useMemo(() => {
    if (domain === "cardio" && cardioSnapshot) {
      return cardioSnapshot;
    }
    return PROGRESS_MOCK_SNAPSHOTS[domain][range];
  }, [cardioSnapshot, domain, range]);
  const snapshot = useMemo(() => {
    if (domain === "strength" && strengthHistory.length > 0) {
      return { ...baseSnapshot, history: strengthHistory };
    }
    return baseSnapshot;
  }, [baseSnapshot, domain, strengthHistory]);
  const valueFormatter = useMemo(() => getKpiFormatter(domain, selectedKpiIndex), [domain, selectedKpiIndex]);
  const trendSeries = snapshot.series[selectedKpiIndex] ?? snapshot.series[0] ?? [];
  const shouldShowCardioWeekHistory = domain === "cardio" && range === "week";
  const cardioWeekHistoryDays = useMemo<CardioWeekHistoryDay[]>(() => {
    if (!shouldShowCardioWeekHistory) {
      return [];
    }

    if (USE_CARDIO_WEEK_HISTORY_MOCK) {
      return CARDIO_WEEK_HISTORY_MOCK.days;
    }

    return buildCardioWeekHistory(snapshot.history);
  }, [shouldShowCardioWeekHistory, snapshot.history]);
  const shouldShowHistory =
    !shouldShowCardioWeekHistory &&
    domain !== "measurement" &&
    (snapshot.history.length > 0 ||
      (domain === "strength" && strengthHistoryLoading) ||
      (domain === "cardio" && cardioLoading));
  const showHistoryLoading =
    (domain === "strength" && strengthHistoryLoading && snapshot.history.length === 0) ||
    (domain === "cardio" && cardioLoading && snapshot.history.length === 0);

  useEffect(() => {
    setSelectedKpiIndex(0);
  }, [domain, range]);

  // ADD: Log when cardio domain is selected and data is requested
  useEffect(() => {
    if (domain === "cardio") {
      logger.debug("[cardio] ProgressScreen: Cardio domain selected", { 
        range, 
        selectedKpiIndex,
        hasCardioSnapshot: !!cardioSnapshot,
        cardioLoading 
      });
    }
  }, [domain, range, selectedKpiIndex, cardioSnapshot, cardioLoading]);

  // ADD: Log when snapshot data changes
  useEffect(() => {
    if (domain === "cardio" && cardioSnapshot) {
      logger.debug("[cardio] ProgressScreen: Cardio snapshot received", {
        range,
        kpiCount: cardioSnapshot.kpis?.length || 0,
        seriesCount: cardioSnapshot.series?.length || 0,
        historyCount: cardioSnapshot.history?.length || 0,
        kpis: cardioSnapshot.kpis?.map(kpi => ({
          title: kpi.title,
          value: kpi.value,
          currentNumeric: kpi.currentNumeric,
          previous: kpi.previous
        }))
      });
    }
  }, [domain, cardioSnapshot]);

  const trendColor = KPI_COLORS[selectedKpiIndex % KPI_COLORS.length];

  const encouragement = getEncouragement(firstName);

  const domainLabel = DOMAIN_LABELS[domain] ?? "Select";
  const rangeLabel = RANGE_LABELS[range] ?? "";
  const trendTitle = snapshot.kpis[selectedKpiIndex]?.title ?? snapshot.kpis[0]?.title ?? "";

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
        <DomainSelector domain={domain} onChange={setDomain} encouragement={encouragement} options={DOMAIN_OPTIONS} />
        <RangeSelector range={range} onChange={setRange} options={RANGE_OPTIONS} />
        <TrendOverview
          domainLabel={domainLabel}
          rangeLabel={rangeLabel}
          title={trendTitle}
          chipLabel={domainLabel}
          series={trendSeries}
          color={trendColor}
          range={range}
          formatter={valueFormatter}
        />
        <KpiTiles domain={domain} kpis={snapshot.kpis} selectedIndex={selectedKpiIndex} onSelect={setSelectedKpiIndex} />
        <Spacer y="sm" />
        {shouldShowCardioWeekHistory ? (
          <CardioWeekHistory days={cardioWeekHistoryDays} />
        ) : shouldShowHistory ? (
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

function buildCardioWeekHistory(entries: HistoryEntry[]): CardioWeekHistoryDay[] {
  const cardioEntries = entries.filter((entry): entry is CardioHistoryEntry => entry.type === "cardio");
  if (cardioEntries.length === 0) {
    return [];
  }

  const grouped = cardioEntries.reduce<Map<string, { date: Date; workouts: CardioWeekHistoryDay["workouts"]; totals: AggregatedTotals; label?: string }>>(
    (acc, entry) => {
      const date = new Date(entry.date);
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
      const workout: CardioWeekHistoryDay["workouts"][number] = {
        id: entry.id,
        type: entry.type,
        name: entry.activity,
        duration: entry.duration,
        distance: entry.distance,
        calories: entry.calories,
        time: entry.time,
        steps: entry.steps,
      };
      group.workouts.push(workout);

      const calories = parseNumeric(entry.calories);
      if (typeof calories === "number") {
        group.totals.calories = (group.totals.calories ?? 0) + calories;
      }

      const distance = parseNumeric(entry.distance);
      if (typeof distance === "number") {
        group.totals.distance = (group.totals.distance ?? 0) + distance;
      }

      if (typeof entry.steps === "number") {
        group.totals.steps = (group.totals.steps ?? 0) + entry.steps;
      }

      const minutes = parseDurationMinutes(entry.duration);
      if (typeof minutes === "number") {
        group.totals.time = (group.totals.time ?? 0) + minutes;
      }

      return acc;
    },
    new Map(),
  );

  return Array.from(grouped.values())
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
}

function parseNumeric(value?: string) {
  if (!value) return undefined;
  const match = value.match(/[\d,.]+/);
  if (!match) return undefined;
  const normalized = match[0].replace(/,/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseDurationMinutes(value?: string) {
  if (!value) return undefined;

  if (/^\d{1,2}:\d{2}:\d{2}$/.test(value)) {
    const [hours, minutes, seconds] = value.split(":").map(Number);
    if ([hours, minutes, seconds].some((part) => Number.isNaN(part))) {
      return undefined;
    }
    return hours * 60 + minutes + seconds / 60;
  }

  const hourMatch = value.match(/(\d+)\s*h/);
  const minuteMatch = value.match(/(\d+)\s*m/);
  const totalMinutes =
    (hourMatch ? Number.parseInt(hourMatch[1], 10) * 60 : 0) + (minuteMatch ? Number.parseInt(minuteMatch[1], 10) : 0);
  return Number.isNaN(totalMinutes) ? undefined : totalMinutes;
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

function getWeekdayLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 1).toUpperCase();
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

