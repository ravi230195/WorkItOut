import { useEffect, useMemo, useState } from "react";

import AppScreen from "../layouts/AppScreen";
import type { TimeRange } from "@/types/progress";
import type { HistoryEntry, ProgressDomain } from "../progress/Progress.types";
import { PROGRESS_MOCK_SNAPSHOTS } from "./progress/MockData";
import { TrendOverview } from "./progress/TrendOverview";
import { KPI_COLORS, getEncouragement, getKpiFormatter } from "./progress/util";
import { HistorySection } from "./progress/HistorySection";
import { KpiTiles } from "./progress/KpiTiles";
import { useAuth } from "../AuthContext";

import { RoutineAccess } from "../../hooks/useAppNavigation";
import { Stack } from "../layouts";
import Spacer from "../layouts/Spacer";
import { DomainSelector } from "./progress/DomainSelector";
import { RangeSelector } from "./progress/RangeSelector";
import { DOMAIN_LABELS, DOMAIN_OPTIONS, RANGE_LABELS, RANGE_OPTIONS } from "./progress/constants";
import { useCardioProgressSnapshot, useStrengthHistory, useUserFirstName } from "./progress/hooks";

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
  const shouldShowHistory =
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

