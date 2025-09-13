// Progress Screen (single-file) — responsive, themed, accessible
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
} from "recharts";
import { Activity, Dumbbell, Ruler, TrendingUp, Flame, HeartPulse, Info, CalendarDays, Download } from "lucide-react";

// Types
export type RangeKey = "week" | "3m" | "6m";
export type WorkoutType = "cardio" | "strength" | "body";
export type TimePoint = { date: string; value: number; [k: string]: number | string | null };
export type CardioPoint = TimePoint & { distance_km?: number; pace_sec_per_km?: number; hr_avg?: number; duration_min?: number };
export type StrengthPoint = TimePoint & { total_volume?: number; sets?: number; reps?: number; avg_rpe?: number };
export type BodyPoint = TimePoint & { weight_kg?: number; body_fat_pct?: number; waist_cm?: number };
export type KPI = { label: string; value: string; deltaPct?: number; icon: React.ReactNode; help: string };
export type RecentSession = { id: string; date: string; type: WorkoutType; title: string; primaryMetricLabel: string; primaryMetricValue: string; miniSeries?: Array<{ x: string; y: number }>; };

// Formatters
const fmtPct = (n?: number) => (n == null ? "" : `${n > 0 ? "+" : ""}${n.toFixed(1)}%`);
const fmtNum = (n: number, d = 0) => new Intl.NumberFormat(undefined, { maximumFractionDigits: d }).format(n);
const toDate = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, days: number) => { const x = new Date(d); x.setDate(x.getDate() + days); return x; };

// Mock data provider — replace with real API
function mockSeries(type: WorkoutType, range: RangeKey): TimePoint[] {
  const today = new Date();
  const points: TimePoint[] = [];
  const len = range === "week" ? 7 : 12; // week: daily, 3m: weekly (12 weeks), 6m: biweekly (12 periods)
  for (let i = len - 1; i >= 0; i--) {
    const base = range === "week" ? addDays(today, -i) : addDays(today, -(i * (range === "3m" ? 7 : 14)));
    const date = toDate(base);
    if (type === "cardio") {
      const distance = 3 + Math.random() * 7; const pace = 300 + Math.random() * 90; const hr = 120 + Math.random() * 30; const dur = distance * (pace / 60);
      points.push({ date, value: distance, distance_km: distance, pace_sec_per_km: pace, hr_avg: hr, duration_min: dur });
    } else if (type === "strength") {
      const vol = 8000 + Math.random() * 12000; const sets = 12 + Math.floor(Math.random() * 10); const reps = sets * (6 + Math.floor(Math.random() * 4)); const rpe = 6 + Math.random() * 3;
      points.push({ date, value: vol, total_volume: vol, sets, reps, avg_rpe: rpe });
    } else {
      const weight = 70 + Math.sin(i / 3) * 0.8 + Math.random() * 0.6; const bf = 17 + Math.cos(i / 4) * 0.6 + Math.random() * 0.5; const waist = 82 + Math.cos(i / 2) * 0.8;
      points.push({ date, value: weight, weight_kg: weight, body_fat_pct: bf, waist_cm: waist });
    }
  }
  return points;
}
function previousPeriod(series: TimePoint[]): TimePoint[] { return series.map((p, i) => ({ ...p, value: i > 0 ? series[i - 1].value : p.value })); }

function getKpis(type: WorkoutType, range: RangeKey, data: TimePoint[]): KPI[] {
  if (type === "cardio") {
    const totalDist = data.reduce((s, d) => s + (d.distance_km as number), 0);
    const avgPaceSec = data.reduce((s, d) => s + (d.pace_sec_per_km as number), 0) / Math.max(1, data.length);
    const totalMins = data.reduce((s, d) => s + (d.duration_min as number), 0);
    const avgHr = data.reduce((s, d) => s + (d.hr_avg as number), 0) / Math.max(1, data.length);
    return [
      { label: "Total Distance", value: `${fmtNum(totalDist, 1)} km`, deltaPct: 3.2, icon: <Activity className="h-4 w-4" />, help: "Sum of distance in range" },
      { label: "Avg Pace", value: `${Math.round(avgPaceSec / 60)}:${String(Math.round(avgPaceSec % 60)).padStart(2, "0")}/km`, deltaPct: -1.4, icon: <TrendingUp className="h-4 w-4" />, help: "Average pace per km" },
      { label: "Active Time", value: `${fmtNum(totalMins, 0)} min`, deltaPct: 2.1, icon: <Flame className="h-4 w-4" />, help: "Total moving duration" },
      { label: "Avg HR", value: `${fmtNum(avgHr, 0)} bpm`, deltaPct: 0.6, icon: <HeartPulse className="h-4 w-4" />, help: "Average heart rate" },
    ];
  }
  if (type === "strength") {
    const totalVol = data.reduce((s, d) => s + (d.total_volume as number), 0);
    const sets = data.reduce((s, d) => s + (d.sets as number), 0);
    const reps = data.reduce((s, d) => s + (d.reps as number), 0);
    const avgRpe = data.reduce((s, d) => s + (d.avg_rpe as number), 0) / Math.max(1, data.length);
    return [
      { label: "Total Volume", value: `${fmtNum(totalVol, 0)} kg`, deltaPct: 4.5, icon: <Dumbbell className="h-4 w-4" />, help: "Sum of lifted weight" },
      { label: "Sets", value: fmtNum(sets), deltaPct: 2.0, icon: <TrendingUp className="h-4 w-4" />, help: "Total sets completed" },
      { label: "Reps", value: fmtNum(reps), deltaPct: 1.2, icon: <TrendingUp className="h-4 w-4" />, help: "Total reps completed" },
      { label: "Avg RPE", value: fmtNum(avgRpe, 1), deltaPct: -0.4, icon: <Flame className="h-4 w-4" />, help: "Average perceived exertion" },
    ];
  }
  const avgWeight = data.reduce((s, d) => s + (d.weight_kg as number), 0) / Math.max(1, data.length);
  const start = data[0]?.weight_kg as number; const end = data[data.length - 1]?.weight_kg as number; const change = (end ?? 0) - (start ?? 0);
  const bf = data.reduce((s, d) => s + (d.body_fat_pct as number), 0) / Math.max(1, data.length); const consistency = Math.round((data.length / (range === "week" ? 7 : 12)) * 100);
  return [
    { label: "Avg Weight", value: `${fmtNum(avgWeight, 1)} kg`, deltaPct: change, icon: <Ruler className="h-4 w-4" />, help: "Average weight across range" },
    { label: "Change", value: `${change > 0 ? "+" : ""}${fmtNum(change, 1)} kg`, deltaPct: change * 2, icon: <TrendingUp className="h-4 w-4" />, help: "Change since start of range" },
    { label: "Body Fat %", value: `${fmtNum(bf, 1)}%`, deltaPct: (Math.random() - 0.5) * 2, icon: <Flame className="h-4 w-4" />, help: "Average body fat percentage" },
    { label: "Consistency", value: `${fmtNum(consistency)}%`, deltaPct: consistency - 50, icon: <CalendarDays className="h-4 w-4" />, help: "Days logged / expected" },
  ];
}

function exportCsv(filename: string, rows: Array<Record<string, string | number>>) { const header = Object.keys(rows[0] || {}).join(","); const body = rows.map(r => Object.values(r).join(",")).join("\n"); const blob = new Blob([header + "\n" + body], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); }

const StickyControls: React.FC<{ type: WorkoutType; setType: (t: WorkoutType) => void; range: RangeKey; setRange: (r: RangeKey) => void; compare: boolean; setCompare: (b: boolean) => void; }> = ({ type, setType, range, setRange, compare, setCompare }) => (
  <div className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-background/70 bg-background/90 border-b border-[var(--border)]">
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-[var(--muted-foreground)]" htmlFor="workoutType">Workout Type</label>
        <div className="relative">
          <select id="workoutType" value={type} onChange={e => setType(e.target.value as WorkoutType)} className="input-modern w-44 pr-8 pl-3 py-2 rounded-xl bg-[var(--input)] border border-[var(--input-border)] text-foreground shadow-sm">
            <option value="cardio">Cardio</option>
            <option value="strength">Strength</option>
            <option value="body">Body Measurements</option>
          </select>
          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">▾</div>
        </div>
      </div>
      <div className="flex items-center gap-1 rounded-2xl p-1 bg-[var(--muted)] ml-auto">
        {([{ k: "week", label: "Week" }, { k: "3m", label: "3-Month" }, { k: "6m", label: "6-Month" }] as const).map(opt => (
          <button key={opt.k} onClick={() => setRange(opt.k)} className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition ${range === opt.k ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow" : "text-[var(--muted-foreground)] hover:text-foreground"}`}>{opt.label}</button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] cursor-pointer">
        <input type="checkbox" checked={compare} onChange={e => setCompare(e.target.checked)} className="accent-[var(--primary)]" />
        Compare to previous period
      </label>
    </div>
  </div>
);

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (<div className={`animate-pulse rounded-lg bg-foreground/5 ${className ?? ""}`} />);

function InternalProgressScreen() {
  const [type, setType] = React.useState<WorkoutType>("cardio");
  const [range, setRange] = React.useState<RangeKey>("week");
  const [compare, setCompare] = React.useState(false);
  const [loading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const data = useMemo(() => mockSeries(type, range), [type, range]);
  const prev = useMemo(() => (compare ? previousPeriod(data) : []), [compare, data]);
  const kpis = useMemo(() => getKpis(type, range, data), [type, range, data]);
  const empty = data.length === 0;

  const handleExport = () => exportCsv(`progress_${type}_${range}.csv`, data.map(d => ({ date: d.date, value: d.value })));

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[var(--soft-gray)] via-[var(--background)] to-[var(--warm-cream)]/30">
      <StickyControls type={type} setType={setType} range={range} setRange={setRange} compare={compare} setCompare={setCompare} />
      <div className="max-w-7xl mx-auto pt-6 px-4 md:px-6 grid gap-6">
        <div className="flex items-center gap-3 justify-end">
          <button onClick={handleExport} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-[var(--muted)] text-foreground hover:bg-[var(--muted)]/80 transition"><Download className="h-4 w-4" /> Export CSV</button>
        </div>
        {error && (<div className="p-3 rounded-xl border border-[var(--destructive)]/30 bg-[var(--destructive-light)] text-[var(--destructive)]">{error}<button onClick={() => setError(null)} className="ml-3 underline">Retry</button></div>)}
        {loading && (<div className="grid md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>)}
        {empty && !loading && (
          <Card className="border-0 shadow-sm bg-white/70"><CardContent className="py-10 grid place-items-center text-center"><div className="text-2xl font-semibold text-foreground">No data yet</div><div className="text-[var(--muted-foreground)] mt-2">Start logging to see your progress here.</div><button className="mt-4 px-4 py-2 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)]">Log a workout</button></CardContent></Card>
        )}
        {!empty && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((k) => (
              <Card key={k.label} className="border-0 shadow-sm bg-white/70"><CardHeader className="pb-2"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[var(--muted-foreground)] text-sm">{k.icon}<span>{k.label}</span></div><span className={`text-xs px-2 py-0.5 rounded-full ${(k.deltaPct ?? 0) >= 0 ? "bg-[var(--success-light)] text-[var(--success)]" : "bg-[var(--destructive-light)] text-[var(--destructive)]"}`}>{fmtPct(k.deltaPct)}</span></div></CardHeader><CardContent><div className="text-2xl font-bold text-foreground">{k.value}</div><div className="text-[var(--muted-foreground)] text-xs mt-1 flex items-center gap-1"><Info className="h-3.5 w-3.5" /> {k.help}</div></CardContent></Card>
            ))}
          </div>
        )}
        {!empty && (
          <Card className="border-0 shadow-sm bg-white/70"><CardHeader className="pb-2"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[var(--muted-foreground)]"><TrendingUp className="h-4 w-4" /><span>Trend</span></div><Badge className="bg-[var(--muted)] text-foreground">{range.toUpperCase()}</Badge></div></CardHeader><CardContent className="space-y-4"><div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%">{type === "body" ? (<LineChart data={data as BodyPoint[]} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--ring-track-gray-hsl))" /><XAxis dataKey="date" tick={{ fontSize: 12 }} /><YAxis yAxisId="left" tick={{ fontSize: 12 }} /><YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} /><ReTooltip /><Legend /><Line yAxisId="left" type="monotone" dataKey="weight_kg" stroke="hsl(var(--warm-sage-hsl))" strokeWidth={2} dot={false} name="Weight (kg)" /><Line yAxisId="right" type="monotone" dataKey="body_fat_pct" stroke="hsl(var(--warm-coral-hsl))" strokeWidth={2} dot={false} name="Body Fat %" />{compare && <Line type="monotone" data={prev} dataKey="value" stroke="hsl(var(--soft-gray-hsl))" strokeWidth={1} dot={false} name="Prev" />}</LineChart>) : type === "strength" ? (<AreaChart data={data as StrengthPoint[]} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}><defs><linearGradient id="vol" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--warm-coral-hsl))" stopOpacity={0.5} /><stop offset="95%" stopColor="hsl(var(--warm-coral-hsl))" stopOpacity={0.05} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--ring-track-gray-hsl))" /><XAxis dataKey="date" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><ReTooltip /><Legend /><Area type="monotone" dataKey="total_volume" stroke="hsl(var(--warm-coral-hsl))" fill="url(#vol)" name="Total Volume" />{compare && <Line type="monotone" data={prev} dataKey="value" stroke="hsl(var(--soft-gray-hsl))" strokeWidth={1} dot={false} name="Prev" />}</AreaChart>) : (<AreaChart data={data as CardioPoint[]} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}><defs><linearGradient id="dist" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--warm-sage-hsl))" stopOpacity={0.5} /><stop offset="95%" stopColor="hsl(var(--warm-sage-hsl))" stopOpacity={0.05} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--ring-track-gray-hsl))" /><XAxis dataKey="date" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><ReTooltip /><Legend /><Area type="monotone" dataKey="distance_km" stroke="hsl(var(--warm-sage-hsl))" fill="url(#dist)" name="Distance (km)" />{compare && <Line type="monotone" data={prev} dataKey="value" stroke="hsl(var(--soft-gray-hsl))" strokeWidth={1} dot={false} name="Prev" />}</AreaChart>)}</ResponsiveContainer></div><div className="h-10"><ResponsiveContainer><LineChart data={data}><Line type="monotone" dataKey="value" stroke="hsl(var(--accent-blue-hsl))" strokeWidth={1.5} dot={false} /></LineChart></ResponsiveContainer></div></CardContent></Card>
        )}
        {!empty && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm bg-white/70"><CardHeader className="pb-2"><div className="flex items-center gap-2 text-[var(--muted-foreground)]"><Flame className="h-4 w-4" /> <span>{type === "cardio" ? "Zones" : type === "strength" ? "Volume by Group" : "Weight Histogram"}</span></div></CardHeader><CardContent className="h-64"><ResponsiveContainer width="100%" height="100%">{type === "body" ? (<BarChart data={[20,30,45,60,50,30,15].map((v,i)=>({bucket:`${60+i*2}-${62+i*2}kg`, n:v}))}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--ring-track-gray-hsl))" /><XAxis dataKey="bucket" tick={{ fontSize: 10 }} interval={0} angle={-20} height={40} /><YAxis tick={{ fontSize: 12 }} /><ReTooltip /><Bar dataKey="n" fill="hsl(var(--warm-peach-hsl))" /></BarChart>) : (<BarChart data={[{ zone: "Z1", v: 12 }, { zone: "Z2", v: 22 }, { zone: "Z3", v: 31 }, { zone: "Z4", v: 18 }, { zone: "Z5", v: 9 }]}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--ring-track-gray-hsl))" /><XAxis dataKey="zone" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><ReTooltip /><Bar dataKey="v" fill={type === "cardio" ? "hsl(var(--warm-sage-hsl))" : "hsl(var(--warm-coral-hsl))"} /></BarChart>)}</ResponsiveContainer></CardContent></Card>
            <Card className="border-0 shadow-sm bg-white/70"><CardHeader className="pb-2"><div className="flex items-center gap-2 text-[var(--muted-foreground)]"><CalendarDays className="h-4 w-4" /><span>Consistency</span></div></CardHeader><CardContent><div className="grid grid-cols-7 gap-1">{Array.from({ length: 7 * 6 }).map((_, i) => { const val = Math.random(); const c = val > 0.66 ? "bg-[var(--primary)]/90" : val > 0.33 ? "bg-[var(--primary)]/60" : "bg-[var(--primary)]/30"; return <div key={i} className={`h-6 rounded ${c}`} aria-label={`Day ${i+1} activity`} />; })}</div></CardContent></Card>
          </div>
        )}
        {!empty && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm bg-white/70"><CardHeader className="pb-2"><div className="flex items-center gap-2 text-[var(--muted-foreground)]"><TrendingUp className="h-4 w-4" /> <span>Highlights</span></div></CardHeader><CardContent><ul className="space-y-2 text-sm">{type === "cardio" && (<><li>Fastest 5K: 24:12</li><li>Longest run: 14.2 km</li><li>Best avg pace week: 5:09/km</li></>)}{type === "strength" && (<><li>Top 1RM Bench: 110 kg</li><li>Top 1RM Squat: 160 kg</li><li>Heaviest set: 180 kg x 3</li></>)}{type === "body" && (<><li>Change since start: -1.4 kg</li><li>Best 4-week trend: -0.8 kg</li></>)}</ul></CardContent></Card>
            <Card className="border-0 shadow-sm bg-white/70"><CardHeader className="pb-2"><div className="flex items-center gap-2 text-[var(--muted-foreground)]"><Activity className="h-4 w-4" /><span>Recent Sessions</span></div></CardHeader><CardContent className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="sticky top-0 bg-white/70"><tr className="text-left text-[var(--muted-foreground)]"><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Title</th><th className="py-2 pr-4">Metric</th><th className="py-2">Trend</th></tr></thead><tbody>{Array.from({ length: 6 }).map((_, i) => (<tr key={i} className="border-t border-[var(--border)]/50"><td className="py-2 pr-4 whitespace-nowrap">{toDate(addDays(new Date(), -i))}</td><td className="py-2 pr-4 truncate max-w-[12rem]">{type === "cardio" ? "Easy run" : type === "strength" ? "Upper body" : "Weigh-in"}</td><td className="py-2 pr-4 text-right">{type === "cardio" ? `${(5 + Math.random()*5).toFixed(1)} km` : type === "strength" ? `${Math.round(9000 + Math.random()*5000)} kg` : `${(70 + Math.random()).toFixed(1)} kg`}</td><td className="py-2 w-32"><div className="h-8"><ResponsiveContainer><LineChart data={Array.from({ length: 10 }).map((__, j) => ({ x: j, y: 10 + Math.random() * 5 }))}><Line type="monotone" dataKey="y" stroke="hsl(var(--accent-blue-hsl))" strokeWidth={1} dot={false} /></LineChart></ResponsiveContainer></div></td></tr>))}</tbody></table></CardContent></Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProgressScreen() { return <InternalProgressScreen />; }
export { InternalProgressScreen as ProgressScreen };

