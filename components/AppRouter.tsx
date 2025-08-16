import { WorkoutDashboard } from "./WorkoutDashboard";
import { RoutinesScreen } from "./RoutinesScreen";
import { ActiveWorkout } from "./ActiveWorkout";
import { ExerciseSelector } from "./ExerciseSelector";

import { CreateRoutine } from "./CreateRoutine";
import { AddExercisesToRoutine } from "./AddExercisesToRoutine";
import { ExerciseSetupScreen } from "./ExerciseSetupScreen";
import { RoutineEditor } from "./RoutineEditor";
import { ProgressScreen } from "./ProgressScreen";
import { ProfileScreen } from "./ProfileScreen";
import { SignInScreen } from "./SignInScreen";
import { SignUpScreen } from "./SignUpScreen";
import { BottomNavigation, TabType } from "./BottomNavigation";
import { AppView, VIEWS_WITHOUT_BOTTOM_NAV } from "../utils/navigation";
import { Exercise } from "./ExerciseDatabase";
import { WorkoutTemplate } from "./WorkoutTemplates";

interface AppRouterProps {
  currentView: AppView;
  activeTab: TabType;
  selectedExercise: Exercise | null;
  selectedTemplate: WorkoutTemplate | null;
  currentRoutineId: number | null;
  currentRoutineName: string;
  refreshTrigger: number;
  isAuthenticated: boolean;
  onAuthSuccess: (token: string) => void;
  onNavigateToSignUp: () => void;
  onNavigateToSignIn: () => void;
  onSelectTemplate: (template: WorkoutTemplate) => void;
  onEndWorkout: () => void;
  onAddExercise: () => void;
  onSelectExercise: (exercise: Exercise) => void;
  onCloseExerciseSelector: () => void;
  onExerciseAdded: () => void;
  onTabChange: (tab: TabType) => void;
  onCreateRoutine: () => void;
  onRoutineCreated: (routineName: string) => void;
  onCloseCreateRoutine: () => void;
  onCompleteRoutineCreation: () => void;
  onExerciseSelected: (exercise: any, createdRoutineId: number) => void;
  onShowExerciseSetup: () => void;
  onCloseExerciseSetup: () => void;
  onExerciseSetupComplete: () => void;
  onShowRoutineEditor: () => void;
  onCloseRoutineEditor: () => void;
  onSelectRoutine: (routineId: number, routineName: string) => void;
  onCloseExerciseSetupToRoutines: () => void;
  onShowExerciseSelector: () => void;
  onReturnToExerciseSetup: (exercise: Exercise) => void;
}

export function AppRouter({
  currentView,
  activeTab,
  selectedExercise,
  selectedTemplate,
  currentRoutineId,
  currentRoutineName,
  refreshTrigger,
  isAuthenticated,
  onAuthSuccess,
  onNavigateToSignUp,
  onNavigateToSignIn,
  onSelectTemplate,
  onEndWorkout,
  onAddExercise,
  onSelectExercise,
  onCloseExerciseSelector,
  onExerciseAdded,
  onTabChange,
  onCreateRoutine,
  onRoutineCreated,
  onCloseCreateRoutine,
  onCompleteRoutineCreation,
  onExerciseSelected,
  onShowExerciseSetup,
  onCloseExerciseSetup,
  onExerciseSetupComplete,
  onShowRoutineEditor,
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

  const showBottomNav = !VIEWS_WITHOUT_BOTTOM_NAV.includes(currentView);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--soft-gray)] via-[var(--background)] to-[var(--warm-cream)]/30">
      {currentView === "workouts" && (
        <WorkoutDashboard 
          onSelectTemplate={onSelectTemplate}
        />
      )}

      {currentView === "routines" && (
        <RoutinesScreen 
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
          exercise={selectedExercise || undefined}
          routineId={currentRoutineId}
          routineName={currentRoutineName}
          onBack={onCloseExerciseSetupToRoutines}
          onSave={onExerciseSetupComplete}
          onAddMoreExercises={onCloseExerciseSetup}
          isEditingExistingRoutine={!selectedExercise}
          onShowExerciseSelector={onShowExerciseSelector}
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
      
      {currentView === "active-workout" && (
        <ActiveWorkout 
          onEndWorkout={onEndWorkout}
          onAddExercise={onAddExercise}
          selectedExercise={selectedExercise}
          onExerciseAdded={onExerciseAdded}
          template={selectedTemplate || undefined}
        />
      )}
      
      {currentView === "exercise-selection" && (
        <ExerciseSelector
          onSelectExercise={onSelectExercise}
          onClose={onCloseExerciseSelector}
        />
      )}

      {currentView === "progress" && (
        <ProgressScreen />
      )}

      {currentView === "profile" && (
        <ProfileScreen />
      )}
      
      {showBottomNav && (
        <BottomNavigation 
          activeTab={activeTab} 
          onTabChange={onTabChange}
        />
      )}
    </div>
  );
}