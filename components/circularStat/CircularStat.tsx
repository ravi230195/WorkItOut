import { useThemeTokens } from "./useThemeTokens";

export type CircularStatProps = {
  value: number | null | undefined;
  max?: number;
  label: string;
  unit?: string;
  size?: number;
  strokeWidth?: number;
  decimals?: number;
  trackColor?: string;
  progressColor?: string;
  textColor?: string;
  /** Replaces large center text (first line) */
  primaryTextOverride?: string | null;
  /** Replaces small text below (second line) */
  secondaryTextOverride?: string | null;
};

export default function CircularStat({
  value,
  max = 100,
  label,
  unit = "%",
  size = 112,
  strokeWidth = 10,
  decimals = 0,
  trackColor,
  progressColor,
  textColor,
  primaryTextOverride,
  secondaryTextOverride,
}: CircularStatProps) {
  const { warmBrown, warmCoral, trackGray } = useThemeTokens();
  const resolvedTrack = trackColor ?? trackGray;
  const resolvedProgress = progressColor ?? warmCoral;
  const resolvedText = textColor ?? warmBrown;
  const safeValue =
    typeof value === "number" && isFinite(value)
      ? Math.max(0, Math.min(value, max))
      : null;

  const radius = (size - strokeWidth) / 2;
  const C = 2 * Math.PI * radius;
  const progress = safeValue == null ? 0 : safeValue / max;
  const dashOffset = C * (1 - progress);
  const gradId = `grad-${String(label).replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <div className="flex flex-col items-center select-none" role="group" aria-label={`${label} progress`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={resolvedProgress} />
            <stop offset="100%" stopColor={resolvedProgress} />
          </linearGradient>
        </defs>

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={resolvedTrack}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          style={{ opacity: 0.25 }}
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${C} ${C}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={safeValue ?? undefined}
          aria-valuetext={
            primaryTextOverride && secondaryTextOverride
              ? `${primaryTextOverride} of ${secondaryTextOverride} ${unit || ""}`.trim()
              : undefined
          }
        />

        <g transform={`translate(${size / 2}, ${size / 2})`}>
          <text
            textAnchor="middle"
            dominantBaseline="central"
            style={{ fontSize: size * 0.24, fontWeight: 700, fill: resolvedText }}
          >
            {primaryTextOverride ?? (safeValue == null ? "—" : safeValue.toFixed(decimals))}
          </text>
          <text
            y={size * 0.18}
            textAnchor="middle"
            dominantBaseline="hanging"
            style={{ fontSize: size * 0.14, fontWeight: 600, fill: resolvedText, opacity: 0.5 }}
          >
            {secondaryTextOverride ?? unit}
          </text>
        </g>
      </svg>

      <div className="mt-2 text-xs" style={{ color: resolvedText, opacity: 0.75 }}>
        {label}
      </div>
    </div>
  );
}
