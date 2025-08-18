import { Card, CardContent, CardHeader } from "./ui/card";
import { TactileButton } from "./TactileButton";
import { CircularProgress } from "./CircularProgress";
import { StepCounter } from "./StepCounter";

import {
  Clock,
  TrendingUp,
  Calendar,
  Dumbbell,
  Target,
  Zap,
} from "lucide-react";
import { useWorkout } from "./WorkoutContext";
import { WorkoutTemplate } from "./WorkoutTemplates";
import { useWorkoutTemplates } from "../hooks/useWorkoutTemplates";
import { useStepTracking } from "../hooks/useStepTracking";
import { useScrollToTop } from "../hooks/useScrollToTop";
import { useKeyboardInset } from "../hooks/useKeyboardInset";

import { supabaseAPI, Workout } from "../utils/supabase-api";
import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

interface RecentWorkout {
  id: string;
  name: string;
  date: string;
  duration: string;
  exercises: number;
  type: "push" | "pull" | "legs" | "cardio";
}

const getWorkoutIcon = (type: RecentWorkout["type"]) => {
  switch (type) {
    case "push":
      return (
        <Zap size={14} className="text-[var(--warm-coral)]" />
      );
    case "pull":
      return (
        <Target size={14} className="text-[var(--warm-sage)]" />
      );
    case "legs":
      return (
        <Dumbbell
          size={14}
          className="text-[var(--warm-peach)]"
        />
      );
    case "cardio":
      return (
        <TrendingUp
          size={14}
          className="text-[var(--warm-mint)]"
        />
      );
    default:
      return (
        <Dumbbell
          size={14}
          className="text-[var(--warm-brown)]"
        />
      );
  }
};

const getWorkoutType = (workoutId?: string | number): RecentWorkout["type"] => {
  if (!workoutId) return "push";
  // Convert to string and use a simple hash to assign a consistent type
  const idString = String(workoutId);
  const hash = idString.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const types: RecentWorkout["type"][] = ["push", "pull", "legs"];
  return types[hash % types.length];
};

interface WorkoutDashboardProps {
  onSelectTemplate: (template: WorkoutTemplate) => void;
}

export function WorkoutDashboard({
  onSelectTemplate,
}: WorkoutDashboardProps) {
  // Scroll to top when component mounts
  const scrollRef = useScrollToTop();
  // Keyboard-aware scrolling
  useKeyboardInset();
  
  const { hasWorkedOutToday, todaysWorkout } = useWorkout();
  const { 
    userToken, 
    currentWorkoutId, 
    setCurrentWorkoutId, 
    setWorkoutStartedAt 
  } = useAuth();
  const { workoutTemplates } = useWorkoutTemplates(userToken);
  const [recentWorkoutsFromAPI, setRecentWorkoutsFromAPI] = useState<Workout[]>([]);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(false);
  
  // Step tracking integration with new methods
  const { 
    steps, 
    goal, 
    progressPercentage, 
    isLoading: isLoadingSteps,
    refreshStepGoal,
    forceRefreshStepData
  } = useStepTracking(true);

  const [workoutStats, setWorkoutStats] = useState({
    thisWeek: 0,
    total: 0
  });



  // Initial data fetch on mount and when user token changes
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!userToken) return;

      console.log('🚀 [DBG] Fetching initial dashboard data...');
      setIsLoadingWorkouts(true);
      try {
        console.log('🔄 [DBG] Loading recent workouts from Supabase...');
        const workouts = await supabaseAPI.getRecentWorkouts();
        console.log('✅ [DBG] Initial workouts loaded:', workouts.length);
        setRecentWorkoutsFromAPI(workouts);
        
        // Calculate stats
        const thisWeekCount = workouts.filter(w => {
          const workoutDate = new Date(w.started_at);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return workoutDate >= weekAgo;
        }).length;
        
        const stats = {
          thisWeek: thisWeekCount,
          total: workouts.length
        };

        console.log('✅ [DBG] Initial workout stats calculated:', stats);
        setWorkoutStats(stats);
      } catch (error) {
        console.error("❌ [DBG] Failed to fetch initial dashboard data:", error);
        if (error instanceof Error && error.message === "UNAUTHORIZED") {
          toast.error("Session expired. Please sign in.");
        } else {
          // Don't show error toast for workout loading failures
          console.warn("Failed to load initial workouts");
        }
      } finally {
        setIsLoadingWorkouts(false);
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

  const getSubtext = () => {
    if (hasWorkedOutToday) {
      return "Rest day! Great job today.";
    }
    if (currentWorkoutId) {
      return "You have an active workout!";
    }
    return "Ready to crush your workout?";
  };

  const handleTodaysWorkoutClick = async () => {
    // If there's already an active workout, continue it
    if (currentWorkoutId && todaysWorkout) {
      const matchingTemplate = workoutTemplates.find(
        (template) => template.name === todaysWorkout.name,
      );
      if (matchingTemplate) {
        onSelectTemplate(matchingTemplate);
        return;
      }
    }

    if (todaysWorkout) {
      // Find the matching template based on today's workout name
      const matchingTemplate = workoutTemplates.find(
        (template) => template.name === todaysWorkout.name,
      );

      if (matchingTemplate) {
        try {
          // Start workout in Supabase if authenticated
          if (userToken) {
            // Check if exercise mapping is ready
            if (!supabaseAPI.isExerciseMappingReady()) {
              throw new Error("Exercise database not ready. Please wait a moment and try again.");
            }

            console.log('🔄 [DBG] Starting workout in Supabase...');
            const workout = await supabaseAPI.startWorkout(matchingTemplate.id);
            if (workout) {
              console.log('✅ [DBG] Workout started successfully:', workout.id);
              setCurrentWorkoutId(parseInt(workout.id));
              setWorkoutStartedAt(workout.started_at);
              toast.success(`Started ${matchingTemplate.name} workout!`);
            }
          }
          onSelectTemplate(matchingTemplate);
        } catch (error) {
          console.error("❌ [DBG] Failed to start workout:", error);
          // Fallback to local workout if API fails
          onSelectTemplate(matchingTemplate);
          if (error instanceof Error && error.message === "UNAUTHORIZED") {
            toast.error("Session expired. Please sign in.");
          } else if (error instanceof Error && error.message.includes("Exercise database not ready")) {
            toast.error(error.message);
          } else {
            toast.error("Failed to sync workout. Working offline.");
          }
        }
      } else {
        // If no matching template found, show error
        toast.error("No workout scheduled for today");
      }
    }
  };

  const formatWorkoutDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div ref={scrollRef} className="dashboard-bg pt-safe p-6 space-y-6 max-w-md mx-auto pb-20">
        {/* Dynamic Greeting */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-medium text-[var(--warm-brown)]">
            {getGreeting()}
          </h1>
          <p className="text-[var(--warm-brown)]/70">
            {getSubtext()}
          </p>
        </div>

        {/* Today's Workout Card */}
        {todaysWorkout && !hasWorkedOutToday && (
          <Card
            className={`${
              currentWorkoutId 
                ? "bg-gradient-to-r from-[var(--warm-sage)]/20 to-[var(--warm-mint)]/20 border-[var(--warm-sage)]/40" 
                : "bg-gradient-to-r from-[var(--warm-coral)]/10 to-[var(--warm-peach)]/10 border-[var(--warm-coral)]/20"
            } cursor-pointer hover:border-opacity-60 hover:shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]`}
            onClick={handleTodaysWorkoutClick}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Target
                  size={20}
                  className={currentWorkoutId ? "text-[var(--warm-sage)]" : "text-[var(--warm-coral)]"}
                />
                <h3 className="font-medium text-[var(--warm-brown)]">
                  {currentWorkoutId ? "Active Workout" : "Today's Workout"}
                </h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-[var(--warm-brown)]">
                  {todaysWorkout.name}
                </h4>
                <div className="flex items-center gap-1 text-sm text-[var(--warm-brown)]/60">
                  <Clock size={14} />
                  {todaysWorkout.estimatedTime}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {todaysWorkout.exercises
                  .slice(0, 3)
                  .map((exercise, index) => (
                    <span
                      key={index}
                      className={`text-xs px-2 py-1 rounded-full ${
                        currentWorkoutId 
                          ? "bg-[var(--warm-sage)]/10 text-[var(--warm-sage)]"
                          : "bg-[var(--warm-coral)]/10 text-[var(--warm-coral)]"
                      }`}
                    >
                      {exercise}
                    </span>
                  ))}
                {todaysWorkout.exercises.length > 3 && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    currentWorkoutId 
                      ? "bg-[var(--warm-sage)]/10 text-[var(--warm-sage)]"
                      : "bg-[var(--warm-coral)]/10 text-[var(--warm-coral)]"
                  }`}>
                    +{todaysWorkout.exercises.length - 3} more
                  </span>
                )}
              </div>

              {/* Click indicator */}
              <div className="flex items-center justify-center pt-2">
                <div className={`text-xs flex items-center gap-1 ${
                  currentWorkoutId ? "text-[var(--warm-sage)]" : "text-[var(--warm-coral)]"
                }`}>
                  <Target size={12} />
                  {currentWorkoutId ? "Tap to continue workout" : "Tap to start this workout"}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Workouts */}
        <div className="space-y-3">
          <h2 className="text-lg text-[var(--warm-brown)]">
            Recent Workouts
          </h2>
          {isLoadingWorkouts ? (
            <div className="text-center text-[var(--warm-brown)]/60 py-4">
              Loading workouts...
            </div>
          ) : recentWorkoutsFromAPI.length > 0 ? (
            <div className="space-y-2">
              {recentWorkoutsFromAPI.slice(0, 3).map((workout, index) => {
                try {
                  // Safety check - ensure workout has required properties
                  if (!workout || typeof workout !== 'object') {
                    throw new Error('Invalid workout object');
                  }

                  if (!workout.id) {
                    throw new Error('Workout missing ID');
                  }

                  const workoutData = {
                    id: String(workout.id), // Ensure ID is always a string
                    name: `Workout #${String(workout.id).slice(-4)}`, // Convert ID to string before slicing
                    date: formatWorkoutDate(workout.started_at),
                    duration: workout.duration_minutes ? `${workout.duration_minutes}m` : "N/A",
                    exercises: 0, // Could be calculated if we had exercise data
                    type: getWorkoutType(workout.id) // Pass the original ID (getWorkoutType handles conversion)
                  };

                return (
                  <Card
                    key={workoutData.id}
                    className="bg-white/80 backdrop-blur-sm border-[var(--border)] hover:border-[var(--warm-coral)]/30 transition-colors"
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[var(--soft-gray)] flex items-center justify-center">
                            {getWorkoutIcon(workoutData.type)}
                          </div>
                          <div>
                            <h3 className="font-medium text-[var(--warm-brown)]">
                              {workoutData.name}
                            </h3>
                            <p className="text-sm text-[var(--warm-brown)]/60">
                              {workoutData.date}
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="flex items-center gap-1 text-[var(--warm-brown)]/70">
                            <Clock size={12} />
                            {workoutData.duration}
                          </div>
                          <div className="text-[var(--warm-brown)]/60">
                            {workoutData.exercises} exercises
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
                } catch (error) {
                  console.error("❌ [DBG] Error rendering workout:", error, workout);
                  // Return a fallback card for this workout
                  return (
                    <Card
                      key={`error-${index}`}
                      className="bg-white/80 backdrop-blur-sm border-[var(--border)]"
                    >
                      <CardContent className="p-4">
                        <div className="text-sm text-red-600">
                          Error displaying workout
                        </div>
                      </CardContent>
                    </Card>
                  );
                }
              })}
            </div>
          ) : (
            <div className="text-center text-[var(--warm-brown)]/60 py-8">
              <Dumbbell size={32} className="mx-auto mb-2 text-[var(--warm-brown)]/40" />
              <p>No recent workouts</p>
              <p className="text-sm mt-1">Start your first workout to see it here!</p>
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

          {/* Workout Stats - Two Column Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6 flex flex-col items-center">
                <CircularProgress
                  value={workoutStats.thisWeek}
                  max={6}
                  size={80}
                  label="This Week"
                  color="var(--warm-sage)"
                />
                <div className="mt-2 text-center">
                  <div className="text-sm font-medium text-[var(--warm-brown)]">
                    This Week
                  </div>
                  <div className="text-xs text-[var(--warm-brown)]/60">
                    {workoutStats.thisWeek} / 6 workouts
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6 flex flex-col items-center">
                <CircularProgress
                  value={Math.min(workoutStats.total, 300)}
                  max={300}
                  size={80}
                  label="Total"
                  color="var(--warm-coral)"
                />
                <div className="mt-2 text-center">
                  <div className="text-sm font-medium text-[var(--warm-brown)]">
                    Total Workouts
                  </div>
                  <div className="text-xs text-[var(--warm-brown)]/60">
                    {workoutStats.total} completed
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}