// components/screens/ExerciseSetupScreen.tsx
import React, { useEffect, useRef, useState } from "react";
import { TactileButton } from "../TactileButton";
import {
  supabaseAPI,
  Exercise,
  UserRoutineExercise,
  UserRoutineExerciseSet,
} from "../../utils/supabase/supabase-api";
import { useAuth } from "../AuthContext";
import { toast } from "sonner";
import { AppScreen, Section, ScreenHeader, FooterBar, Stack, Spacer } from "../layouts";
import { RoutineAccess } from "../../hooks/useAppNavigation";
import ExerciseSetEditorCard from "../sets/ExerciseSetEditorCard";
import ExpandingCard from "../ui/ExpandingCard";

/* -------- Local input-type for the configure card -------- */
interface InlineExerciseSet {
  id: string;
  reps: string;
  weight: string;
}

/* -------- Incoming props -------- */
interface ExerciseSetupScreenProps {
  exercise?: Exercise;
  routineId: number;
  routineName: string;
  selectedExerciseForSetup: Exercise | null;
  setSelectedExerciseForSetup: (exercise: Exercise | null) => void;
  onBack: () => void;
  onSave: () => void;
  onAddMoreExercises: () => void;
  isEditingExistingRoutine?: boolean;
  onShowExerciseSelector?: () => void;
  access?: RoutineAccess;
  bottomBar?: React.ReactNode;
}

/* -------- Persisted row shape we already use -------- */
interface SavedExerciseWithDetails extends UserRoutineExercise {
  exercise_name?: string;
  category?: string;
  exercise_id: number;
  muscle_group?: string;
}

/* =========================================================================
   EDITOR STATE (normalized)
   ========================================================================= */
type SetKey = number | string; // db id or temp id ("temp-123")
type EditorSet = {
  key: SetKey;
  set_order: number;
  reps: string;    // keep as string for inputs
  weight: string;  // keep as string for inputs
  isNew?: boolean;
  isDeleted?: boolean;
  isDirty?: boolean;
};

type EditorExercise = {
  templateId: number;   // routine_template_exercise_id
  exerciseId: number;   // exercises.exercise_id
  name: string;
  muscle_group?: string;
  order: number;
  loaded: boolean;      // sets loaded into editor
  setIds: SetKey[];
  setsById: Record<SetKey, EditorSet>;
  isDirty?: boolean;    // any set changed
  isDeleted?: boolean;  // whole exercise deleted
};

type EditorState = Record<number, EditorExercise>; // keyed by templateId

export function ExerciseSetupScreen({
  exercise,
  routineId,
  routineName,
  selectedExerciseForSetup,
  setSelectedExerciseForSetup,
  onBack,
  onSave,
  onAddMoreExercises,
  isEditingExistingRoutine = false,
  onShowExerciseSelector,
  access = RoutineAccess.Editable,
}: ExerciseSetupScreenProps) {
  /* ---------------------------------------------------------
     Local state (configure card for a brand-new exercise)
     --------------------------------------------------------- */
  const [sets, setSets] = useState<InlineExerciseSet[]>([{ id: "1", reps: "0", weight: "0" }]);
  const [isSaving, setIsSaving] = useState(false);

  /* ---------------------------------------------------------
     Loaded routine + hybrid prefetch
     --------------------------------------------------------- */
  const [savedExercises, setSavedExercises] = useState<SavedExerciseWithDetails[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);

  /* ---------------------------------------------------------
     Editor structure replaces editingSets/exerciseSetsData
     --------------------------------------------------------- */
  const [editor, setEditor] = useState<EditorState>({});

  /* small loading map (per-exercise when fetching sets) */
  const [loadingSets, setLoadingSets] = useState<Record<number, boolean>>({});

  /* global unsaved state and saving flag */
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savingAllChanges, setSavingAllChanges] = useState(false);

  /* Which exercise card is expanded */
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);

  /* Scroll helpers */
  const configCardRef = useRef<HTMLDivElement | null>(null);
  const expandedRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const { userToken } = useAuth();

  /* -------- HYBRID prefetch knobs -------- */
  const PREFETCH_SETS_COUNT = 3;
  const PREFETCH_CONCURRENCY = 3;

  /* =========================================================================
     Smart scrolling (kept; does not auto-scroll set rows)
     ========================================================================= */
  const onFocusScroll: React.FocusEventHandler<HTMLInputElement> = (e) => {
    setTimeout(() => e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" }), 60);
  };

  const [currentExercise, setCurrentExercise] = useState<Exercise | undefined>(exercise);

  useEffect(() => {
    if (!exercise) return;
    setCurrentExercise(exercise);
  }, [exercise]);

  useEffect(() => {
    if (selectedExerciseForSetup) {
      setCurrentExercise(selectedExerciseForSetup);
      setSelectedExerciseForSetup(null);
    }
  }, [selectedExerciseForSetup, setSelectedExerciseForSetup]);

  /* =========================================================================
     Load routine exercises
     ========================================================================= */
  const seedEditorSkeleton = (rows: SavedExerciseWithDetails[]) => {
    setEditor((prev) => {
      const next: EditorState = {};
      rows.forEach((e, idx) => {
        const existing = prev[e.routine_template_exercise_id];
        next[e.routine_template_exercise_id] = existing
          ? {
              ...existing,
              // keep loaded/sets if already there
              name: e.exercise_name || existing.name,
              muscle_group: e.muscle_group ?? existing.muscle_group,
              order: e.exercise_order ?? existing.order ?? idx + 1,
              isDeleted: false, // visible after refresh
            }
          : {
              templateId: e.routine_template_exercise_id,
              exerciseId: e.exercise_id,
              name: e.exercise_name || "",
              muscle_group: e.muscle_group || undefined,
              order: e.exercise_order ?? idx + 1,
              loaded: false,
              setIds: [],
              setsById: {},
              isDeleted: false,
            };
      });
      return next;
    });
  };

  const loadSavedExercises = async () => {
    if (!userToken) return [];
    setIsLoadingSaved(true);
    try {
      const saved = (await supabaseAPI.getUserRoutineExercisesWithDetails(
        routineId
      )) as SavedExerciseWithDetails[];
      setSavedExercises(saved);
      seedEditorSkeleton(saved);
      return saved;
    } catch (error) {
      console.error("Failed to load saved exercises:", error);
      toast.error("Failed to load saved exercises");
      return [];
    } finally {
      setIsLoadingSaved(false);
    }
  };

  useEffect(() => {
    loadSavedExercises();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routineId, userToken]);

  /* =========================================================================
     HYBRID: prefetch first N exercises' sets; keep lazy on expand
     ========================================================================= */
  useEffect(() => {
    if (!savedExercises.length) return;
    let cancelled = false;

    const alreadyLoaded = new Set<number>(
      Object.values(editor)
        .filter((ex) => ex.loaded)
        .map((ex) => ex.templateId)
    );

    const idsToPrefetch = savedExercises
      .slice(0, PREFETCH_SETS_COUNT)
      .map((e) => e.routine_template_exercise_id)
      .filter((id) => !alreadyLoaded.has(id));

    if (!idsToPrefetch.length) return;

    const fetchOne = async (id: number) => {
      try {
        setLoadingSets((p) => ({ ...p, [id]: true }));
        const data = await supabaseAPI.getExerciseSetsForRoutine(id);
        if (!cancelled) {
          injectSetsIntoEditor(id, data);
        }
      } catch (err) {
        console.warn("Prefetch sets failed for", id, err);
      } finally {
        if (!cancelled) {
          setLoadingSets((p) => {
            const n = { ...p };
            delete n[id];
            return n;
          });
        }
      }
    };

    (async () => {
      for (let i = 0; i < idsToPrefetch.length; i += PREFETCH_CONCURRENCY) {
        const batch = idsToPrefetch.slice(i, i + PREFETCH_CONCURRENCY);
        await Promise.all(batch.map((id) => fetchOne(id)));
        if (cancelled) break;
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedExercises]); // don't depend on editor to avoid loops

  /* =========================================================================
     Editor helpers
     ========================================================================= */
  const injectSetsIntoEditor = (templateId: number, rows: UserRoutineExerciseSet[]) => {
    setEditor((prev) => {
      const ex = prev[templateId];
      if (!ex) return prev;
      const next: EditorState = { ...prev };
      const newEx: EditorExercise = {
        ...ex,
        loaded: true,
        isDeleted: false, // make sure it becomes visible if it was marked deleted locally
        setIds: [],
        setsById: {},
      };

      const sorted = [...rows].sort((a, b) => (a.set_order || 0) - (b.set_order || 0));
      sorted.forEach((s) => {
        const key = s.routine_template_exercise_set_id;
        newEx.setIds.push(key);
        newEx.setsById[key] = {
          key,
          set_order: s.set_order ?? 0,
          reps: String(s.planned_reps ?? "0"),
          weight: String(s.planned_weight_kg ?? "0"),
        };
      });
      next[templateId] = newEx;
      return next;
    });
  };

  const ensureExerciseLoaded = async (ex: SavedExerciseWithDetails) => {
    const id = ex.routine_template_exercise_id;
    const node = editor[id];
    if (!node || node.loaded) return;

    setLoadingSets((p) => ({ ...p, [id]: true }));
    try {
      const rows = await supabaseAPI.getExerciseSetsForRoutine(id);
      injectSetsIntoEditor(id, rows);
    } catch (err) {
      console.error("Failed to fetch sets:", err);
      toast.error("Failed to load sets");
    } finally {
      setLoadingSets((p) => {
        const n = { ...p };
        delete n[id];
        return n;
      });
    }
  };

  const updateEditorSet = (templateId: number, setKey: SetKey, field: "reps" | "weight", value: string) => {
    setEditor((prev) => {
      const ex = prev[templateId];
      if (!ex) return prev;
      const s = ex.setsById[setKey];
      if (!s) return prev;

      const next: EditorState = { ...prev };
      const exCopy: EditorExercise = { ...ex, setsById: { ...ex.setsById }, setIds: [...ex.setIds] };
      const setCopy: EditorSet = { ...s, [field]: value, isDirty: true };
      exCopy.setsById[setKey] = setCopy;
      exCopy.isDirty = true;
      next[templateId] = exCopy;
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const addSetToExercise = (templateId: number) => {
    setEditor((prev) => {
      const ex = prev[templateId];
      if (!ex) return prev;

      const next: EditorState = { ...prev };
      const exCopy: EditorExercise = { ...ex, setsById: { ...ex.setsById }, setIds: [...ex.setIds] };

      // Only consider numeric keys (existing sets) for order calculation, filter out temp keys
      const numericKeys = exCopy.setIds.filter(k => typeof k === 'number');
      const maxOrder = numericKeys.reduce((m, k) => Math.max(m, exCopy.setsById[k].set_order), 0);
      const set_order = maxOrder + 1;
      const tempKey = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      exCopy.setIds.push(tempKey);
      exCopy.setsById[tempKey] = {
        key: tempKey,
        set_order,
        reps: "0",
        weight: "0",
        isNew: true,
        isDirty: true,
      };
      exCopy.isDirty = true;

      next[templateId] = exCopy;
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const reindexOrders = (ex: EditorExercise): EditorExercise => {
    const exCopy: EditorExercise = { ...ex, setsById: { ...ex.setsById }, setIds: [...ex.setIds] };
    let order = 1;
    exCopy.setIds.forEach((k) => {
      const s = exCopy.setsById[k];
      if (s.isDeleted) return;
      const newOrder = order++;
      exCopy.setsById[k] = {
        ...s,
        set_order: newOrder,
        isDirty: s.isDirty || s.set_order !== newOrder,
      };
    });
    return exCopy;
  };

  const removeSetFromExercise = (templateId: number, setKey: SetKey) => {
    setEditor((prev) => {
      const ex = prev[templateId];
      if (!ex) return prev;
      const s = ex.setsById[setKey];
      if (!s) return prev;

      const next: EditorState = { ...prev };
      let exCopy: EditorExercise = { ...ex, setsById: { ...ex.setsById }, setIds: [...ex.setIds] };

      if (String(setKey).startsWith("temp-") || s.isNew) {
        // Just drop it entirely
        exCopy.setIds = exCopy.setIds.filter((k) => k !== setKey);
        delete exCopy.setsById[setKey];
      } else {
        // Mark deleted, keep id for save plan
        exCopy.setsById[setKey] = { ...s, isDeleted: true, isDirty: true };
      }

      // Compact order on the remaining
      exCopy = reindexOrders(exCopy);
      exCopy.isDirty = true;

      next[templateId] = exCopy;
      return next;
    });
    setHasUnsavedChanges(true);
  };

  /* Delete WHOLE exercise (local mark, saved on Save All) */
  const markExerciseDeleted = (templateId: number) => {
    setEditor((prev) => {
      const ex = prev[templateId];
      if (!ex) return prev;
      const next: EditorState = { ...prev };
      next[templateId] = { ...ex, isDeleted: true, isDirty: true };
      return next;
    });
    setHasUnsavedChanges(true);
    if (expandedExercise === templateId) setExpandedExercise(null);
  };

  /* =========================================================================
     Expand handler (loads sets on demand)
     ========================================================================= */
  const handleToggleExercise = async (ex: SavedExerciseWithDetails) => {
    const id = ex.routine_template_exercise_id;
    if (expandedExercise === id) {
      setExpandedExercise(null);
      return;
    }
    setExpandedExercise(id);
    await ensureExerciseLoaded(ex);
  };

  /* =========================================================================
     Configure card helpers (new exercise inline)
     ========================================================================= */
  const addSet = () => {
    const newId = (sets.length + 1).toString();
    setSets((prev) => [...prev, { id: newId, reps: "0", weight: "0" }]);
  };
  const removeSet = (setId: string) => {
    if (sets.length > 1) setSets((prev) => prev.filter((s) => s.id !== setId));
  };
  const updateSet = (setId: string, field: "reps" | "weight", value: string) => {
    setSets((prev) => prev.map((s) => (s.id === setId ? { ...s, [field]: value } : s)));
  };
  const resetForm = () => setSets([{ id: "1", reps: "0", weight: "0" }]);

  const refreshSavedExercises = async () => {
    try {
      const saved = (await supabaseAPI.getUserRoutineExercisesWithDetails(
        routineId
      )) as SavedExerciseWithDetails[];
      setSavedExercises(saved);
      seedEditorSkeleton(saved);
      return saved;
    } catch (error) {
      console.error("Failed to refresh saved exercises:", error);
      return [];
    }
  };

  function validateSetsPayload(rows: Array<{ reps: number; weight: number; set_order: number }>) {
    const errors: string[] = [];
    rows.forEach((r, i) => {
      if (!Number.isInteger(r.reps) || r.reps < 0) errors.push(`row ${i}: reps must be int ≥ 0`);
      if (!(Number.isFinite(r.weight) && r.weight >= 0)) errors.push(`row ${i}: weight must be number ≥ 0`);
      if (!Number.isInteger(r.set_order) || r.set_order <= 0) errors.push(`row ${i}: order must be int ≥ 1`);
    });
    const expected = rows.map((_, i) => i + 1).join(",");
    const actual = rows.map((r) => r.set_order).join(",");
    if (expected !== actual) errors.push(`set_order mismatch expected [${expected}] got [${actual}]`);
    return errors;
  }

  const handleSaveNewExercise = async () => {
    if (!currentExercise) {
      toast.error("No exercise selected");
      return;
    }
    if (!userToken) {
      toast.error("Please sign in to save exercise");
      return;
    }
    const hasValidSet = sets.some((s) => parseInt(s.reps) > 0 || parseFloat(s.weight) > 0);
    if (!hasValidSet) {
      toast.error("Please add at least one set with reps or weight");
      return;
    }

    setIsSaving(true);
    try {
      const exerciseOrder = savedExercises.length + 1;
      const validSets = sets.filter((s) => parseInt(s.reps) > 0 || parseFloat(s.weight) > 0);

      const savedExercise = await supabaseAPI.addExerciseToRoutine(
        routineId,
        currentExercise.exercise_id,
        exerciseOrder
      );
      if (!savedExercise) throw new Error("Failed to save exercise to routine");

      const setsToSave = validSets.map((s, idx) => ({
        reps: parseInt(s.reps) || 0,
        weight: parseFloat(s.weight) || 0,
        set_order: idx + 1,
      }));
      const valErrors = validateSetsPayload(setsToSave);
      if (valErrors.length) console.warn("SETS VALIDATION", valErrors);

      await supabaseAPI.addExerciseSetsToRoutine(
        savedExercise.routine_template_exercise_id,
        currentExercise.exercise_id,
        setsToSave
      );

      await supabaseAPI.recomputeAndSaveRoutineMuscleSummary(routineId);

      toast.success(`Added ${currentExercise.name} with ${validSets.length} sets`);
      const saved = await refreshSavedExercises();

      // load sets into editor for the new one so it becomes editable right away
      const rows = await supabaseAPI.getExerciseSetsForRoutine(savedExercise.routine_template_exercise_id);
      injectSetsIntoEditor(savedExercise.routine_template_exercise_id, rows);

      setCurrentExercise(undefined);
      resetForm();
      onSave();

      // Optionally expand the newly created one (commented to avoid forced scroll)
      // setExpandedExercise(savedExercise.routine_template_exercise_id);
    } catch (error) {
      console.error("Save new exercise failed", error);
      toast.error(error instanceof Error ? error.message : "Failed to save exercise");
    } finally {
      setIsSaving(false);
    }
  };

  /* =========================================================================
     SAVE PLAN (multiple exercises at once) — now includes exercise deletes
     ========================================================================= */
  type SavePlan = {
    setsToCreateByExercise: Record<number, { reps: number; weight: number; set_order: number }[]>;
    setsToUpdate: { id: number; reps?: number; weight?: number }[];
    setOrderUpdates: { id: number; set_order: number }[];
    setsToDelete: number[];
    exercisesToDelete: number[];
  };

  const buildSavePlan = (state: EditorState): SavePlan => {
    const plan: SavePlan = {
      setsToCreateByExercise: {},
      setsToUpdate: [],
      setOrderUpdates: [],
      setsToDelete: [],
      exercisesToDelete: [],
    };

    Object.values(state).forEach((ex) => {
      if (!ex.isDirty) return;

      if (ex.isDeleted) {
        // Delete whole exercise: queue all existing sets for deletion + the exercise itself
        ex.setIds.forEach((k) => {
          if (!String(k).startsWith("temp-")) plan.setsToDelete.push(Number(k));
        });
        plan.exercisesToDelete.push(ex.templateId);
        return; // skip any creates/updates/orders for this exercise
      }

      // Otherwise, compute order & changes across existing + temp sets
      ex.setIds.forEach((k) => {
        const s = ex.setsById[k];
        if (s.isDeleted) {
          if (!String(k).startsWith("temp-")) plan.setsToDelete.push(Number(k));
          return;
        }

        const reps = parseInt(s.reps || "0") || 0;
        const wt = parseFloat(s.weight || "0") || 0;

        if (String(k).startsWith("temp-") || s.isNew) {
          if (reps <= 0 && wt <= 0) return; // skip empty temp
          if (!plan.setsToCreateByExercise[ex.templateId]) {
            plan.setsToCreateByExercise[ex.templateId] = [];
          }
          plan.setsToCreateByExercise[ex.templateId].push({
            reps,
            weight: wt,
            set_order: s.set_order,
          });
        } else {
          // existing set
          const id = Number(k);
          if (s.isDirty) {
            plan.setsToUpdate.push({ id, reps, weight: wt });
          }
          // keep final order (deduped below)
          plan.setOrderUpdates.push({ id, set_order: s.set_order });
        }
      });
    });

    // dedupe order updates by last-write-wins
    const lastOrder: Record<number, number> = {};
    plan.setOrderUpdates.forEach(({ id, set_order }) => (lastOrder[id] = set_order));
    plan.setOrderUpdates = Object.entries(lastOrder).map(([id, set_order]) => ({
      id: Number(id),
      set_order: Number(set_order),
    }));

    // remove updates for sets that are deleted
    if (plan.setsToDelete.length) {
      const deleted = new Set(plan.setsToDelete);
      plan.setsToUpdate = plan.setsToUpdate.filter((u) => !deleted.has(u.id));
      plan.setOrderUpdates = plan.setOrderUpdates.filter((o) => !deleted.has(o.id));
    }

    return plan;
  };

  const getExerciseIdForTemplate = (templateId: number) => {
    const row = savedExercises.find((e) => e.routine_template_exercise_id === templateId);
    return row?.exercise_id ?? null;
  };

  const applySavePlan = async (plan: SavePlan) => {
    // 0) Whole exercise deletions (soft delete the row itself)
    if (plan.exercisesToDelete.length) {
      await Promise.all(plan.exercisesToDelete.map((id) => supabaseAPI.deleteRoutineExercise(id)));
      // Optional: if your DB has ON DELETE CASCADE on sets, you can skip adding their sets to setsToDelete.
      // We already queued existing sets above for safety; harmless if redundant.
    }

    // 1) Deletions (sets)
    if (plan.setsToDelete.length) {
      await Promise.all(plan.setsToDelete.map((id) => supabaseAPI.deleteExerciseSet(id)));
    }

    // 2) Updates (values)
    if (plan.setsToUpdate.length) {
      await Promise.all(
        plan.setsToUpdate.map(({ id, reps, weight }) =>
          supabaseAPI.updateExerciseSet(id, reps ?? 0, weight ?? 0)
        )
      );
    }

    // 3) Orders (idempotent)
    if (plan.setOrderUpdates.length) {
      await Promise.all(
        plan.setOrderUpdates.map(({ id, set_order }) =>
          supabaseAPI.updateExerciseSetOrder(id, set_order)
        )
      );
    }

    // 4) Creates (grouped by exercise)
    const createEntries = Object.entries(plan.setsToCreateByExercise);
    for (const [templateIdStr, rows] of createEntries) {
      const templateId = Number(templateIdStr);
      const exId = getExerciseIdForTemplate(templateId);
      if (!exId) continue;
      if (!rows.length) continue;

      const payload = rows
        .map((r) => ({
          reps: Number.isFinite(r.reps) ? r.reps : 0,
          weight: Number.isFinite(r.weight) ? r.weight : 0,
          set_order: r.set_order,
        }))
        .filter((r) => r.reps > 0 || r.weight > 0);

      if (payload.length) {
        await supabaseAPI.addExerciseSetsToRoutine(templateId, exId, payload);
      }
    }
  };

  const handleSaveAllChanges = async () => {
    if (!userToken) {
      toast.error("Please sign in to save changes");
      return;
    }
    const plan = buildSavePlan(editor);

    // nothing to save?
    if (
      !Object.keys(plan.setsToCreateByExercise).length &&
      !plan.setsToUpdate.length &&
      !plan.setOrderUpdates.length &&
      !plan.setsToDelete.length &&
      !plan.exercisesToDelete.length
    ) {
      toast.message("No changes to save");
      return;
    }

    setSavingAllChanges(true);
    try {
      await applySavePlan(plan);

      // Refresh everything and reseed editor skeleton
      const saved = await refreshSavedExercises();

      // Clean up editor state: remove exercises that were soft-deleted from database
      setEditor((prev) => {
        const next: EditorState = { ...prev };
        // Remove exercises that were deleted from the database
        plan.exercisesToDelete.forEach((deletedId) => {
          delete next[deletedId];
        });
        // Clear dirty flags for remaining exercises
        Object.values(next).forEach((ex) => {
          ex.isDirty = false;
          ex.isDeleted = false;
        });
        return next;
      });

      // Reload sets for any still-present exercises that were dirty (skips those we deleted)
      const remainingDirtyIds = Object.values(editor)
        .filter((ex) => ex.isDirty && !plan.exercisesToDelete.includes(ex.templateId))
        .map((ex) => ex.templateId);

      await Promise.all(
        remainingDirtyIds.map(async (templateId) => {
          const rows = await supabaseAPI.getExerciseSetsForRoutine(templateId);
          injectSetsIntoEditor(templateId, rows);
        })
      );

      await supabaseAPI.recomputeAndSaveRoutineMuscleSummary(routineId);

      setHasUnsavedChanges(false);
      toast.success("All changes saved successfully!");
    } catch (error) {
      console.error("Failed to save changes:", error);
      toast.error("Failed to save changes");
    } finally {
      setSavingAllChanges(false);
    }
  };

  const handleCancelAllEdits = () => {
    // reload editor for all loaded exercises to drop local changes
    const ids = Object.values(editor)
      .filter((ex) => ex.loaded)
      .map((ex) => ex.templateId);

    Promise.all(ids.map((id) => supabaseAPI.getExerciseSetsForRoutine(id)))
      .then((results) => {
        results.forEach((rows, idx) => injectSetsIntoEditor(ids[idx], rows));
        setEditor((prev) => {
          const next: EditorState = { ...prev };
          Object.values(next).forEach((ex) => {
            ex.isDirty = false;
            ex.isDeleted = false;
          });
          return next;
        });
        setHasUnsavedChanges(false);
      })
      .catch(() => {
        // Fallback: just clear flags without refetch
        setEditor((prev) => {
          const next: EditorState = { ...prev };
          Object.values(next).forEach((ex) => {
            if (!ex.loaded) return;
            ex.isDirty = false;
            ex.isDeleted = false;
            ex.setIds = ex.setIds.filter((k) => !ex.setsById[k].isDeleted);
            Object.keys(ex.setsById).forEach((k) => {
              const s = ex.setsById[k];
              if (s.isDeleted) delete ex.setsById[k];
              else ex.setsById[k] = { ...s, isDirty: false, isNew: false };
            });
          });
          return next;
        });
        setHasUnsavedChanges(false);
      });
  };

  /* =========================================================================
     Precomputed view slices
     ========================================================================= */
  const visibleExercises = savedExercises.filter(
    (e) => !editor[e.routine_template_exercise_id]?.isDeleted
  );
  const dirtyExerciseCount = Object.values(editor).filter((ex) => ex.isDirty).length;

  /* =========================================================================
     Render helpers (refactor to reduce inline conditionals)
     ========================================================================= */
  const renderHeader = () => (
    <ScreenHeader
      title={routineName || "Routine"}
      onBack={onBack}
      {...(access === RoutineAccess.Editable
        ? {
            onAdd: () => {
              if (isEditingExistingRoutine && onShowExerciseSelector) onShowExerciseSelector();
              else onAddMoreExercises();
            },
          }
        : {})}
      showBorder={false}
      denseSmall
      contentHeightPx={74}
      titleClassName="text-[17px] font-bold"
    />
  );

  const renderBottomBar = () =>
    hasUnsavedChanges ? (
      <FooterBar
        size="md"
        bg="translucent"
        align="between"
        maxContent="responsive"
        innerClassName="w-full gap-3"
      >
        <div className="flex w-full gap-3">
          <TactileButton
            variant="secondary"
            onClick={handleCancelAllEdits}
            disabled={access === RoutineAccess.ReadOnly}
            className={`flex-1 h-11 md:h-12 ${
              access === RoutineAccess.ReadOnly
                ? "opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200"
                : "bg-transparent border-[var(--warm-brown)]/20 text-[var(--warm-brown)]/60 hover:bg-[var(--soft-gray)]"
            } font-medium`}
          >
            CANCEL ALL
          </TactileButton>
          <TactileButton
            onClick={handleSaveAllChanges}
            disabled={savingAllChanges || access === RoutineAccess.ReadOnly}
            className={`flex-1 h-11 md:h-12 font-medium border-0 transition-all ${
              access === RoutineAccess.ReadOnly
                ? "opacity-50 cursor-not-allowed bg-gray-400"
                : "bg-[var(--warm-coral)] hover:bg-[var(--warm-coral)]/90 text-white btn-tactile"
            }`}
          >
            {savingAllChanges ? "SAVING..." : `SAVE ALL (${dirtyExerciseCount})`}
          </TactileButton>
        </div>
      </FooterBar>
    ) : null;

  const renderLoadingSkeleton = () => (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-white/50 rounded-xl animate-pulse">
          <div className="w-9 h-9 md:w-10 md:h-10 bg-[var(--muted)] rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-[var(--muted)] rounded w-3/4" />
            <div className="h-3 bg-[var(--muted)] rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );

  const buildItemsForExercise = (templateId: number) => {
    const exNode = editor[templateId];
    if (!exNode?.loaded) return [];
    return exNode.setIds
      .filter((k) => !exNode.setsById[k].isDeleted)
      .sort((a, b) => exNode.setsById[a].set_order - exNode.setsById[b].set_order)
      .map((k) => {
        const s = exNode.setsById[k];
        return {
          key: k,
          order: s.set_order,
          reps: s.reps,
          weight: s.weight,
          removable: exNode.setIds.filter((id) => !exNode.setsById[id].isDeleted).length > 1,
        };
      });
  };

  const renderExerciseCard = (savedExercise: SavedExerciseWithDetails) => {
    const templateId = savedExercise.routine_template_exercise_id;
    const isExpanded = expandedExercise === templateId;
    const exNode = editor[templateId];
    const isLoadingSetsData = loadingSets[templateId] || false;
    const items = buildItemsForExercise(templateId);

    return (
      <div
        key={templateId}
        ref={(el) => {
          expandedRefs.current[templateId] = el;
        }}
        className="scroll-mt-24"
      >
        <ExpandingCard
          variant="solid"
          size="md"
          expanded={isExpanded}
          onToggle={() => handleToggleExercise(savedExercise)}
          title={savedExercise.exercise_name || ""}
          subtitle={items.length > 0 ? `${items.length} ${items.length === 1 ? "Set" : "Sets"}` : ""}
          leading={
            <div className="w-10 h-10 md:w-12 md:h-12 bg-[var(--muted)] rounded-lg flex items-center justify-center overflow-hidden">
              <span className="text-sm md:text-base font-medium text-[var(--muted-foreground)]">
                {(savedExercise.exercise_name || "").substring(0, 2).toUpperCase()}
              </span>
            </div>
          }
          className="bg-white/80 border-[var(--border)]"
          bodyClassName="pt-2"
        >
          {isLoadingSetsData || !exNode?.loaded ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin w-4 h-4 border-2 border-[var(--warm-coral)] border-t-transparent rounded-full" />
              <span className="ml-2 text-sm text-[var(--warm-brown)]/60">Loading sets...</span>
            </div>
          ) : (
            <ExerciseSetEditorCard
              name={savedExercise.exercise_name || ""}
              initials={(savedExercise.exercise_name || "").substring(0, 2)}
              items={items}
              onChange={(key, field, value) =>
                updateEditorSet(templateId, key as SetKey, field as "reps" | "weight", value)
              }
              onRemove={(key) => removeSetFromExercise(templateId, key as SetKey)}
              onAdd={() => addSetToExercise(templateId)}
              // supply delete exercise action to the SetList via the editor card
              onDeleteExercise={() => markExerciseDeleted(templateId)}
              deleteDisabled={access === RoutineAccess.ReadOnly}
              disabled={access === RoutineAccess.ReadOnly}
              onFocusScroll={onFocusScroll}
              className="mb-2"
            />
          )}
        </ExpandingCard>
      </div>
    );
  };

  const renderExerciseList = () => {
    if (isLoadingSaved) return renderLoadingSkeleton();
    if (visibleExercises.length === 0) {
      return (
        <div className="text-center py-4">
          <p className="text-[var(--muted-foreground)]">Ready to add exercises to this routine</p>
        </div>
      );
    }
    return <div className="space-y-3">{visibleExercises.map(renderExerciseCard)}</div>;
  };

  const renderExerciseSection = () => (
    <Section variant="plain" padding="none">
      <div className="mt-2 mb-6">
        <h3 className="text-xs md:text-sm text-[var(--muted-foreground)] uppercase tracking-wider mb-3">
          EXERCISES IN ROUTINE ({visibleExercises.length})
        </h3>
        {renderExerciseList()}
      </div>
    </Section>
  );

  const renderConfigureCard = () =>
    currentExercise ? (
      <div ref={configCardRef} className="scroll-mt-24">
        <ExpandingCard
          variant="solid"
          size="md"
          expanded
          onToggle={() => {}}
          disabled
          disableChevron
          title={currentExercise.name}
          subtitle={`${sets.length} ${sets.length === 1 ? "Set" : "Sets"}`}
          leading={
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-[var(--muted)] text-[var(--muted-foreground)] flex items-center justify-center font-medium">
              {currentExercise.name.substring(0, 2)}
            </div>
          }
          className="mb-6 bg-white/80 border-[var(--border)]"
          bodyClassName="pt-2"
        >
          <ExerciseSetEditorCard
            name={currentExercise.name}
            initials={currentExercise.name.substring(0, 2)}
            items={sets.map((s, i) => ({
              key: s.id,
              order: i + 1,
              reps: s.reps,
              weight: s.weight,
              removable: sets.length > 1,
            }))}
            onChange={(key, field, value) => updateSet(String(key), field as "reps" | "weight", value)}
            onRemove={(key) => removeSet(String(key))}
            onAdd={() =>
              setSets((prev) => [...prev, { id: (prev.length + 1).toString(), reps: "0", weight: "0" }])
            }
            onCancel={() => {
              setCurrentExercise(undefined);
              resetForm();
            }}
            onPrimary={handleSaveNewExercise}
            primaryLabel="SAVE EXERCISE"
            primaryDisabled={isSaving || access === RoutineAccess.ReadOnly}
            disabled={access === RoutineAccess.ReadOnly}
            onFocusScroll={onFocusScroll}
          />
        </ExpandingCard>
      </div>
    ) : null;

  /* =========================================================================
     Render (composed with helpers)
     ========================================================================= */
  return (
    <AppScreen
      header={renderHeader()}
      maxContent="responsive"
      padContent={false}
      contentBottomPaddingClassName={hasUnsavedChanges ? "pb-24" : ""}
      bottomBar={renderBottomBar()}
      showHeaderBorder={false}
      showBottomBarBorder={false}
      contentClassName=""
    >
      <Stack gap="fluid">
        <Spacer y="sm" />
        {renderExerciseSection()}
        {renderConfigureCard()}
      </Stack>
    </AppScreen>
  );
}
