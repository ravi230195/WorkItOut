import type { DotProps } from 'recharts';
import type { TimeRange } from '../../types/progress';

export const createNumberFormatter = (decimals = 0) =>
  new Intl.NumberFormat(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });

export const capitalizeWord = (value: string) =>
  value.length === 0 ? value : value.charAt(0).toUpperCase() + value.slice(1);

const getWeekNumber = (date: Date) => {
  const dt = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.ceil((((dt as unknown as number) - (yearStart as unknown as number)) / 86400000 + 1) / 7);
};

export const formatChartDate = (iso: string, granularity: TimeRange) => {
  const d = new Date(iso);
  if (granularity === 'week') {
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  }
  if (granularity === 'threeMonths') {
    return `W${getWeekNumber(d)}`;
  }
  return d.toLocaleDateString(undefined, { month: 'short' });
};

export const createDotRenderer = (color: string) => (props: DotProps) => {
  const { cx, cy, payload } = props;
  if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) {
    return null;
  }
  if (payload.isPR) {
    return (
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize={12} aria-hidden>
        ⭐
      </text>
    );
  }
  return <circle cx={cx} cy={cy} r={3} fill={color} opacity={0.9} aria-hidden />;
};

export const PANEL_SURFACE_CLASS =
  'rounded-2xl border border-white/25 bg-white/85 dark:bg-zinc-900/70 shadow-lg';
export const KPI_CARD_SURFACE_CLASS =
  'rounded-2xl border border-white/20 bg-white/80 dark:bg-zinc-900/70 shadow-sm';
export const TEXT_EMPHASIS_CLASS = 'text-black dark:text-white';
export const TEXT_SUBTLE_CLASS = 'text-neutral-600 dark:text-neutral-400';
export const TEXT_SOFT_CLASS = 'text-neutral-600 dark:text-neutral-300';
export const BADGE_BASE_CLASS = 'rounded-full border border-white/40 bg-white/70 dark:bg-zinc-900/60';
