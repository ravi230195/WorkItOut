import { useState, useEffect } from "react";
import { TactileButton } from "../TactileButton";
import { MoreVertical, AlertCircle, Clock3 as Clock, TrendingUp } from "lucide-react";
import { useStepTracking } from "../../hooks/useStepTracking";
import { useScrollToTop } from "../../hooks/useScrollToTop";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";
import { supabaseAPI, UserRoutine } from "../../utils/supabase/supabase-api";
import { useAuth } from "../AuthContext";
import { toast } from "sonner";
import ProgressRings from "../circularStat/ProgressRings";

interface WorkoutDashboardScreenProps {
  onCreateRoutine: () => void;
  onSelectRoutine: (routineId: number, routineName: string) => void;
  onOverlayChange?: (open: boolean) => void;
}

/** 🎨 App-palette avatars */
const avatarPalette = [
  { bg: "bg-[var(--soft-gray)]", iconBg: "bg-[var(--warm-coral)]", emoji: "🏋️" },
  { bg: "bg-[var(--warm-cream)]", iconBg: "bg-[var(--warm-brown)]", emoji: "🏃" },
  { bg: "bg-[var(--soft-gray)]", iconBg: "bg-[var(--warm-sage)]", emoji: "🧘" },
  { bg: "bg-[var(--warm-cream)]", iconBg: "bg-[var(--warm-coral)]", emoji: "🤸" },
  { bg: "bg-[var(--soft-gray)]", iconBg: "bg-[var(--warm-brown)]", emoji: "🔥" },
];

export default function WorkoutDashboardScreen({
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

        if (needsRecompute.length > 0) {
          const results = await Promise.allSettled(
            needsRecompute.map(id => supabaseAPI.recomputeAndSaveRoutineMuscleSummary(id))
          );
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

      {/* Progress rings above Create Routine */}
      <ProgressRings
        steps={isLoadingSteps ? null : steps}
        goal={isLoadingSteps ? null : goal}
        recoveryPercent={null}
        strain={null}
        onStepsClick={() => { }}
        onRecoveryClick={() => { }}
        onStrainClick={() => { }}
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
        </div>
      ) : (
        <div className="space-y-3">
          {routines.map((routine, idx) => {
            const palette = avatarPalette[idx % avatarPalette.length];

            const muscleGroups =
              ((routine as any).muscle_group_summary as string | undefined)?.trim() || "—";

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

                  <p className="text-xs text-[var(--warm-brown)]/60 truncate">
                    {muscleGroups}
                  </p>

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
                    Created {new Date(routine.created_at).toLocaleDateString()}
                    {" "}• v{routine.version}
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
            <div className="mx-auto w-full max-w-md px-4">
              <div className="bg-white rounded-t-2xl shadow-2xl border-t border-x border-[var(--border)] overflow-hidden"
                style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--kb-inset, var(--keyboard-inset, 0px)) + 12px)", }}>
                <div className="flex justify-center py-2">
                  <div className="h-1.5 w-10 rounded-full bg-gray-200" />
                </div>

                <div className="max-h-[70vh] overflow-y-auto">
                  <div className="px-4 pb-2">
                    <p className="text-xs text-gray-500">Routine</p>
                    <h3 className="font-medium text-[var(--warm-brown)] truncate">
                      {actionRoutine.name}
                    </h3>
                  </div>
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
