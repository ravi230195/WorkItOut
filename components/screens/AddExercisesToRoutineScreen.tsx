import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Filter } from "lucide-react";
import { Input } from "../ui/input";
import { TactileButton } from "../TactileButton";
import { supabaseAPI, Exercise } from "../../utils/supabase/supabase-api";
import { useAuth } from "../AuthContext";
import { toast } from "sonner";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";
import BackButton from "../BackButton";

interface AddExercisesToRoutineScreenProps {
  routineId?: number;               // context only
  routineName: string;              // display only
  onBack: () => void;               // parent decides where back goes
  onExerciseSelected: (exercise: Exercise) => void; // tell parent to open configure
  isFromExerciseSetup?: boolean;    // usually true in this flow
}

export function AddExercisesToRoutineScreen({
  routineId,
  routineName,
  onBack,
  onExerciseSelected,
  isFromExerciseSetup = true,
}: AddExercisesToRoutineScreenProps) {
  useKeyboardInset();

  const { userToken } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingExercise, setIsAddingExercise] = useState(false);

  // load exercises
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const data = await supabaseAPI.getExercises();
        if (cancelled) return;
        setExercises(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("[AddExercises] fetch error:", error);
        toast.error("Failed to load exercises");
        setExercises([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // filter + group (memo to avoid recompute)
  const grouped = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? exercises.filter(ex =>
        ex.name.toLowerCase().includes(q)
      )
      : exercises;

    const out: Record<string, Exercise[]> = {};
    for (const ex of filtered) {
      const k = (ex.name?.[0] || "#").toUpperCase();
      (out[k] ||= []).push(ex);
    }
    return out;
  }, [exercises, searchQuery]);

  // handlers
  const handleSelectExercise = (exercise: Exercise) => {
    setSelectedExercise(prev =>
      prev?.exercise_id === exercise.exercise_id ? null : exercise
    );
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
      onExerciseSelected(selectedExercise); // parent navigates to configure
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Please try again.";
      toast.error(`Failed to proceed: ${msg}`);
    } finally {
      setIsAddingExercise(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header – same pattern as Create Routine (no absolute, no sticky) */}
      <div className="flex items-center p-4 bg-white/80 backdrop-blur-sm border-b border-[var(--border)]">
        {/* Left */}
        <BackButton onClick={onBack} />

        {/* Center (one line, auto-size, truncates) */}
        <div className="flex-1 min-w-0 text-center">
          <h1 className="font-medium text-[var(--warm-brown)] truncate text-[clamp(16px,4.2vw,20px)]">
            Select exercises
          </h1>
        </div>

        {/* Right spacer to balance left button */}
        <div className="w-10" />
      </div>

      {/* Search + Filter */}
      <div className="px-4 py-2 bg-white border-b border-[var(--border)]">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-brown)]/60"
            size={20}
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for an exercise..."
            className="bg-[var(--input-background)] border-[var(--border)] text-[var(--warm-brown)] placeholder:text-[var(--warm-brown)]/60 h-12 pl-10 pr-4 rounded-xl focus:border-[var(--warm-coral)] focus:ring-[var(--warm-coral)]/20"
          />

        </div>
      </div>

      {/* Exercise List */}
      <div className="overflow-y-auto px-4 pb-[calc(104px+env(safe-area-inset-bottom))]">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin mx-auto mb-2 w-8 h-8 border-2 border-[var(--warm-coral)] border-t-transparent rounded-full" />
            <p className="text-[var(--warm-brown)]/60">Loading exercises...</p>
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-8 text-[var(--warm-brown)]/60">
            No exercises found
          </div>
        ) : (
          Object.keys(grouped)
            .sort((a, b) => a.localeCompare(b))
            .map((letter) => (
              <div key={letter} className="mb-6">
                <h2 className="text-[var(--warm-brown)]/60 font-medium mb-3 px-2 tracking-wide">
                  {letter}
                </h2>
                <div className="space-y-2">
                  {grouped[letter].map((exercise) => {
                    const isSelected =
                      selectedExercise?.exercise_id === exercise.exercise_id;
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
                              <h3 className="font-medium text-[var(--warm-brown)]">
                                {exercise.name}
                              </h3>
                              <p className="text-[var(--warm-brown)]/60">
                                {exercise.muscle_group}
                              </p>
                            </div>
                            <div className="text-[var(--warm-brown)]/40">
                              <div className="w-6 h-6 rounded-full border border-[var(--warm-brown)]/20 grid place-items-center">
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

      {/* Bottom Action Bar (centered ADD) */}
      <div className="fixed-bottom-safe bg-white border-t border-[var(--border)] z-50 px-4 pt-4 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex justify-center">
          <TactileButton
            onClick={handleAddExercise}
            disabled={!selectedExercise || isAddingExercise}
            className={`h-14 px-8 min-w-[220px] sm:min-w-[260px] font-medium border-0 transition-all ${selectedExercise
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
