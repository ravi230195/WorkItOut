import { useId, useMemo, useState } from 'react';
import type { ActivityCategory, TimeRange, MuscleGroup } from '../../types/progress';
import { MockProgressProvider as provider } from '../../screen/progress/MockData';
import KpiCard from './KpiCard';
// npm i recharts
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  DotProps,
} from 'recharts';

const formatter = (decimals = 0) =>
  new Intl.NumberFormat(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

type MetricMeta = {
  label: string;
  unitLabel?: string;
  primaryColor: string;
  accentColor: string;
  focusLabel?: string;
  tickFormatter: (value: number) => string;
  tooltipFormatter: (value: number) => string;
};

type Props = {
  category: ActivityCategory;
  timeRange: TimeRange;
  defaultCompare?: boolean;
  strengthFocus?: MuscleGroup;
  cardioFocus?: string;
};

const fmtDate = (iso: string, granularity: TimeRange) => {
  const d = new Date(iso);
  if (granularity === 'week') {
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  }
  if (granularity === 'threeMonths') {
    return `W${getWeekNumber(d)}`;
  }
  return d.toLocaleDateString(undefined, { month: 'short' });
};

function getWeekNumber(d: Date) {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.ceil((((dt as unknown as number) - (yearStart as unknown as number)) / 86400000 + 1) / 7);
}

const cardioMap: Record<string, { label: string; unit: string; decimals?: number }> = {
  all: { label: 'Active Minutes', unit: 'min' },
  running: { label: 'Distance', unit: 'km', decimals: 1 },
  cycling: { label: 'Distance', unit: 'km', decimals: 1 },
  walking: { label: 'Distance', unit: 'km', decimals: 1 },
  rowing: { label: 'Distance', unit: 'km', decimals: 1 },
  swimming: { label: 'Distance', unit: 'km', decimals: 1 },
  elliptical: { label: 'Time', unit: 'min' },
  hiit: { label: 'Calories', unit: 'kcal' },
};

const getMetricMeta = (
  category: ActivityCategory,
  strengthFocus: MuscleGroup | undefined,
  cardioFocus: string | undefined,
): MetricMeta => {
  if (category === 'strength') {
    const focus = strengthFocus ?? 'all';
    const focusName = focus === 'all' ? 'All' : capitalize(focus);
    const unit = 'kg';
    const format = formatter(0);
    return {
      label: `${focus === 'all' ? 'Total Volume' : `${focusName} Volume`} (${unit})`,
      unitLabel: unit,
      primaryColor: 'var(--brand-orange)',
      accentColor: 'var(--brand-green)',
      focusLabel: `${focusName} Strength`,
      tickFormatter: (value) => `${format.format(value)} ${unit}`,
      tooltipFormatter: (value) => `${format.format(value)} ${unit}`,
    };
  }

  if (category === 'cardio') {
    const focusKey = cardioFocus && cardioMap[cardioFocus] ? cardioFocus : 'all';
    const meta = cardioMap[focusKey];
    const decimals = meta.decimals ?? 0;
    const format = formatter(decimals);
    const focusLabel = (() => {
      if (focusKey === 'all') return 'All Cardio';
      if (focusKey === 'hiit') return 'HIIT Cardio';
      return `${capitalize(focusKey)} Cardio`;
    })();
    return {
      label: `${meta.label} (${meta.unit})`,
      unitLabel: meta.unit,
      primaryColor: 'var(--brand-green)',
      accentColor: 'var(--brand-orange)',
      focusLabel,
      tickFormatter: (value) => `${format.format(value)} ${meta.unit}`,
      tooltipFormatter: (value) => `${format.format(value)} ${meta.unit}`,
    };
  }

  const format = formatter(1);
  return {
    label: 'Change (kg)',
    unitLabel: 'kg',
    primaryColor: 'var(--brand-yellow)',
    accentColor: 'var(--brand-green)',
    focusLabel: 'Body Measurements',
    tickFormatter: (value) => {
      const str = format.format(value);
      return `${value > 0 ? '+' : ''}${str} kg`;
    },
    tooltipFormatter: (value) => {
      const str = format.format(value);
      return `${value > 0 ? '+' : ''}${str} kg`;
    },
  };
};

const createDotRenderer = (color: string) => (props: DotProps) => {
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

export default function ProgressDetailSection({
  category,
  timeRange,
  defaultCompare = false,
  strengthFocus,
  cardioFocus,
}: Props) {
  const [compare, setCompare] = useState(defaultCompare);
  const gradientId = useId();

  const activeMuscle = category === 'strength' ? strengthFocus ?? 'all' : undefined;

  const series = provider.series({ category, range: timeRange, muscle: activeMuscle });
  const prev = compare
    ? provider.previousSeries({ category, range: timeRange, muscle: activeMuscle })
    : [];
  const kpis = provider.kpis({ category, range: timeRange });
  const workouts = provider.recentWorkouts({ category, range: timeRange, limit: 6 });
  const bestAll = provider.bestsAllTime({ category });
  const bestPeriod = provider.bestsInPeriod({ category, range: timeRange });
  const target = provider.targetLine?.({ category, range: timeRange });

  const meta = useMemo(
    () => getMetricMeta(category, strengthFocus, cardioFocus),
    [category, strengthFocus, cardioFocus],
  );
  const dotRenderer = useMemo(() => createDotRenderer(meta.primaryColor), [meta.primaryColor]);

  const compareButtonClass = compare
    ? 'rounded-full border border-[var(--brand-green)] bg-[var(--brand-green-soft)]/70 px-3 py-1.5 text-sm font-semibold text-black shadow-sm'
    : 'rounded-full border border-white/40 bg-white/80 px-3 py-1.5 text-sm font-medium text-neutral-600 dark:bg-zinc-900/60 dark:text-neutral-200 hover:bg-white dark:hover:bg-zinc-900';

  return (
    <section className="flex flex-col gap-4" aria-label="Detailed progress insights">
      <div
        className="rounded-2xl border border-white/25 bg-white/85 dark:bg-zinc-900/70 shadow-lg p-4 text-black dark:text-white"
        aria-label="Progress trend chart"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold tracking-tight">Trend</h3>
            {meta.focusLabel && (
              <span className="w-fit rounded-full border border-white/40 bg-white/70 px-3 py-1 text-xs font-semibold text-neutral-600 dark:bg-zinc-900/60 dark:text-neutral-300">
                {meta.focusLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={compareButtonClass}
              onClick={() => setCompare((v) => !v)}
            >
              Compare period
            </button>
          </div>
        </div>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            {category === 'body' ? (
              <LineChart data={series} aria-label="Body progress chart" margin={{ top: 24, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} />
                <XAxis dataKey="date" tickFormatter={(value) => fmtDate(value, timeRange)} tick={{ fontSize: 12 }} />
                <YAxis
                  width={60}
                  tick={{ fontSize: 12 }}
                  tickFormatter={meta.tickFormatter}
                  label={{
                    value: meta.label,
                    angle: -90,
                    position: 'insideLeft',
                    style: { fill: 'currentColor', opacity: 0.7, fontSize: 12 },
                  }}
                />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: number) => [meta.tooltipFormatter(value), meta.unitLabel ?? '']}
                  contentStyle={{ borderRadius: 12, borderColor: 'rgba(0,0,0,0.08)' }}
                />
                {target !== undefined && (
                  <ReferenceLine
                    y={target}
                    stroke={meta.accentColor}
                    strokeOpacity={0.3}
                    label={{ value: `Target ${meta.tooltipFormatter(target)}`, position: 'right' }}
                  />
                )}
                <Line type="monotone" dataKey="value" stroke={meta.primaryColor} strokeWidth={2} dot={dotRenderer} activeDot={{ r: 4 }} />
                {prev.length > 0 && (
                  <Line
                    type="monotone"
                    data={prev}
                    dataKey="value"
                    stroke={meta.accentColor}
                    strokeOpacity={0.25}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                )}
              </LineChart>
            ) : (
              <AreaChart data={series} aria-label="Activity progress chart" margin={{ top: 24, right: 16, left: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={meta.primaryColor} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={meta.accentColor} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} />
                <XAxis dataKey="date" tickFormatter={(value) => fmtDate(value, timeRange)} tick={{ fontSize: 12 }} />
                <YAxis
                  width={60}
                  tick={{ fontSize: 12 }}
                  tickFormatter={meta.tickFormatter}
                  label={{
                    value: meta.label,
                    angle: -90,
                    position: 'insideLeft',
                    style: { fill: 'currentColor', opacity: 0.7, fontSize: 12 },
                  }}
                />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: number) => [meta.tooltipFormatter(value), meta.unitLabel ?? '']}
                  contentStyle={{ borderRadius: 12, borderColor: 'rgba(0,0,0,0.08)' }}
                />
                {target !== undefined && (
                  <ReferenceLine
                    y={target}
                    stroke={meta.accentColor}
                    strokeOpacity={0.35}
                    label={{ value: `Target ${meta.tooltipFormatter(target)}`, position: 'right' }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="value"
                  fill={`url(#${gradientId})`}
                  stroke={meta.primaryColor}
                  strokeWidth={2.5}
                  dot={dotRenderer}
                  activeDot={{ r: 5 }}
                />
                {prev.length > 0 && (
                  <Area
                    type="monotone"
                    data={prev}
                    dataKey="value"
                    stroke={meta.accentColor}
                    strokeOpacity={0.25}
                    strokeDasharray="5 5"
                    fillOpacity={0}
                    dot={false}
                  />
                )}
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">⭐ markers indicate personal records in this period.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Key performance indicators">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <div className="rounded-2xl border border-white/25 bg-white/85 dark:bg-zinc-900/70 shadow-lg" aria-label="Recent workouts">
        <div className="p-4 border-b border-white/20">
          <h3 className="text-base font-semibold tracking-tight text-black dark:text-white">Recent Sessions</h3>
        </div>
        <ul className="divide-y divide-white/20">
          {workouts.map((workout) => (
            <li key={workout.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {workout.hasPR && (
                    <span title="Contains personal record" aria-label="Personal record" className="text-amber-600 text-lg">
                      👑
                    </span>
                  )}
                  <p className="font-semibold truncate text-black dark:text-white">{workout.title}</p>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {workout.subtitle} · {new Date(workout.date).toLocaleDateString()}
                </p>
              </div>
              <span className="text-sm font-semibold rounded-xl bg-neutral-100/80 dark:bg-zinc-800 px-3 py-1 text-neutral-700 dark:text-neutral-100">
                {workout.highlight}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-label="Performance records">
        <div className="rounded-2xl border border-white/25 bg-white/85 dark:bg-zinc-900/70 shadow-lg p-4">
          <h3 className="text-base font-semibold tracking-tight text-black dark:text-white mb-2">All-Time Bests</h3>
          <ul className="text-sm text-neutral-600 dark:text-neutral-300 space-y-2">
            {bestAll.map((best, idx) => (
              <li key={`${best.label}-${idx}`} className="flex justify-between gap-2">
                <span>{best.label}</span>
                <span className="font-semibold text-black dark:text-white">{best.value}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-white/25 bg-white/85 dark:bg-zinc-900/70 shadow-lg p-4">
          <h3 className="text-base font-semibold tracking-tight text-black dark:text-white mb-2">Best This Period</h3>
          <ul className="text-sm text-neutral-600 dark:text-neutral-300 space-y-2">
            {bestPeriod.map((best, idx) => (
              <li key={`${best.label}-${idx}`} className="flex justify-between gap-2">
                <span>{best.label}</span>
                <span className="font-semibold text-black dark:text-white">{best.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
