import { useEffect, useMemo, useState } from "react";

import AppScreen from "../layouts/AppScreen";
import type { TimeRange } from "../../src/types/progress";
import type { ProgressDomain } from "../progress/Progress.types";
import { PROGRESS_MOCK_SNAPSHOTS } from "./progress/MockData";
import { TrendOverview } from "./progress/TrendOverview";
import { KPI_COLORS, getEncouragement, getKpiFormatter } from "./progress/util";
import { CardioWeekHistory, buildCardioWeekHistory, type CardioWeekHistoryDay } from "./progress/CardioWeekHistory";
import { KpiTiles } from "./progress/KpiTiles";
import { useAuth } from "../AuthContext";
import { logger } from "../../utils/logging";

import { Stack } from "../layouts";
import Spacer from "../layouts/Spacer";
import { DomainSelector } from "./progress/DomainSelector";
import { RangeSelector } from "./progress/RangeSelector";
import { DOMAIN_LABELS, DOMAIN_OPTIONS, RANGE_LABELS, RANGE_OPTIONS } from "./progress/constants";
import { useWorkoutsProgressSnapshot, useUserFirstName } from "./progress/hooks";

const USE_WORKOUTS_WEEK_MOCK = true;

interface ProgressScreenProps {
  bottomBar?: React.ReactNode;
}

export function ProgressScreen({ bottomBar }: ProgressScreenProps) {
  const [domain, setDomain] = useState<ProgressDomain>("workouts");
  const [range, setRange] = useState<TimeRange>("week");
  const [selectedKpiIndex, setSelectedKpiIndex] = useState(0);
  const { userToken } = useAuth();
  const firstName = useUserFirstName(userToken);
  const {
    snapshot: fetchedWorkoutsSnapshot,
    loading: fetchedWorkoutsLoading,
  } = useWorkoutsProgressSnapshot(range);

  const isUsingWorkoutsMockData = USE_WORKOUTS_WEEK_MOCK;

  const workoutsSnapshot = useMemo(() => {
    if (isUsingWorkoutsMockData) {
      return PROGRESS_MOCK_SNAPSHOTS.workouts[range];
    }
    return fetchedWorkoutsSnapshot;
  }, [fetchedWorkoutsSnapshot, isUsingWorkoutsMockData, range]);

  const workoutsLoading = isUsingWorkoutsMockData ? false : fetchedWorkoutsLoading;

  const baseSnapshot = useMemo(() => {
    if (domain === "workouts" && workoutsSnapshot) {
      return workoutsSnapshot;
    }
    return PROGRESS_MOCK_SNAPSHOTS[domain][range];
  }, [domain, range, workoutsSnapshot]);
  const snapshot = baseSnapshot;
  const valueFormatter = useMemo(() => getKpiFormatter(domain, selectedKpiIndex), [domain, selectedKpiIndex]);
  const trendSeries = snapshot.series[selectedKpiIndex] ?? snapshot.series[0] ?? [];
  const workoutsHistoryDays = useMemo<CardioWeekHistoryDay[]>(() => {
    if (domain !== "workouts") {
      return [];
    }

    return buildCardioWeekHistory(snapshot.history);
  }, [domain, snapshot.history]);

  useEffect(() => {
    setSelectedKpiIndex(0);
  }, [domain, range]);

  // ADD: Log when workouts domain is selected and data is requested
  useEffect(() => {
    if (domain === "workouts") {
      logger.debug("[workouts] ProgressScreen: Workouts domain selected", {
        range,
        selectedKpiIndex,
        hasWorkoutsSnapshot: !!workoutsSnapshot,
        workoutsLoading
      });
    }
  }, [domain, range, selectedKpiIndex, workoutsSnapshot, workoutsLoading]);

  // ADD: Log when snapshot data changes
  useEffect(() => {
    if (domain === "workouts" && workoutsSnapshot) {
      logger.debug("[workouts] ProgressScreen: Workouts snapshot received", {
        range,
        kpiCount: workoutsSnapshot.kpis?.length || 0,
        seriesCount: workoutsSnapshot.series?.length || 0,
        historyCount: workoutsSnapshot.history?.length || 0,
        kpis: workoutsSnapshot.kpis?.map(kpi => ({
          title: kpi.title,
          value: kpi.value,
          currentNumeric: kpi.currentNumeric,
          previous: kpi.previous
        }))
      });
    }
  }, [domain, workoutsSnapshot]);

  const trendColor = KPI_COLORS[selectedKpiIndex % KPI_COLORS.length];

  const encouragement = getEncouragement(firstName);

  const domainLabel = DOMAIN_LABELS[domain] ?? "Select";
  const rangeLabel = RANGE_LABELS[range] ?? "";
  const trendTitle = snapshot.kpis[selectedKpiIndex]?.title ?? snapshot.kpis[0]?.title ?? "";

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
        {domain === "workouts" ? <CardioWeekHistory days={workoutsHistoryDays} /> : null}
      </Stack>
    </AppScreen>
  );
}

export default ProgressScreen;

