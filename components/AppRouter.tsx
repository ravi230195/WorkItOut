import WorkoutDashboardScreen from "./screens/WorkoutDashboardScreen";
import CreateRoutineScreen from "./screens/CreateRoutineScreen";
import { AddExercisesToRoutineScreen } from "./screens/AddExercisesToRoutineScreen";
import { ExerciseSetupScreen } from "./screens/ExerciseSetupScreen";
import EditMeasurementsScreen from "./screens/EditMeasurementsScreen";

import { ProgressScreen } from "./screens/ProgressScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { MyAccountScreen } from "./screens/profile/MyAccountScreen";
import DeviceSettingsScreen from "./screens/profile/DeviceSettingsScreen";
import { SignInScreen } from "./screens/SignInScreen";
import { SignUpScreen } from "./screens/SignUpScreen";
import { WelcomeScreen } from "./screens/WelcomeScreen";

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
  onNavigateToWelcome: () => void;

  onCreateRoutine: () => void;
  onEditMeasurements: () => void;
  /** Passes (name, id) to jump straight to ExerciseSetup */
  onRoutineCreated: (routineName: string, routineId: number) => void;

  onCloseCreateRoutine: () => void;
  onCloseEditMeasurements: () => void;
  onCompleteRoutineCreation: () => void;

  onExerciseSelected: (exercises: Exercise[]) => void;
  onCloseExerciseSetup: () => void;
  onCloseAddExercises: () => void;
  onExerciseSetupComplete: () => void;


  onSelectRoutine: (routineId: number, routineName: string, access?: RoutineAccess) => void;

  onCloseExerciseSetupToRoutines: () => void;
  bottomBar?: React.ReactNode;
  /** notify App when a modal/sheet is open so it can hide BottomNavigation */
  onOverlayChange?: (open: boolean) => void;

  onNavigateToMyAccount: () => void;
  onCloseMyAccount: () => void;
  onNavigateToDeviceSettings: () => void;
  onCloseDeviceSettings: () => void;
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
  onNavigateToWelcome,

  onCreateRoutine,
  onEditMeasurements,
  onRoutineCreated,
  onCloseCreateRoutine,
  onCloseEditMeasurements,
  onCompleteRoutineCreation,

  onExerciseSelected,
  onCloseExerciseSetup,
  onCloseAddExercises,
  onExerciseSetupComplete,


  onSelectRoutine,

  onCloseExerciseSetupToRoutines,
  bottomBar,
  onOverlayChange,
  onNavigateToMyAccount,
  onCloseMyAccount,
  onNavigateToDeviceSettings,
  onCloseDeviceSettings,
}: AppRouterProps) {
  logger.debug(`🔍 [DBG] CURRENT SCREEN: ${currentView.toUpperCase()}`);

  if (
    !isAuthenticated ||
    currentView === "signin" ||
    currentView === "signup" ||
    currentView === "welcome"
  ) {
    if (currentView === "signup") {
      return (
        <SignUpScreen
          onAuthSuccess={onAuthSuccess}
          onNavigateToSignIn={onNavigateToSignIn}
          onNavigateToWelcome={onNavigateToWelcome}
          bottomBar={bottomBar}
        />
      );
    }
    if (currentView === "signin") {
      return (
        <SignInScreen
          onAuthSuccess={onAuthSuccess}
          onNavigateToSignUp={onNavigateToSignUp}
          onNavigateToWelcome={onNavigateToWelcome}
          bottomBar={bottomBar}
        />
      );
    }
    return (
      <WelcomeScreen
        onNavigateToSignUp={onNavigateToSignUp}
        onNavigateToSignIn={onNavigateToSignIn}
        onAuthSuccess={onAuthSuccess}
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
        exitTo="down"
      >
        <CreateRoutineScreen
          onBack={onCloseCreateRoutine}
          onRoutineCreated={onRoutineCreated} // (name, id)
        />
      </SlideTransition>

      <SlideTransition
        show={currentView === "edit-measurements"}
        enterFrom="down"
        exitTo="down"
      >
        <EditMeasurementsScreen onBack={onCloseEditMeasurements} />
      </SlideTransition>

      <SlideTransition
        show={currentView === "add-exercises-to-routine" && !!currentRoutineName}
        enterFrom="center"
        exitTo="center"
      >
        <AddExercisesToRoutineScreen
          routineId={currentRoutineId || undefined}
          routineName={currentRoutineName}
          onBack={
            currentRoutineId ? onCloseAddExercises : onCloseCreateRoutine
          }
          onExerciseSelected={(exercises: Exercise[]) => onExerciseSelected(exercises)}
          isFromExerciseSetup={!!currentRoutineId}
        />
      </SlideTransition>

      <SlideTransition
        show={
          currentView === "exercise-setup" &&
          currentRoutineId !== null &&
          !!currentRoutineName
        }
        enterFrom="left"
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
      {currentView === "profile" && (
        <ProfileScreen
          bottomBar={bottomBar}
          onNavigateToMyAccount={onNavigateToMyAccount}
          onNavigateToDeviceSettings={onNavigateToDeviceSettings}
        />
      )}

      <SlideTransition
        show={currentView === "profile-my-account"}
        enterFrom="right"
        exitTo="right"
      >
        <MyAccountScreen onBack={onCloseMyAccount} />
      </SlideTransition>

      <SlideTransition
        show={currentView === "profile-device-settings"}
        enterFrom="right"
        exitTo="right"
      >
        <DeviceSettingsScreen onBack={onCloseDeviceSettings} />
      </SlideTransition>
    </div>
  );
}
