import type { CSSProperties } from "react";

import type { KpiDatum, ProgressDomain } from "../../progress/Progress.types";
import { KPI_COLORS, PROGRESS_THEME, determineTrend, getKpiFormatter } from "./util";

type KpiTilesProps = {
  domain: ProgressDomain;
  kpis: KpiDatum[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

const KPI_HEADER_CLASS_ACTIVE = "text-[#22313F]" as const;
const KPI_HEADER_CLASS_INACTIVE = "text-[rgba(34,49,63,0.65)]" as const;

const KPI_TILE_STYLE = (isActive: boolean, tileColor: string): CSSProperties => ({
  backgroundColor: isActive ? tileColor : PROGRESS_THEME.cardBackground,
  border: isActive ? "none" : `1px solid ${PROGRESS_THEME.cardBorder}`,
});

function KpiTiles({ domain, kpis, selectedIndex, onSelect }: KpiTilesProps) {
  if (!kpis.length) {
    return null;
  }

  return (
    <section className="mt-8 grid grid-cols-2 gap-4">
      {kpis.map((kpi, index) => {
        const isActive = index === selectedIndex;
        const tileColor = KPI_COLORS[index % KPI_COLORS.length] ?? KPI_COLORS[0];
        const formatter = getKpiFormatter(domain, index);
        const previous = kpi.previous ?? null;
        const currentNumeric = kpi.currentNumeric ?? null;
        const trend = determineTrend(currentNumeric, previous);
        const displayUnit = kpi.unit && kpi.unit.toLowerCase() !== "sessions" ? kpi.unit : undefined;

        return (
          <button
            key={`${domain}-${kpi.title}-${index}`}
            type="button"
            onClick={() => onSelect(index)}
            className="rounded-2xl px-5 py-4 text-left shadow-[0_16px_28px_-18px_rgba(30,36,50,0.35)] transition focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={KPI_TILE_STYLE(isActive, tileColor)}
            aria-pressed={isActive}
            aria-label={`${kpi.title} ${kpi.value}`}
          >
            <header
              className={`text-xs font-semibold uppercase tracking-wide ${
                isActive ? KPI_HEADER_CLASS_ACTIVE : KPI_HEADER_CLASS_INACTIVE
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
  );
}

export { KpiTiles };
