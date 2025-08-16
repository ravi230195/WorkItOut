import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { TactileButton } from "./TactileButton";
import { Input } from "./ui/input";
import { X, Plus, Play, Pause, Check, Timer } from "lucide-react";
import { Exercise, exerciseDatabase } from "./ExerciseDatabase";
import { WorkoutTemplate } from "./WorkoutTemplates";
import { supabaseAPI, WorkoutExercise, Set } from "../utils/supabase-api";
import { useAuth } from "./AuthContext";
import { toast } from "sonner@2.0.3";

interface SetInput {
  id: string;
  reps: number | null;
  weight: number | null;
  rpe?: number | null;
  completed: boolean;
}

interface ExerciseData {
  id: string;
  name: string;
  exerciseId: string;
  workoutExerciseId?: string;
  sets: SetInput[];
  isExpanded: boolean;
}

interface ActiveWorkoutProps {
  onEndWorkout: () => void;
  onAddExercise: () => void;
  selectedExercise: Exercise | null;
  onExerciseAdded: () => void;
  template?: WorkoutTemplate;
}

export function ActiveWorkout({ 
  onEndWorkout, 
  onAddExercise, 
  selectedExercise, 
  onExerciseAdded,
  template 
}: ActiveWorkoutProps) {
  const [workoutName] = useState(template?.name || "Custom Workout");
  const { 
    userToken, 
    currentWorkoutId, 
    workoutElapsedLabel, 
    restSecondsActive, 
    setRestSecondsActive,
    skipRest,
    clearWorkoutSession
  } = useAuth();
  
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [isEndingWorkout, setIsEndingWorkout] = useState(false);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);

  // Initialize exercises from template
  useEffect(() => {
    const initializeExercises = async () => {
      if (template && template.exercises) {
        // Create workout exercises in Supabase if we have a current workout
        if (currentWorkoutId && userToken) {
          try {
            // Convert exercise names to exercise IDs for Supabase
            const exerciseIds = template.exercises
              .map(exerciseName => {
                const localExercise = exerciseDatabase.find(ex => 
                  ex.name.toLowerCase() === exerciseName.toLowerCase()
                );
                return localExercise?.id || exerciseName.toLowerCase().replace(/\s+/g, '-');
              });
            
            await supabaseAPI.bulkCreateWorkoutExercises(currentWorkoutId, exerciseIds);
          } catch (error) {
            console.error("Failed to create workout exercises:", error);
            if (error instanceof Error && error.message === "UNAUTHORIZED") {
              toast.error("Session expired. Please sign in.");
            } else {
              toast.error("Failed to initialize workout exercises. Continuing offline.");
            }
          }
        }

        // Initialize template exercises from database (exercises are now exercise names)
        const templateExercises = template.exercises
          .map((exerciseName, index) => {
            // Try to find the exercise in the local database to get its ID for mapping
            const localExercise = exerciseDatabase.find(ex => 
              ex.name.toLowerCase() === exerciseName.toLowerCase()
            );
            
            return {
              id: `template-${index}`,
              name: exerciseName,
              exerciseId: localExercise?.id || exerciseName.toLowerCase().replace(/\s+/g, '-'), // Use local ID if available, otherwise create slug
              sets: [{
                id: `template-${index}-1`,
                reps: null,
                weight: null,
                completed: false
              }],
              isExpanded: false
            };
          });
        
        setExercises(templateExercises);
      } else {
        // Default exercises for custom workout
        setExercises([
          {
            id: "1",
            name: "Bench Press",
            exerciseId: "bench-press",
            sets: [
              { id: "1-1", reps: 12, weight: 185, completed: true },
              { id: "1-2", reps: 10, weight: 195, completed: true },
              { id: "1-3", reps: null, weight: 205, completed: false },
            ],
            isExpanded: true
          },
          {
            id: "2", 
            name: "Incline Dumbbell Press",
            exerciseId: "incline-dumbbell-press",
            sets: [
              { id: "2-1", reps: null, weight: null, completed: false },
            ],
            isExpanded: false
          }
        ]);
      }
    };

    initializeExercises();
  }, [template, currentWorkoutId, userToken]);

  // Handle adding selected exercise
  useEffect(() => {
    if (selectedExercise) {
      const newExercise: ExerciseData = {
        id: Date.now().toString(),
        name: selectedExercise.name,
        exerciseId: selectedExercise.id,
        sets: [{
          id: `${Date.now()}-1`,
          reps: null,
          weight: null,
          completed: false
        }],
        isExpanded: true
      };
      
      setExercises(prev => [...prev, newExercise]);
      onExerciseAdded();
    }
  }, [selectedExercise, onExerciseAdded]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleExerciseExpansion = async (exerciseId: string) => {
    const exercise = exercises.find(e => e.id === exerciseId);
    if (!exercise) return;

    // If expanding and we have Supabase integration, get the workout exercise ID and last set
    if (!exercise.isExpanded && currentWorkoutId && userToken) {
      try {
        // Get workout exercise ID using frontend exercise ID
        const workoutExercise = await supabaseAPI.getWorkoutExerciseForExercise(
          currentWorkoutId, 
          exercise.exerciseId
        );

        if (workoutExercise) {
          // Get last set to prefill
          const lastSet = await supabaseAPI.getLastSetForExercise(workoutExercise.id);
          
          // Update exercise with workout exercise ID and prefilled data
          setExercises(prev => prev.map(e => 
            e.id === exerciseId 
              ? {
                  ...e,
                  workoutExerciseId: workoutExercise.id,
                  sets: lastSet ? [{
                    id: `${exerciseId}-1`,
                    reps: lastSet.reps,
                    weight: lastSet.weight,
                    rpe: lastSet.rpe,
                    completed: false
                  }] : e.sets,
                  isExpanded: true
                }
              : e
          ));
        } else {
          // Just expand without prefill
          setExercises(prev => prev.map(e => 
            e.id === exerciseId 
              ? { ...e, isExpanded: true }
              : e
          ));
        }
      } catch (error) {
        console.error("Failed to get exercise data:", error);
        if (error instanceof Error && error.message === "UNAUTHORIZED") {
          toast.error("Session expired. Please sign in.");
        } else {
          // Just expand without prefill on error
          setExercises(prev => prev.map(e => 
            e.id === exerciseId 
              ? { ...e, isExpanded: true }
              : e
          ));
        }
      }
    } else {
      // Just toggle expansion
      setExercises(prev => prev.map(e => 
        e.id === exerciseId 
          ? { ...e, isExpanded: !e.isExpanded }
          : e
      ));
    }
  };

  const updateSet = (exerciseId: string, setId: string, field: 'reps' | 'weight' | 'rpe', value: number) => {
    setExercises(exercises.map(exercise => 
      exercise.id === exerciseId 
        ? {
            ...exercise,
            sets: exercise.sets.map(set => 
              set.id === setId ? { ...set, [field]: value } : set
            )
          }
        : exercise
    ));
  };

  const completeSet = async (exerciseId: string, setId: string) => {
    if (restSecondsActive > 0) {
      toast.error("Rest active. Tap Skip to continue.");
      return;
    }

    const exercise = exercises.find(e => e.id === exerciseId);
    const set = exercise?.sets.find(s => s.id === setId);
    
    if (!exercise || !set || !set.reps || !set.weight) {
      toast.error("Please enter weight and reps before completing set.");
      return;
    }

    setActiveSetId(setId);

    try {
      // Save to Supabase if we have the data
      if (exercise.workoutExerciseId && userToken) {
        await supabaseAPI.insertSet(
          exercise.workoutExerciseId,
          set.reps,
          set.weight,
          set.rpe || undefined
        );
      }

      // Mark set as completed
      setExercises(exercises.map(ex => 
        ex.id === exerciseId 
          ? {
              ...ex,
              sets: ex.sets.map(s => 
                s.id === setId ? { ...s, completed: true } : s
              )
            }
          : ex
      ));

      // Start 2-minute rest timer
      setRestSecondsActive(120);
      
      // Auto-prefill next set with same values
      setTimeout(() => {
        addSet(exerciseId, set.reps, set.weight, set.rpe);
      }, 100);

      toast.success("Set completed!");
    } catch (error) {
      console.error("Failed to save set:", error);
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        toast.error("Session expired. Please sign in.");
      } else {
        toast.error("Failed to save set. Continuing offline.");
        // Still complete the set locally even if save fails
        setExercises(exercises.map(ex => 
          ex.id === exerciseId 
            ? {
                ...ex,
                sets: ex.sets.map(s => 
                  s.id === setId ? { ...s, completed: true } : s
                )
              }
            : ex
        ));
        setRestSecondsActive(120);
        setTimeout(() => {
          addSet(exerciseId, set.reps, set.weight, set.rpe);
        }, 100);
      }
    } finally {
      setActiveSetId(null);
    }
  };

  const addSet = (exerciseId: string, prefillReps?: number | null, prefillWeight?: number | null, prefillRpe?: number | null) => {
    const exercise = exercises.find(e => e.id === exerciseId);
    if (!exercise) return;
    
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const newSet: SetInput = {
      id: `${exerciseId}-${exercise.sets.length + 1}`,
      reps: prefillReps !== undefined ? prefillReps : (lastSet?.reps || null),
      weight: prefillWeight !== undefined ? prefillWeight : (lastSet?.weight || null),
      rpe: prefillRpe !== undefined ? prefillRpe : (lastSet?.rpe || null),
      completed: false
    };

    setExercises(exercises.map(exercise => 
      exercise.id === exerciseId 
        ? { ...exercise, sets: [...exercise.sets, newSet] }
        : exercise
    ));
  };

  const removeExercise = (exerciseId: string) => {
    setExercises(exercises.filter(exercise => exercise.id !== exerciseId));
  };

  const handleEndWorkout = async () => {
    if (isEndingWorkout) return;
    
    setIsEndingWorkout(true);
    try {
      if (currentWorkoutId && userToken) {
        // End workout without duration_minutes to avoid schema error
        await supabaseAPI.endWorkout(currentWorkoutId.toString());
        toast.success("Workout saved successfully!");
      }
      
      clearWorkoutSession();
      onEndWorkout();
    } catch (error) {
      console.error("Failed to end workout:", error);
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        toast.error("Session expired. Please sign in.");
      } else {
        toast.error("Failed to save workout. Data may be lost.");
      }
      // Still end workout locally even if save fails
      clearWorkoutSession();
      onEndWorkout();
    } finally {
      setIsEndingWorkout(false);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto h-screen flex flex-col" style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 16px))', paddingBottom: 'max(96px, calc(96px + env(safe-area-inset-bottom, 0px)))' }}>
      {/* Header with Timer */}
      <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm">
        <div>
          <h1 className="font-medium text-[var(--warm-brown)]">{workoutName}</h1>
          <div className="flex items-center gap-2">
            <Timer size={14} className="text-[var(--warm-coral)]" />
            <p className="text-sm text-[var(--warm-brown)]/60">{workoutElapsedLabel}</p>
          </div>
        </div>
        <TactileButton 
          variant="secondary" 
          size="sm" 
          onClick={handleEndWorkout}
          disabled={isEndingWorkout}
        >
          {isEndingWorkout ? <div className="w-4 h-4 animate-spin border-2 border-current border-t-transparent rounded-full" /> : <X size={16} />}
        </TactileButton>
      </div>

      {/* Rest Timer */}
      {restSecondsActive > 0 && (
        <Card className="bg-gradient-to-r from-[var(--warm-coral)]/10 to-[var(--warm-peach)]/10 border-[var(--warm-coral)]/20">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="animate-pulse">
                <Pause size={16} className="text-[var(--warm-coral)]" />
              </div>
              <span className="text-sm text-[var(--warm-brown)]">Rest Time</span>
            </div>
            <div className="text-2xl font-medium text-[var(--warm-coral)]">{formatTime(restSecondsActive)}</div>
            <TactileButton 
              variant="sage" 
              size="sm" 
              className="mt-2"
              onClick={skipRest}
            >
              Skip Rest
            </TactileButton>
          </CardContent>
        </Card>
      )}

      {/* Exercises */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {exercises.map((exercise) => (
          <Card key={exercise.id} className="bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => toggleExerciseExpansion(exercise.id)}
                  className="flex-1 text-left"
                >
                  <h2 className="font-medium text-[var(--warm-brown)]">{exercise.name}</h2>
                  <p className="text-xs text-[var(--warm-brown)]/60">
                    {exercise.isExpanded ? "Tap to collapse" : "Tap to expand"}
                  </p>
                </button>
                <button
                  onClick={() => removeExercise(exercise.id)}
                  className="text-[var(--warm-brown)]/40 hover:text-[var(--warm-coral)] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </CardHeader>
            
            {exercise.isExpanded && (
              <CardContent className="space-y-3">
                {exercise.sets.map((set, index) => (
                  <div key={set.id} className="flex items-center gap-3">
                    <div className="w-6 text-center text-sm text-[var(--warm-brown)]/60">
                      {index + 1}
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Weight"
                        value={set.weight || ''}
                        onChange={(e) => updateSet(exercise.id, set.id, 'weight', Number(e.target.value))}
                        className="bg-[var(--input-background)] border-[var(--border)] text-center"
                        disabled={set.completed || restSecondsActive > 0}
                      />
                      <Input
                        placeholder="Reps"
                        value={set.reps || ''}
                        onChange={(e) => updateSet(exercise.id, set.id, 'reps', Number(e.target.value))}
                        className="bg-[var(--input-background)] border-[var(--border)] text-center"
                        disabled={set.completed || restSecondsActive > 0}
                      />
                    </div>
                    {set.completed ? (
                      <div className="w-8 h-8 rounded-full bg-[var(--warm-sage)] flex items-center justify-center">
                        <Check size={16} className="text-white" />
                      </div>
                    ) : (
                      <TactileButton
                        variant="sage"
                        size="sm"
                        className="w-8 h-8 p-0 rounded-full"
                        onClick={() => completeSet(exercise.id, set.id)}
                        disabled={!set.reps || !set.weight || restSecondsActive > 0 || activeSetId === set.id}
                      >
                        {activeSetId === set.id ? (
                          <div className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                          <Check size={16} />
                        )}
                      </TactileButton>
                    )}
                  </div>
                ))}
                
                <TactileButton
                  variant="secondary"
                  size="sm"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => addSet(exercise.id)}
                  disabled={restSecondsActive > 0}
                >
                  <Plus size={14} />
                  Add Set
                </TactileButton>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Add Exercise Button */}
      <TactileButton 
        variant="peach" 
        className="w-full flex items-center justify-center gap-2"
        onClick={onAddExercise}
        disabled={restSecondsActive > 0}
      >
        <Plus size={16} />
        Add Exercise
      </TactileButton>
    </div>
  );
}