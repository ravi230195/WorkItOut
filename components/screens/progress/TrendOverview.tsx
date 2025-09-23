import type { TimeRange } from "@/types/progress";
import type { TrendPoint } from "../../progress/Progress.types";
import { PROGRESS_THEME } from "./util";
import { TrendChart } from "./TrendChart";

interface TrendOverviewProps {
  domainLabel: string;
  rangeLabel: string;
  title: string;
  chipLabel: string;
  series: TrendPoint[];
  color: string;
  range: TimeRange;
  formatter: (value: number) => string;
}

export function TrendOverview({
  domainLabel,
  rangeLabel,
  title,
  chipLabel,
  series,
  color,
  range,
  formatter,
}: TrendOverviewProps) {
  return (
    <section className="rounded-3xl border bg-white p-5" style={{ borderColor: PROGRESS_THEME.cardBorder, boxShadow: PROGRESS_THEME.cardShadow }}>
      <header className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: PROGRESS_THEME.textMuted }}>
            {domainLabel}
          </div>
          <h2 className="text-xl font-semibold text-[#111111]">{title}</h2>
          <p className="text-xs font-medium" style={{ color: PROGRESS_THEME.textMuted }}>
            {rangeLabel} overview
          </p>
        </div>
        <div className="rounded-full border bg-[#F7F6F3] px-3 py-1 text-xs font-semibold" style={{ borderColor: PROGRESS_THEME.borderSubtle, color: PROGRESS_THEME.textSubtle }}>
          {chipLabel}
        </div>
      </header>
      <TrendChart data={series} color={color} range={range} formatter={formatter} />
    </section>
  );
}
