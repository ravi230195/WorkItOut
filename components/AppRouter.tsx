import  WorkoutDashboardScreen  from "./screens/WorkoutDashboardScreen";
import { CreateRoutineScreen } from "./screens/CreateRoutineScreen";
import { AddExercisesToRoutineScreen } from "./screens/AddExercisesToRoutineScreen";
import { ExerciseSetupScreen } from "./screens/ExerciseSetupScreen";

import { ProgressScreen } from "./screens/ProgressScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { SignInScreen } from "./screens/SignInScreen";
import { SignUpScreen } from "./screens/SignUpScreen";

import { AppView } from "../utils/navigation";
import { Exercise } from "../utils/supabase/supabase-api";

interface AppRouterProps {
  currentView: AppView;
  currentRoutineId: number | null;
  currentRoutineName: string;

  selectedExerciseForSetup: Exercise | null;
  setSelectedExerciseForSetup: (exercise: Exercise | null) => void;

  isAuthenticated: boolean;
  onAuthSuccess: (token: string) => void;
  onNavigateToSignUp: () => void;
  onNavigateToSignIn: () => void;

  onCreateRoutine: () => void;
  /** Passes (name, id) to jump straight to ExerciseSetup */
  onRoutineCreated: (routineName: string, routineId: number) => void;

  onCloseCreateRoutine: () => void;
  onCompleteRoutineCreation: () => void;

  onExerciseSelected: (exercise: Exercise, createdRoutineId?: number) => void;
  onCloseExerciseSetup: () => void;
  onExerciseSetupComplete: () => void;


  onSelectRoutine: (routineId: number, routineName: string) => void;

  onCloseExerciseSetupToRoutines: () => void;
  onReturnToExerciseSetup: (exercise: Exercise) => void;

  /** notify App when a modal/sheet is open so it can hide BottomNavigation */
  onOverlayChange?: (open: boolean) => void;
}

export function AppRouter({
  currentView,
  currentRoutineId,
  currentRoutineName,

  selectedExerciseForSetup,
  setSelectedExerciseForSetup,

  isAuthenticated,
  onAuthSuccess,
  onNavigateToSignUp,
  onNavigateToSignIn,

  onCreateRoutine,
  onRoutineCreated,
  onCloseCreateRoutine,
  onCompleteRoutineCreation,

  onExerciseSelected,
  onCloseExerciseSetup,
  onExerciseSetupComplete,


  onSelectRoutine,

  onCloseExerciseSetupToRoutines,
  onReturnToExerciseSetup,

  onOverlayChange,
}: AppRouterProps) {
  console.log(`🔍 [DBG] CURRENT SCREEN: ${currentView.toUpperCase()}`);

  if (!isAuthenticated || currentView === "signin" || currentView === "signup") {
    if (currentView === "signup") {
      return (
        <SignUpScreen
          onAuthSuccess={onAuthSuccess}
          onNavigateToSignIn={onNavigateToSignIn}
        />
      );
    }
    return (
      <SignInScreen
        onAuthSuccess={onAuthSuccess}
        onNavigateToSignUp={onNavigateToSignUp}
      />
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[var(--soft-gray)] via-[var(--background)] to-[var(--warm-cream)]/30">
      {currentView === "workouts" && (
        <WorkoutDashboardScreen
          onCreateRoutine={onCreateRoutine}
          onSelectRoutine={onSelectRoutine}
          // ⬇️ forward overlay visibility changes to App (to hide bottom nav)
          onOverlayChange={onOverlayChange}
        />
      )}

      {currentView === "create-routine" && (
        <CreateRoutineScreen
          onBack={onCloseCreateRoutine}
          onRoutineCreated={onRoutineCreated} // (name, id)
        />
      )}

      {currentView === "add-exercises-to-routine" && currentRoutineName && (
        <AddExercisesToRoutineScreen
          routineId={currentRoutineId || undefined}
          routineName={currentRoutineName}
          onBack={currentRoutineId ? onCloseExerciseSetupToRoutines : onCloseCreateRoutine}
          onExerciseSelected={
            currentRoutineId
              ? (exercise: Exercise) => onReturnToExerciseSetup(exercise)
              : (exercise: Exercise, routineId?: number) =>
                  onExerciseSelected(exercise, routineId)
          }
          isFromExerciseSetup={!!currentRoutineId}
        />
      )}

      {currentView === "exercise-setup" &&
        currentRoutineId &&
        currentRoutineName && (
          <ExerciseSetupScreen
            routineId={currentRoutineId}
            routineName={currentRoutineName}
            selectedExerciseForSetup={selectedExerciseForSetup}
            setSelectedExerciseForSetup={setSelectedExerciseForSetup}
            onBack={onCloseExerciseSetupToRoutines}   // back to routines list
            onSave={onExerciseSetupComplete}          // stay on setup
            onAddMoreExercises={onCloseExerciseSetup} // “+” opens exercise picker
            isEditingExistingRoutine={true}
            onShowExerciseSelector={onCloseExerciseSetup}
          />
        )}

      {currentView === "progress" && <ProgressScreen />}
      {currentView === "profile" && <ProfileScreen />}
    </div>
  );
}
