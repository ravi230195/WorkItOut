import WorkoutDashboardScreen from "./screens/WorkoutDashboardScreen";
import CreateRoutineScreen from "./screens/CreateRoutineScreen";
import { AddExercisesToRoutineScreen } from "./screens/AddExercisesToRoutineScreen";
import { ExerciseSetupScreen } from "./screens/ExerciseSetupScreen";
import EditMeasurementsScreen from "./screens/EditMeasurementsScreen";

import { ProgressScreen } from "./screens/ProgressScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { SignInScreen } from "./screens/SignInScreen";
import { SignUpScreen } from "./screens/SignUpScreen";

import { AppView } from "../utils/navigation";
import { Exercise } from "../utils/supabase/supabase-api";
import { RoutineAccess } from "../hooks/useAppNavigation";
import { logger } from "../utils/logging";
import { SlideTransition } from "./SlideTransition";

interface AppRouterProps {
  currentView: AppView;
  currentRoutineId: number | null;
  currentRoutineName: string;
  routineAccess: RoutineAccess;

  exerciseSetupMode: "plan" | "workout";
  setExerciseSetupMode: (mode: "plan" | "workout") => void;

  selectedExercisesForSetup: Exercise[];
  setSelectedExercisesForSetup: (exercises: Exercise[]) => void;

  isAuthenticated: boolean;
  onAuthSuccess: (token: string, refreshToken: string) => void;
  onNavigateToSignUp: () => void;
  onNavigateToSignIn: () => void;

  onCreateRoutine: () => void;
  onEditMeasurements: () => void;
  /** Passes (name, id) to jump straight to ExerciseSetup */
  onRoutineCreated: (routineName: string, routineId: number) => void;

  onCloseCreateRoutine: () => void;
  onCloseEditMeasurements: () => void;
  onCompleteRoutineCreation: () => void;

  onExerciseSelected: (exercises: Exercise[]) => void;
  onCloseExerciseSetup: () => void;
  onExerciseSetupComplete: () => void;


  onSelectRoutine: (routineId: number, routineName: string, access?: RoutineAccess) => void;

  onCloseExerciseSetupToRoutines: () => void;
  bottomBar?: React.ReactNode;
  /** notify App when a modal/sheet is open so it can hide BottomNavigation */
  onOverlayChange?: (open: boolean) => void;
}

export function AppRouter({
  currentView,
  currentRoutineId,
  currentRoutineName,
  routineAccess,

  exerciseSetupMode,
  setExerciseSetupMode,

  selectedExercisesForSetup,
  setSelectedExercisesForSetup,

  isAuthenticated,
  onAuthSuccess,
  onNavigateToSignUp,
  onNavigateToSignIn,

  onCreateRoutine,
  onEditMeasurements,
  onRoutineCreated,
  onCloseCreateRoutine,
  onCloseEditMeasurements,
  onCompleteRoutineCreation,

  onExerciseSelected,
  onCloseExerciseSetup,
  onExerciseSetupComplete,


  onSelectRoutine,

  onCloseExerciseSetupToRoutines,
  bottomBar,
  onOverlayChange,
}: AppRouterProps) {
  logger.debug(`🔍 [DBG] CURRENT SCREEN: ${currentView.toUpperCase()}`);

  if (!isAuthenticated || currentView === "signin" || currentView === "signup") {
    if (currentView === "signup") {
      return (
        <SignUpScreen
          onAuthSuccess={onAuthSuccess}
          onNavigateToSignIn={onNavigateToSignIn}
          bottomBar={bottomBar}
        />
      );
    }
    return (
      <SignInScreen
        onAuthSuccess={onAuthSuccess}
        onNavigateToSignUp={onNavigateToSignUp}
        bottomBar={bottomBar}
      />
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[var(--soft-gray)] via-[var(--background)] to-[var(--warm-cream)]/30">
      {currentView === "workouts" && (
        <WorkoutDashboardScreen
          onCreateRoutine={onCreateRoutine}
          onEditMeasurements={onEditMeasurements}
          onSelectRoutine={onSelectRoutine}
          // ⬇️ forward overlay visibility changes to App (to hide bottom nav)
          onOverlayChange={onOverlayChange}
          bottomBar={bottomBar}
        />
      )}

      <SlideTransition
        show={currentView === "create-routine"}
        enterFrom="down"
        exitTo="left"
      >
        <CreateRoutineScreen
          onBack={onCloseCreateRoutine}
          onRoutineCreated={onRoutineCreated} // (name, id)
        />
      </SlideTransition>

      <SlideTransition
        show={currentView === "edit-measurements"}
        enterFrom="down"
        exitTo="left"
      >
        <EditMeasurementsScreen onBack={onCloseEditMeasurements} />
      </SlideTransition>

      {currentView === "add-exercises-to-routine" && currentRoutineName && (
        <AddExercisesToRoutineScreen
          routineId={currentRoutineId || undefined}
          routineName={currentRoutineName}
          onBack={currentRoutineId ? onCloseExerciseSetupToRoutines : onCloseCreateRoutine}
          onExerciseSelected={(exercises: Exercise[]) => onExerciseSelected(exercises)}
          isFromExerciseSetup={!!currentRoutineId}
        />
      )}

      <SlideTransition
        show={
          currentView === "exercise-setup" &&
          currentRoutineId !== null &&
          !!currentRoutineName
        }
        enterFrom="right"
        exitTo="left"
      >
        <ExerciseSetupScreen
          routineId={currentRoutineId!}
          routineName={currentRoutineName}
          selectedExercisesForSetup={selectedExercisesForSetup}
          setSelectedExercisesForSetup={setSelectedExercisesForSetup}
          onBack={onCloseExerciseSetupToRoutines}
          onSave={onExerciseSetupComplete}
          onAddMoreExercises={onCloseExerciseSetup}
          isEditingExistingRoutine={true}
          onShowExerciseSelector={onCloseExerciseSetup}
          access={routineAccess}
          initialMode={exerciseSetupMode}
          onModeChange={setExerciseSetupMode}
        />
      </SlideTransition>

      {currentView === "progress" && <ProgressScreen bottomBar={bottomBar} />}
      {currentView === "profile" && <ProfileScreen bottomBar={bottomBar} />}
    </div>
  );
}
