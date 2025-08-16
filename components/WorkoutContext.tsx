import { createContext, useContext, useState, ReactNode } from "react";

interface WorkoutContextType {
  hasWorkedOutToday: boolean;
  todaysWorkout: {
    name: string;
    exercises: string[];
    estimatedTime: string;
  } | null;
  workoutStreak: number;
  completeWorkout: () => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [hasWorkedOutToday, setHasWorkedOutToday] = useState(false);
  const [workoutStreak, setWorkoutStreak] = useState(5);
  
  const todaysWorkout = {
    name: "Upper Push",
    exercises: ["Bench Press", "Overhead Press", "Dips", "Tricep Pushdown"],
    estimatedTime: "60-75 min"
  };

  const completeWorkout = () => {
    setHasWorkedOutToday(true);
    setWorkoutStreak(prev => prev + 1);
  };

  return (
    <WorkoutContext.Provider value={{
      hasWorkedOutToday,
      todaysWorkout,
      workoutStreak,
      completeWorkout
    }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (context === undefined) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
}