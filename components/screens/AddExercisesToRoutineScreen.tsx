// components/screens/AddExercisesToRoutineScreen.tsx
import { useState, useEffect, useMemo, memo, useCallback, useRef } from "react";
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
import { useKeyboardVisible } from "../../hooks/useKeyboardVisible";

interface AddExercisesToRoutineScreenProps {
  routineId?: number;
  routineName: string;
  onBack: () => void;
  onExerciseSelected: (exercises: Exercise[]) => void;
  isFromExerciseSetup?: boolean;
}

type MuscleFilter = "all" | string;
const OTHER_GROUP = "Other";
const PAGE_SIZE = 30;
const LOAD_MORE_PRELOAD = 5;

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
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={20} />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search for an exercise..."}
        className="bg-input-background border-border text-black placeholder:text-black h-12 md:h-12 pl-10 pr-4 rounded-xl focus:border-warm-coral focus:ring-warm-coral/20"
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
      leading={<span className="font-medium text-black">{initials}</span>}
      leadingClassName="w-12 h-12 rounded-xl bg-card/10 grid place-items-center"
      primary={exercise.name}
      secondary={subtitle}
      primaryClassName="font-medium text-black text-[clamp(16px,4.5vw,19px)]"
      secondaryClassName="text-[clamp(11px,3.2vw,12px)] text-black"
      className={[
        "w-full rounded-2xl border border-border card-modern shadow-xl hover:shadow-xl transition-all text-left px-4",
        selected
          ? "bg-warm-coral/60 border-warm-coral/60"
          : "hover:bg-soft-gray",
      ].join(" ")}
      style={{ border: "2px solid var(--border)" }}
      trailing={
        <div className="text-black">
          <div className="w-6 h-6 rounded-full border border-border grid place-items-center">ⓘ</div>
        </div>
      }
    />
  );
});

function ExerciseList({
  groupedAZ,
  selectedExercises,
  onSelect,
  onLoadMore,
  hasMore,
  isLoadingMore,
}: {
  groupedAZ: Record<string, Exercise[]>;
  selectedExercises: Exercise[];
  onSelect: (ex: Exercise) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
}) {
  const letters = useMemo(
    () => Object.keys(groupedAZ).sort((a, b) => a.localeCompare(b)),
    [groupedAZ]
  );

  const selectedIds = useMemo(
    () => selectedExercises.map((e) => e.exercise_id),
    [selectedExercises]
  );
  // Total number of exercises rendered (headers excluded)
  const totalExercises = useMemo(
    () => letters.reduce((sum, l) => sum + groupedAZ[l].length, 0),
    [letters, groupedAZ]
  );

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
        onLoadMore();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, isLoadingMore, totalExercises]);

  if (letters.length === 0) {
    return null;
  }

  let renderIndex = -1;

  return (
    <>
      {letters.map((letter) => (
        <div key={letter}>
          <h2 className="text-xs md:text-sm text-black font-medium mb-3 px-2 tracking-wide">
            {letter}
          </h2>
          <div className="space-y-2">
            {groupedAZ[letter].map((exercise) => {
              renderIndex++;
              const ref =
                renderIndex === totalExercises - LOAD_MORE_PRELOAD
                  ? loadMoreRef
                  : undefined;
              return (
                <div key={exercise.exercise_id} ref={ref}>
                  <ExerciseRow
                    exercise={exercise}
                    selected={selectedIds.includes(exercise.exercise_id)}
                    onSelect={onSelect}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {isLoadingMore && (
        <div className="text-center text-black py-4">Loading...</div>
      )}
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
  const keyboardVisible = useKeyboardVisible();

  const handleScroll = useCallback(() => {
    if (keyboardVisible) {
      (document.activeElement as HTMLElement | null)?.blur();
    }
  }, [keyboardVisible]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<MuscleFilter>("all");
  const [appliedFilter, setAppliedFilter] = useState<MuscleFilter>("all");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showSlowSpinner, setShowSlowSpinner] = useState(false);
  const pageRef = useRef(0);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [filtersReady, setFiltersReady] = useState(false);
  const selectedFilterRef = useRef<MuscleFilter>("all");

  // Component render timing
  useEffect(() => {
    const renderTimer = performanceTimer.start("AddExercisesToRoutineScreen render");
    return () => {
      const renderTime = renderTimer.end();
      logger.info(`[ADD_EXERCISES] Component render: ${renderTime.duration.toFixed(2)}ms`);
    };
  }, []);

  const fetchExercises = useCallback(
    async (
      reset: boolean,
      filter: MuscleFilter,
      search: string
    ) => {
      const page = reset ? 0 : pageRef.current;
      try {
        if (reset) {
          setIsLoading(true);
          setHasMore(false);
          pageRef.current = 0;
        } else {
          setIsLoadingMore(true);
        }
        setLoadError(false);
        const fetchTimer = performanceTimer.start(
          "AddExercisesToRoutineScreen fetch exercises"
        );
        const data = await supabaseAPI.getExercises({
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          muscleGroup:
            filter === "all" || filter === OTHER_GROUP ? undefined : filter,
          other: filter === OTHER_GROUP,
          search: search.trim() || undefined,
        });
        const fetchTime = fetchTimer.end();
        logger.info(
          `[ADD_EXERCISES] Fetch exercises: ${fetchTime.duration.toFixed(2)}ms`
        );
        setExercises((prev) => (reset ? data : [...prev, ...data]));
        setHasMore(data.length === PAGE_SIZE);
        pageRef.current = page + 1;
        setAppliedFilter(filter);
        setLoadError(false);
      } catch (error) {
        logger.error("[AddExercises] fetch error:", error);
        toast.error("Failed to load exercises");
        if (reset) setExercises([]);
        setLoadError(true);
      } finally {
        if (reset) setIsLoading(false);
        else setIsLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    let active = true;
    supabaseAPI
      .getMuscleGroups()
      .then((groups) => {
        if (active) setMuscleGroups(groups);
      })
      .catch((error) =>
        logger.error("[AddExercises] failed to load muscle groups", error)
      )
      .finally(() => {
        if (active) setFiltersReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    selectedFilterRef.current = selectedFilter;
  }, [selectedFilter]);

  useEffect(() => {
    if (!filtersReady) return;
    const handle = setTimeout(
      () => fetchExercises(true, selectedFilterRef.current, searchQuery),
      300
    );
    return () => clearTimeout(handle);
  }, [filtersReady, searchQuery, fetchExercises]);

  useEffect(() => {
    let t: NodeJS.Timeout;
    if (isLoading) {
      t = setTimeout(() => setShowSlowSpinner(true), 1000);
    } else {
      setShowSlowSpinner(false);
    }
    return () => clearTimeout(t);
  }, [isLoading]);

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
    
    const base =
      appliedFilter === "all" ? exercises : (byGroup.get(appliedFilter) ?? []);
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
  }, [exercises, byGroup, appliedFilter, searchQuery]);

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
      onScroll={handleScroll}
    >
      <Stack gap="fluid">
        <Spacer y="xss" />

        {/* Segmented muscle-group filter */}
        <Section variant="plain" padding="none">
          {!filtersReady ? (
            <div className="py-2 flex justify-center">
              <div className="w-6 h-6 border-4 border-warm-coral border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              <SegmentedToggle<MuscleFilter>
                value={selectedFilter}
                onChange={(f) => {
                  setSelectedFilter(f);
                  fetchExercises(true, f, searchQuery);
                }}
                options={segmentOptions}
                size="sm"
                variant="filled"
                tone="accent"
                className="min-w-max"
              />
            </div>
          )}
        </Section>

        {/* Search */}
        <Section variant="plain" padding="none">
          <SearchField value={searchQuery} onChange={setSearchQuery} />
        </Section>

        <Spacer y="xss" />

        {/* Exercise List */}
        <Section variant="plain" padding="none" className="space-y-6">
          {loadError ? (
            <Section variant="card" className="text-center">
              <p className="text-black">Failed to load exercises</p>
            </Section>
          ) : (
            <>
              <ExerciseList
                groupedAZ={groupedAZ}
                selectedExercises={selectedExercises}
                onSelect={handleSelectExercise}
                onLoadMore={() => fetchExercises(false, appliedFilter, searchQuery)}
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
              />
              {isLoading && showSlowSpinner && (
                <div className="py-6 flex justify-center">
                  <div className="animate-spin w-8 h-8 border-4 border-warm-coral border-t-transparent rounded-full" />
                </div>
              )}
            </>
          )}
        </Section>

        <Spacer y="xl" />
      </Stack>
    </AppScreen>
  );
}
