// components/screens/AddExercisesToRoutineScreen.tsx
import { useState, useEffect, useMemo, memo } from "react";
import { Search } from "lucide-react";
import { Input } from "../ui/input";
import { TactileButton } from "../TactileButton";
import SegmentedToggle from "../segmented/SegmentedToggle";
import { supabaseAPI, Exercise } from "../../utils/supabase/supabase-api";
import { useAuth } from "../AuthContext";
import { toast } from "sonner";
import { AppScreen, ScreenHeader, Section, Stack, Spacer } from "../layouts";
import { BottomNavigation } from "../BottomNavigation";
import { logger } from "../../utils/logging";

interface AddExercisesToRoutineScreenProps {
  routineId?: number;
  routineName: string;
  onBack: () => void;
  onExerciseSelected: (exercises: Exercise[]) => void;
  isFromExerciseSetup?: boolean;
  bottomBar?: React.ReactNode;
}

type MuscleFilter = "all" | string;
const OTHER_GROUP = "Other";

// ────────────────────────────────────────────────────────────────────────────────
// Small reusable UI bits
// ────────────────────────────────────────────────────────────────────────────────
const SearchField = memo(function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-brown/60" size={20} />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search for an exercise..."}
        className="bg-input-background border-border text-warm-brown placeholder:text-warm-brown/60 h-12 md:h-12 pl-10 pr-4 rounded-xl focus:border-warm-coral focus:ring-warm-coral/20"
      />
    </div>
  );
});

const ExerciseRow = memo(function ExerciseRow({
  exercise,
  selected,
  onSelect,
}: {
  exercise: Exercise;
  selected: boolean;
  onSelect: (ex: Exercise) => void;
}) {
  const initials = exercise.name.substring(0, 2).toUpperCase();
  const subtitle = (exercise.muscle_group || "").trim() || OTHER_GROUP;

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(exercise)}
      className="w-full text-left focus:outline-none"
    >
      <div
        className={[
          "p-3 md:p-4 rounded-xl border transition-all",
          selected
            // toned down selection (less “bright orange”)
            ? "bg-warm-coral/60 border-warm-coral/30 shadow-md"
            : "bg-card border-border hover:bg-soft-gray/50 hover:border-warm-coral/30 hover:shadow-md",
        ].join(" ")}
      >
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-warm-brown/10 rounded-lg grid place-items-center">
            <span className="text-sm md:text-base font-medium text-warm-brown/60">
              {initials}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-warm-brown truncate">{exercise.name}</h3>
            <p className="text-xs md:text-sm text-warm-brown/60 truncate">{subtitle}</p>
          </div>
          <div className="text-warm-brown/40">
            <div className="w-6 h-6 rounded-full border border-warm-brown/20 grid place-items-center">
              <div>ⓘ</div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
});

const ExerciseGroup = memo(function ExerciseGroup({
  letter,
  items,
  selectedIds,
  onSelect,
}: {
  letter: string;
  items: Exercise[];
  selectedIds: number[];
  onSelect: (ex: Exercise) => void;
}) {
  return (
    <div>
      <h2 className="text-xs md:text-sm text-warm-brown/60 font-medium mb-3 px-2 tracking-wide">
        {letter}
      </h2>
      <div className="space-y-2">
        {items.map((exercise) => (
          <ExerciseRow
            key={exercise.exercise_id}
            exercise={exercise}
            selected={selectedIds.includes(exercise.exercise_id)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
});

function ExerciseList({
  groupedAZ,
  selectedExercises,
  onSelect,
}: {
  groupedAZ: Record<string, Exercise[]>;
  selectedExercises: Exercise[];
  onSelect: (ex: Exercise) => void;
}) {
  const letters = useMemo(
    () => Object.keys(groupedAZ).sort((a, b) => a.localeCompare(b)),
    [groupedAZ]
  );

  if (letters.length === 0) {
    return (
      <Section variant="card" className="text-center">
        <p className="text-warm-brown/60">No exercises found</p>
      </Section>
    );
  }

  return (
    <>
      {letters.map((letter) => (
        <ExerciseGroup
          key={letter}
          letter={letter}
          items={groupedAZ[letter]}
          selectedIds={selectedExercises.map((e) => e.exercise_id)}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Screen
// ────────────────────────────────────────────────────────────────────────────────
export function AddExercisesToRoutineScreen({
  routineId,
  routineName,
  onBack,
  onExerciseSelected,
  isFromExerciseSetup = true,
}: AddExercisesToRoutineScreenProps) {
  const { userToken } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<MuscleFilter>("all");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingExercise, setIsAddingExercise] = useState(false);

  // fetch once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const data = await supabaseAPI.getExercises();
        if (cancelled) return;
        setExercises(Array.isArray(data) ? data : []);
      } catch (error) {
        logger.error("[AddExercises] fetch error:", error);
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

  // unique muscle groups
  const muscleGroups = useMemo(() => {
    const s = new Set<string>();
    for (const ex of exercises) {
      const g = (ex.muscle_group || "").trim();
      s.add(g || OTHER_GROUP);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [exercises]);

  // index by group
  const byGroup = useMemo(() => {
    const map = new Map<string, Exercise[]>();
    for (const ex of exercises) {
      const key = (ex.muscle_group || "").trim() || OTHER_GROUP;
      (map.get(key) ?? map.set(key, []).get(key)!).push(ex);
    }
    return map;
  }, [exercises]);

  // filter + search + group to A–Z
  const groupedAZ = useMemo(() => {
    const base = muscleFilter === "all" ? exercises : (byGroup.get(muscleFilter) ?? []);
    const q = searchQuery.trim().toLowerCase();
    const filtered = q ? base.filter((ex) => ex.name.toLowerCase().includes(q)) : base;

    const out: Record<string, Exercise[]> = {};
    for (const ex of filtered) {
      const k = (ex.name?.[0] || "#").toUpperCase();
      (out[k] ||= []).push(ex);
    }
    return out;
  }, [exercises, byGroup, muscleFilter, searchQuery]);

  const handleSelectExercise = (exercise: Exercise) => {
    setSelectedExercises((prev) => {
      const exists = prev.find((e) => e.exercise_id === exercise.exercise_id);
      if (exists) return prev.filter((e) => e.exercise_id !== exercise.exercise_id);
      return [...prev, exercise];
    });
  };

  const handleAddExercise = async () => {
    if (selectedExercises.length === 0) return toast.error("Please select an exercise");
    if (!userToken) return toast.error("Please sign in to add exercises");

    setIsAddingExercise(true);
    try {
      onExerciseSelected(selectedExercises);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Please try again.";
      toast.error(`Failed to proceed: ${msg}`);
    } finally {
      setIsAddingExercise(false);
    }
  };

  const segmentOptions = useMemo(
    () => [
      { value: "all" as MuscleFilter, label: "ALL" },
      ...muscleGroups.map((g) => ({ value: g as MuscleFilter, label: g })),
    ],
    [muscleGroups]
  );

  return (
    <AppScreen
      header={
        <ScreenHeader
          title="Select exercises"
          onBack={onBack}
          showBorder={false}
          denseSmall
          contentHeightPx={74}
          titleClassName="text-[17px] font-bold"
        />
      }
      maxContent="responsive"
      padContent={false}
      showHeaderBorder={false}
      showBottomBarBorder={false}
      bottomBar={
        <BottomNavigation>
          <TactileButton
            onClick={handleAddExercise}
            disabled={selectedExercises.length === 0 || isAddingExercise}
            className={`h-12 md:h-14 sm:w-auto px-6 md:px-8 font-medium border-0 transition-all ${
              selectedExercises.length > 0
                ? "bg-primary hover:bg-primary-hover text-primary-foreground opacity-90 btn-tactile"
                : "bg-warm-brown/20 text-warm-brown/40 cursor-not-allowed"
            }`}
          >
            {isAddingExercise
              ? "ADDING..."
              : selectedExercises.length > 0
              ? `ADD (${selectedExercises.length})`
              : "ADD"}
          </TactileButton>
        </BottomNavigation>
      }
      bottomBarSticky
      contentClassName=""
    >
      <Stack gap="fluid">
        <Spacer y="xss" />

        {/* Segmented muscle-group filter */}
        <Section variant="plain" padding="none">
          <div className="overflow-x-auto no-scrollbar">
            <SegmentedToggle<MuscleFilter>
              value={muscleFilter}
              onChange={setMuscleFilter}
              options={segmentOptions}
              size="sm"
              variant="filled"
              tone="accent"
              className="min-w-max"
            />
          </div>
        </Section>

        {/* Search */}
        <Section variant="plain" padding="none">
          <SearchField value={searchQuery} onChange={setSearchQuery} />
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
            <ExerciseList
              groupedAZ={groupedAZ}
              selectedExercises={selectedExercises}
              onSelect={handleSelectExercise}
            />
          )}
        </Section>

        <Spacer y="xl" />
      </Stack>
    </AppScreen>
  );
}
