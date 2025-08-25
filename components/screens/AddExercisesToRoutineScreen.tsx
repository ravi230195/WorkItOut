// components/screens/AddExercisesToRoutineScreen.tsx
import { useState, useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "../ui/input";
import { TactileButton } from "../TactileButton";
import { supabaseAPI, Exercise } from "../../utils/supabase/supabase-api";
import { useAuth } from "../AuthContext";
import { toast } from "sonner";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";
import { AppScreen, ScreenHeader, Section, FooterBar, Stack, Spacer } from "../layouts";

interface AddExercisesToRoutineScreenProps {
  routineId?: number;
  routineName: string;
  onBack: () => void;
  onExerciseSelected: (exercise: Exercise) => void;
  isFromExerciseSetup?: boolean;
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
    return () => {
      cancelled = true;
    };
  }, []);

  // filter + group (memo)
  const grouped = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? exercises.filter((ex) => ex.name.toLowerCase().includes(q))
      : exercises;

    const out: Record<string, Exercise[]> = {};
    for (const ex of filtered) {
      const k = (ex.name?.[0] || "#").toUpperCase();
      (out[k] ||= []).push(ex);
    }
    return out;
  }, [exercises, searchQuery]);

  const handleSelectExercise = (exercise: Exercise) => {
    setSelectedExercise((prev) =>
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
      onExerciseSelected(selectedExercise);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Please try again.";
      toast.error(`Failed to proceed: ${msg}`);
    } finally {
      setIsAddingExercise(false);
    }
  };

  return (
    <AppScreen
      header={<ScreenHeader title="Select exercises" onBack={onBack} denseSmall />}
      // Wider on tablets; AppScreen provides responsive gutters
      maxContent="responsive"
      padContent={false}
      contentClassName="pb-24"
      showHeaderBorder={false}
      showBottomBarBorder={false}
      bottomBar={
        <FooterBar size="md" bg="solid" align="center" maxContent="responsive">
          <TactileButton
            onClick={handleAddExercise}
            disabled={!selectedExercise || isAddingExercise}
            className={`h-12 md:h-14  sm:w-auto px-6 md:px-8 font-medium border-0 transition-all ${
              selectedExercise
                ? "bg-[var(--warm-coral)] hover:bg-[var(--warm-coral)]/90 text-white btn-tactile"
                : "bg-[var(--warm-brown)]/20 text-[var(--warm-brown)]/40 cursor-not-allowed"
            }`}
          >
            {isAddingExercise ? "ADDING..." : selectedExercise ? "ADD (1)" : "ADD"}
          </TactileButton>
        </FooterBar>
      }
      bottomBarSticky
    >
      <Stack gap="fluid">
        <Spacer y="xss" />

        {/* Search */}
        <Section variant="plain" padding="none">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-brown)]/60"
              size={20}
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for an exercise..."
              className="bg-[var(--input-background)] border-[var(--border)] text-[var(--warm-brown)] placeholder:text-[var(--warm-brown)]/60 h-12 md:h-12 pl-10 pr-4 rounded-xl focus:border-[var(--warm-coral)] focus:ring-[var(--warm-coral)]/20"
            />
          </div>
        </Section>

        <Spacer y="xss" />

        {/* Exercise List */}
        <Section
          variant="plain"
          padding="none"
          loading={isLoading}
          loadingBehavior="replace"
          className="space-y-6"
        >
          {!isLoading && (
            <>
              {Object.keys(grouped).length === 0 ? (
                <Section variant="card" className="text-center">
                  <p className="text-[var(--warm-brown)]/60">No exercises found</p>
                </Section>
              ) : (
                Object.keys(grouped)
                  .sort((a, b) => a.localeCompare(b))
                  .map((letter) => (
                    <div key={letter}>
                      <h2 className="text-xs md:text-sm text-[var(--warm-brown)]/60 font-medium mb-3 px-2 tracking-wide">
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
                              aria-pressed={isSelected}
                              onClick={() => handleSelectExercise(exercise)}
                              className="w-full text-left focus:outline-none"
                            >
                              <div
                                className={[
                                  "p-3 md:p-4 rounded-xl border transition-all",
                                  isSelected
                                    ? "bg-[var(--warm-coral)]/100 border-[var(--warm-coral)] shadow-md"
                                    : "bg-white border-[var(--border)] hover:bg-[var(--soft-gray)]/50 hover:border-[var(--warm-coral)]/30 hover:shadow-md",
                                ].join(" ")}
                              >
                                <div className="flex items-center gap-3 md:gap-4">
                                  <div className="w-10 h-10 md:w-12 md:h-12 bg-[var(--warm-brown)]/10 rounded-lg grid place-items-center">
                                    <span className="text-sm md:text-base font-medium text-[var(--warm-brown)]/60">
                                      {initials}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-[var(--warm-brown)] truncate">
                                      {exercise.name}
                                    </h3>
                                    <p className="text-xs md:text-sm text-[var(--warm-brown)]/60 truncate">
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
            </>
          )}
        </Section>

        <Spacer y="xs" />
      </Stack>
    </AppScreen>
  );
}
