import { useEffect, useMemo, useRef, useState } from "react";
import * as shape from "d3-shape";
import { scaleLinear, scalePoint } from "d3-scale";

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

  const { areaPath, linePath, dots, ticks, yPosition, averageY, averageValue } = useMemo(() => {
    if (!width || data.length === 0) {
      return {
        areaPath: "",
        linePath: "",
        dots: [] as Array<{ cx: number; cy: number; label: string }>,
        ticks: [] as number[],
        yPosition: (value: number) => value,
        averageY: inset.top,
        averageValue: 0,
      };
    }

    const values = data.map((point) => point.y);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const paddedMax = maxValue === 0 ? 1 : maxValue * 1.12;
    const paddedMin = minValue === maxValue ? minValue * 0.9 : minValue * 0.9;

    const xScale = scalePoint<number>()
      .domain(data.map((_, index) => index))
      .range([inset.left, width - inset.right])
      .padding(data.length === 1 ? 1 : 0.4);

    const yScale = scaleLinear()
      .domain([paddedMin, paddedMax])
      .range([CHART_HEIGHT - inset.bottom, inset.top])
      .nice();

    const line = shape
      .line<TrendPoint>()
      .x((_, index) => xScale(index) ?? inset.left)
      .y((point) => yScale(point.y))
      .curve(shape.curveCatmullRom.alpha(0.5));

    const area = shape
      .area<TrendPoint>()
      .x((_, index) => xScale(index) ?? inset.left)
      .y0(CHART_HEIGHT - inset.bottom)
      .y1((point) => yScale(point.y))
      .curve(shape.curveCatmullRom.alpha(0.5));

    const dots = data.map((point, index) => ({
      cx: xScale(index) ?? inset.left,
      cy: yScale(point.y),
      label: point.x,
    }));

    const tickCount = range === "week" ? 3 : range === "threeMonths" ? 4 : 5;
    const ticks = generateTicks(yScale.domain() as [number, number], tickCount);
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;

    return {
      areaPath: area(data) ?? "",
      linePath: line(data) ?? "",
      dots,
      ticks,
      yPosition: (value: number) => yScale(value),
      averageY: yScale(average),
      averageValue: average,
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
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
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
            y1={averageY}
            y2={averageY}
            stroke={color}
            strokeOpacity={0.18}
            strokeWidth={2}
            strokeDasharray="4 6"
          />
          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
          {dots.map((dot, index) => (
            <g key={dot.label}>
              <circle
                cx={dot.cx}
                cy={dot.cy}
                r={3.5}
                stroke={color}
                strokeWidth={1}
                fill="#FFFFFF"
                style={{ cursor: "pointer" }}
                tabIndex={0}
                onMouseEnter={() => setHoverIndex(index)}
                onMouseLeave={() => setHoverIndex(null)}
                onFocus={() => setHoverIndex(index)}
                onBlur={() => setHoverIndex(null)}
              />
              <rect
                x={dot.cx - Math.max(20, (width - inset.left - inset.right) / Math.max(dots.length, 1) / 2)}
                width={Math.max(40, (width - inset.left - inset.right) / Math.max(dots.length, 1))}
                y={inset.top}
                height={CHART_HEIGHT - inset.top - inset.bottom}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(index)}
                onMouseLeave={() => setHoverIndex(null)}
              />
            </g>
          ))}
          {data.map((point, index) => {
            const label = formatDayLabel(range, point.x);
            if (!label) return null;
            const labelY = range === "threeMonths" ? CHART_HEIGHT - 20 : CHART_HEIGHT - 4;
            return (
              <text
                key={`x-${point.x}`}
                x={dots[index]?.cx ?? inset.left}
                y={labelY}
                textAnchor={range === "threeMonths" ? "end" : "middle"}
                fontSize={range === "threeMonths" ? 9 : 10}
                fill="rgba(30,36,50,0.4)"
                transform={
                  range === "threeMonths"
                    ? `rotate(-35, ${dots[index]?.cx ?? inset.left}, ${labelY})`
                    : undefined
                }
              >
                {label}
              </text>
            );
          })}
          {dots.length > 0 ? (
            <line
              x1={dots[dots.length - 1].cx}
              x2={dots[dots.length - 1].cx}
              y1={inset.top}
              y2={CHART_HEIGHT - inset.bottom}
              stroke="rgba(30,36,50,0.15)"
              strokeDasharray="2 4"
            />
          ) : null}
          {ticks.map((tick) => (
            <text
              key={`y-${tick}`}
              x={width - inset.right + 6}
              y={yPosition(tick)}
              textAnchor="start"
              fontSize={11}
              fill="rgba(30,36,50,0.25)"
            >
              {formatTickValue(tick)}
            </text>
          ))}
          {hoverIndex !== null && dots[hoverIndex] ? (
            <g transform={`translate(${dots[hoverIndex].cx},${dots[hoverIndex].cy})`} pointerEvents="none">
              <line
                x1={0}
                x2={0}
                y1={0}
                y2={CHART_HEIGHT - dots[hoverIndex].cy - inset.bottom}
                stroke={color}
                strokeOpacity={0.18}
                strokeDasharray="2 4"
              />
              <circle r={6} fill={color} fillOpacity={0.18} />
              <circle r={3.5} stroke={color} strokeWidth={1.5} fill="#FFFFFF" />
              <foreignObject x={-70} y={-60} width={140} height={52}>
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
            fill="rgba(30,36,50,0.45)"
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
