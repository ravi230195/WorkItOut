import { LineChart, Line, XAxis, ResponsiveContainer } from "recharts";

interface TrendChartProps {
  data: { week: string; workouts: number }[];
  height?: number;
}

export function TrendChart({ data, height = 80 }: TrendChartProps) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis 
            dataKey="week" 
            axisLine={false} 
            tickLine={false}
            tick={{ fontSize: 12, fill: 'var(--foreground)', opacity: 0.6 }}
          />
          <Line 
            type="monotone" 
            dataKey="workouts" 
            stroke="var(--warm-coral)" 
            strokeWidth={3}
            dot={{ fill: 'var(--warm-coral)', strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: 'var(--warm-coral)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}