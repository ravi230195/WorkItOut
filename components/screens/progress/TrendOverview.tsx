import { useMemo } from "react";

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

function toRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    return hex;
  }
  const bigint = Number.parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
  const chipStyles = useMemo(
    () => ({
      backgroundColor: toRgba(color, 0.14),
      borderColor: toRgba(color, 0.28),
      color,
    }),
    [color],
  );

  return (
    <section
      className="rounded-3xl border bg-white p-5"
      style={{
        borderColor: PROGRESS_THEME.cardBorder,
        boxShadow: PROGRESS_THEME.cardShadow,
      }}
    >
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
        <div
          className="rounded-full border px-3 py-1 text-xs font-semibold shadow-[0_10px_24px_-20px_rgba(30,36,50,0.65)]"
          style={chipStyles}
        >
          {chipLabel}
        </div>
      </header>
      <TrendChart data={series} color={color} range={range} formatter={formatter} />
    </section>
  );
}
