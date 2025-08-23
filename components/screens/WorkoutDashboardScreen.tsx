import { useState, useEffect } from "react";
import { TactileButton } from "../TactileButton";
import { MoreVertical, AlertCircle, Clock3 as Clock, TrendingUp } from "lucide-react";
import { useStepTracking } from "../../hooks/useStepTracking";
import { useScrollToTop } from "../../hooks/useScrollToTop";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";
import { supabaseAPI, UserRoutine } from "../../utils/supabase/supabase-api";
import { useAuth } from "../AuthContext";
import { toast } from "sonner";

interface WorkoutDashboardScreenProps {
  onCreateRoutine: () => void;
  onSelectRoutine: (routineId: number, routineName: string) => void;
  onOverlayChange?: (open: boolean) => void;
}

/* ---------- CircularStat (with text overrides) ---------- */
function CircularStat({
  value,
  max = 100,
  label,
  unit = "%",
  size = 112,
  strokeWidth = 10,
  decimals = 0,
  trackColor = "#e5e7eb",     // gray-200
  progressColor = "#e07a5f",  // warm coral
  textColor = "#3d2914",      // warm brown
  primaryTextOverride, // If provided, replaces the large number text in the center */
  secondaryTextOverride, // If provided, replaces the small unit text below the number */
}: {
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
  primaryTextOverride?: string | null;
  secondaryTextOverride?: string | null;
}) {
  const safeValue =
    typeof value === "number" && isFinite(value) ? Math.max(0, Math.min(value, max)) : null;
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
            <stop offset="0%" stopColor={progressColor} />
            <stop offset="100%" stopColor={progressColor} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
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
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={safeValue ?? undefined}
          role="progressbar"
        />
        <g transform={`translate(${size / 2}, ${size / 2})`}>
          <text
            textAnchor="middle"
            dominantBaseline="central"
            style={{ fontSize: size * 0.24, fontWeight: 700, fill: textColor }}
          >
            {primaryTextOverride ?? (safeValue == null ? "—" : safeValue.toFixed(decimals))}
          </text>
          <text
            y={size * 0.18}
            textAnchor="middle"
            dominantBaseline="hanging"
            style={{ fontSize: size * 0.14, fontWeight: 600, fill: textColor, opacity: 0.5 }}
          >
            {secondaryTextOverride ?? unit}
          </text>
        </g>
      </svg>
      <div className="mt-2 text-xs" style={{ color: textColor, opacity: 0.75 }}>
        {label}
      </div>
    </div>
  );
}

/* ---------- ProgressRings (Steps shows "steps / goal" while ring still uses %) ---------- */
function ProgressRings({
  steps,
  goal,
  recoveryPercent,
  strain,
  onStepsClick,
  onRecoveryClick,
  onStrainClick,
}: {
  steps: number | null | undefined;
  goal: number | null | undefined;
  recoveryPercent?: number | null;
  strain?: number | null;
  onStepsClick?: () => void;
  onRecoveryClick?: () => void;
  onStrainClick?: () => void;
}) {
  const css =
    typeof window !== "undefined" && typeof document !== "undefined"
      ? getComputedStyle(document.documentElement)
      : null;
  const warmBrown = css?.getPropertyValue("--foreground")?.trim() || "#3d2914";
  const warmCoral = css?.getPropertyValue("--primary")?.trim() || "#e07a5f";
  const accentBlue = css?.getPropertyValue("--accent-blue")?.trim() || "#4aa3df";

  const percent =
    steps != null && goal != null ? Math.round((steps / Math.max(goal, 1)) * 100) : null;
  const fmt = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString());

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3 px-1">
        {/* Steps: arc based on %, center text shows "steps / goal" */}
        <button className="touch-manipulation" onClick={onStepsClick} aria-label="Steps progress">
          <CircularStat
            value={percent}
            max={100}
            label="Steps"
            unit="%"
            size={108}
            strokeWidth={10}
            textColor={warmBrown}
            progressColor={accentBlue}
            trackColor="#d1d5db"
            primaryTextOverride={fmt(steps)}
            secondaryTextOverride={`${fmt(goal)}`}
          />
        </button>

        {/* Recovery: unchanged */}
        <button className="touch-manipulation" onClick={onRecoveryClick} aria-label="Recovery progress">
          <CircularStat
            value={recoveryPercent ?? null}
            max={100}
            label="Recovery"
            unit="%"
            size={108}
            strokeWidth={10}
            textColor={warmBrown}
            progressColor={"#f2c94c"}
            trackColor="#d1d5db"
          />
        </button>

        {/* Strain: unchanged */}
        <button className="touch-manipulation" onClick={onStrainClick} aria-label="Strain">
          <CircularStat
            value={strain ?? null}
            max={10} // or 21 if you prefer
            label="Strain"
            unit=""
            size={108}
            strokeWidth={10}
            decimals={1}
            textColor={warmBrown}
            progressColor={warmCoral}
            trackColor="#d1d5db"
          />
        </button>
      </div>
      <div className="mt-3 h-px bg-black/5" />
    </div>
  );
}
/* -------------------------------------------------------------------------- */

/** 🎨 App-palette avatars */
const avatarPalette = [
  { bg: "bg-[var(--soft-gray)]",  iconBg: "bg-[var(--warm-coral)]", emoji: "🏋️" },
  { bg: "bg-[var(--warm-cream)]", iconBg: "bg-[var(--warm-brown)]", emoji: "🏃" },
  { bg: "bg-[var(--soft-gray)]",  iconBg: "bg-[var(--warm-sage)]",  emoji: "🧘" },
  { bg: "bg-[var(--warm-cream)]", iconBg: "bg-[var(--warm-coral)]", emoji: "🤸" },
  { bg: "bg-[var(--soft-gray)]",  iconBg: "bg-[var(--warm-brown)]", emoji: "🔥" },
];

export function WorkoutDashboardScreen({
  onCreateRoutine,
  onSelectRoutine,
  onOverlayChange,
}: WorkoutDashboardScreenProps) {
  const scrollRef = useScrollToTop();
  useKeyboardInset();
  const { userToken } = useAuth();

  const [routines, setRoutines] = useState<UserRoutine[]>([]);
  const [isLoadingRoutines, setIsLoadingRoutines] = useState(true);
  const [routinesError, setRoutinesError] = useState<string | null>(null);

  // only need exercise counts for time (10 min per exercise)
  const [exerciseCounts, setExerciseCounts] = useState<Record<number, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(false);

  // bottom-sheet
  const [actionRoutine, setActionRoutine] = useState<UserRoutine | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { steps, goal, isLoading: isLoadingSteps } = useStepTracking(true);

  const reloadRoutines = async () => {
    const data = await supabaseAPI.getUserRoutines();
    setRoutines(data);
  };

  // initial routines
  useEffect(() => {
    const fetchInitial = async () => {
      if (!userToken) return;
      setIsLoadingRoutines(true);
      setRoutinesError(null);
      try {
        await reloadRoutines();
      } catch (error) {
        console.error(error);
        setRoutinesError(
          error instanceof Error ? error.message : "Failed to load routines"
        );
      } finally {
        setIsLoadingRoutines(false);
      }
    };
    fetchInitial();
  }, [userToken]);

  // compute exercise counts for each routine (for time display)
  useEffect(() => {
    let cancelled = false;

    const fetchExerciseCounts = async () => {
      if (!userToken || routines.length === 0) {
        setExerciseCounts({});
        return;
      }
      setLoadingCounts(true);
      try {
        const entries: Array<[number, number]> = [];
        const needsRecompute: number[] = [];

        // get counts and note which routines lack a summary
        for (const r of routines) {
          const list = await supabaseAPI.getUserRoutineExercises(r.routine_template_id);
          const active = (Array.isArray(list) ? list : []).filter(x => x.is_active !== false);
          entries.push([r.routine_template_id, active.length]);

          const summary = (r as any).muscle_group_summary as string | undefined;
          if (active.length > 0 && (!summary || summary.trim() === "")) {
            needsRecompute.push(r.routine_template_id);
          }
        }

        if (!cancelled) {
          setExerciseCounts(Object.fromEntries(entries));
        }

        // recompute + persist summaries that are empty but have exercises
        if (needsRecompute.length > 0) {
          const results = await Promise.allSettled(
            needsRecompute.map(id => supabaseAPI.recomputeAndSaveRoutineMuscleSummary(id))
          );

          // (optional) update local routines so UI reflects it immediately
          if (!cancelled) {
            const summariesById = new Map<number, string>();
            needsRecompute.forEach((id, i) => {
              const res = results[i];
              if (res.status === "fulfilled") summariesById.set(id, res.value || "");
            });
            if (summariesById.size) {
              setRoutines(prev =>
                prev.map(rt =>
                  summariesById.has(rt.routine_template_id)
                    ? ({ ...rt, muscle_group_summary: summariesById.get(rt.routine_template_id) } as any)
                    : rt
                )
              );
            }
          }
        }
      } catch (e) {
        console.error("Failed to load exercise counts / recompute summaries", e);
      } finally {
        if (!cancelled) setLoadingCounts(false);
      }
    };

    fetchExerciseCounts();
    return () => { cancelled = true; };
  }, [userToken, routines]);

  // make sure bottom-nav is restored if unmounting with sheet open
  useEffect(() => {
    return () => {
      if (actionRoutine) onOverlayChange?.(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openActions = (routine: UserRoutine, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionRoutine(routine);
    setRenaming(false);
    setRenameValue(routine.name);
    setConfirmDelete(false);
    onOverlayChange?.(true);
  };
  const closeActions = () => {
    setActionRoutine(null);
    setRenaming(false);
    setConfirmDelete(false);
    onOverlayChange?.(false);
  };

  const handleRenameSubmit = async () => {
    if (!actionRoutine) return;
    const nextName = renameValue.trim();
    if (!nextName) {
      toast.error("Name cannot be empty");
      return;
    }
    try {
      await supabaseAPI.renameRoutine(actionRoutine.routine_template_id, nextName);
      await reloadRoutines();
      toast.success("Routine renamed");
      closeActions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename routine");
    }
  };

  const handleDeleteRoutine = async () => {
    if (!actionRoutine) return;
    try {
      await supabaseAPI.deleteRoutine(actionRoutine.routine_template_id);
      await reloadRoutines();
      toast.success("Routine deleted");
      closeActions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete routine");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div ref={scrollRef} className="min-h-[100dvh] pt-safe p-6 space-y-6 max-w-md mx-auto pb-20 pb-safe">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-[var(--warm-brown)] mt-1">
          My Routines
        </h1>
        <p className="text-sm text-[var(--warm-brown)]/60 mt-1">
          Select a routine to start your workout
        </p>
      </div>

      {/* NEW: Whoop-style progress rings row (placed ABOVE Create Routine) */}
      <ProgressRings
        steps={isLoadingSteps ? null : steps}
        goal={isLoadingSteps ? null : goal}
        recoveryPercent={null} // placeholder until you have data
        strain={null}          // placeholder until you have data
        onStepsClick={() => {}}
        onRecoveryClick={() => {}}
        onStrainClick={() => {}}
      />

      <div className="flex items-center justify-end">
        <TactileButton
          onClick={onCreateRoutine}
          className="bg-[var(--warm-coral)] hover:bg-[var(--warm-coral)]/90 text-white px-4 py-2 text-sm font-medium rounded-xl"
        >
          Create Routine
        </TactileButton>
      </div>

      {isLoadingRoutines ? (
        <div className="text-center py-8">
          <div className="animate-spin mx-auto mb-3 w-6 h-6 border-2 border-[var(--warm-coral)] border-t-transparent rounded-full"></div>
          <p className="text-[var(--warm-brown)]/60 text-sm">Loading routines...</p>
        </div>
      ) : routinesError ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-red-600 text-sm mb-3">{routinesError}</p>
          <TactileButton onClick={reloadRoutines} variant="secondary" className="px-4 py-2 text-sm">
            Try Again
          </TactileButton>
        </div>
      ) : routines.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[var(--warm-brown)]/60 text-sm mb-3">
            Start by adding a new routine
          </p>
          <TactileButton
            onClick={onCreateRoutine}
            className="bg-[var(--warm-coral)] hover:bg-[var(--warm-coral)]/90 text-white px-4 py-2 text-sm font-medium rounded-xl"
          >
            Create Your First Routine
          </TactileButton>
        </div>
      ) : (
        <div className="space-y-3">
          {routines.map((routine, idx) => {
            const palette = avatarPalette[idx % avatarPalette.length];

            // precomputed summary string from DB (kept up-to-date when editing)
            const muscleGroups =
              ((routine as any).muscle_group_summary as string | undefined)?.trim() || "—";

            // exercise count drives time (10 min per exercise)
            const exerciseCount = exerciseCounts[routine.routine_template_id] ?? 0;
            const timeMin = exerciseCount > 0 ? exerciseCount * 10 : null;

            return (
              <div
                key={routine.routine_template_id}
                onClick={() =>
                  onSelectRoutine(routine.routine_template_id, routine.name)
                }
                className="relative flex items-center gap-3 bg-white shadow-sm hover:shadow-md transition-all rounded-2xl p-4 border border-[var(--border)]"
              >
                {/* kebab vertically centered */}
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-[var(--soft-gray)]/60"
                  onClick={(e) => openActions(routine, e)}
                  aria-label="More options"
                >
                  <MoreVertical size={18} className="text-[var(--warm-brown)]/70" />
                </button>

                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${palette.bg}`}>
                  <div className={`w-8 h-8 ${palette.iconBg} rounded-lg grid place-items-center text-white text-lg`}>
                    <span>{palette.emoji}</span>
                  </div>
                </div>

                {/* padding so text doesn't run under kebab */}
                <div className="flex-1 min-w-0 pr-16">
                  <h3 className="font-medium text-[var(--warm-brown)] truncate">
                    {routine.name}
                  </h3>

                  {/* muscle groups line */}
                  <p className="text-xs text-[var(--warm-brown)]/60 truncate">
                    {muscleGroups}
                  </p>

                  {/* time (10 min/exercise) + exercise count */}
                  <div className="mt-2 flex items-center gap-4 text-xs text-[var(--warm-brown)]/70">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={14} />
                      {loadingCounts ? "—" : timeMin !== null ? `${timeMin} min` : "—"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp size={14} />
                      {loadingCounts ? "—" : `${exerciseCount} exercise${exerciseCount === 1 ? "" : "s"}`}
                    </span>
                  </div>

                  <p className="mt-1 text-[10px] text-[var(--warm-brown)]/40">
                    Created {formatDate(routine.created_at)} • v{routine.version}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* bottom sheet */}
      {actionRoutine && (
        <div className="fixed inset-0 z-50" aria-modal="true" role="dialog" onClick={closeActions}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <div className="absolute inset-x-0 bottom-0" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto w-full max-w-md px-4 pb-[env(safe-area-inset-bottom)]">
              <div className="bg-white rounded-t-2xl shadow-2xl border-t border-x border-[var(--border)] overflow-hidden">
                <div className="flex justify-center py-2">
                  <div className="h-1.5 w-10 rounded-full bg-gray-200" />
                </div>

                <div className="px-4 pb-2">
                  <p className="text-xs text-gray-500">Routine</p>
                  <h3 className="font-medium text-[var(--warm-brown)] truncate">
                    {actionRoutine.name}
                  </h3>
                </div>

                <div className="h-px bg-[var(--border)]" />

                {!renaming && !confirmDelete ? (
                  <div className="p-2">
                    <button
                      className="w-full text-left px-3 py-3 rounded-lg hover:bg-gray-50"
                      onClick={() => setRenaming(true)}
                    >
                      Rename
                    </button>
                    <button
                      className="w-full text-left px-3 py-3 rounded-lg hover:bg-red-50 text-red-600"
                      onClick={() => setConfirmDelete(true)}
                    >
                      Delete
                    </button>

                    <div className="pt-1">
                      <TactileButton
                        variant="secondary"
                        className="w-full py-3"
                        onClick={closeActions}
                      >
                        Cancel
                      </TactileButton>
                    </div>
                  </div>
                ) : null}

                {renaming && !confirmDelete && (
                  <div className="p-4 space-y-3">
                    <label className="text-sm text-gray-600">New name</label>
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--warm-coral)]/30 focus:border-[var(--warm-coral)]"
                      placeholder="Enter routine name"
                    />
                    <div className="flex gap-3 pt-1">
                      <TactileButton
                        className="flex-1"
                        onClick={handleRenameSubmit}
                        disabled={!renameValue.trim()}
                      >
                        Save
                      </TactileButton>
                      <TactileButton
                        variant="secondary"
                        className="flex-1"
                        onClick={() => setRenaming(false)}
                      >
                        Cancel
                      </TactileButton>
                    </div>
                  </div>
                )}

                {confirmDelete && (
                  <div className="p-4 space-y-3">
                    <p className="text-sm text-gray-700">
                      Delete <span className="font-medium">{actionRoutine.name}</span>?
                      <br />
                      <span className="text-gray-500">This will remove it from your list</span>
                    </p>
                    <div className="flex gap-3 pt-1">
                      <TactileButton
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        onClick={handleDeleteRoutine}
                      >
                        Delete
                      </TactileButton>
                      <TactileButton
                        variant="secondary"
                        className="flex-1"
                        onClick={() => setConfirmDelete(false)}
                      >
                        Cancel
                      </TactileButton>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
