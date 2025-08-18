import { AuthProvider, useAuth } from "./components/AuthContext";
import { WorkoutProvider } from "./components/WorkoutContext";
import { AppRouter } from "./components/AppRouter";
import { useAuthEffects } from "./hooks/useAuthEffects";
import { useAppNavigation } from "./hooks/useAppNavigation";
import { useMobileSetup } from "./hooks/useMobileSetup";
import { Toaster } from "./components/ui/sonner";

/* ✅ NEW: import BottomNavigation + TabType */
import { BottomNavigation, TabType } from "./components/BottomNavigation";

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
  /* ✅ ADDED: show nav only after successful sign-in
     You can tighten this later to also hide on specific auth screens if needed.
  */
     const showNav = isAuthenticated;
  /* ✅ CHANGED: wrap the app in a 2-row grid:
     - <main> is the ONLY scrollable area
     - BottomNavigation stays fixed at the bottom
  */
    return (
    <div id="app" className="h-[100dvh] grid grid-rows-[1fr_auto] overflow-hidden">
      <main
        className={
          "overflow-auto overscroll-contain " +
          (showNav ? "pb-[calc(72px+env(safe-area-inset-bottom))]" : "")
        }
      >
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
      </main>

      {/* ✅ CHANGED: render BottomNavigation only when signed in */}
      {showNav && (
        <BottomNavigation
          activeTab={activeTab as TabType}
          onTabChange={handleTabChange}
        />
      )}
    </div>
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
