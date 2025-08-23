import { useState, useEffect } from "react";
import { ArrowLeft, Search, Plus, Filter } from "lucide-react";
import { Input } from "../ui/input";
import { TactileButton } from "../TactileButton";
import { supabaseAPI, Exercise } from "../../utils/supabase/supabase-api";
import { useAuth } from "../AuthContext";
import { toast } from "sonner";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";

interface AddExercisesToRoutineScreenProps {
  routineId?: number;              // for context only
  routineName: string;             // display only
  onBack: () => void;              // parent decides where back goes
  onExerciseSelected: (exercise: Exercise) => void; // tell parent to open configure
  isFromExerciseSetup?: boolean;   // usually true in this flow
}

export function AddExercisesToRoutineScreen({
  routineId,
  routineName,
  onBack,
  onExerciseSelected,
  isFromExerciseSetup = true,
}: AddExercisesToRoutineScreenProps) {
  useKeyboardInset();

  const [searchQuery, setSearchQuery] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const { userToken } = useAuth();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        console.log("[AddExercises] Loading exercises from Supabase…");
        const data = await supabaseAPI.getExercises();
        if (cancelled) return;
        console.log("[AddExercises] Loaded", data.length, "exercises");
        setExercises(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("[AddExercises] Failed to fetch exercises:", error);
        toast.error("Failed to load exercises");
        setExercises([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredExercises = exercises.filter(ex =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.muscle_group?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedExercises = filteredExercises.reduce((groups, ex) => {
    const first = (ex.name?.[0] || "#").toUpperCase();
    (groups[first] ||= []).push(ex);
    return groups;
  }, {} as Record<string, Exercise[]>);

  const handleSelectExercise = (exercise: Exercise) => {
    setSelectedExercise(prev => prev?.exercise_id === exercise.exercise_id ? null : exercise);
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

    setIsAddingExercise(true);
    try {
      // Do NOT insert here; go back to ExerciseSetup with the selection
      onExerciseSelected(selectedExercise);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Please try again.";
      toast.error(`Failed to proceed: ${msg}`);
    } finally {
      setIsAddingExercise(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col pt-safe">
      {/* Header */}
      <div className="flex items-center p-4 bg-white/80 backdrop-blur-sm border-b border-[var(--border)]">
        <TactileButton variant="secondary" size="sm" onClick={onBack} className="p-2 h-auto">
          <ArrowLeft size={20} />
        </TactileButton>
        <h1 className="flex-1 text-center font-medium text-[var(--warm-brown)]">
          SELECT EXERCISES
        </h1>
      </div>

      {/* Search + Filter */}
      <div className="px-4 py-4 space-y-3 bg-white/80 backdrop-blur-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-brown)]/60" size={20} />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for an exercise..."
            className="bg-[var(--input-background)] border-[var(--border)] text-[var(--warm-brown)] placeholder:text-[var(--warm-brown)]/60 h-12 pl-10 pr-12 rounded-xl focus:border-[var(--warm-coral)] focus:ring-[var(--warm-coral)]/20"
          />
          <TactileButton variant="secondary" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 h-auto">
            <Filter size={16} />
          </TactileButton>
        </div>

        {/* Add Custom Exercise (placeholder) */}
        <TactileButton variant="secondary" className="w-full border-2 border-dashed border-[var(--border)] hover:border-[var(--warm-coral)]/50 bg-transparent">
          <div className="flex items-center justify-center gap-3 text-[var(--warm-brown)]/70">
            <Plus size={20} />
            <span>Add Custom Exercise</span>
          </div>
        </TactileButton>
      </div>

      {/* Exercise List */}
      <div className="overflow-y-auto px-4 pb-[calc(96px+env(safe-area-inset-bottom))]">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin mx-auto mb-2 w-8 h-8 border-2 border-[var(--warm-coral)] border-t-transparent rounded-full" />
            <p className="text-[var(--warm-brown)]/60">Loading exercises...</p>
          </div>
        ) : Object.keys(groupedExercises).length === 0 ? (
          <div className="text-center py-8 text-[var(--warm-brown)]/60">No exercises found</div>
        ) : (
          Object.keys(groupedExercises).sort((a, b) => a.localeCompare(b)).map((letter) => (
            <div key={letter} className="mb-6">
              <h2 className="text-[var(--warm-brown)]/60 font-medium mb-3 px-2 tracking-wide">{letter}</h2>
              <div className="space-y-2">
                {groupedExercises[letter].map((exercise) => {
                  const isSelected = selectedExercise?.exercise_id === exercise.exercise_id;
                  const initials = exercise.name.substring(0, 2).toUpperCase();

                  return (
                    <button
                      key={exercise.exercise_id}
                      type="button"
                      onClick={() => handleSelectExercise(exercise)}
                      className="w-full text-left focus:outline-none"
                    >
                      <div
                        className={[
                          "p-4 rounded-xl border transition-all",
                          isSelected
                            ? "bg-[var(--warm-coral)]/100 border-[var(--warm-coral)] shadow-md"
                            : "bg-white border-[var(--border)] hover:bg-[var(--soft-gray)]/50 hover:border-[var(--warm-coral)]/30 hover:shadow-md",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-[var(--warm-brown)]/10 rounded-lg flex items-center justify-center">
                            <span className="font-medium text-[var(--warm-brown)]/60">
                              {initials}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-[var(--warm-brown)]">{exercise.name}</h3>
                            <p className="text-[var(--warm-brown)]/60">{exercise.equipment}</p>
                          </div>
                          <div className="text-[var(--warm-brown)]/40">
                            <div className="w-6 h-6 rounded-full border border-[var(--warm-brown)]/20 flex items-center justify-center">
                              <div>ⓘ</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed-bottom-safe bg-white/95 backdrop-blur-sm border-t border-[var(--border)] z-50 px-4 pt-4 pb-[env(safe-area-inset-bottom)]">
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
            className={`flex-1 h-12 font-medium border-0 transition-all ${selectedExercise
                ? "bg-[var(--warm-coral)] hover:bg-[var(--warm-coral)]/90 text-white btn-tactile"
                : "bg-[var(--warm-brown)]/20 text-[var(--warm-brown)]/40 cursor-not-allowed"
              }`}
          >
            {isAddingExercise ? "ADDING..." : selectedExercise ? "ADD (1)" : "ADD"}
          </TactileButton>
        </div>
      </div>
    </div>
  );
}
