// components/screens/ExerciseSetupScreen.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppScreen, Section, ScreenHeader, Stack, Spacer } from "../layouts";
import { BottomNavigation } from "../BottomNavigation";
import { BottomNavigationButton } from "../BottomNavigationButton";
import ExpandingCard from "../ui/ExpandingCard";
import ExerciseSetEditorCard from "../sets/ExerciseSetEditorCard";
import { RoutineAccess } from "../../hooks/useAppNavigation";
import { useAuth } from "../AuthContext";
import {
  Exercise,
  supabaseAPI,
  type UserRoutineExerciseSet,
} from "../../utils/supabase/supabase-api";
import { logger } from "../../utils/logging";
import { performanceTimer } from "../../utils/performanceTimer";
import { loadRoutineExercisesWithSets, SETS_PREFETCH_CONCURRENCY } from "../../utils/routineLoader";
import ListItem from "../ui/ListItem";
import ActionSheet from "../sheets/ActionSheet";
import { Check } from "lucide-react";

// --- Journal-based persistence (simple, testable) ---
import {
  makeJournal,
  recordExAdd,
  recordExDelete,
  recordSetAdd,
  recordSetDelete,
  recordSetReorder,
  recordSetUpdate,
} from "../routine-editor/journal";
import { collapseJournal, journalIsNoop } from "../routine-editor/collapseJournal";
import { runJournal, type ExIdMap } from "../routine-editor/journalRunner";
import { tempId, type Id } from "../routine-editor/journalTypes";

/* =======================================================================================
   Types used by this screen (UI state only)
   ======================================================================================= */

type ExerciseMeta = { exercise_id: number; name: string; muscle_group?: string | null };

type UISet = {
  id: Id; // DB id (>0) or temp (<0)
  set_order: number;
  reps: string; // keep strings for controlled inputs
  weight: string;
  done?: boolean;
};

type UIExercise = {
  id: Id; // templateId (>0) or temp (<0)
  templateId?: number; // present if existing in DB
  exerciseId: number; // exercises.exercise_id
  name: string;
  muscle_group?: string;
  loaded: boolean; // sets loaded
  expanded: boolean;
  completed: boolean;
  sets: UISet[];
};

/* =======================================================================================
   Props
   ======================================================================================= */

interface ExerciseSetupScreenProps {
  routineId: number;
  routineName: string;
  selectedExercisesForSetup: Exercise[];
  setSelectedExercisesForSetup: (exercises: Exercise[]) => void;
  onBack: () => void;
  onSave: () => void;
  onAddMoreExercises: () => void;
  isEditingExistingRoutine?: boolean;
  onShowExerciseSelector?: () => void;
  access?: RoutineAccess;
  initialMode?: "plan" | "workout";
  onModeChange?: (mode: "plan" | "workout") => void;
}

/* =======================================================================================
   Component
   ======================================================================================= */

export function ExerciseSetupScreen({
  routineId,
  routineName,
  selectedExercisesForSetup,
  setSelectedExercisesForSetup,
  onBack,
  onSave,
  onAddMoreExercises,
  isEditingExistingRoutine = false,
  onShowExerciseSelector,
  access = RoutineAccess.Editable,
  initialMode = "plan",
  onModeChange,
}: ExerciseSetupScreenProps) {
  const { userToken } = useAuth();

  const [exercises, setExercises] = useState<UIExercise[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [showEndSheet, setShowEndSheet] = useState(false);
  const [loadingSets, setLoadingSets] = useState<Record<string, boolean>>({}); // key by exercise id as string

  type ScreenMode = "plan" | "workout";
  const [screenMode, setScreenMode] = useState<ScreenMode>(initialMode);
  const inWorkout = screenMode === "workout";

  // Append-only action journal (doesn't trigger re-renders)
  const journalRef = useRef(makeJournal());
  // Snapshot of last-saved state for change detection
  const savedSnapshotRef = useRef<any[]>([]);
  // Backup of exercises before entering workout mode
  const preWorkoutExercisesRef = useRef<UIExercise[]>([]);

  // Workout timer state
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const workoutStartRef = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const formatHHMMSS = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds]
      .map((v) => v.toString().padStart(2, "0"))
      .join(":");
  };

  useEffect(() => {
    if (inWorkout) {
      timerRef.current = setInterval(() => {
        if (workoutStartRef.current != null) {
          setElapsedSeconds(
            Math.floor((Date.now() - workoutStartRef.current) / 1000)
          );
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      workoutStartRef.current = null;
      setElapsedSeconds(0);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [inWorkout]);

  /* -------------------------------------------------------------------------------------
     Utilities
     ------------------------------------------------------------------------------------- */

  // ✅ NEW: Normalize placeholders so "Undefined"/"Unknown"/"null"/"N/A" don't block fallback
  const normalizeField = (val: unknown): string => {
    const s = (val ?? "").toString().trim();
    if (!s) return "";
    if (/^(unknown|undefined|null|n\/a)$/i.test(s)) return "";
    return s;
  };

  const fetchExerciseMeta = async (id: number): Promise<ExerciseMeta | null> => {
    try {
      // Uses supabaseAPI.getExercise(id) which is cached internally
      const metaAny = await supabaseAPI.getExercise(id);
      const meta = Array.isArray(metaAny) ? (metaAny as any[])[0] : (metaAny as any);
      return (meta ?? null) as ExerciseMeta | null;
    } catch (error) {
      logger.error(" [EXERCISE_SETUP] fetchExerciseMeta error:", error);
      return null;
    }
  };

  // Normalize exercises to compare against saved snapshot (order + values only)
  const snapshotExercises = (list: UIExercise[]) =>
    list
      .map((e) => ({
        id: e.id,
        exerciseId: e.exerciseId,
        sets: e.sets
          .slice()
          .sort((a, b) => a.set_order - b.set_order)
          .map((s) => ({
            id: s.id,
            set_order: s.set_order,
            reps: s.reps,
            weight: s.weight,
          })),
      }))
      .sort((a, b) => a.id - b.id);

  /* -------------------------------------------------------------------------------------
     Load saved exercises using routineLoader
     ------------------------------------------------------------------------------------- */
  useEffect(() => {
    if (!userToken) return;
    let cancelled = false;

    (async () => {
      const timer = performanceTimer.start('ExerciseSetup - load saved exercises');
      setLoadingSaved(true);
      try {
        const loaded = await loadRoutineExercisesWithSets(routineId, {
          concurrency: SETS_PREFETCH_CONCURRENCY,
          timer: performanceTimer,
        });
        if (cancelled) return;
        const uiList: UIExercise[] = loaded.map((r) => ({
          id: r.templateId,
          templateId: r.templateId,
          exerciseId: r.exerciseId,
          name: r.name,
          muscle_group: r.muscle_group,
          loaded: true,
          expanded: false,
          completed: false,
          sets: r.sets,
        }));
        setExercises(uiList);
        savedSnapshotRef.current = snapshotExercises(uiList);
      } catch (e) {
        logger.error(String(e));
        toast.error('Failed to load exercises');
      } finally {
        if (!cancelled) setLoadingSaved(false);
        timer.endWithLog();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [routineId, userToken]);

  /* -------------------------------------------------------------------------------------
     Add selected exercises AFTER initial load completes
     ------------------------------------------------------------------------------------- */
  useEffect(() => {
    if (loadingSaved) return;
    if (selectedExercisesForSetup.length === 0) return;

    (async () => {
      const timer = performanceTimer.start('ExerciseSetup - add selected exercises');
      for (const ex of selectedExercisesForSetup) {
        await addNewExercise(ex);
      }
      setSelectedExercisesForSetup([]);

      // Scroll new cards into view
      requestAnimationFrame(() =>
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })
      );

      timer.endWithLog();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExercisesForSetup, loadingSaved]);

  /* =======================================================================================
     Helpers: update local UI state
     ======================================================================================= */

  const withExercises = (updater: (draft: UIExercise[]) => void) => {
    setExercises((prev) => {
      const next = prev.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) }));
      updater(next);
      return next;
    });
  };

  const recomputeExerciseCompletion = (ex: UIExercise) => {
    const allDone = ex.sets.length > 0 && ex.sets.every((s) => s.done);
    ex.completed = allDone;
    ex.expanded = !allDone;
  };

  const ensureSetsLoaded = async (ex: UIExercise) => {
    // With eager load this will usually be a no-op; keep for safety.
    if (ex.loaded || !ex.templateId) return;

    const timer = performanceTimer.start(`ExerciseSetup - ensureSetsLoaded for exercise ${ex.id}`);
    setLoadingSets((p) => ({ ...p, [String(ex.id)]: true }));
    try {
      const rows = (await supabaseAPI.getExerciseSetsForRoutine(
        ex.templateId
      )) as UserRoutineExerciseSet[];
      const mapped: UISet[] = rows
        .sort((a, b) => (a.set_order || 0) - (b.set_order || 0))
        .map((r) => ({
          id: r.routine_template_exercise_set_id,
          set_order: r.set_order ?? 0,
          reps: String(r.planned_reps ?? "0"),
          weight: String(r.planned_weight_kg ?? "0"),
        }));

      withExercises((draft) => {
        const i = draft.findIndex((d) => d.id === ex.id);
        if (i >= 0) {
          draft[i].sets = mapped;
          draft[i].loaded = true;
        }
      });
    } catch (e) {
      logger.error(String(e));
      toast.error("Failed to load sets");
    } finally {
      setLoadingSets((p) => {
        const n = { ...p };
        delete n[String(ex.id)];
        return n;
      });
      timer.endWithLog();
    }
  };

  /* =======================================================================================
     Journal-backed UI actions
     ======================================================================================= */

  const addNewExercise = async (x: Exercise) => {
    const timer = performanceTimer.start('ExerciseSetup - addNewExercise');
    const newExId: Id = tempId();
    const initialSetId: Id = tempId();

    // If selector didn't include muscle_group or name, fetch per-exercise meta now
    let name = x.name?.trim() || "";
    let muscle_group = ((x as any).muscle_group || "")?.toString().trim() || "";

    if (!name || !muscle_group) {
      const metaTimer = performanceTimer.start('ExerciseSetup - fetchExerciseMeta in addNewExercise');
      const meta = await fetchExerciseMeta(x.exercise_id);
      if (meta) {
        if (!name) name = normalizeField(meta.name) || name;
        if (!muscle_group) muscle_group = normalizeField(meta.muscle_group) || muscle_group;
      }
      metaTimer.endWithLog();
    }

    // 1) Update UI
    setExercises((prev) => [
      ...prev,
      {
        id: newExId,
        exerciseId: x.exercise_id,
        name,
        muscle_group: muscle_group || undefined,
        loaded: true,
        expanded: true,
        completed: false,
        sets: [{ id: initialSetId, set_order: 1, reps: "0", weight: "0", ...(inWorkout ? { done: false } : {}) }],
      },
    ]);

    // 2) Record in journal
    recordExAdd(journalRef.current, newExId, x.exercise_id, name);
    recordSetAdd(journalRef.current, newExId, initialSetId, 1, "0", "0");

    timer.endWithLog();
  };

  const toggleExpanded = async (exId: Id) => {
    const ex = exercises.find((e) => e.id === exId);
    if (!ex) return;

    if (!ex.loaded && ex.templateId) {
      await ensureSetsLoaded(ex);
    }

    withExercises((draft) => {
      const i = draft.findIndex((d) => d.id === exId);
      if (i >= 0) draft[i].expanded = !draft[i].expanded;
    });
  };

  const computeNextOrder = (sets: UISet[]) =>
    sets.reduce((m, s) => Math.max(m, s.set_order || 0), 0) + 1;

  /** Add set by duplicating the last set’s reps/weight (or "0"/"0" if none). */
  const onAddSet = async (exId: Id) => {
    if (access === RoutineAccess.ReadOnly) return;

    const current = exercises.find((e) => e.id === exId);
    if (!current) return;
    if (!current.loaded && current.templateId) {
      await ensureSetsLoaded(current);
    }

    withExercises((draft) => {
      const i = draft.findIndex((d) => d.id === exId);
      if (i < 0) return;

      const ex = draft[i];
      const nextOrder = computeNextOrder(ex.sets);

      const prevSet =
        ex.sets.length > 0
          ? ex.sets.slice().sort((a, b) => a.set_order - b.set_order)[ex.sets.length - 1]
          : undefined;

      const newSetId: Id = tempId();
      const initialReps = prevSet ? prevSet.reps : "0";
      const initialWeight = prevSet ? prevSet.weight : "0";

      ex.sets.push({
        id: newSetId,
        set_order: nextOrder,
        reps: initialReps,
        weight: initialWeight,
        ...(inWorkout ? { done: false } : {}),
      });

      recordSetAdd(journalRef.current, exId, newSetId, nextOrder, initialReps, initialWeight);
      recomputeExerciseCompletion(ex);
    });
  };

  // robust key resolver: expect set id; also accept order number.
  const resolveSetId = (ex: UIExercise, rawKey: unknown): Id | null => {
    if (typeof rawKey === "number") {
      const byId = ex.sets.find((s) => s.id === rawKey);
      if (byId) return byId.id;
      const byOrder = ex.sets.find((s) => s.set_order === rawKey);
      return byOrder ? byOrder.id : null;
    }
    if (typeof rawKey === "string") {
      const n = Number(rawKey);
      if (!Number.isNaN(n)) {
        const byId = ex.sets.find((s) => s.id === n);
        if (byId) return byId.id;
        const byOrder = ex.sets.find((s) => s.set_order === n);
        return byOrder ? byOrder.id : null;
      }
    }
    return null;
  };

  const onChangeSet = (exId: Id, rawKey: unknown, field: "reps" | "weight", value: string) => {
    if (access === RoutineAccess.ReadOnly) return;
    withExercises((draft) => {
      const i = draft.findIndex((d) => d.id === exId);
      if (i < 0) return;
      const ex = draft[i];

      const setId = resolveSetId(ex, rawKey);
      if (setId == null) return;

      const sIdx = ex.sets.findIndex((s) => s.id === setId);
      if (sIdx < 0) return;

      const prev = ex.sets[sIdx];
      const next: UISet = { ...prev, [field]: value };
      ex.sets[sIdx] = next;

      if (field === "reps") recordSetUpdate(journalRef.current, exId, setId, value, undefined);
      else recordSetUpdate(journalRef.current, exId, setId, undefined, value);
    });
  };

  const onRemoveSet = (exId: Id, rawKey: unknown) => {
    if (access === RoutineAccess.ReadOnly) return;
    withExercises((draft) => {
      const i = draft.findIndex((d) => d.id === exId);
      if (i < 0) return;
      const ex = draft[i];

      const setId = resolveSetId(ex, rawKey);
      if (setId == null) return;

      const before = ex.sets.slice();
      ex.sets = ex.sets.filter((s) => s.id !== setId);

      recordSetDelete(journalRef.current, exId, setId);

      // reindex 1..N and record reorders for DB sets only
      let order = 1;
      for (const s of ex.sets) {
        const old = before.find((b) => b.id === s.id);
        s.set_order = order++;
        if (s.id > 0 && old && old.set_order !== s.set_order) {
          recordSetReorder(journalRef.current, exId, s.id, s.set_order);
        }
      }
      recomputeExerciseCompletion(ex);
    });
  };

  const onDeleteExercise = (exId: Id) => {
    if (access === RoutineAccess.ReadOnly) return;
    setExercises((prev) => prev.filter((e) => e.id !== exId));
    recordExDelete(journalRef.current, exId);
  };

  const onToggleDone = (exId: Id, rawKey: unknown, done: boolean) => {
    withExercises((draft) => {
      const ex = draft.find((d) => d.id === exId);
      if (!ex) return;
      const setId = resolveSetId(ex, rawKey);
      if (setId == null) return;
      const s = ex.sets.find((st) => st.id === setId);
      if (s) s.done = done;
      recomputeExerciseCompletion(ex);
    });
  };

  const onToggleExerciseDone = async (exId: Id, done: boolean) => {
    const ex = exercises.find((e) => e.id === exId);
    if (!ex) return;
    if (!ex.loaded && ex.templateId) {
      await ensureSetsLoaded(ex);
    }
    withExercises((draft) => {
      const ex = draft.find((d) => d.id === exId);
      if (!ex) return;
      ex.sets.forEach((s) => (s.done = done));
      recomputeExerciseCompletion(ex);
    });
  };

  const updateMode = (mode: ScreenMode) => {
    setScreenMode(mode);
    onModeChange?.(mode);
  };

  const startWorkout = () => {
    workoutStartRef.current = Date.now();
    setElapsedSeconds(0);
    // preserve current plan state for quick restoration if workout is canceled
    preWorkoutExercisesRef.current = JSON.parse(JSON.stringify(exercises));
    // reset any stale journal entries and mark all sets as not done locally
    journalRef.current = makeJournal();
    setExercises((prev) =>
      prev.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => ({ ...s, done: false })),
        completed: false,
        expanded: false,
      }))
    );
    updateMode("workout");
    logger.info(" [EXERCISE_SETUP] Workout started for id: " + routineId);
  };

  const endWorkout = async () => {
    if (!userToken) {
      toast.error("Please sign in to save workout");
      return;
    }

    setSavingWorkout(true);
    try {
      // Persist workout session in one go at workout end
      //TODO: Uncomment this when we have a way to start a workout and fetch the workout id
      // const workout = await supabaseAPI.startWorkout(routineId);
      logger.info(" [EXERCISE_SETUP] Workout ended for id: " + routineId);
      // Dummy workout object
      let workout = {
        id: "123",
        template_id: routineId,
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
      };

      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        //TODO: Uncomment this when we have a way to add a workout exercise
        //const xEx = await supabaseAPI.addWorkoutExercise(workout.id, ex.exerciseId, i + 1);
        let wEx = {
          id: "123",
          workout_id: workout.id,
          exercise_id: ex.exerciseId,
          order_index: i + 1,
        };
        logger.info(" [EXERCISE_SETUP] Workout exercise added for id: " + ex.exerciseId);
        for (const s of ex.sets) {
          logger.info(" [EXERCISE_SETUP] Workout set added for id: " + wEx.id + " Set order: " + s.set_order + " Reps: " + (Number(s.reps) || 0) + " Weight: " + (Number(s.weight) || 0) + " Done: " + (s.done ? "DONE" : "NOT DONE"));
          /*await supabaseAPI.addWorkoutSet(
            wEx.id,
            s.set_order,
            Number(s.reps) || 0,
            Number(s.weight) || 0,
            s.done ? new Date().toISOString() : undefined
          );*/
        }
      }

      //TODO: Uncomment this when we have a way to end a workout
      //await supabaseAPI.endWorkout(workout.id);
      logger.info(" [EXERCISE_SETUP] Workout ended for id: " + workout.id);
      const durationSecs =
        workoutStartRef.current != null
          ? Math.floor((Date.now() - workoutStartRef.current) / 1000)
          : elapsedSeconds;
      logger.info(
        " [EXERCISE_SETUP] Workout duration: " + formatHHMMSS(durationSecs)
      );

      // Apply workout edits to the routine template
      const journal = journalRef.current;
      const exIdMap: ExIdMap = {};
      for (const e of exercises) {
        exIdMap[e.id] = { templateId: e.templateId, exerciseId: e.exerciseId };
      }
      const plan = collapseJournal(journal);
      if (!journalIsNoop(journal)) {
        await runJournal(plan, routineId, exIdMap);
      }
      journalRef.current = makeJournal();

      await reloadFromDb();
      toast.success("Workout saved!");
      updateMode("plan");
    } catch (e) {
      logger.error(String(e));
      toast.error("Failed to save workout");
    } finally {
      setSavingWorkout(false);
    }
  };

  const cancelWorkout = async () => {
    journalRef.current = makeJournal();
    setExercises(JSON.parse(JSON.stringify(preWorkoutExercisesRef.current)));
    updateMode("plan");
  };

  /* =======================================================================================
     Save / Cancel
     ======================================================================================= */

  const reloadFromDb = async () => {
    setLoadingSaved(true);
    try {
      const loaded = await loadRoutineExercisesWithSets(routineId, {
        concurrency: SETS_PREFETCH_CONCURRENCY,
        timer: performanceTimer,
      });
      const uiList: UIExercise[] = loaded.map((r) => ({
        id: r.templateId,
        templateId: r.templateId,
        exerciseId: r.exerciseId,
        name: r.name,
        muscle_group: r.muscle_group,
        loaded: true,
        expanded: false,
        completed: false,
        sets: r.sets,
      }));
      setExercises(uiList);
      savedSnapshotRef.current = snapshotExercises(uiList);
    } catch (e) {
      logger.error(String(e));
      toast.error("Failed to refresh");
    } finally {
      setLoadingSaved(false);
    }
  };

  const onSaveAll = async () => {
    if (!userToken) {
      toast.error("Please sign in to save changes");
      return;
    }
    const journal = journalRef.current;
    if (journalIsNoop(journal)) {
      toast.message("No changes to save");
      return;
    }

    const exIdMap: ExIdMap = {};
    for (const e of exercises) {
      exIdMap[e.id] = { templateId: e.templateId, exerciseId: e.exerciseId };
    }

    const plan = collapseJournal(journal);

    setSavingAll(true);
    try {
      await runJournal(plan, routineId, exIdMap);
      journalRef.current = makeJournal();
      await reloadFromDb();
      toast.success("All changes saved!");
      onSave?.();
    } catch (e) {
      logger.error(String(e));
      toast.error("Failed to save changes");
    } finally {
      setSavingAll(false);
    }
  };

  /* =======================================================================================
     Derived & Render
     ======================================================================================= */

  const hasUnsaved = useMemo(
    () =>
      performanceTimer.timeSync(
        "ExerciseSetup - check unsaved",
        () => {
          const current = JSON.stringify(snapshotExercises(exercises));
          const saved = JSON.stringify(savedSnapshotRef.current);
          return current !== saved;
        },
      ),
    [exercises]
  );
  const visible = exercises;
  const completedCount = useMemo(
    () => exercises.filter((ex) => ex.completed).length,
    [exercises]
  );
  const hasIncompleteSets = useMemo(
    () => exercises.some((ex) => ex.sets.some((s) => !s.done)),
    [exercises]
  );

  const handleBack = () => {
    const timer = performanceTimer.start("ExerciseSetup - handleBack");
    if (screenMode === "plan" && hasUnsaved) {
      const proceed = window.confirm(
        "You have unsaved changes. Leave without saving?"
      );
      if (!proceed) {
        timer.endWithLog();
        return;
      }
    }
    onBack();
    timer.endWithLog();
  };

  const renderHeader = () => (
    <ScreenHeader
      title={routineName || "Routine"}
      subtitle={inWorkout ? formatHHMMSS(elapsedSeconds) : undefined}
      subtitleClassName="text-base font-bold text-black"
      onBack={inWorkout ? undefined : handleBack}
      {...(access === RoutineAccess.Editable && !inWorkout
        ? {
            onAdd: () => {
              if (isEditingExistingRoutine && onShowExerciseSelector) onShowExerciseSelector();
              else onAddMoreExercises();
            },
          }
        : {})}
      showBorder={false}
      denseSmall
      titleClassName="text-[17px] font-bold"
    />
  );

  const renderBottomBar = () => {
    if (screenMode === "plan") {
      if (hasUnsaved) {
        return (
          <BottomNavigation>
            <BottomNavigationButton
              onClick={onSaveAll}
              disabled={savingAll || access === RoutineAccess.ReadOnly}
            >
              {savingAll ? "SAVING..." : `SAVE ALL`}
            </BottomNavigationButton>
          </BottomNavigation>
        );
      }
      if (visible.length === 0) {
        return null;
      }
      return (
        <BottomNavigation>
          <BottomNavigationButton onClick={startWorkout}>
            START WORKOUT
          </BottomNavigationButton>
        </BottomNavigation>
      );
    }
    return (
      <BottomNavigation>
        <BottomNavigationButton
          onClick={() => setShowEndSheet(true)}
          disabled={savingWorkout}
        >
          {savingWorkout ? "SAVING..." : "END WORKOUT"}
        </BottomNavigationButton>
      </BottomNavigation>
    );
  };

  const renderExerciseCard = (ex: UIExercise) => {
    const isLoading = !!loadingSets[String(ex.id)];
    const initials = ex.name.substring(0, 2).toUpperCase();

    const items = ex.loaded
      ? ex.sets
          .slice()
          .sort((a, b) => a.set_order - b.set_order)
          .map((s) => ({
            key: s.id, // child will pass this back; our resolver also handles order numbers
            order: s.set_order,
            reps: s.reps,
            weight: s.weight,
            removable: ex.sets.length > 1,
            done: s.done,
          }))
      : [];

    // Subtitle: "<muscle_group> • <N Sets>" (when loaded) or just muscle group while loading.
    const subtitle = (() => {
      const mg = normalizeField(ex.muscle_group);
      if (ex.loaded) {
        const count = items.length;
        const setsLabel = count === 1 ? "1 Set" : `${count} Sets`;
        return mg ? `${mg} • ${setsLabel}` : setsLabel;
      }
      return mg || "";
    })();

    return (
      <div key={ex.id} className="scroll-mt-24">
        <ExpandingCard
          variant="plain"
          size="md"
          expanded={ex.expanded}
          onToggle={() => toggleExpanded(ex.id)}
          title={ex.name}
          subtitle={subtitle}
          leading={
            <span className="text-sm md:text-base font-medium text-black">
              {initials}
            </span>
          }
          trailing={
            inWorkout ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void onToggleExerciseDone(ex.id, !ex.completed);
                }}
                className={`w-5 h-5 rounded-full border-2 bg-white flex items-center justify-center ${
                  ex.completed ? "border-success" : "border-success-light"
                }`}
              >
                <Check
                  size={12}
                  className={ex.completed ? "text-success" : "text-success-light"}
                />
              </button>
            ) : undefined
          }
          disableChevron={inWorkout}
          className={`w-full rounded-2xl border border-border card-modern shadow-xl hover:shadow-xl transition-all text-left ${
            ex.completed && !ex.expanded ? "bg-success-light" : "bg-card/80"
          }`}
          style={{ border: "2px solid var(--border)" }}
          bodyClassName="pt-2"
        >
          {isLoading || !ex.loaded ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin w-4 h-4 border-2 border-warm-coral border-t-transparent rounded-full" />
              <span className="ml-2 text-sm text-black">Loading sets...</span>
            </div>
          ) : (
            <ExerciseSetEditorCard
              name={ex.name}
              initials={initials}
              items={items}
              mode={inWorkout ? "workout" : "edit"}
              onChange={(key, field, value) =>
                onChangeSet(
                  ex.id,
                  key as unknown,
                  field as "reps" | "weight",
                  value
                )
              }
              onRemove={
                inWorkout ? undefined : (key) => onRemoveSet(ex.id, key as unknown)
              }
              onAdd={() => onAddSet(ex.id)}
              onDeleteExercise={
                inWorkout ? undefined : () => onDeleteExercise(ex.id)
              }
              onToggleDone={
                inWorkout ? (key, done) => onToggleDone(ex.id, key, done) : undefined
              }
              deleteDisabled={access === RoutineAccess.ReadOnly}
              disabled={access === RoutineAccess.ReadOnly}
              onFocusScroll={(e) => {
                const target = e.currentTarget;
                setTimeout(() => {
                  if (target && target.scrollIntoView) {
                    target.scrollIntoView({
                      block: "center",
                      behavior: "smooth",
                    });
                  }
                }, 60);
              }}
              className="mb-2"
            />
          )}
        </ExpandingCard>
      </div>
    );
  };

  const renderExerciseList = () => {
    if (loadingSaved) {
      return (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <ListItem
              key={i}
              leading={<div />}
              leadingClassName="w-10 h-10 md:w-12 md:h-12 bg-muted rounded-lg"
              primary={<div className="h-4 bg-muted rounded w-3/4" />}
              secondary={<div className="h-3 bg-muted rounded w-1/2" />}
              className="px-3 md:px-4 bg-card/50 rounded-xl animate-pulse"
            />
          ))}
        </div>
      );
    }
    if (visible.length === 0) {
      return (
        <div className="text-center py-4">
          <p className="text-black">Ready to add exercises to this routine</p>
        </div>
      );
    }
    return <div className="space-y-3">{visible.map((ex) => renderExerciseCard(ex))}</div>;
  };

  return (
    <>
      <AppScreen
        header={renderHeader()}
        maxContent="responsive"
        padContent={false}
        contentBottomPaddingClassName={hasUnsaved || inWorkout ? "pb-24" : ""}
        bottomBar={renderBottomBar()}
        showHeaderBorder={false}
        showBottomBarBorder={false}
        contentClassName=""
      >
        <Stack gap="fluid">
          <Spacer y="sm" />
          <Section variant="plain" padding="none">
            <div className="mt-2 mb-6">
              {inWorkout ? (
                completedCount > 0 && (
                  <h3 className="text-xs md:text-sm text-black uppercase tracking-wider mb-3">
                    {completedCount} COMPLETED
                  </h3>
                )
              ) : (
                <h3 className="text-xs md:text-sm text-black uppercase tracking-wider mb-3">
                  EXERCISES IN ROUTINE ({visible.length})
                </h3>
              )}
              {renderExerciseList()}
            </div>
          </Section>
        </Stack>
      </AppScreen>
      <ActionSheet
        open={showEndSheet}
        onClose={() => setShowEndSheet(false)}
        title="Finish Workout?"
        message={
          hasIncompleteSets
            ? "There are valid sets in this workout that have not been marked as complete."
            : undefined
        }
        actions={[
          {
            label: savingWorkout ? "Saving…" : "Finish Workout",
            onClick: async () => {
              setShowEndSheet(false);
              await endWorkout();
            },
            type: "button",
            disabled: savingWorkout,
          },
          {
            label: "Cancel Workout",
            onClick: async () => {
              setShowEndSheet(false);
              await cancelWorkout();
            },
            type: "button",
            variant: "destructive",
            disabled: savingWorkout,
          },
        ]}
      />
    </>
  );
}
