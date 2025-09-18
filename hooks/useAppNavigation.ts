import { useState } from "react";
import { Exercise } from "../utils/supabase/supabase-api";
import { ViewType } from "../utils/navigation";
import { toast } from "sonner";
import { logger } from "../utils/logging";

export enum RoutineAccess {
  Editable = "editable",
  ReadOnly = "readonly",
}

export function useAppNavigation() {
  const [currentView, setCurrentView] = useState<ViewType>("workouts");
  const [activeTab, setActiveTab] = useState<"workouts" | "progress" | "profile">("workouts");

  const [currentRoutineId, setCurrentRoutineId] = useState<number | null>(null);
  const [currentRoutineName, setCurrentRoutineName] = useState<string>("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // When picker returns, ExerciseSetup consumes a batch of exercises to configure
  const [selectedExercisesForSetup, setSelectedExercisesForSetup] = useState<Exercise[]>([]);
  const [routineAccess, setRoutineAccess] = useState<RoutineAccess>(RoutineAccess.Editable);

  // Persist ExerciseSetupScreen mode ("plan" or "workout") across navigation
  const [exerciseSetupMode, setExerciseSetupMode] = useState<"plan" | "workout">(
    "plan"
  );


  const handleUnauthorizedError = (error: Error) => {
    if (error.message === "UNAUTHORIZED") {
      toast.error("Session expired. Please sign in.");
      setCurrentView("welcome");
      return true;
    }
    return false;
  };

  const handleAuthSuccess = (token: string, refreshToken: string, setUserToken: (token: string | null, refreshToken?: string | null) => void) => {
    setUserToken(token, refreshToken);
    setCurrentView("workouts");
    setActiveTab("workouts");
  };

  const navigateToSignUp = () => setCurrentView("signup");
  const navigateToSignIn = () => setCurrentView("signin");
  const navigateToWelcome = () => setCurrentView("welcome");

  const handleTabChange = (tab: "workouts" | "progress" | "profile") => {
    setActiveTab(tab);
    switch (tab) {
      case "workouts":
        setCurrentView("workouts");
        break;
      case "progress":
        setCurrentView("progress");
        break;
      case "profile":
        setCurrentView("profile");
        break;
    }
  };

  const showProfileAccount = () => {
    setActiveTab("profile");
    setCurrentView("profile-my-account");
  };

  const closeProfileAccount = () => {
    setActiveTab("profile");
    setCurrentView("profile");
  };

  const showProfileDeviceSettings = () => {
    setActiveTab("profile");
    setCurrentView("profile-device-settings");
  };

  const closeProfileDeviceSettings = () => {
    setActiveTab("profile");
    setCurrentView("profile");
  };

  const showCreateRoutine = () => setCurrentView("create-routine");
  const showEditMeasurements = () => setCurrentView("edit-measurements");

  /** After CreateRoutineScreen creates a routine, jump to ExerciseSetup (empty) */
  const handleRoutineCreated = (routineName: string, routineId?: number) => {
    setCurrentRoutineName(routineName);
    if (routineId) setCurrentRoutineId(routineId);
    setSelectedExercisesForSetup([]); // start empty
    setRoutineAccess(RoutineAccess.Editable);
    setExerciseSetupMode("plan");
    setCurrentView("exercise-setup");
  };

  /** When picker selects one or more exercises */
  const handleExercisesSelected = (exercises: Exercise[]) => {
    setSelectedExercisesForSetup(exercises);
    setCurrentView("exercise-setup");
  };

  /** From ExerciseSetup: the "+" opens the picker */
  const closeExerciseSetup = () => {
    setCurrentView("add-exercises-to-routine");
  };

  /** Back from AddExercises → ExerciseSetup */
  const closeAddExercises = () => {
    setCurrentView("exercise-setup");
  };

  /** Back from ExerciseSetup → Workouts/Routines */
  const closeExerciseSetupToRoutines = () => {
    setCurrentRoutineId(null);
    setCurrentRoutineName("");
    setSelectedExercisesForSetup([]);
    setExerciseSetupMode("plan");
    setCurrentView("workouts");
  };

  /** Save in ExerciseSetup should stay on the screen (list updates there) */
  const handleExerciseSetupComplete = () => {
    // no navigation; screen handles UI refresh
  };

  /** When user selects a routine from a list (defaults to editable) */
  const onRoutineSelection = (routineId: number, routineName: string, access?: RoutineAccess) => {
    setCurrentRoutineId(routineId);
    setCurrentRoutineName(routineName);
    setSelectedExercisesForSetup([]);
    setRoutineAccess(access || RoutineAccess.Editable);
    setExerciseSetupMode("plan");
    setCurrentView("exercise-setup");
  };


  const closeCreateRoutine = () => setCurrentView("workouts");
  const closeEditMeasurements = () => setCurrentView("workouts");

  const completeRoutineCreation = () => {
    setCurrentRoutineId(null);
    setCurrentRoutineName("");
    setSelectedExercisesForSetup([]);
    setExerciseSetupMode("plan");
    setCurrentView("workouts");
    setRefreshTrigger(prev => prev + 1);
  };

  const safeNavigate = async (asyncAction: () => Promise<void>, fallbackView?: ViewType) => {
    try {
      await asyncAction();
    } catch (error) {
      logger.error("Navigation action failed:", error);
      if (error instanceof Error && !handleUnauthorizedError(error)) {
        toast.error("Something went wrong. Please try again.");
        if (fallbackView) setCurrentView(fallbackView);
      }
    }
  };

  return {
    currentView,
    setCurrentView,
    activeTab,
    currentRoutineId,
    currentRoutineName,
    refreshTrigger,
    selectedExercisesForSetup,
    setSelectedExercisesForSetup,
    routineAccess,
    setRoutineAccess,
    exerciseSetupMode,
    setExerciseSetupMode,

    handleAuthSuccess,
    navigateToSignUp,
    navigateToSignIn,
    navigateToWelcome,
    handleTabChange,

    showCreateRoutine,
    showEditMeasurements,
    handleRoutineCreated,
    closeCreateRoutine,
    closeEditMeasurements,
    completeRoutineCreation,

    handleExercisesSelected,
    closeExerciseSetup,
    closeAddExercises,
    handleExerciseSetupComplete,
    onRoutineSelection,

    closeExerciseSetupToRoutines,
    handleUnauthorizedError,
    safeNavigate,
    showProfileAccount,
    closeProfileAccount,
    showProfileDeviceSettings,
    closeProfileDeviceSettings,
  };
}
