import { useState, useEffect, useRef } from "react";
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

  // bottom-sheet
  const [actionRoutine, setActionRoutine] = useState<UserRoutine | null>(null);

  // Profile for greeting with user's name
  const [profile, setProfile] = useState<Profile | null>(null);
  const { steps, goal, isLoading: isLoadingSteps } = useStepTracking();

  const canEdit = view === RoutinesView.My;
  const recomputeInFlight = useRef(false);

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

  // Ensure server-side routine stats (exercise count + muscle summary) stay in sync
  useEffect(() => {
    if (!canEdit) return;
    if (recomputeInFlight.current) return;

    const routinesNeedingUpdate = routines
      .filter((routine) => {
        const summary = (routine.muscle_group_summary ?? "").trim();
        const rawCount = routine.exercise_count;
        const hasCount = typeof rawCount === "number" && Number.isFinite(rawCount) && rawCount >= 0;
        const count = hasCount ? rawCount : null;

        const needsCount = count === null;
        const needsSummaryFill = (count ?? 0) > 0 && summary === "";
        const needsSummaryReset = count === 0 && summary !== "";

        return needsCount || needsSummaryFill || needsSummaryReset;
      })
      .map((routine) => routine.routine_template_id);

    if (routinesNeedingUpdate.length === 0) return;

    recomputeInFlight.current = true;
    let cancelled = false;
    const timer = performanceTimer.start("WorkoutDashboard - recompute routine stats");

    const run = async () => {
      try {
        logger.debug(
          "🔍 DGB [WORKOUT_SCREEN] Recomputing routine stats for:",
          routinesNeedingUpdate
        );
        const results = await Promise.allSettled(
          routinesNeedingUpdate.map((id) => supabaseAPI.recomputeAndSaveRoutineMuscleSummary(id))
        );

        if (!cancelled) {
          const failures = results.filter(
            (result): result is PromiseRejectedResult => result.status === "rejected"
          );
          if (failures.length > 0) {
            logger.error(
              "Failed to recompute routine stats",
              failures.map((failure) => failure.reason)
            );
          }
        }
      } catch (error) {
        if (!cancelled) {
          logger.error("Failed to recompute routine stats", error);
        }
      } finally {
        if (cancelled) {
          timer.end();
        } else {
          timer.endWithLog();
        }
        recomputeInFlight.current = false;
      }
    };

    run();

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
