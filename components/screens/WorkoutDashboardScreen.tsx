import { useState, useEffect } from "react";
import { TactileButton } from "../TactileButton";
import { AlertCircle, Clock3 as Clock, TrendingUp } from "lucide-react";
import { useStepTracking } from "../../hooks/useStepTracking";
import { supabaseAPI, UserRoutine } from "../../utils/supabase/supabase-api";
import { useAuth } from "../AuthContext";
import { toast } from "sonner";
import ProgressRings from "../circularStat/ProgressRings";
import { AppScreen, Section, ScreenHeader, Stack, Spacer } from "../layouts";
import RoutineActionsSheet from "../sheets/RoutineActionsSheets";
import SegmentedToggle from "../segmented/SegmentedToggle";
import { RoutineAccess } from "../../hooks/useAppNavigation";
import { logger } from "../../utils/logging";
import { performanceTimer } from "../../utils/performanceTimer";
import { loadRoutineExercisesWithSets } from "../../utils/routineLoader";
import ListItem from "../ui/ListItem";

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
  { bg: "bg-soft-gray", iconBg: "bg-warm-coral", emoji: "🏋️" },
  { bg: "bg-[var(--warm-cream)]", iconBg: "bg-[var(--warm-brown)]", emoji: "🏃" },
  { bg: "bg-soft-gray", iconBg: "bg-[var(--warm-sage)]", emoji: "🧘" },
  { bg: "bg-[var(--warm-cream)]", iconBg: "bg-warm-coral", emoji: "🤸" },
  { bg: "bg-soft-gray", iconBg: "bg-[var(--warm-brown)]", emoji: "🔥" },
];

export default function WorkoutDashboardScreen({
  onCreateRoutine,
  onSelectRoutine,
  onOverlayChange,
  bottomBar
}: WorkoutDashboardScreenProps) {
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

  const reloadRoutines = async (which: RoutinesView = view) => {
    setIsLoadingRoutines(true);
    setRoutinesError(null);
    try {
      const data =
        which === RoutinesView.My
          ? await supabaseAPI.getUserRoutines()
          : await supabaseAPI.getSampleRoutines();
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRoutines(Array.isArray(data) ? data : []);
    } catch (error) {
      logger.error(String(error));
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
      const timer = performanceTimer.start('fetchExerciseCounts');
      
      if (routines.length === 0) {
        logger.debug("🔍 DGB [WORKOUT_SCREEN] No routines, skipping");
        setExerciseCounts({});
        timer.endWithLog('debug');
        return;
      }
      setLoadingCounts(true);
      try {
        const results = await Promise.all(
          routines.map(async (r) => {
            const routineTimer = performanceTimer.start(`fetchExerciseCounts - routine ${r.routine_template_id}`);

            logger.debug("🔍 DGB [WORKOUT_SCREEN] Processing routine:", r.routine_template_id, "name:", r.name);
            const active = await loadRoutineExercisesWithSets(r.routine_template_id, { timer: performanceTimer });
            //logger.debug("🔍 DGB [WORKOUT_SCREEN] Raw list from API:", active);
            //logger.debug("🔍 DGB [WORKOUT_SCREEN] List length:", active?.length, "isArray:", Array.isArray(active));

            let needsRecomp = false;
            if (canEdit) {
              const summary = (r as any).muscle_group_summary as string | undefined;
              // Only recompute if there are active exercises AND no summary
              if (active.length > 0 && (!summary || summary.trim() === "")) {
                logger.info("🔍 DGB [WORKOUT_SCREEN] Routine needs recompute:", r.routine_template_id, "summary:", summary, "active exercises:", active.length);
                needsRecomp = true;
              } else if (active.length === 0) {
                logger.debug("🔍 DGB [WORKOUT_SCREEN] Routine has 0 active exercises, skipping recompute:", r.routine_template_id, "summary:", summary);
              }
            }

            routineTimer.endWithLog('debug');
            return { id: r.routine_template_id, count: active.length, needsRecompute: needsRecomp };
          })
        );

        const entries = results.map(({ id, count }) => [id, count] as [number, number]);
        const needsRecompute = results.filter(r => r.needsRecompute).map(r => r.id);

        if (!cancelled) setExerciseCounts(Object.fromEntries(entries));

        // only recompute summaries for "my" data
        if (canEdit && needsRecompute.length > 0) {
          const recomputeTimer = performanceTimer.start('fetchExerciseCounts - muscle summary recompute');
          
          logger.debug("🔍 DGB [WORKOUT_SCREEN] Triggering muscle summary recompute for routines:", needsRecompute);
          logger.debug("🔍 DGB [WORKOUT_SCREEN] canEdit:", canEdit, "needsRecompute count:", needsRecompute.length);
          
          const results = await Promise.allSettled(
            needsRecompute.map((id) => {
              logger.debug("🔍 DGB [WORKOUT_SCREEN] Calling recomputeAndSaveRoutineMuscleSummary for routine ID:", id);
              return supabaseAPI.recomputeAndSaveRoutineMuscleSummary(id);
            })
          );
          if (!cancelled) {
            logger.debug("🔍 DGB [WORKOUT_SCREEN] Muscle summary recompute completed, results:", results);
            // Since recomputeAndSaveRoutineMuscleSummary returns void, we just check if it succeeded
            const successfulCount = results.filter(res => res.status === "fulfilled").length;
            logger.debug("🔍 DGB [WORKOUT_SCREEN] Successful recomputes:", successfulCount, "out of", needsRecompute.length);
            
            if (successfulCount > 0) {
              logger.debug("🔍 DGB [WORKOUT_SCREEN] Muscle summary recompute completed successfully");
              logger.debug("🔍 DGB [WORKOUT_SCREEN] No need to trigger routine state update - let cache handle it");
              // Don't trigger setRoutines here - it causes infinite loop!
            }
          }
          
          recomputeTimer.endWithLog('debug');
        }
      } catch (e) {
        logger.error("Failed to load exercise counts / recompute summaries", e);
      } finally {
        if (!cancelled) setLoadingCounts(false);
        timer.endWithLog('info'); // Main function timing at INFO level
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
      header={
        <ScreenHeader
          title={"My Routines"}
          showBorder={false}
          denseSmall
          contentHeightPx={74}
          titleClassName="text-[17px] font-bold"
        />
      }
      maxContent="responsive"
      showHeaderBorder={false}
      showBottomBarBorder={false}
      bottomBar={bottomBar}
      bottomBarSticky
      contentClassName=""
      headerInScrollArea={true}
    >
      <Stack gap="fluid">
        <Section variant="plain" padding="none" className="text-center">
          <p className="text-3xl text-warm-brown/60 mt-1">
            Welcome back !
          </p>
        </Section>

        <Spacer y="sm" />

        {/* subtitle (title is in header) */}
        <Section variant="plain" padding="none" className="text-center">
          <p className="text-sm text-warm-brown/60 mt-1">
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
            onStepsClick={() => {}}
            onRecoveryClick={() => {}}
            onStrainClick={() => {}}
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
            className="data-[checked=true]:bg-warm-coral/20 data-[checked=true]:text-warm-brown"
            variant="filled"
            tone="accent"
          />

          {canEdit && (
            <TactileButton
              onClick={onCreateRoutine}
              className="bg-primary hover:bg-primary-hover text-primary-foreground px-4 py-2 text-sm font-medium rounded-xl"
            >
              Create Routine
            </TactileButton>
          )}
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
                    <div className="w-12 h-12 mx-auto mb-3 bg-destructive-light rounded-full flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    </div>
                    <p className="text-destructive text-sm">{routinesError}</p>
                  </div>
                </Section>
              ) : routines.length === 0 ? (
                <Section variant="card" className="text-center">
                  <p className="text-warm-brown/60 text-sm">
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
                          onSelectRoutine(
                            routine.routine_template_id,
                            routine.name,
                            view === RoutinesView.My ? RoutineAccess.Editable : RoutineAccess.ReadOnly
                          )
                        }
                        className="w-full rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all text-left"
                      >
                        <ListItem
                          leading={
                            <div className={`w-8 h-8 ${palette.iconBg} rounded-lg grid place-items-center text-primary-foreground text-lg`}>
                              <span>{palette.emoji}</span>
                            </div>
                          }
                          leadingClassName={`w-12 h-12 rounded-xl flex items-center justify-center ${palette.bg}`}
                          primary={routine.name}
                          secondary={muscleGroups}
                          tertiary={
                            <div className="mt-2 flex items-center gap-4 text-warm-brown/70">
                              <span className="inline-flex items-center gap-1">
                                <Clock size={14} />
                                {loadingCounts ? "—" : timeMin !== null ? `${timeMin} min` : "—"}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <TrendingUp size={14} />
                                {loadingCounts ? "—" : `${exerciseCount} exercise${exerciseCount === 1 ? "" : "s"}`}
                              </span>
                            </div>
                          }
                          primaryClassName="font-medium text-warm-brown text-[clamp(16px,4.5vw,19px)]"
                          secondaryClassName="text-[clamp(11px,3.2vw,12px)] text-warm-brown/60"
                          tertiaryClassName="text-[clamp(11px,3.2vw,12px)]"
                          className="p-4"
                          rightIcon={canEdit ? "kebab" : undefined}
                          onRightIconClick={(e) => openActions(routine, e)}
                        />
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