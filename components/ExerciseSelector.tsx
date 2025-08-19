import { useState, useEffect } from "react";
import { TactileButton } from "./TactileButton";
import { Input } from "./ui/input";
import { supabaseAPI, Exercise } from "../utils/supabase-api";
import { useKeyboardInset } from "../hooks/useKeyboardInset";

interface ExerciseSelectorProps {
  onSelectExercise: (exercise: Exercise) => void;
  onClose: () => void;
}

export function ExerciseSelector({ onSelectExercise, onClose }: ExerciseSelectorProps) {
  useKeyboardInset();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const exerciseData = await supabaseAPI.getExercises();
        setExercises(exerciseData);
      } catch (error) {
        console.error("Failed to fetch exercises:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExercises();
  }, []);

  const filteredExercises = exercises.filter(exercise =>
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.muscle_group?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-background flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm border-b border-[var(--border)]">
        <h1 className="font-medium text-[var(--warm-brown)]">Select Exercise</h1>
        <TactileButton variant="secondary" size="sm" onClick={onClose}>
          ✕
        </TactileButton>
      </div>

      {/* Search */}
      <div className="px-4 py-4">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search exercises..."
          className="w-full"
        />
      </div>

      {/* Exercise List */}
      <div className="flex-1 overflow-y-auto px-4">
        {isLoading ? (
          <div className="text-center py-8">
            <p>Loading exercises...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredExercises.map(exercise => (
              <TactileButton
                key={exercise.exercise_id}
                variant="secondary"
                onClick={() => onSelectExercise(exercise)}
                className="w-full p-4 rounded-xl border bg-[var(--soft-gray)]/50 border-[var(--border)] hover:bg-white hover:border-[var(--warm-coral)]/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[var(--warm-brown)]/10 rounded-lg flex items-center justify-center">
                    <span className="font-medium text-[var(--warm-brown)]/60">
                      {exercise.name.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-medium text-[var(--warm-brown)]">{exercise.name}</h3>
                    <p className="text-sm text-[var(--warm-brown)]/60">{exercise.equipment}</p>
                  </div>
                </div>
              </TactileButton>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}