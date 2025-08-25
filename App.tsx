import { AuthProvider, useAuth } from "./components/AuthContext";
import { WorkoutProvider } from "./components/WorkoutContext";
import { AppRouter } from "./components/AppRouter";
import { useAuthEffects } from "./hooks/useAuthEffects";
import { useAppNavigation } from "./hooks/useAppNavigation";
import { useMobileSetup } from "./hooks/useMobileSetup";
import { Toaster } from "./components/ui/sonner";
import { useState } from "react";

import { BottomNavigation, TabType } from "./components/BottomNavigation";
import { VIEWS_WITHOUT_BOTTOM_NAV } from "./utils/navigation";

// ✅ add this (path to your boundary component)
import ErrorBoundary from "./components/system/ErrorBoundary";

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
    selectedExerciseForSetup,
    setSelectedExerciseForSetup,
    routineAccess,
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
    onRoutineSelection,
    closeExerciseSetupToRoutines,
    returnToExerciseSetup
  } = useAppNavigation();

  const { isAuthenticated } = useAuthEffects({ currentView, setCurrentView });
  const showBottomNav = !VIEWS_WITHOUT_BOTTOM_NAV.includes(currentView);
  const [overlayOpen, setOverlayOpen] = useState(false);

  const showNav = isAuthenticated && showBottomNav && !overlayOpen;

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
          currentRoutineId={currentRoutineId}
          currentRoutineName={currentRoutineName}
          routineAccess={routineAccess}
          selectedExerciseForSetup={selectedExerciseForSetup}
          setSelectedExerciseForSetup={setSelectedExerciseForSetup}
          isAuthenticated={isAuthenticated}
          onAuthSuccess={(token) => handleAuthSuccess(token, setUserToken)}
          onNavigateToSignUp={navigateToSignUp}
          onNavigateToSignIn={navigateToSignIn}
          onCreateRoutine={showCreateRoutine}
          onRoutineCreated={handleRoutineCreated}
          onCloseCreateRoutine={closeCreateRoutine}
          onCompleteRoutineCreation={completeRoutineCreation}
          onExerciseSelected={handleExerciseSelected}
          onCloseExerciseSetup={closeExerciseSetup}
          onExerciseSetupComplete={handleExerciseSetupComplete}
          onSelectRoutine={onRoutineSelection}
          onCloseExerciseSetupToRoutines={closeExerciseSetupToRoutines}
          onReturnToExerciseSetup={returnToExerciseSetup}
          onOverlayChange={setOverlayOpen}
        />
      </main>

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
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
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
