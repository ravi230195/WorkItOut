import { useState, useEffect } from "react";
import { Dumbbell, Ruler } from "lucide-react";
import { useStepTracking } from "../../hooks/useStepTracking";
import { supabaseAPI, UserRoutine, Profile } from "../../utils/supabase/supabase-api";
import { useAuth } from "../AuthContext";
import ProgressRings from "../circularStat/ProgressRings";
import { AppScreen, Section, ScreenHeader, Stack, Spacer } from "../layouts";
import SegmentedToggle from "../segmented/SegmentedToggle";
import { RoutineAccess } from "../../hooks/useAppNavigation";
import { logger } from "../../utils/logging";
import { performanceTimer } from "../../utils/performanceTimer";
import FabSpeedDial from "../FabSpeedDial";
import RoutinesList from "../workout-dashboard/RoutinesList";
import RoutineActionSheet from "../workout-dashboard/RoutineActionSheet";
import { RoutinesView } from "../workout-dashboard/types";

interface WorkoutDashboardScreenProps {
  onCreateRoutine: () => void;
  onEditMeasurements: () => void;
  onSelectRoutine: (routineId: number, routineName: string, access?: RoutineAccess) => void;
  onOverlayChange?: (open: boolean) => void;
  bottomBar?: React.ReactNode;
}

export default function WorkoutDashboardScreen({
  onCreateRoutine,
  onEditMeasurements,
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

  // Profile for greeting with user's name
  const [profile, setProfile] = useState<Profile | null>(null);
  const { steps, goal, isLoading: isLoadingSteps } = useStepTracking();

  const canEdit = view === RoutinesView.My;

  const reloadRoutines = async (which: RoutinesView = view) => {
    setIsLoadingRoutines(true);
    setRoutinesError(null);
    try {
      const data =
        which === RoutinesView.My
          ? await supabaseAPI.getUserRoutines()
          : await supabaseAPI.getSampleRoutines();
      // oldest routines first
      data.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
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

  // Load profile for personalized greeting
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userToken) return;
      try {
        const p = await supabaseAPI.getMyProfile();
        setProfile(p);
      } catch (e) {
        logger.error("Failed to load profile for dashboard greeting", e);
      }
    };
    fetchProfile();
  }, [userToken]);

  const getFirstName = () => {
    if (profile?.first_name && profile.first_name.trim() !== "") {
      return profile.first_name.split(" ")[0];
    }
    if (profile?.display_name && profile.display_name.trim() !== "") {
      return profile.display_name.split(" ")[0];
    }
    return null;
  };

  const getStoredExerciseCount = (routine: UserRoutine): number | null => {
    const rawCount = (routine as any).exercise_count ?? (routine as any).exersise_count;
    const parsed = typeof rawCount === "string" ? Number(rawCount) : rawCount;
    if (typeof parsed !== "number" || Number.isNaN(parsed) || parsed < 0) {
      return null;
    }
    return parsed;
  };

  // compute exercise counts for each routine (for time display)
  useEffect(() => {
    let cancelled = false;

    const fetchExerciseCounts = async () => {
      const timer = performanceTimer.start("fetchExerciseCounts");

      if (routines.length === 0) {
        logger.debug("🔍 DGB [WORKOUT_SCREEN] No routines, skipping");
        if (!cancelled) {
          setExerciseCounts({});
          setLoadingCounts(false);
        }
        timer.endWithLog();
        return;
      }

      if (!cancelled) setLoadingCounts(true);

      try {
        const countsById = new Map<number, number>();
        const routinesNeedingFallback: UserRoutine[] = [];

        routines.forEach((routine) => {
          const stored = getStoredExerciseCount(routine);
          if (stored != null) {
            countsById.set(routine.routine_template_id, stored);
          } else {
            routinesNeedingFallback.push(routine);
          }
        });

        if (routinesNeedingFallback.length > 0) {
          logger.debug(
            "🔍 DGB [WORKOUT_SCREEN] Fetching exercise counts via fallback for routines:",
            routinesNeedingFallback.map((r) => r.routine_template_id)
          );

          const fallbackResults = await Promise.all(
            routinesNeedingFallback.map(async (routine) => {
              const routineTimer = performanceTimer.start(
                `fetchExerciseCounts - routine ${routine.routine_template_id}`
              );
              try {
                const exercises = await supabaseAPI.getUserRoutineExercises(
                  routine.routine_template_id
                );
                const count = Array.isArray(exercises) ? exercises.length : 0;
                return { id: routine.routine_template_id, count };
              } finally {
                routineTimer.endWithLog();
              }
            })
          );

          fallbackResults.forEach(({ id, count }) => {
            countsById.set(id, count);
          });
        }

        if (!cancelled) {
          setExerciseCounts(Object.fromEntries(countsById));
        }

        if (canEdit) {
          const routinesRequiringUpdate = routines
            .filter((routine) => {
              const summary = ((routine as any).muscle_group_summary as string | undefined)?.trim();
              const storedCount = getStoredExerciseCount(routine);
              const count = countsById.get(routine.routine_template_id) ?? storedCount ?? 0;
              const needsSummary = count > 0 && (!summary || summary.length === 0);
              const needsCount = storedCount == null;
              return needsSummary || needsCount;
            })
            .map((routine) => routine.routine_template_id);

          if (routinesRequiringUpdate.length > 0) {
            const recomputeTimer = performanceTimer.start(
              "fetchExerciseCounts - muscle summary recompute"
            );

            logger.debug(
              "🔍 DGB [WORKOUT_SCREEN] Triggering muscle summary recompute for routines:",
              routinesRequiringUpdate
            );
            logger.debug(
              "🔍 DGB [WORKOUT_SCREEN] canEdit:",
              canEdit,
              "needsRecompute count:",
              routinesRequiringUpdate.length
            );

            const results = await Promise.allSettled(
              routinesRequiringUpdate.map((id) => {
                logger.debug(
                  "🔍 DGB [WORKOUT_SCREEN] Calling recomputeAndSaveRoutineMuscleSummary for routine ID:",
                  id
                );
                return supabaseAPI.recomputeAndSaveRoutineMuscleSummary(id);
              })
            );

            if (!cancelled) {
              logger.debug(
                "🔍 DGB [WORKOUT_SCREEN] Muscle summary recompute completed, results:",
                results
              );

              const successfulCount = results.filter((res) => res.status === "fulfilled").length;
              logger.debug(
                "🔍 DGB [WORKOUT_SCREEN] Successful recomputes:",
                successfulCount,
                "out of",
                routinesRequiringUpdate.length
              );

              let updated = false;
              const updatedCounts = new Map(countsById);
              results.forEach((res, index) => {
                if (res.status === "fulfilled" && res.value) {
                  const recomputed = res.value.exercise_count;
                  if (typeof recomputed === "number" && !Number.isNaN(recomputed)) {
                    updatedCounts.set(routinesRequiringUpdate[index], recomputed);
                    updated = true;
                  }
                }
              });

              if (updated) {
                setExerciseCounts(Object.fromEntries(updatedCounts));
              }
            }

            recomputeTimer.endWithLog();
          }
        }
      } catch (e) {
        logger.error("Failed to load exercise counts / recompute summaries", e);
      } finally {
        if (!cancelled) setLoadingCounts(false);
        timer.endWithLog();
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
          <p className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-orange-400 to-amber-500 drop-shadow-sm">
            {getFirstName() ? `Welcome back, ${getFirstName()}!` : "Welcome back!"}
          </p>
        </Section>


        <Spacer y="sm" />

        {/* subtitle (title is in header) */}
        <Section variant="plain" padding="none" className="text-center">
          <p className="text-sm text-black mt-1">
            {view === RoutinesView.My
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

        {/* view toggle */}
        <Section
          variant="plain"
          padding="none"
          className="flex items-center justify-start px-4"
        >
          <SegmentedToggle
            value={view}
            onChange={setView}
            options={[
              { value: RoutinesView.My, label: "My routines" },
              { value: RoutinesView.Sample, label: "Sample routines" },
            ]}
            size="sm"
            /* Light warm highlight when selected */
            className="data-[checked=true]:bg-warm-coral/20 data-[checked=true]:text-black"
            variant="filled"
            tone="accent"
          />
        </Section>

        {/* routines list */}
        <RoutinesList
          routines={routines}
          routinesError={routinesError}
          isLoading={isLoadingRoutines}
          reloadRoutines={() => reloadRoutines()}
          view={view}
          exerciseCounts={exerciseCounts}
          loadingCounts={loadingCounts}
          canEdit={canEdit}
          onSelectRoutine={onSelectRoutine}
          openActions={openActions}
        />

        <Spacer y="lg" />
        {/* action sheet flows when editing user's own routines */}
        {canEdit && actionRoutine && (
          <RoutineActionSheet
            routine={actionRoutine}
            onClose={closeActions}
            reloadRoutines={() => reloadRoutines(RoutinesView.My)}
          />
        )}
      </Stack>

      <FabSpeedDial
        actions={[
          {
            label: "Create Routine",
            onPress: onCreateRoutine,
            icon: <Dumbbell className="w-6 h-6" />,
          },
          {
            label: "Edit Measurement",
            onPress: onEditMeasurements,
            icon: <Ruler className="w-6 h-6" />,
          },
        ]}
      />
    </AppScreen>
  );
}
