import { WorkoutDashboard } from "./WorkoutDashboard";
import { CreateRoutine } from "./CreateRoutine";
import { AddExercisesToRoutine } from "./AddExercisesToRoutine";
import { ExerciseSetupScreen } from "./ExerciseSetupScreen";
import { RoutineEditor } from "./RoutineEditor";
import { ProgressScreen } from "./ProgressScreen";
import { ProfileScreen } from "./ProfileScreen";
import { SignInScreen } from "./SignInScreen";
import { SignUpScreen } from "./SignUpScreen";
import { TabType } from "./BottomNavigation";
import { AppView } from "../utils/navigation";
import { Exercise } from "../utils/supabase-api";

interface AppRouterProps {
  currentView: AppView;
  activeTab: TabType;
  currentRoutineId: number | null;
  currentRoutineName: string;
  isAuthenticated: boolean;
  onAuthSuccess: (token: string) => void;
  onNavigateToSignUp: () => void;
  onNavigateToSignIn: () => void;
  onTabChange: (tab: TabType) => void;
  onCreateRoutine: () => void;
  onRoutineCreated: (routineName: string) => void;
  onCloseCreateRoutine: () => void;
  onCompleteRoutineCreation: () => void;
  onExerciseSelected: (exercise: Exercise, createdRoutineId?: number) => void;
  onCloseExerciseSetup: () => void;
  onExerciseSetupComplete: () => void;
  onCloseRoutineEditor: () => void;
  onSelectRoutine: (routineId: number, routineName: string) => void;
  onCloseExerciseSetupToRoutines: () => void;
  onShowExerciseSelector: () => void;
  onReturnToExerciseSetup: (exercise: Exercise) => void;
}

export function AppRouter({
  currentView,
  activeTab,
  currentRoutineId,
  currentRoutineName,
  isAuthenticated,
  onAuthSuccess,
  onNavigateToSignUp,
  onNavigateToSignIn,
  onTabChange,
  onCreateRoutine,
  onRoutineCreated,
  onCloseCreateRoutine,
  onCompleteRoutineCreation,
  onExerciseSelected,
  onCloseExerciseSetup,
  onExerciseSetupComplete,
  onCloseRoutineEditor,
  onSelectRoutine,
  onCloseExerciseSetupToRoutines,
  onShowExerciseSelector,
  onReturnToExerciseSetup
}: AppRouterProps) {
  // Show auth screens when not authenticated or when explicitly navigating to auth screens
  if (!isAuthenticated || currentView === "signin" || currentView === "signup") {
    if (currentView === "signup") {
      return (
        <SignUpScreen 
          onAuthSuccess={onAuthSuccess} 
          onNavigateToSignIn={onNavigateToSignIn}
        />
      );
    } else {
      return (
        <SignInScreen 
          onAuthSuccess={onAuthSuccess} 
          onNavigateToSignUp={onNavigateToSignUp} 
        />
      );
    }
  }

  return (
    <>
      <div className="bg-gradient-to-br from-[var(--soft-gray)] via-[var(--background)] to-[var(--warm-cream)]/30">
        {currentView === "workouts" && (
          <WorkoutDashboard 
            onCreateRoutine={onCreateRoutine}
            onSelectRoutine={onSelectRoutine}
          />
        )}

        {currentView === "create-routine" && (
          <CreateRoutine
            onBack={onCloseCreateRoutine}
            onRoutineCreated={onRoutineCreated}
          />
        )}
        
        {currentView === "add-exercises-to-routine" && currentRoutineName && (
          <AddExercisesToRoutine
            routineId={currentRoutineId || undefined}
            routineName={currentRoutineName}
            onBack={currentRoutineId ? onCloseExerciseSetupToRoutines : onCloseCreateRoutine}
            onExerciseSelected={currentRoutineId ? (exercise: Exercise) => onReturnToExerciseSetup(exercise) : onExerciseSelected}
            isFromExerciseSetup={!!currentRoutineId}
          />
        )}

        {currentView === "exercise-setup" && currentRoutineId && currentRoutineName && (
          <ExerciseSetupScreen
            routineId={currentRoutineId}
            routineName={currentRoutineName}
            onBack={onCloseExerciseSetupToRoutines}
            onSave={onExerciseSetupComplete}
            onAddMoreExercises={onCloseExerciseSetup}
            isEditingExistingRoutine={true}
          />
        )}

        {currentView === "routine-editor" && currentRoutineId && (
          <RoutineEditor
            routineId={currentRoutineId}
            routineName={currentRoutineName}
            onBack={onCloseRoutineEditor}
            onAddExercise={onCloseRoutineEditor}
            onSave={onCompleteRoutineCreation}
          />
        )}

        {currentView === "progress" && (
          <ProgressScreen />
        )}

        {currentView === "profile" && (
          <ProfileScreen />
        )}
      </div>
    </>
  );
}