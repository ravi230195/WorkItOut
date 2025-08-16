import { useState } from "react";
import { WorkoutTemplate } from "../components/WorkoutTemplates";
import { Exercise } from "../components/ExerciseDatabase";
import { ViewType } from "../utils/navigation";
import { toast } from "sonner";

export function useAppNavigation() {
  const [currentView, setCurrentView] = useState<ViewType>("workouts");
  const [activeTab, setActiveTab] = useState<"workouts" | "routines" | "progress" | "profile">("workouts");
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null);
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

  const handleSelectTemplate = (template: WorkoutTemplate) => {
    setSelectedTemplate(template);
    setCurrentView("active-workout");
  };

  const endWorkout = () => {
    setSelectedTemplate(null);
    setCurrentView("workouts");
    setActiveTab("workouts");
    // Refresh the workouts view to show updated data
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
    setSelectedExercise(exercise);
    setCurrentView("active-workout");
  };

  const closeExerciseSelector = () => {
    setCurrentView("active-workout");
  };

  const handleTabChange = (tab: "workouts" | "routines" | "progress" | "profile") => {
    setActiveTab(tab);
    
    // Map tab to view
    switch (tab) {
      case "workouts":
        setCurrentView("workouts");
        break;
      case "routines":
        setCurrentView("routines");
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

  const handleExerciseSelected = (exercise: Exercise, createdRoutineId: number) => {
    // Store the exercise and routine info, then navigate to exercise setup
    setSelectedExercise(exercise);
    setCurrentRoutineId(createdRoutineId);
    setCurrentView("exercise-setup");
  };

  const showExerciseSetup = () => {
    setCurrentView("exercise-setup");
  };

  const showExerciseSetupEmpty = (routineId: number, routineName: string) => {
    setCurrentRoutineId(routineId);
    setCurrentRoutineName(routineName);
    setSelectedExercise(null); // No exercise selected
    setCurrentView("exercise-setup");
  };

  const closeExerciseSetup = () => {
    // Clear selected exercise when navigating to exercise selection
    setSelectedExercise(null);
    setCurrentView("add-exercises-to-routine");
  };

  // New function specifically for returning to exercise setup from exercise selection
  const returnToExerciseSetup = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setCurrentView("exercise-setup");
  };

  const closeExerciseSetupToRoutines = () => {
    // Clear all routine state and go back to routines
    setSelectedExercise(null);
    setCurrentRoutineId(null);
    setCurrentRoutineName("");
    setCurrentView("routines");
  };

  const handleExerciseSetupComplete = () => {
    // After exercise setup is complete, clear the selected exercise but stay on screen
    // This allows the component to show the empty state with saved exercises
    setSelectedExercise(null);
    console.log("Exercise setup completed, staying on screen for more exercises");
  };

  const showRoutineEditor = () => {
    setCurrentView("routine-editor");
  };

  const closeRoutineEditor = () => {
    setCurrentView("add-exercises-to-routine");
  };

  const closeCreateRoutine = () => {
    setCurrentView("routines");
  };

  const completeRoutineCreation = () => {
    setCurrentRoutineId(null);
    setCurrentRoutineName("");
    setCurrentView("routines");
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
    selectedExercise,
    setSelectedExercise,
    selectedTemplate,
    currentRoutineId,
    currentRoutineName,
    refreshTrigger,
    handleAuthSuccess,
    navigateToSignUp,
    navigateToSignIn,
    handleSelectTemplate,
    endWorkout,
    showExerciseSelector,
    handleSelectExercise,
    closeExerciseSelector,
    handleTabChange,
    showCreateRoutine,
    handleRoutineCreated,
    closeCreateRoutine,
    completeRoutineCreation,
    handleExerciseSelected,
    showExerciseSetup,
    closeExerciseSetup,
    handleExerciseSetupComplete,
    showRoutineEditor,
    closeRoutineEditor,
    showExerciseSetupEmpty,
    closeExerciseSetupToRoutines,
    handleUnauthorizedError,
    safeNavigate,
    returnToExerciseSetup
  };
}