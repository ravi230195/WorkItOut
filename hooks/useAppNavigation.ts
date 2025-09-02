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


  const handleUnauthorizedError = (error: Error) => {
    if (error.message === "UNAUTHORIZED") {
      toast.error("Session expired. Please sign in.");
      setCurrentView("signin");
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

  const showCreateRoutine = () => setCurrentView("create-routine");

  /** After CreateRoutineScreen creates a routine, jump to ExerciseSetup (empty) */
  const handleRoutineCreated = (routineName: string, routineId?: number) => {
    setCurrentRoutineName(routineName);
    if (routineId) setCurrentRoutineId(routineId);
    setSelectedExercisesForSetup([]); // start empty
    setRoutineAccess(RoutineAccess.Editable);
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

  /** Back from ExerciseSetup → Workouts/Routines */
  const closeExerciseSetupToRoutines = () => {
    setCurrentRoutineId(null);
    setCurrentRoutineName("");
    setSelectedExercisesForSetup([]);
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
    setCurrentView("exercise-setup");  };


  const closeCreateRoutine = () => setCurrentView("workouts");

  const completeRoutineCreation = () => {
    setCurrentRoutineId(null);
    setCurrentRoutineName("");
    setSelectedExercisesForSetup([]);
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

    handleAuthSuccess,
    navigateToSignUp,
    navigateToSignIn,
    handleTabChange,

    showCreateRoutine,
    handleRoutineCreated,
    closeCreateRoutine,
    completeRoutineCreation,

    handleExercisesSelected,
    closeExerciseSetup,
    handleExerciseSetupComplete,
    onRoutineSelection,

    closeExerciseSetupToRoutines,
    handleUnauthorizedError,
    safeNavigate,
  };
}
