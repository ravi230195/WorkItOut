import { useEffect, useMemo, useRef, useState } from "react";
import { scaleBand, scaleLinear } from "d3-scale";

import type { TimeRange } from "@/types/progress";
import type { TrendPoint } from "../../progress/Progress.types";
import { PROGRESS_THEME, formatDayLabel, formatTickValue, generateTicks } from "./util";

const CHART_HEIGHT = 240;

type TrendChartProps = {
  data: TrendPoint[];
  color: string;
  range: TimeRange;
  formatter: (value: number) => string;
};

const TrendChart: React.FC<TrendChartProps> = ({ data, color, range, formatter }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const gradientId = useMemo(() => `grad-${Math.random().toString(36).slice(2, 10)}`, []);
  const inset = useMemo(() => {
    if (range === "threeMonths") {
      return { top: 16, bottom: 12, left: 28, right: 36 } as const;
    }
    if (range === "sixMonths") {
      return { top: 16, bottom: 12, left: 24, right: 28 } as const;
    }
    return { top: 16, bottom: 12, left: 18, right: 18 } as const;
  }, [range]);

  useEffect(() => {
    const current = containerRef.current;
    if (!current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(current);
    return () => observer.disconnect();
  }, []);

  const { bars, ticks, yPosition, averageY, averageValue, baselineY } = useMemo(() => {
    if (!width || data.length === 0) {
      return {
        bars: [] as Array<{
          x: number;
          y: number;
          width: number;
          height: number;
          label: string;
        }>,
        ticks: [] as number[],
        yPosition: (value: number) => value,
        averageY: inset.top,
        averageValue: 0,
        baselineY: CHART_HEIGHT - inset.bottom,
      };
    }

    const values = data.map((point) => point.y);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const paddedMax = maxValue === 0 ? 1 : maxValue * 1.12;
    const paddedMin = minValue === maxValue ? minValue * 0.9 : minValue * 0.88;

    const xScale = scaleBand<number>()
      .domain(data.map((_, index) => index))
      .range([inset.left, width - inset.right])
      .paddingInner(range === "week" ? 0.2 : range === "threeMonths" ? 0.3 : 0.28)
      .paddingOuter(range === "week" ? 0.18 : 0.2);

    const yScale = scaleLinear()
      .domain([paddedMin, paddedMax])
      .range([CHART_HEIGHT - inset.bottom, inset.top])
      .nice();

    const [domainMin] = yScale.domain();
    const baselineValue = domainMin > 0 ? domainMin : 0;
    const baselineY = yScale(baselineValue);

    const bars = data.map((point, index) => {
      const bandX = xScale(index) ?? inset.left;
      const barWidth = xScale.bandwidth();
      const valueY = yScale(point.y);
      const isPositive = point.y >= baselineValue;
      const barTop = isPositive ? valueY : baselineY;
      const barBottom = isPositive ? baselineY : valueY;
      const rawHeight = Math.max(0, barBottom - barTop);
      const minHeight = data.length > 0 ? Math.min(8, (CHART_HEIGHT - inset.top - inset.bottom) * 0.1) : 0;
      const height = rawHeight < 2 ? Math.max(rawHeight, minHeight || 2) : rawHeight;
      return {
        x: bandX,
        y: isPositive ? Math.min(valueY, baselineY - height) : baselineY,
        width: barWidth,
        height,
        label: point.x,
      };
    });

    const tickCount = range === "week" ? 3 : range === "threeMonths" ? 4 : 5;
    const ticks = generateTicks(yScale.domain() as [number, number], tickCount);
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;

    return {
      bars,
      ticks,
      yPosition: (value: number) => yScale(value),
      averageY: yScale(average),
      averageValue: average,
      baselineY,
    };
  }, [data, inset.bottom, inset.left, inset.right, inset.top, range, width]);

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{ height: CHART_HEIGHT }}
      onMouseLeave={() => setHoverIndex(null)}
    >
      {width > 0 && data.length > 0 ? (
        <svg
          key={`${range}-${data.length}-${color}`}
          width={width}
          height={CHART_HEIGHT}
          role="img"
          aria-label="Progress trend"
          className="transition-opacity duration-300"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.6} />
              <stop offset="100%" stopColor={color} stopOpacity={0.12} />
            </linearGradient>
          </defs>
          {ticks.map((tick) => (
            <line
              key={`grid-${tick}`}
              x1={inset.left}
              x2={width - inset.right}
              y1={yPosition(tick)}
              y2={yPosition(tick)}
              stroke="rgba(30,36,50,0.08)"
              strokeDasharray="4 6"
            />
          ))}
          <line
            x1={inset.left}
            x2={width - inset.right}
            y1={baselineY}
            y2={baselineY}
            stroke="rgba(30,36,50,0.1)"
          />
          <line
            x1={inset.left}
            x2={width - inset.right}
            y1={averageY}
            y2={averageY}
            stroke={color}
            strokeOpacity={0.75}
            strokeWidth={2}
            strokeDasharray="4 6"
          />
          {bars.map((bar, index) => (
            <g key={bar.label}>
              <rect
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                rx={bar.width / 2.6}
                fill={`url(#${gradientId})`}
                opacity={hoverIndex === null || hoverIndex === index ? 1 : 0.45}
                stroke={hoverIndex === index ? color : "transparent"}
                strokeWidth={hoverIndex === index ? 1.5 : 0}
              />
              <rect
                x={bar.x}
                y={inset.top}
                width={bar.width}
                height={CHART_HEIGHT - inset.top - inset.bottom}
                fill="transparent"
                style={{
                  cursor: "pointer",
                  outline: "none",
                  WebkitTapHighlightColor: "transparent",
                }}
                tabIndex={0}
                role="presentation"
                aria-label={`${formatter(data[index].y)} on ${formatDayLabel(range, data[index].x)}`}
                onMouseEnter={() => setHoverIndex(index)}
                onMouseLeave={() => setHoverIndex(null)}
                onFocus={() => setHoverIndex(index)}
                onBlur={() => setHoverIndex(null)}
              />
            </g>
          ))}
          {data.map((point, index) => {
            const label = formatDayLabel(range, point.x);
            if (!label) return null;
            const bar = bars[index];
            const labelY = range === "threeMonths" ? CHART_HEIGHT - 18 : CHART_HEIGHT - 4;
            return (
              <text
                key={`x-${point.x}`}
                x={(bar?.x ?? inset.left) + (bar?.width ?? 0) / 2}
                y={labelY}
                textAnchor={range === "threeMonths" ? "end" : "middle"}
                fontSize={range === "threeMonths" ? 9 : 10}
                fill="rgba(30,36,50,0.45)"
                transform={
                  range === "threeMonths"
                    ? `rotate(-32, ${(bar?.x ?? inset.left) + (bar?.width ?? 0) / 2}, ${labelY})`
                    : undefined
                }
              >
                {label}
              </text>
            );
          })}
          {ticks.map((tick) => (
            <text
              key={`y-${tick}`}
              x={width - inset.right + 6}
              y={yPosition(tick)}
              textAnchor="start"
              fontSize={11}
              fill="#111111"
            >
              {formatTickValue(tick)}
            </text>
          ))}
          {hoverIndex !== null && bars[hoverIndex] ? (
            <g
              transform={`translate(${bars[hoverIndex].x + bars[hoverIndex].width / 2},${bars[hoverIndex].y})`}
              pointerEvents="none"
            >
              <line
                x1={0}
                x2={0}
                y1={0}
                y2={CHART_HEIGHT - bars[hoverIndex].y - inset.bottom}
                stroke={color}
                strokeOpacity={0.22}
                strokeDasharray="2 4"
              />
              <circle r={Math.max(6, bars[hoverIndex].width / 2.6)} fill={color} fillOpacity={0.16} />
              <circle r={Math.max(3.5, bars[hoverIndex].width / 4.5)} stroke={color} strokeWidth={1.4} fill="#FFFFFF" />
              <foreignObject
                x={(() => {
                  const tooltipWidth = 148;
                  const tooltipHalf = tooltipWidth / 2;
                  const chartLeft = inset.left + 4;
                  const chartRight = width - inset.right - 4;
                  const centerX = bars[hoverIndex].x + bars[hoverIndex].width / 2;
                  const desiredLeft = centerX - tooltipHalf;
                  const desiredRight = centerX + tooltipHalf;

                  if (desiredLeft < chartLeft) {
                    return -tooltipHalf + (chartLeft - desiredLeft);
                  }
                  if (desiredRight > chartRight) {
                    return -tooltipHalf - (desiredRight - chartRight);
                  }
                  return -tooltipHalf;
                })()}
                y={(() => {
                  const tooltipHeight = 56;
                  const verticalGap = 8;
                  const desiredY = -tooltipHeight - verticalGap;
                  const chartTop = inset.top + 4;
                  const minY = chartTop - bars[hoverIndex].y;
                  return Math.max(desiredY, minY);
                })()}
                width={148}
                height={56}
              >
                <div
                  className="rounded-2xl border bg-white px-3 py-2 text-[10px] font-semibold text-[#111111]"
                  style={{ borderColor: PROGRESS_THEME.cardBorder, boxShadow: PROGRESS_THEME.tooltipShadow }}
                >
                  <p className="text-[11px] font-semibold text-[#111111]">
                    {formatter(data[hoverIndex].y)}
                  </p>
                  <p className="text-[10px] font-medium" style={{ color: PROGRESS_THEME.textFaint }}>
                    {new Date(data[hoverIndex].x).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </foreignObject>
            </g>
          ) : null}
          <text
            x={width - inset.right}
            y={averageY - 8}
            textAnchor="end"
            fontSize={10}
            fill="#111111"
          >
            {`Avg ${formatter(averageValue)}`}
          </text>
        </svg>
      ) : (
        <div className="h-full w-full" />
      )}
    </div>
  );
};

export { TrendChart };
