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
    currentRoutineId,
    currentRoutineName,
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
    returnToExerciseSetup
  } = useAppNavigation();

  const { isAuthenticated } = useAuthEffects({ currentView, setCurrentView });

  const showNav = isAuthenticated;

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
          currentRoutineId={currentRoutineId}
          currentRoutineName={currentRoutineName}
          isAuthenticated={isAuthenticated}
          onAuthSuccess={(token) => handleAuthSuccess(token, setUserToken)}
          onNavigateToSignUp={navigateToSignUp}
          onNavigateToSignIn={navigateToSignIn}

          onSelectExercise={handleSelectExercise}
          onCloseExerciseSelector={closeExerciseSelector}
          onTabChange={handleTabChange}
          onCreateRoutine={showCreateRoutine}
          onRoutineCreated={handleRoutineCreated}
          onCloseCreateRoutine={closeCreateRoutine}
          onCompleteRoutineCreation={completeRoutineCreation}
          onExerciseSelected={handleExerciseSelected}
          onCloseExerciseSetup={closeExerciseSetup}
          onExerciseSetupComplete={handleExerciseSetupComplete}
          onCloseRoutineEditor={closeRoutineEditor}
          onSelectRoutine={showExerciseSetupEmpty}
          onCloseExerciseSetupToRoutines={closeExerciseSetupToRoutines}
          onShowExerciseSelector={showExerciseSelector}
          onReturnToExerciseSetup={returnToExerciseSetup}
        />
      </main>

      {/* ✅ unchanged: BottomNavigation rendered here when signed in */}
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