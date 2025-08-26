import { useState, useEffect } from "react";
import { TactileButton } from "../TactileButton";
import { MoreVertical, AlertCircle, Clock3 as Clock, TrendingUp } from "lucide-react";
import { useStepTracking } from "../../hooks/useStepTracking";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";
import { supabaseAPI, UserRoutine } from "../../utils/supabase/supabase-api";
import { useAuth } from "../AuthContext";
import { toast } from "sonner";
import ProgressRings from "../circularStat/ProgressRings";
import { AppScreen, Section, ScreenHeader, Stack, Spacer } from "../layouts";
import RoutineActionsSheet from "../sheets/RoutineActionsSheets";
import SegmentedToggle from "../segmented/SegmentedToggle";
import { RoutineAccess } from "../../hooks/useAppNavigation";

interface WorkoutDashboardScreenProps {
  onCreateRoutine: () => void;
  onSelectRoutine: (routineId: number, routineName: string, access?: RoutineAccess) => void;
  onOverlayChange?: (open: boolean) => void;
  bottomBar?: React.ReactNode;
}

export enum RoutinesView {
  My = "my",
  Sample = "sample",
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
  bottomBar
}: WorkoutDashboardScreenProps) {
  useKeyboardInset();
  const { userToken } = useAuth();

  const [view, setView] = useState<RoutinesView>(RoutinesView.My);
  const [routines, setRoutines] = useState<UserRoutine[]>([]);
  const [isLoadingRoutines, setIsLoadingRoutines] = useState(true);
  const [routinesError, setRoutinesError] = useState<string | null>(null);

  // only need exercise counts for time (10 min per exercise)
  const [exerciseCounts, setExerciseCounts] = useState<Record<number, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(false);

  // bottom-sheet
  const [actionRoutine, setActionRoutine] = useState<UserRoutine | null>(null);

  const { steps, goal, isLoading: isLoadingSteps } = useStepTracking(true);

  const canEdit = view === RoutinesView.My;

  // DEBUG: Add useEffect to check container dimensions
  useEffect(() => {
    const container = document.querySelector('.AppScreen') as HTMLElement;
    const content = document.querySelector('.content') as HTMLElement;
    const main = document.querySelector('main') as HTMLElement;
    
    console.log('🔍 DEBUG CONTAINER DIMENSIONS:');
    console.log('AppScreen height:', container?.offsetHeight);
    console.log('Main height:', main?.offsetHeight);
    console.log('Content height:', content?.offsetHeight);
    console.log('Window height:', window.innerHeight);
    console.log('AppScreen scroll height:', container?.scrollHeight);
    console.log('Main scroll height:', main?.scrollHeight);
    console.log('Content scroll height:', content?.scrollHeight);
    console.log('---');
  }, []);

  const reloadRoutines = async (which: RoutinesView = view) => {
    setIsLoadingRoutines(true);
    setRoutinesError(null);
    try {
      const data =
        which === RoutinesView.My
          ? await supabaseAPI.getUserRoutines()
          : await supabaseAPI.getSampleRoutines();

      setRoutines(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setRoutinesError(error instanceof Error ? error.message : "Failed to load routines");
    } finally {
      setIsLoadingRoutines(false);
    }
  };

  // initial + on view/user change
  useEffect(() => {
    if (view === RoutinesView.My && !userToken) {
      setRoutines([]);
      return;
    }
    reloadRoutines(view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, userToken]);

  // compute exercise counts for each routine (for time display)
  useEffect(() => {
    let cancelled = false;
    const fetchExerciseCounts = async () => {
      if (routines.length === 0) {
        setExerciseCounts({});
        return;
      }
      setLoadingCounts(true);
      try {
        const entries: Array<[number, number]> = [];
        const needsRecompute: number[] = [];

        for (const r of routines) {
          const list = await supabaseAPI.getUserRoutineExercises(r.routine_template_id);
          const active = (Array.isArray(list) ? list : []).filter((x) => x.is_active !== false);
          entries.push([r.routine_template_id, active.length]);

          if (canEdit) {
            const summary = (r as any).muscle_group_summary as string | undefined;
            if (active.length > 0 && (!summary || summary.trim() === "")) {
              needsRecompute.push(r.routine_template_id);
            }
          }
        }

        if (!cancelled) setExerciseCounts(Object.fromEntries(entries));

        // only recompute summaries for "my" data
        if (canEdit && needsRecompute.length > 0) {
          const results = await Promise.allSettled(
            needsRecompute.map((id) => supabaseAPI.recomputeAndSaveRoutineMuscleSummary(id))
          );
          if (!cancelled) {
            const summariesById = new Map<number, string>();
            needsRecompute.forEach((id, i) => {
              const res = results[i];
              if (res.status === "fulfilled") summariesById.set(id, res.value || "");
            });
            if (summariesById.size) {
              setRoutines((prev) =>
                prev.map((rt) =>
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
    return () => {
      cancelled = true;
    };
  }, [routines, canEdit]);

  useEffect(() => {
    return () => {
      if (actionRoutine) onOverlayChange?.(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openActions = (routine: UserRoutine, e: React.MouseEvent) => {
    if (!canEdit) return; // hide in sample view
    e.stopPropagation();
    setActionRoutine(routine);
    onOverlayChange?.(true);
  };
  const closeActions = () => {
    setActionRoutine(null);
    onOverlayChange?.(false);
  };

  return (
    <AppScreen
      header={<ScreenHeader title={"My Routines"} denseSmall />}
      maxContent="responsive"
      showHeaderBorder={false}
      showBottomBarBorder={false}
      bottomBar={bottomBar}
      bottomBarSticky
      contentClassName=""
    >
      <Stack gap="fluid">

        {/* subtitle (title is in header) */}
        <Section variant="plain" padding="none" className="text-center">
          <p className="text-sm text-[var(--warm-brown)]/60 mt-1">
            {view === "my"
              ? "Select a routine to start your workout"
              : "Explore prebuilt routines to get started"}
          </p>
        </Section>

        <Spacer y="sm" />

        {/* Progress rings */}
        <Section variant="plain" padding="none">
          <ProgressRings
            steps={isLoadingSteps ? null : steps}
            goal={isLoadingSteps ? null : goal}
            recoveryPercent={null}
            strain={null}
            onStepsClick={() => { }}
            onRecoveryClick={() => { }}
            onStrainClick={() => { }}
          />
        </Section>

        <Spacer y="xss" />

        {/* top row: view toggle + create */}
        <Section
          variant="plain"
          padding="none"
          className="flex items-center justify-between gap-3"
        >
          <SegmentedToggle
            value={view}
            onChange={setView}
            options={[
              { value: RoutinesView.Sample, label: "Sample routines" },
              { value: RoutinesView.My, label: "My routines" },
            ]}
            size="sm"
            /* Light warm highlight when selected */
            className="data-[checked=true]:bg-[var(--warm-coral)]/20 data-[checked=true]:text-[var(--warm-brown)]"
            variant="filled"
            tone="accent"
          />

          {canEdit && <TactileButton
            onClick={onCreateRoutine}
            className="bg-[var(--warm-coral)] hover:bg-[var(--warm-coral)]/90 text-white px-4 py-2 text-sm font-medium rounded-xl"
          >
            Create Routine
          </TactileButton>}
        </Section>

        {/* routines list with Section loading state */}
        <Section
          variant="plain"
          padding="none"
          className="space-y-3"
          loading={isLoadingRoutines}
          loadingBehavior="replace"
        >
          {!isLoadingRoutines && (
            <>
              {routinesError ? (
                <Section
                  variant="card"
                  title="Error Loading Routines"
                  actions={
                    <TactileButton onClick={() => reloadRoutines()} variant="secondary" className="px-4 py-2 text-sm">
                      Try Again
                    </TactileButton>
                  }
                >
                  <div className="text-center py-4">
                    <div className="w-12 h-12 mx-auto mb-3 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <p className="text-red-600 text-sm">{routinesError}</p>
                  </div>
                </Section>
              ) : routines.length === 0 ? (
                <Section variant="card" className="text-center">
                  <p className="text-[var(--warm-brown)]/60 text-sm">
                    {view === "my" ? "Start by adding a new routine" : "No sample routines found"}
                  </p>
                </Section>
              ) : (
                <div className="space-y-3">
                  {routines.map((routine, idx) => {
                    const palette = avatarPalette[idx % avatarPalette.length];

                    const muscleGroups =
                      ((routine as any).muscle_group_summary as string | undefined)?.trim() || "—";

                    const exerciseCount = exerciseCounts[routine.routine_template_id] ?? 0;
                    const timeMin = exerciseCount > 0 ? exerciseCount * 10 : null;

                    return (
                      <button
                        key={routine.routine_template_id}
                        onClick={() =>
                          onSelectRoutine(routine.routine_template_id, routine.name,
                            view === RoutinesView.My ? RoutineAccess.Editable : RoutineAccess.ReadOnly)
                        }
                        className="
                          w-full
                          rounded-2xl border border-[var(--border)]
                          bg-white shadow-sm hover:shadow-md transition-all
                          p-4
                          text-left
                        "
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${palette.bg}`}>
                              <div className={`w-8 h-8 ${palette.iconBg} rounded-lg grid place-items-center text-white text-lg`}>
                                <span>{palette.emoji}</span>
                              </div>
                            </div>

                            <div className="min-w-0">
                              <h3
                                className="
                                  font-medium text-[var(--warm-brown)] truncate 
                                  text-[clamp(16px,4.5vw,19px)] 
                                  text-left 
                                "
                              >
                                {routine.name}
                              </h3>

                              <p className="text-[clamp(11px,3.2vw,12px)] text-[var(--warm-brown)]/60 truncate text-left">
                                {muscleGroups}
                              </p>

                              <div className="
                              mt-2 flex items-center gap-4 
                              text-[clamp(11px,3.2vw,12px)] 
                              text-[var(--warm-brown)]/70">
                                <span className="inline-flex items-center gap-1">
                                  <Clock size={14} />
                                  {loadingCounts ? "—" : timeMin !== null ? `${timeMin} min` : "—"}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <TrendingUp size={14} />
                                  {loadingCounts ? "—" : `${exerciseCount} exercise${exerciseCount === 1 ? "" : "s"}`}
                                </span>
                              </div>

                              {/*<p className="mt-1 text-[10px] text-[var(--warm-brown)]/40">
                                Created {new Date(routine.created_at).toLocaleDateString()} • v{routine.version}
                              </p>*/}
                            </div>
                          </div>

                          {/* right: kebab only when editable */}
                          {canEdit && (
                            <TactileButton
                              variant="secondary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openActions(routine, e);
                              }}
                              className="shrink-0 p-2 h-auto bg-transparent hover:bg-[var(--soft-gray)]/60 text-[var(--warm-brown)]/70"
                              aria-label="More options"
                            >
                              <MoreVertical size={18} />
                            </TactileButton>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </Section>

        {/* bottom sheet (only when editing user's own routines) */}
        {canEdit && actionRoutine && (
          <RoutineActionsSheet
            open={!!actionRoutine}
            routineName={actionRoutine?.name ?? ""}
            onClose={closeActions}
            onRequestRename={async (newName) => {
              if (!actionRoutine) return;
              await supabaseAPI.renameRoutine(actionRoutine.routine_template_id, newName);
              await reloadRoutines(RoutinesView.My);
              toast.success("Routine renamed");
              closeActions();
            }}
            onRequestDelete={async () => {
              if (!actionRoutine) return;
              await supabaseAPI.deleteRoutine(actionRoutine.routine_template_id);
              await reloadRoutines(RoutinesView.My);
              toast.success("Routine deleted");
              closeActions();
            }}
          />
        )}
      </Stack>
    </AppScreen>
  );
}
