
import { StepCounter } from "./StepCounter";
import { TactileButton } from "./TactileButton";

import {
  MoreHorizontal,
  AlertCircle,
} from "lucide-react";

import { useStepTracking } from "../hooks/useStepTracking";
import { useScrollToTop } from "../hooks/useScrollToTop";
import { useKeyboardInset } from "../hooks/useKeyboardInset";

import { supabaseAPI, UserRoutine } from "../utils/supabase-api";
import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

interface WorkoutDashboardProps {
  onCreateRoutine: () => void;
  onSelectRoutine: (routineId: number, routineName: string) => void;
}

export function WorkoutDashboard({
  onCreateRoutine,
  onSelectRoutine,
}: WorkoutDashboardProps) {
  // Scroll to top when component mounts
  const scrollRef = useScrollToTop();
  // Keyboard-aware scrolling
  useKeyboardInset();


  const { userToken } = useAuth();

  const [routines, setRoutines] = useState<UserRoutine[]>([]);
  const [isLoadingRoutines, setIsLoadingRoutines] = useState(true);
  const [routinesError, setRoutinesError] = useState<string | null>(null);

  // Step tracking integration with new methods
  const {
    steps,
    goal,
    progressPercentage,
    isLoading: isLoadingSteps,
  } = useStepTracking(true);

  // Initial data fetch on mount and when user token changes
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!userToken) return;

      console.log('🚀 [DBG] Fetching initial dashboard data...');
      setIsLoadingRoutines(true);
      try {
        console.log('🔄 [DBG] Loading routines from Supabase...');
        const routinesData = await supabaseAPI.getUserRoutines();
        console.log('✅ [DBG] Initial routines loaded:', routinesData.length);
        setRoutines(routinesData);
      } catch (error) {
        console.error("❌ [DBG] Failed to fetch initial dashboard data:", error);
        if (error instanceof Error && error.message === "UNAUTHORIZED") {
          toast.error("Session expired. Please sign in.");
        } else {
          setRoutinesError(error instanceof Error ? error.message : "Failed to load routines");
        }
      } finally {
        setIsLoadingRoutines(false);
      }
    };

    fetchInitialData();
  }, [userToken]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning!";
    if (hour < 18) return "Good afternoon!";
    return "Good evening!";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div ref={scrollRef} className="dashboard-bg pt-safe p-6 space-y-6 max-w-md mx-auto pb-20">
      {/* Dynamic Greeting */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-medium text-[var(--warm-brown)]">
          {getGreeting()}
        </h1>

      </div>

      {/* Routines Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-[var(--warm-brown)]">
            MY ROUTINES
          </h2>
          <TactileButton
            onClick={onCreateRoutine}
            className="bg-[var(--warm-coral)] hover:bg-[var(--warm-coral)]/90 text-white px-3 py-1.5 text-sm font-medium"
          >
            Create Routine
          </TactileButton>
        </div>

        {isLoadingRoutines ? (
          <div className="text-center py-8">
            <div className="animate-spin mx-auto mb-3 w-6 h-6 border-2 border-[var(--warm-coral)] border-t-transparent rounded-full"></div>
            <p className="text-[var(--warm-brown)]/60 text-sm">Loading routines...</p>
          </div>
        ) : routinesError ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-red-600 text-sm mb-3">{routinesError}</p>
            <TactileButton
              onClick={() => window.location.reload()}
              variant="secondary"
              className="px-4 py-2 text-sm"
            >
              Try Again
            </TactileButton>
          </div>
        ) : routines.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[var(--warm-brown)]/60 text-sm mb-3">
              Start by adding new routine
            </p>
            <TactileButton
              onClick={onCreateRoutine}
              className="bg-[var(--warm-coral)] hover:bg-[var(--warm-brown)]/90 text-white px-4 py-2 text-sm font-medium"
            >
              Create Your First Routine
            </TactileButton>
          </div>
        ) : (
          <div className="space-y-3">
            {routines.map((routine) => (
              <div
                key={routine.routine_template_id}
                onClick={() => onSelectRoutine(routine.routine_template_id, routine.name)}
                className="bg-white/80 backdrop-blur-sm rounded-2xl border border-[var(--border)] p-4 shadow-sm hover:shadow-md transition-all cursor-pointer hover:bg-white/90"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-[var(--warm-brown)] mb-1">
                      {routine.name}
                    </h3>
                    <p className="text-sm text-[var(--warm-brown)]/60">
                      Created {formatDate(routine.created_at)} • Version {routine.version}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-[var(--warm-brown)]/40 px-2 py-1 bg-[var(--soft-gray)] rounded-full">
                      Active
                    </div>
                    <TactileButton
                      variant="secondary"
                      size="sm"
                      className="p-2 h-auto"
                    >
                      <MoreHorizontal size={16} />
                    </TactileButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progress Overview with Steps and Workout Stats */}
      <div className="space-y-4">
        {/* Step Counter - Full Width Widget */}
        <StepCounter
          steps={steps}
          goal={goal}
          progressPercentage={progressPercentage}
          isLoading={isLoadingSteps}
        />
      </div>
    </div>
  );
}