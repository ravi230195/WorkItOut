import type { TimeRange } from "../../progress/Progress.types";
import type { TrendPoint } from "../../progress/Progress.types";
import { PROGRESS_THEME } from "./util";
import { TrendChart } from "./TrendChart";

interface TrendOverviewProps {
  domainLabel: string;
  rangeLabel: string;
  title: string;
  series: TrendPoint[];
  color: string;
  range: TimeRange;
  formatter: (value: number) => string;
}

export function TrendOverview({
  domainLabel,
  rangeLabel,
  title,
  series,
  color,
  range,
  formatter,
}: TrendOverviewProps) {
  return (
    <section
      className="rounded-3xl border bg-white p-5"
      style={{
        borderColor: PROGRESS_THEME.cardBorder,
        boxShadow: PROGRESS_THEME.cardShadow,
      }}
    >
      <header className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: PROGRESS_THEME.textMuted }}>
          {domainLabel}
        </div>
        <h2 className="text-xl font-semibold text-[#111111]">{title}</h2>
      </header>
      <TrendChart data={series} color={color} range={range} formatter={formatter} />
    </section>
  );
}
