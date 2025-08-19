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

  // Error handling for unauthorized sessions
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

  const navigateToSignUp = () => {
    setCurrentView("signup");
  };

  const navigateToSignIn = () => {
    setCurrentView("signin");
  };





  const showExerciseSelector = () => {
    // If we're in exercise setup with a routine, go to add exercises to routine
    if (currentView === "exercise-setup" && currentRoutineId) {
      setCurrentView("add-exercises-to-routine");
    } else {
      setCurrentView("exercise-selection");
    }
  };

  const handleSelectExercise = (exercise: Exercise) => {
    setCurrentView("exercise-setup");
  };

  const closeExerciseSelector = () => {
    setCurrentView("workouts");
  };

  const handleTabChange = (tab: "workouts" | "progress" | "profile") => {
    setActiveTab(tab);
    
    // Map tab to view
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

  const showCreateRoutine = () => {
    setCurrentView("create-routine");
  };

  const handleRoutineCreated = (routineName: string, routineId?: number) => {
    // Store routine name and ID
    setCurrentRoutineName(routineName);
    if (routineId) {
      setCurrentRoutineId(routineId);
    }
    // For now, keep going to exercise selection first
    setCurrentView("add-exercises-to-routine");
  };

  const handleExerciseSelected = (exercise: Exercise, createdRoutineId?: number) => {
    // Store the routine info, then navigate to exercise setup
    if (createdRoutineId) {
      setCurrentRoutineId(createdRoutineId);
    }
    setCurrentView("exercise-setup");
  };



  const showExerciseSetupEmpty = (routineId: number, routineName: string) => {
    setCurrentRoutineId(routineId);
    setCurrentRoutineName(routineName);
    setCurrentView("exercise-setup");
  };

  const closeExerciseSetup = () => {
    setCurrentView("add-exercises-to-routine");
  };

  // New function specifically for returning to exercise setup from exercise selection
  const returnToExerciseSetup = (exercise: Exercise) => {
    setCurrentView("exercise-setup");
  };

  const closeExerciseSetupToRoutines = () => {
    // Clear all routine state and go back to workouts
    setCurrentRoutineId(null);
    setCurrentRoutineName("");
    setCurrentView("workouts");
  };

  const handleExerciseSetupComplete = () => {
    // After exercise setup is complete, stay on screen
    // This allows the component to show the empty state with saved exercises
    console.log("Exercise setup completed, staying on screen for more exercises");
  };



  const closeRoutineEditor = () => {
    setCurrentView("add-exercises-to-routine");
  };

  const closeCreateRoutine = () => {
    setCurrentView("workouts");
  };

  const completeRoutineCreation = () => {
    setCurrentRoutineId(null);
    setCurrentRoutineName("");
    setCurrentView("workouts");
    // Trigger a refresh of the routines list to show the new routine
    setRefreshTrigger(prev => prev + 1);
  };

  // Navigation helper that handles errors
  const safeNavigate = async (asyncAction: () => Promise<void>, fallbackView?: ViewType) => {
    try {
      await asyncAction();
    } catch (error) {
      console.error("Navigation action failed:", error);
      if (error instanceof Error && !handleUnauthorizedError(error)) {
        toast.error("Something went wrong. Please try again.");
        if (fallbackView) {
          setCurrentView(fallbackView);
        }
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
    handleAuthSuccess,
    navigateToSignUp,
    navigateToSignIn,
    showExerciseSelector,
    handleSelectExercise,
    closeExerciseSelector,
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
    returnToExerciseSetup
  };
}
