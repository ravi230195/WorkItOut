import { useId, useMemo, useState } from 'react';
import type { ActivityCategory, TimeRange, MuscleGroup } from '../../types/progress';
import { MockProgressProvider } from '../../screen/progress/MockData';
import {
  BADGE_BASE_CLASS,
  TEXT_EMPHASIS_CLASS,
  TEXT_SOFT_CLASS,
  TEXT_SUBTLE_CLASS,
  createDotRenderer,
  createNumberFormatter,
  formatChartDate,
  capitalizeWord,
  PANEL_SURFACE_CLASS,
} from '../../screen/progress/util';
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
} from 'recharts';

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
    const focusName = focus === 'all' ? 'All' : capitalizeWord(focus);
    const unit = 'kg';
    const format = createNumberFormatter(0);
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
    const format = createNumberFormatter(decimals);
    const focusLabel = (() => {
      if (focusKey === 'all') return 'All Cardio';
      if (focusKey === 'hiit') return 'HIIT Cardio';
      return `${capitalizeWord(focusKey)} Cardio`;
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

  const format = createNumberFormatter(1);
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

  const series = MockProgressProvider.series({ category, range: timeRange, muscle: activeMuscle });
  const prev = compare
    ? MockProgressProvider.previousSeries({ category, range: timeRange, muscle: activeMuscle })
    : [];
  const kpis = MockProgressProvider.kpis({ category, range: timeRange });
  const workouts = MockProgressProvider.recentWorkouts({ category, range: timeRange, limit: 6 });
  const bestAll = MockProgressProvider.bestsAllTime({ category });
  const bestPeriod = MockProgressProvider.bestsInPeriod({ category, range: timeRange });
  const target = MockProgressProvider.targetLine?.({ category, range: timeRange });

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
      <div className={`${PANEL_SURFACE_CLASS} p-4 ${TEXT_EMPHASIS_CLASS}`} aria-label="Progress trend chart">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold tracking-tight">Trend</h3>
            {meta.focusLabel && (
              <span
                className={`w-fit ${BADGE_BASE_CLASS} px-3 py-1 text-xs font-semibold ${TEXT_SOFT_CLASS}`}
              >
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
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => formatChartDate(value, timeRange)}
                  tick={{ fontSize: 12 }}
                />
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
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => formatChartDate(value, timeRange)}
                  tick={{ fontSize: 12 }}
                />
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

      <div className={PANEL_SURFACE_CLASS} aria-label="Recent workouts">
        <div className="p-4 border-b border-white/20">
          <h3 className={`text-base font-semibold tracking-tight ${TEXT_EMPHASIS_CLASS}`}>Recent Sessions</h3>
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
                  <p className={`font-semibold truncate ${TEXT_EMPHASIS_CLASS}`}>{workout.title}</p>
                </div>
                <p className={`text-sm ${TEXT_SUBTLE_CLASS}`}>
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
        <div className={`${PANEL_SURFACE_CLASS} p-4`}>
          <h3 className={`text-base font-semibold tracking-tight ${TEXT_EMPHASIS_CLASS} mb-2`}>All-Time Bests</h3>
          <ul className={`text-sm ${TEXT_SOFT_CLASS} space-y-2`}>
            {bestAll.map((best, idx) => (
              <li key={`${best.label}-${idx}`} className="flex justify-between gap-2">
                <span>{best.label}</span>
                <span className={`font-semibold ${TEXT_EMPHASIS_CLASS}`}>{best.value}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={`${PANEL_SURFACE_CLASS} p-4`}>
          <h3 className={`text-base font-semibold tracking-tight ${TEXT_EMPHASIS_CLASS} mb-2`}>Best This Period</h3>
          <ul className={`text-sm ${TEXT_SOFT_CLASS} space-y-2`}>
            {bestPeriod.map((best, idx) => (
              <li key={`${best.label}-${idx}`} className="flex justify-between gap-2">
                <span>{best.label}</span>
                <span className={`font-semibold ${TEXT_EMPHASIS_CLASS}`}>{best.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
