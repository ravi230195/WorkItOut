import { useState } from "react";
import { Exercise } from "../utils/supabase-api";
import { ViewType } from "../utils/navigation";
import { toast } from "sonner";

export function useAppNavigation() {
  const [currentView, setCurrentView] = useState<ViewType>("workouts");
  const [activeTab, setActiveTab] = useState<"workouts" | "progress" | "profile">("workouts");

  const [currentRoutineId, setCurrentRoutineId] = useState<number | null>(null);
  const [currentRoutineName, setCurrentRoutineName] = useState<string>("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // When picker returns, ExerciseSetup uses this to open configure form
  const [selectedExerciseForSetup, setSelectedExerciseForSetup] = useState<Exercise | null>(null);

  const handleUnauthorizedError = (error: Error) => {
    if (error.message === "UNAUTHORIZED") {
      toast.error("Session expired. Please sign in.");
      setCurrentView("signin");
      return true;
    }
    return false;
  };

  const handleAuthSuccess = (token: string, setUserToken: (token: string) => void) => {
    setUserToken(token);
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
    setSelectedExerciseForSetup(null); // start empty
    setCurrentView("exercise-setup");
  };

  /** When a picker selects an exercise (also used by create flow if needed) */
  const handleExerciseSelected = (exercise: Exercise, createdRoutineId?: number) => {
    if (createdRoutineId) setCurrentRoutineId(createdRoutineId);
    setSelectedExerciseForSetup(exercise);
    setCurrentView("exercise-setup");
  };

  const showExerciseSetupEmpty = (routineId: number, routineName: string) => {
    setCurrentRoutineId(routineId);
    setCurrentRoutineName(routineName);
    setSelectedExerciseForSetup(null);
    setCurrentView("exercise-setup");
  };

  /** From ExerciseSetup: the "+" opens the picker */
  const closeExerciseSetup = () => {
    setCurrentView("add-exercises-to-routine");
  };

  /** Picker returns an exercise → go back to ExerciseSetup with it preloaded */
  const returnToExerciseSetup = (exercise: Exercise) => {
    setSelectedExerciseForSetup(exercise);
    setCurrentView("exercise-setup");
  };

  /** Back from ExerciseSetup → Workouts/Routines */
  const closeExerciseSetupToRoutines = () => {
    setCurrentRoutineId(null);
    setCurrentRoutineName("");
    setSelectedExerciseForSetup(null);
    setCurrentView("workouts");
  };

  /** Save in ExerciseSetup should stay on the screen (list updates there) */
  const handleExerciseSetupComplete = () => {
    // no navigation; screen handles UI refresh
  };

  const closeRoutineEditor = () => setCurrentView("add-exercises-to-routine");
  const closeCreateRoutine = () => setCurrentView("workouts");

  const completeRoutineCreation = () => {
    setCurrentRoutineId(null);
    setCurrentRoutineName("");
    setSelectedExerciseForSetup(null);
    setCurrentView("workouts");
    setRefreshTrigger(prev => prev + 1);
  };

  const safeNavigate = async (asyncAction: () => Promise<void>, fallbackView?: ViewType) => {
    try {
      await asyncAction();
    } catch (error) {
      console.error("Navigation action failed:", error);
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
    selectedExerciseForSetup,
    setSelectedExerciseForSetup,

    handleAuthSuccess,
    navigateToSignUp,
    navigateToSignIn,
    handleTabChange,

    showCreateRoutine,
    handleRoutineCreated,
    closeCreateRoutine,
    completeRoutineCreation,

    handleExerciseSelected,
    closeExerciseSetup,
    handleExerciseSetupComplete,
    closeRoutineEditor,
    showExerciseSetupEmpty,
    closeExerciseSetupToRoutines,
    handleUnauthorizedError,
    safeNavigate,
    returnToExerciseSetup,
  };
}
