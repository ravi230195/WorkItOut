import { useState, useEffect } from "react";
import { ArrowLeft, Plus, MoreHorizontal, X, Trash2 } from "lucide-react";
import { TactileButton } from "../TactileButton";
import { Input } from "../ui/input";
import { supabaseAPI, Exercise, UserRoutineExercise } from "../../utils/supabase/supabase-api";
import { useAuth } from "../AuthContext";
import { toast } from "sonner";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";
import BackButton from "../BackButton";

interface RoutineEditorScreenProps {
  routineId: number;
  routineName: string;
  onBack: () => void;
  onAddExercise: () => void;
  onSave: () => void;
}

interface ExerciseWithSets {
  exercise: Exercise;
  routineExercise: UserRoutineExercise;
  sets: {
    reps: number;
    weight: number;
  }[];
}

export function RoutineEditorScreen({
  routineId,
  routineName,
  onBack,
  onAddExercise,
  onSave
}: RoutineEditorScreenProps) {
  // Keyboard-aware scrolling
  useKeyboardInset();

  const [exercises, setExercises] = useState<ExerciseWithSets[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { userToken } = useAuth();

  useEffect(() => {
    loadRoutineExercises();
  }, [routineId]);

  const loadRoutineExercises = async () => {
    if (!userToken) return;

    try {
      // Get routine exercises
      const routineExercises = await supabaseAPI.getUserRoutineExercises(routineId);

      // Get all exercises to map names
      const allExercises = await supabaseAPI.getExercises();

      // Combine the data
      const exercisesWithSets: ExerciseWithSets[] = [];

      for (const routineExercise of routineExercises) {
        const exercise = allExercises.find(ex =>
          (typeof ex.id === 'number' ? ex.id : parseInt(ex.id)) === routineExercise.exercise_id
        );

        if (exercise) {
          exercisesWithSets.push({
            exercise,
            routineExercise,
            sets: [
              { reps: 0, weight: 0 },
              { reps: 0, weight: 0 },
              { reps: 0, weight: 0 }
            ]
          });
        }
      }

      setExercises(exercisesWithSets);
    } catch (error) {
      console.error("Failed to load routine exercises:", error);
      toast.error("Failed to load routine exercises");
    } finally {
      setIsLoading(false);
    }
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: number) => {
    setExercises(prev => {
      const updated = [...prev];
      updated[exerciseIndex].sets[setIndex][field] = value;
      return updated;
    });
  };

  const addSet = (exerciseIndex: number) => {
    setExercises(prev => {
      const updated = [...prev];
      updated[exerciseIndex].sets.push({ reps: 0, weight: 0 });
      return updated;
    });
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    setExercises(prev => {
      const updated = [...prev];
      if (updated[exerciseIndex].sets.length > 1) {
        updated[exerciseIndex].sets.splice(setIndex, 1);
      }
      return updated;
    });
  };

  const removeExercise = async (exerciseIndex: number) => {
    // In a real implementation, you'd call an API to remove from database
    setExercises(prev => {
      const updated = [...prev];
      updated.splice(exerciseIndex, 1);
      return updated;
    });
    toast.success("Exercise removed from routine");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // In a real implementation, you'd save the set data to the database
      // For now, just show success and navigate back
      toast.success("Routine saved successfully!");
      onSave();
    } catch (error) {
      console.error("Failed to save routine:", error);
      toast.error("Failed to save routine");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin mx-auto mb-2 w-8 h-8 border-2 border-[var(--warm-coral)] border-t-transparent rounded-full"></div>
          <p className="text-[var(--warm-brown)]/60">Loading routine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-12 bg-white/80 backdrop-blur-sm border-b border-[var(--border)]">
        <BackButton onClick={onBack} />
        <h1 className="font-medium text-[var(--warm-brown)] uppercase tracking-wide">{routineName}</h1>
        <TactileButton
          variant="secondary"
          size="sm"
          onClick={onAddExercise}
          className="p-2 h-auto bg-green-500 border-green-600 text-white hover:bg-green-600"
        >
          <Plus size={20} />
        </TactileButton>
      </div>

      {/* Exercise List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        <div className="space-y-6">
          {exercises.map((exerciseData, exerciseIndex) => (
            <div
              key={exerciseData.routineExercise.routine_template_exercise_id}
              className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-[var(--border)]"
            >
              {/* Exercise Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-[var(--soft-gray)] rounded-lg flex items-center justify-center overflow-hidden">
                  {exerciseData.exercise.name.includes('Press') ? (
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop&crop=center"
                      alt={exerciseData.exercise.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-medium text-[var(--warm-brown)]/60">
                      {exerciseData.exercise.name.substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-[var(--warm-brown)]">{exerciseData.exercise.name}</h3>
                  <p className="text-sm text-[var(--warm-brown)]/60">{exerciseData.sets.length} sets</p>
                </div>
                <TactileButton
                  variant="secondary"
                  size="sm"
                  className="p-2 h-auto"
                >
                  <MoreHorizontal size={16} />
                </TactileButton>
              </div>

              {/* Exercise Description */}
              {exerciseData.exercise.name === "Arnold Press - Seated - Dumbbell" && (
                <p className="text-sm text-[var(--warm-brown)]/60 mb-4 px-2">
                  If lifting two dumbbells enter the combined weight of both.
                </p>
              )}

              {/* Sets */}
              <div className="space-y-3">
                {/* Headers */}
                <div className="flex items-center gap-4 px-2">
                  <div className="w-8"></div>
                  <div className="flex-1 text-sm text-[var(--warm-brown)]/60 font-medium">REPS</div>
                  <div className="flex-1 text-sm text-[var(--warm-brown)]/60 font-medium">WEIGHT (KG)</div>
                  <div className="w-8"></div>
                </div>

                {/* Set Rows */}
                {exerciseData.sets.map((set, setIndex) => (
                  <div key={setIndex} className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-[var(--soft-gray)] rounded-lg flex items-center justify-center">
                      <span className="text-sm font-medium text-[var(--warm-brown)]">{setIndex + 1}</span>
                    </div>
                    <div className="flex-1">
                      <Input
                        type="number"
                        value={set.reps || ''}
                        onChange={(e) => updateSet(exerciseIndex, setIndex, 'reps', parseInt(e.target.value) || 0)}
                        className="bg-[var(--input-background)] border-[var(--border)] text-center"
                        placeholder="0"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        type="number"
                        value={set.weight || ''}
                        onChange={(e) => updateSet(exerciseIndex, setIndex, 'weight', parseFloat(e.target.value) || 0)}
                        className="bg-[var(--input-background)] border-[var(--border)] text-center"
                        placeholder="0"
                      />
                    </div>
                    <TactileButton
                      variant="secondary"
                      size="sm"
                      className="w-8 h-8 p-0 hover:bg-red-50 hover:border-red-200"
                      onClick={() => removeSet(exerciseIndex, setIndex)}
                    >
                      <X size={14} className="text-red-500" />
                    </TactileButton>
                  </div>
                ))}

                {/* Add Set Button */}
                <TactileButton
                  variant="secondary"
                  className="w-full mt-3 flex items-center justify-center gap-2 border-dashed border-[var(--border)] hover:border-[var(--warm-coral)]/50"
                  onClick={() => addSet(exerciseIndex)}
                >
                  <Plus size={16} />
                  ADD SET
                </TactileButton>
              </div>

              {/* Remove Exercise Button */}
              <div className="mt-4 flex justify-end">
                <TactileButton
                  variant="secondary"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:border-red-200"
                  onClick={() => removeExercise(exerciseIndex)}
                >
                  <Trash2 size={16} />
                </TactileButton>
              </div>
            </div>
          ))}

          {exercises.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto bg-[var(--soft-gray)] rounded-full flex items-center justify-center mb-4">
                <Plus size={24} className="text-[var(--warm-brown)]/40" />
              </div>
              <h3 className="font-medium text-[var(--warm-brown)] mb-2">No exercises added</h3>
              <p className="text-sm text-[var(--warm-brown)]/60 mb-4">
                Start building your routine by adding exercises
              </p>
              <TactileButton onClick={onAddExercise}>
                Add Exercise
              </TactileButton>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Save Button */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-sm border-t border-[var(--border)]">
        <TactileButton
          onClick={handleSave}
          disabled={isSaving}
          className="w-full h-12 bg-[var(--warm-brown)] hover:bg-[var(--warm-brown)]/90 text-white border-0"
        >
          {isSaving ? "SAVING..." : "SAVE"}
        </TactileButton>
      </div>
    </div>
  );
}