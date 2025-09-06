import { AuthProvider, useAuth } from "./components/AuthContext";
import { WorkoutProvider } from "./components/WorkoutContext";
import { AppRouter } from "./components/AppRouter";
import { useAuthEffects } from "./hooks/useAuthEffects";
import { useAppNavigation } from "./hooks/useAppNavigation";
import { useMobileSetup } from "./hooks/useMobileSetup";
import { Toaster } from "./components/ui/sonner";
import { useState } from "react";
import ThemeToggle from "./components/ThemeToggle";
import { useKeyboardVisible } from "./hooks/useKeyboardVisible";

import { BottomNavigation, TabType } from "./components/BottomNavigation";
import { VIEWS_WITHOUT_BOTTOM_NAV } from "./utils/navigation";

// ✅ add this (path to your boundary component)
import ErrorBoundary from "./components/system/ErrorBoundary";

// App.tsx
function AppContent() {
  const { setUserToken } = useAuth();
  useMobileSetup();

  const {
    currentView,
    setCurrentView,
    activeTab,
    currentRoutineId,
    currentRoutineName,
    selectedExercisesForSetup,
    setSelectedExercisesForSetup,
    routineAccess,
    exerciseSetupMode,
    setExerciseSetupMode,
    handleAuthSuccess,
    navigateToSignUp,
    navigateToSignIn,
    handleTabChange,
    showCreateRoutine,
    showEditMeasurements,
    handleRoutineCreated,
    closeCreateRoutine,
    closeEditMeasurements,
    completeRoutineCreation,
    handleExercisesSelected,
    closeExerciseSetup,
    handleExerciseSetupComplete,
    onRoutineSelection,
    closeExerciseSetupToRoutines,
  } = useAppNavigation();

  // ⬅️ now includes authReady
  const { isAuthenticated, authReady } = useAuthEffects({ currentView, setCurrentView });

  const showBottomNav = !VIEWS_WITHOUT_BOTTOM_NAV.includes(currentView);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const keyboardVisible = useKeyboardVisible();

  const showNav = isAuthenticated && showBottomNav && !overlayOpen && !keyboardVisible;
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
    <div id="app" className="relative h-dvh flex flex-col overflow-hidden">
      <ThemeToggle className="absolute top-2 right-2" />
      <main className="flex-1 min-h-0 overflow-hidden">
        <AppRouter
          currentView={currentView}
          currentRoutineId={currentRoutineId}
          currentRoutineName={currentRoutineName}
          routineAccess={routineAccess}
          selectedExercisesForSetup={selectedExercisesForSetup}
          setSelectedExercisesForSetup={setSelectedExercisesForSetup}
          isAuthenticated={isAuthenticated}
          onAuthSuccess={(token, refreshToken) => handleAuthSuccess(token, refreshToken, setUserToken)}
          onNavigateToSignUp={navigateToSignUp}
          onNavigateToSignIn={navigateToSignIn}
          onCreateRoutine={showCreateRoutine}
          onEditMeasurements={showEditMeasurements}
          onRoutineCreated={handleRoutineCreated}
          onCloseCreateRoutine={closeCreateRoutine}
          onCloseEditMeasurements={closeEditMeasurements}
          onCompleteRoutineCreation={completeRoutineCreation}
          onExerciseSelected={handleExercisesSelected}
          onCloseExerciseSetup={closeExerciseSetup}
          onExerciseSetupComplete={handleExerciseSetupComplete}
          exerciseSetupMode={exerciseSetupMode}
          setExerciseSetupMode={setExerciseSetupMode}
          onSelectRoutine={onRoutineSelection}
          onCloseExerciseSetupToRoutines={closeExerciseSetupToRoutines}
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