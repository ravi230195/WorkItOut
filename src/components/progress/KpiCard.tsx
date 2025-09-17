import { KPI } from '../../types/progress';

type Props = {
  kpi: KPI;
};

export default function KpiCard({ kpi }: Props) {
  const pct = kpi.deltaPct ?? null;
  const trendSymbol = pct === null ? '·' : pct > 0 ? '▲' : pct < 0 ? '▼' : '–';
  const trendColor = pct === null ? 'text-neutral-500 dark:text-neutral-400' : pct > 0 ? 'text-[var(--brand-green-strong)]' : pct < 0 ? 'text-rose-600' : 'text-neutral-500 dark:text-neutral-400';
  const ariaLabel =
    pct === null
      ? `${kpi.label} ${kpi.value}`
      : `${kpi.label} ${kpi.value}, ${pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'} ${Math.abs(pct * 100).toFixed(0)} percent`;

  return (
    <article
      className="flex flex-col justify-between rounded-2xl border border-white/20 bg-white/80 dark:bg-zinc-900/70 shadow-sm p-4 min-w-[150px] text-black dark:text-white"
      aria-label={ariaLabel}
    >
      <div className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-300">
        <span aria-hidden className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-orange-subtle)] text-lg">
          {kpi.icon}
        </span>
        <span className="truncate font-medium">{kpi.label}</span>
      </div>
      <div className="mt-4 flex items-baseline gap-3">
        <span className="text-2xl font-semibold tracking-tight">{kpi.value}</span>
        <span className={`text-xs font-semibold ${trendColor}`} aria-hidden>
          {trendSymbol}
          {pct !== null ? ` ${Math.abs(pct * 100).toFixed(0)}%` : ''}
        </span>
      </div>
    </article>
  );
}
