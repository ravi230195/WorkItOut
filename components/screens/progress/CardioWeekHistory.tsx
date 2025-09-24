import { useMemo, useState, type PropsWithChildren } from "react";
import {
  Activity,
  BarChart3,
  Calendar,
  ChevronDown,
  Clock,
  Dumbbell,
  Flame,
  Footprints,
  MapPin,
  Target,
  Timer,
  Trophy,
  Zap,
} from "lucide-react";

const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

function Card({ className, children }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        "rounded-3xl border shadow-xl bg-white/95 backdrop-blur-sm",
        "border-[rgba(224,122,95,0.15)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Badge({ className, children }: PropsWithChildren<{ className?: string }>) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", className)}>
      {children}
    </span>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[11px] leading-none text-black/60">{children}</span>
);

const Value = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[13px] font-medium text-black">{children}</span>
);

type Day = (typeof DATA.days)[number];
type DayKey = Day["key"];

const DATA = {
  days: [
    {
      key: "today",
      dateLabel: "Today, Dec 15",
      dailyTotals: { calories: 450, time: "1h 23m", distance: "2.3 km", steps: 3420 },
      workouts: [
        {
          id: 1,
          type: "strength",
          name: "Upper Push",
          time: "6:30 AM",
          duration: "45 min",
          exercises: 6,
          sets: 18,
          calories: 320,
          volume: "2,450 kg",
          personalRecords: 2,
        },
        {
          id: 2,
          type: "cardio",
          name: "Cardio Walk",
          time: "2:15 PM",
          duration: "38 min",
          distance: "2.3 km",
          steps: 3420,
          calories: 130,
        },
        {
          id: 7,
          type: "cardio",
          name: "Zone 2 Ride",
          time: "7:45 PM",
          duration: "30 min",
          distance: "8.0 km",
          calories: 210,
        },
      ],
    },
    {
      key: "mon",
      dateLabel: "Mon, Dec 16",
      dailyTotals: { calories: 1040, time: "1h 46m", distance: "6.1 km", steps: 8920 },
      workouts: [
        {
          id: 3,
          type: "strength",
          name: "Lower Body — Legs",
          time: "6:10 AM",
          duration: "48 min",
          exercises: 8,
          sets: 22,
          calories: 620,
          volume: "5,600 kg",
        },
        {
          id: 4,
          type: "hiit",
          name: "Evening HIIT",
          time: "7:20 PM",
          duration: "28 min",
          calories: 420,
          avgHR: 164,
          rpe: "3/5",
        },
      ],
    },
    {
      key: "sun",
      dateLabel: "Sun, Dec 14",
      dailyTotals: { calories: 1385, time: "2h 12m", distance: "14.8 km", steps: 17430 },
      workouts: [
        {
          id: 5,
          type: "cardio",
          name: "Long Run",
          time: "9:00 AM",
          duration: "1h 22m",
          distance: "12.1 km",
          calories: 860,
        },
        {
          id: 6,
          type: "mobility",
          name: "Mobility & Core",
          time: "6:30 PM",
          duration: "50 min",
          exercises: 9,
          rounds: 3,
          calories: 525,
        },
      ],
    },
  ],
} as const;

type WeekStripProps = {
  value: DayKey;
  onChange: (value: DayKey) => void;
  embedded?: boolean;
};

function WeekStrip({ value, onChange, embedded = false }: WeekStripProps) {
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  const clickable: Record<number, DayKey> = { 0: "mon", 2: "today", 6: "sun" };
  const currentEntry = Object.entries(clickable).find(([, key]) => key === value);
  const currentIndex = currentEntry ? currentEntry[0] : undefined;

  return (
    <div className={cn(embedded ? "rounded-xl border bg-white/70 p-2 mb-1" : "rounded-2xl border bg-white/70 p-2")}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-black/60 ml-1">Week so far</span>
        <div className="flex gap-1">
          {labels.map((label, index) => {
            const isActive = String(index) === currentIndex;
            const isEnabled = index in clickable;
            const dayKey = clickable[index];
            return (
              <button
                key={`${label}-${index}`}
                onClick={() => isEnabled && onChange(dayKey)}
                className={cn(
                  "w-7 h-7 rounded-full grid place-items-center text-[11px] border",
                  isEnabled ? "hover:bg-black/5" : "opacity-40 cursor-default",
                  isActive &&
                    "bg-[rgba(224,122,95,0.18)] border-[rgba(224,122,95,0.25)] text-[var(--warm-brown,#3b332e)]",
                )}
                type="button"
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type UnifiedDailyWorkoutCardInnerProps = {
  dayKey: DayKey;
  setDayKey: (value: DayKey) => void;
};

function UnifiedDailyWorkoutCardInner({ dayKey, setDayKey }: UnifiedDailyWorkoutCardInnerProps) {
  const day = useMemo(() => DATA.days.find((entry) => entry.key === dayKey) ?? DATA.days[0], [dayKey]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  return (
    <Card className="w-full max-w-sm bg-white overflow-hidden">
      <div className="p-3 pb-0">
        <WeekStrip value={day.key} onChange={setDayKey} embedded />
      </div>

      <div className="p-3 pt-2">
        <div className="grid grid-cols-[auto,1fr] items-center gap-2">
          <div className="inline-flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[rgb(224,122,95)]" />
            <span className="text-sm font-medium">{day.dateLabel}</span>
          </div>
          <div className="justify-self-end grid grid-flow-col auto-cols-max gap-1.5">
            {[
              { Icon: Flame, value: day.dailyTotals.calories },
              { Icon: Clock, value: day.dailyTotals.time },
              { Icon: MapPin, value: day.dailyTotals.distance },
              { Icon: Footprints, value: day.dailyTotals.steps },
            ].map(({ Icon, value }, index) => (
              <div
                key={index}
                className="h-8 px-2 rounded-lg border bg-white/80 inline-flex items-center gap-1"
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium leading-none">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-3">
        <div className="h-px bg-black/10" />
      </div>

      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Activity className="w-3.5 h-3.5 text-black/60" />
          <h4 className="text-xs text-black/80">Workouts</h4>
        </div>

        <div className={cn(day.workouts.length > 2 ? "space-y-2 overflow-y-auto max-h-56 pr-1 -mr-1" : "space-y-2")}>
          {day.workouts.map((workout) => {
            const isStrength = "sets" in workout;
            const isOpen = Boolean(expanded[workout.id]);
            const metric2 = isStrength ? (workout as { exercises: number }).exercises : (workout as { distance?: string }).distance;
            const label2 = isStrength ? "exercises" : "distance";
            const metric3 = isStrength
              ? (workout as { sets: number }).sets
              : ("steps" in workout ? (workout as { steps: number }).steps : "—");
            const label3 = isStrength ? "sets" : "steps";

            return (
              <button
                key={workout.id}
                onClick={() =>
                  setExpanded((previous) => ({ ...previous, [workout.id]: !previous[workout.id] }))
                }
                className={cn(
                  "group w-full rounded-2xl border p-3 text-left transition-all",
                  "bg-gradient-to-r from-[rgba(245,240,236,0.6)] to-[rgba(245,240,236,0.3)]",
                  "border-[rgba(224,122,95,0.25)] hover:border-[rgba(224,122,95,0.4)]",
                )}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full grid place-items-center border shrink-0",
                        isStrength
                          ? "bg-[rgba(224,122,95,0.16)] border-[rgba(224,122,95,0.25)]"
                          : "bg-[rgba(92,140,120,0.16)] border-[rgba(92,140,120,0.25)]",
                      )}
                    >
                      {isStrength ? (
                        <Dumbbell className="w-3.5 h-3.5 text-[rgb(224,122,95)]" />
                      ) : (
                        <Activity className="w-3.5 h-3.5 text-[rgb(92,140,120)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h5 className="text-[14px] font-medium text-black truncate">{workout.name}</h5>
                        {"personalRecords" in workout && workout.personalRecords ? (
                          <Badge className="bg-[rgba(224,122,95,0.1)] text-[rgb(224,122,95)] border-[rgba(224,122,95,0.2)] h-5">
                            <Trophy className="w-3 h-3 mr-1" />
                            {workout.personalRecords}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-0.5">
                        <Label>{workout.time}</Label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="flex flex-col items-center">
                      <Timer className="w-3.5 h-3.5 text-black/50" />
                      <Value>{workout.duration}</Value>
                      <Label>duration</Label>
                    </div>
                    <div className="flex flex-col items-center">
                      <Target className="w-3.5 h-3.5 text-black/50" />
                      <Value>{metric2}</Value>
                      <Label>{label2}</Label>
                    </div>
                    <div className="flex flex-col items-center">
                      <BarChart3 className="w-3.5 h-3.5 text-black/50" />
                      <Value>{metric3}</Value>
                      <Label>{label3}</Label>
                    </div>
                    <div className="flex flex-col items-center">
                      <Zap className="w-3.5 h-3.5 text-[rgb(224,122,95)]/80" />
                      <Value>{workout.calories}</Value>
                      <Label>calories</Label>
                    </div>
                  </div>

                  <ChevronDown className={cn("w-4 h-4 text-black/40 transition-transform", isOpen && "rotate-180")} />
                </div>

                <div
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
                    isOpen ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="rounded-xl border bg-white/70 p-3 text-sm text-black/70">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          Duration: <span className="font-medium text-black">{workout.duration}</span>
                        </div>
                        <div>
                          {label2.charAt(0).toUpperCase() + label2.slice(1)}:{" "}
                          <span className="font-medium text-black">{metric2}</span>
                        </div>
                        <div>
                          {label3.charAt(0).toUpperCase() + label3.slice(1)}:{" "}
                          <span className="font-medium text-black">{metric3}</span>
                        </div>
                        <div>
                          Calories: <span className="font-medium text-black">{workout.calories}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

export function CardioWeekHistory() {
  const [dayKey, setDayKey] = useState<DayKey>("today");

  return <UnifiedDailyWorkoutCardInner dayKey={dayKey} setDayKey={setDayKey} />;
}

export default CardioWeekHistory;
