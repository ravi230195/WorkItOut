import { AuthProvider, useAuth } from "./components/AuthContext";
import { WorkoutProvider } from "./components/WorkoutContext";
import { AppRouter } from "./components/AppRouter";
import { useAuthEffects } from "./hooks/useAuthEffects";
import { useAppNavigation } from "./hooks/useAppNavigation";
import { useMobileSetup } from "./hooks/useMobileSetup";
import { Toaster } from "./components/ui/sonner";

function AppContent() {
  const { setUserToken } = useAuth();
  
  // Handle all mobile device setup (viewport, safe areas)
  useMobileSetup();

  const {
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
    returnToExerciseSetup
  } = useAppNavigation();

  const { isAuthenticated } = useAuthEffects({ currentView, setCurrentView });

  return (
    <AppRouter
      currentView={currentView}
      activeTab={activeTab}
      selectedExercise={selectedExercise}
      selectedTemplate={selectedTemplate}
      currentRoutineId={currentRoutineId}
      currentRoutineName={currentRoutineName}
      refreshTrigger={refreshTrigger}
      isAuthenticated={isAuthenticated}
      onAuthSuccess={(token) => handleAuthSuccess(token, setUserToken)}
      onNavigateToSignUp={navigateToSignUp}
      onNavigateToSignIn={navigateToSignIn}
      onSelectTemplate={handleSelectTemplate}
      onEndWorkout={endWorkout}
      onAddExercise={showExerciseSelector}
      onSelectExercise={handleSelectExercise}
      onCloseExerciseSelector={closeExerciseSelector}
      onExerciseAdded={() => setSelectedExercise(null)}
      onTabChange={handleTabChange}
      onCreateRoutine={showCreateRoutine}
      onRoutineCreated={handleRoutineCreated}
      onCloseCreateRoutine={closeCreateRoutine}
      onCompleteRoutineCreation={completeRoutineCreation}
      onExerciseSelected={handleExerciseSelected}
      onShowExerciseSetup={showExerciseSetup}
      onCloseExerciseSetup={closeExerciseSetup}
      onExerciseSetupComplete={handleExerciseSetupComplete}
      onShowRoutineEditor={showRoutineEditor}
      onCloseRoutineEditor={closeRoutineEditor}
      onSelectRoutine={showExerciseSetupEmpty}
      onCloseExerciseSetupToRoutines={closeExerciseSetupToRoutines}
      onShowExerciseSelector={showExerciseSelector}
      onReturnToExerciseSetup={returnToExerciseSetup}
    />
  );
}

function AppWithToaster() {
  return (
    <>
      <AppContent />
      <Toaster />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WorkoutProvider>
        <AppWithToaster />
      </WorkoutProvider>
    </AuthProvider>
  );
}