// components/screens/AddExercisesToRoutineScreen.tsx
import { useState, useEffect, useMemo, memo } from "react";
import { Search } from "lucide-react";
import { Input } from "../ui/input";
import { BottomNavigationButton } from "../BottomNavigationButton";
import SegmentedToggle from "../segmented/SegmentedToggle";
import { supabaseAPI, Exercise } from "../../utils/supabase/supabase-api";
import { useAuth } from "../AuthContext";
import { toast } from "sonner";
import { AppScreen, ScreenHeader, Section, Stack, Spacer } from "../layouts";
import { BottomNavigation } from "../BottomNavigation";
import { logger } from "../../utils/logging";
import { performanceTimer } from "../../utils/performanceTimer";
import ListItem from "../ui/ListItem";

interface AddExercisesToRoutineScreenProps {
  routineId?: number;
  routineName: string;
  onBack: () => void;
  onExerciseSelected: (exercises: Exercise[]) => void;
  isFromExerciseSetup?: boolean;
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
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search for an exercise..."}
        className="bg-input-background border-border text-foreground placeholder:text-muted-foreground h-12 md:h-12 pl-10 pr-4 rounded-xl focus:border-warm-coral focus:ring-warm-coral/20"
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
    <ListItem
      as="button"
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(exercise)}
      leading={<span className="font-medium text-muted-foreground">{initials}</span>}
      leadingClassName="w-12 h-12 rounded-xl bg-card/10 grid place-items-center"
      primary={exercise.name}
      secondary={subtitle}
      primaryClassName="font-medium text-foreground text-[clamp(16px,4.5vw,19px)]"
      secondaryClassName="text-[clamp(11px,3.2vw,12px)] text-muted-foreground"
      className={[
        "w-full rounded-2xl border border-border bg-card shadow-sm transition-all px-4",
        selected
          ? "bg-warm-coral/20 border-warm-coral/30 shadow-md"
          : "hover:bg-soft-gray/50 hover:shadow-md",
      ].join(" ")}
      trailing={
        <div className="text-muted-foreground">
          <div className="w-6 h-6 rounded-full border border-border grid place-items-center">ⓘ</div>
        </div>
      }
    />
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
      <h2 className="text-xs md:text-sm text-muted-foreground font-medium mb-3 px-2 tracking-wide">
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
        <p className="text-muted-foreground">No exercises found</p>
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

  // Component render timing
  useEffect(() => {
    const renderTimer = performanceTimer.start("AddExercisesToRoutineScreen render");
    return () => {
      const renderTime = renderTimer.end();
      logger.info(`[ADD_EXERCISES] Component render: ${renderTime.duration.toFixed(2)}ms`);
    };
  }, []);

  // fetch once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const fetchTimer = performanceTimer.start("AddExercisesToRoutineScreen fetch exercises");
        const data = await supabaseAPI.getExercises();
        const fetchTime = fetchTimer.end();
        logger.info(`[ADD_EXERCISES] Fetch exercises: ${fetchTime.duration.toFixed(2)}ms`);
        
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
    const filterTimer = performanceTimer.start("AddExercisesToRoutineScreen filter exercises");
    
    const base = muscleFilter === "all" ? exercises : (byGroup.get(muscleFilter) ?? []);
    const q = searchQuery.trim().toLowerCase();
    const filtered = q ? base.filter((ex) => ex.name.toLowerCase().includes(q)) : base;

    const out: Record<string, Exercise[]> = {};
    for (const ex of filtered) {
      const k = (ex.name?.[0] || "#").toUpperCase();
      (out[k] ||= []).push(ex);
    }
    
    const filterTime = filterTimer.end();
    logger.info(`[ADD_EXERCISES] Filter exercises (${filtered.length} results): ${filterTime.duration.toFixed(2)}ms`);
    
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
          titleClassName="text-[17px] font-bold"
        />
      }
      maxContent="responsive"
      padContent={false}
      showHeaderBorder={false}
      showBottomBarBorder={false}
      bottomBar={
        <BottomNavigation>
          <BottomNavigationButton
            onClick={handleAddExercise}
            disabled={selectedExercises.length === 0 || isAddingExercise}
            className="sm:w-auto"
          >
            {isAddingExercise
              ? "ADDING..."
              : selectedExercises.length > 0
              ? `ADD (${selectedExercises.length})`
              : "ADD"}
          </BottomNavigationButton>
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
