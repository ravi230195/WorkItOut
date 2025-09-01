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

// App.tsx
function AppContent() {
  const { setSession, updateLastActive } = useAuth();
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

  // ⬅️ now includes authReady
  const { isAuthenticated, authReady } = useAuthEffects({ currentView, setCurrentView });

  const showBottomNav = !VIEWS_WITHOUT_BOTTOM_NAV.includes(currentView);
  const [overlayOpen, setOverlayOpen] = useState(false);

  const showNav = isAuthenticated && showBottomNav && !overlayOpen;
  const bottomBarEl = showNav ? (
    <BottomNavigation
      activeTab={activeTab as TabType}
      onTabChange={handleTabChange}
    />
  ) : null;

  // ✅ block until authReady so cold-start doesn’t flash dashboard
  if (!authReady) {
    return (
      <div className="h-dvh grid place-items-center">
        <div className="w-5 h-5 animate-spin border-2 border-current border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div id="app" className="h-dvh flex flex-col overflow-hidden">
      <main className="flex-1 min-h-0 overflow-hidden">
        <AppRouter
          currentView={currentView}
          currentRoutineId={currentRoutineId}
          currentRoutineName={currentRoutineName}
          routineAccess={routineAccess}
          selectedExerciseForSetup={selectedExerciseForSetup}
          setSelectedExerciseForSetup={setSelectedExerciseForSetup}
          isAuthenticated={isAuthenticated}
          onAuthSuccess={(session) => handleAuthSuccess(session, setSession, updateLastActive)}
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
          bottomBar={bottomBarEl}
          onOverlayChange={setOverlayOpen}
        />
      </main>
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