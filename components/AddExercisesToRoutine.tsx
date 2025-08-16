import { useState, useEffect } from "react";
import { ArrowLeft, Search, Plus, Filter } from "lucide-react";
import { Input } from "./ui/input";
import { TactileButton } from "./TactileButton";
import { supabaseAPI, Exercise } from "../utils/supabase-api";
import { useAuth } from "./AuthContext";
import { toast } from "sonner@2.0.3";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface AddExercisesToRoutineProps {
  routineId?: number; // Optional now - will be created on first exercise add
  routineName: string; // We'll pass the routine name to create it with first exercise
  onBack: () => void;
  onExerciseSelected: (exercise: Exercise, createdRoutineId?: number) => void;
  isFromExerciseSetup?: boolean; // Flag to determine if coming from ExerciseSetupScreen
}

export function AddExercisesToRoutine({ 
  routineId, 
  routineName, 
  onBack, 
  onExerciseSelected,
  isFromExerciseSetup = false
}: AddExercisesToRoutineProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const { userToken } = useAuth();

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        console.log("Fetching exercises...");
        const exerciseData = await supabaseAPI.getExercises();
        console.log("Fetched exercises:", exerciseData.length, "exercises");
        setExercises(exerciseData);
      } catch (error) {
        console.error("Failed to fetch exercises:", error);
        toast.error("Failed to load exercises");
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

  // Group exercises by first letter
  const groupedExercises = filteredExercises.reduce((groups, exercise) => {
    const firstLetter = exercise.name[0].toUpperCase();
    if (!groups[firstLetter]) {
      groups[firstLetter] = [];
    }
    groups[firstLetter].push(exercise);
    return groups;
  }, {} as Record<string, Exercise[]>);

  const handleSelectExercise = (exercise: Exercise) => {
    console.log("handleSelectExercise called with:", { 
      exercise_id: exercise.exercise_id, 
      name: exercise.name, 
      idType: typeof exercise.exercise_id 
    });
    
    // Toggle selection
    if (selectedExercise?.exercise_id === exercise.exercise_id) {
      console.log("Unselecting exercise");
      setSelectedExercise(null);
    } else {
      console.log("Selecting exercise");
      setSelectedExercise(exercise);
    }
  };

  const handleAddExercise = async () => {
    if (!selectedExercise) {
      toast.error("Please select an exercise");
      return;
    }

    if (!userToken) {
      toast.error("Please sign in to add exercises");
      return;
    }

    console.log("Proceeding to exercise setup:", {
      exercise: selectedExercise,
      exercise_id: selectedExercise.exercise_id,
      routineId,
      routineName,
      isFromExerciseSetup
    });

    setIsAddingExercise(true);
    try {
      let actualRoutineId = routineId;

      // If no routine ID exists, create the routine first (only for new routines)
      if (!actualRoutineId && !isFromExerciseSetup) {
        console.log(`Creating routine "${routineName}" since it doesn't exist yet`);
        const newRoutine = await supabaseAPI.createUserRoutine(routineName);
        
        if (!newRoutine) {
          throw new Error("Failed to create routine - database might not be ready");
        }

        actualRoutineId = newRoutine.routine_template_id;
        console.log(`Created routine with ID: ${actualRoutineId}`);
      }

      // Navigate to exercise setup screen
      if (isFromExerciseSetup) {
        // Coming from ExerciseSetupScreen, just pass the exercise back
        onExerciseSelected(selectedExercise);
      } else {
        // Coming from create routine flow
        onExerciseSelected(selectedExercise, actualRoutineId!);
      }
      
    } catch (error) {
      console.error("Failed to proceed to exercise setup:", error);
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        toast.error("Session expired. Please sign in.");
      } else if (error instanceof Error) {
        toast.error(`Failed to proceed: ${error.message}`);
      } else {
        toast.error("Failed to proceed. Please try again.");
      }
    } finally {
      setIsAddingExercise(false);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 safe-area-top bg-white/80 backdrop-blur-sm border-b border-[var(--border)]">
        <TactileButton 
          variant="secondary"
          size="sm"
          onClick={onBack}
          className="p-2 h-auto"
        >
          <ArrowLeft size={20} />
        </TactileButton>
        <h1 className="font-medium text-[var(--warm-brown)]">SELECT EXERCISES</h1>
        <div className="w-10" />
      </div>

      {/* Search and Filter */}
      <div className="px-4 py-4 space-y-3 bg-white/80 backdrop-blur-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--warm-brown)]/60" size={20} />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for an exercise..."
            className="bg-[var(--input-background)] border-[var(--border)] text-[var(--warm-brown)] placeholder:text-[var(--warm-brown)]/60 h-12 pl-10 pr-12 text-base rounded-xl focus:border-[var(--warm-coral)] focus:ring-[var(--warm-coral)]/20"
          />
          <TactileButton 
            variant="secondary" 
            size="sm" 
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 h-auto"
          >
            <Filter size={16} />
          </TactileButton>
        </div>

        {/* Add Custom Exercise */}
        <TactileButton 
          variant="secondary" 
          className="w-full border-2 border-dashed border-[var(--border)] hover:border-[var(--warm-coral)]/50 bg-transparent"
        >
          <div className="flex items-center justify-center gap-3 text-[var(--warm-brown)]/70">
            <Plus size={20} />
            <span>Add Custom Exercise</span>
          </div>
        </TactileButton>
      </div>

      {/* Exercise List */}
      <div className="flex-1 overflow-y-auto px-4" style={{ paddingBottom: 'max(128px, calc(128px + env(safe-area-inset-bottom)))' }}>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin mx-auto mb-2 w-8 h-8 border-2 border-[var(--warm-coral)] border-t-transparent rounded-full"></div>
            <p className="text-[var(--warm-brown)]/60">Loading exercises...</p>
          </div>
        ) : Object.keys(groupedExercises).length === 0 ? (
          <div className="text-center py-8 text-[var(--warm-brown)]/60">
            No exercises found
          </div>
        ) : (
          Object.keys(groupedExercises).sort().map(letter => (
            <div key={letter} className="mb-6">
              <h2 className="text-[var(--warm-brown)]/60 font-medium mb-3 px-2">{letter}</h2>
              <div className="space-y-2">
                {groupedExercises[letter].map(exercise => {
                  const isSelected = selectedExercise?.exercise_id === exercise.exercise_id;
                  return (
                    <TactileButton
                      key={`${exercise.exercise_id}-${exercise.name}`}
                      variant="secondary"
                      onClick={() => handleSelectExercise(exercise)}
                      className={`w-full p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-white border-[var(--warm-coral)] shadow-lg ring-2 ring-[var(--warm-coral)]/20'
                          : 'bg-[var(--soft-gray)]/50 border-[var(--border)] hover:bg-white hover:border-[var(--warm-coral)]/30 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[var(--warm-brown)]/10 rounded-lg flex items-center justify-center overflow-hidden">
                          {exercise.name.includes('Press') || exercise.name.includes('Arnold') ? (
                            <ImageWithFallback 
                              src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop&crop=center"
                              alt={exercise.name}
                              className="w-full h-full object-cover"
                            />
                          ) : exercise.name.includes('Bike') || exercise.name.includes('Assault') ? (
                            <ImageWithFallback 
                              src="https://images.unsplash.com/photo-1544397886-6bd04d7a922e?w=100&h=100&fit=crop&crop=center"
                              alt={exercise.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-medium text-[var(--warm-brown)]/60">
                              {exercise.name.substring(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="font-medium text-[var(--warm-brown)]">{exercise.name}</h3>
                          <p className="text-sm text-[var(--warm-brown)]/60">{exercise.equipment}</p>
                        </div>
                        <div className="text-[var(--warm-brown)]/40">
                          <div className="w-6 h-6 rounded-full border border-[var(--warm-brown)]/20 flex items-center justify-center">
                            <div className="text-xs">ⓘ</div>
                          </div>
                        </div>
                      </div>
                    </TactileButton>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Action Bar - Always visible */}
      <div 
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-[var(--border)] z-50 px-4 pt-4" 
        style={{ 
          paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))'
        }}
      >
        <div className="flex gap-3">
          <TactileButton
            variant="secondary"
            className="flex-1 h-12 bg-transparent border-[var(--warm-brown)]/20 text-[var(--warm-brown)]/60 hover:bg-[var(--soft-gray)] font-medium"
            disabled
          >
            SUPERSET
          </TactileButton>
          <TactileButton
            onClick={handleAddExercise}
            disabled={!selectedExercise || isAddingExercise}
            className={`flex-1 h-12 font-medium border-0 transition-all ${
              selectedExercise
                ? 'bg-[var(--warm-coral)] hover:bg-[var(--warm-coral)]/90 text-white btn-tactile'
                : 'bg-[var(--warm-brown)]/20 text-[var(--warm-brown)]/40 cursor-not-allowed'
            }`}
          >
            {isAddingExercise 
              ? "ADDING..." 
              : selectedExercise 
                ? "ADD (1)"
                : "ADD"
            }
          </TactileButton>
        </div>
      </div>
    </div>
  );
}