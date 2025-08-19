import { TactileButton } from "./TactileButton";

interface ActiveWorkoutProps {
  onEndWorkout: () => void;
  onAddExercise: () => void;
  selectedExercise: any;
  onExerciseAdded: () => void;
  template: any;
}

export function ActiveWorkout({ onEndWorkout, onAddExercise }: ActiveWorkoutProps) {
  return (
    <div className="bg-background flex flex-col h-full">
      <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm border-b border-[var(--border)]">
        <h1 className="font-medium text-[var(--warm-brown)]">ACTIVE WORKOUT</h1>
        <TactileButton variant="secondary" size="sm" onClick={onEndWorkout}>
          End
        </TactileButton>
      </div>
      
      <div className="flex-1 p-4">
        <p className="text-center text-[var(--warm-brown)]/60 mb-4">
          Active workout functionality has been moved to routine-based workouts
        </p>
        
        <TactileButton onClick={onAddExercise} className="w-full">
          Add Exercise
        </TactileButton>
      </div>
    </div>
  );
}
