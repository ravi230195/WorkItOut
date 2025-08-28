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

interface ExerciseSet {
  id: string;
  reps: string;
  weight: string;
}

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

interface SavedExerciseWithDetails extends UserRoutineExercise {
  exercise_name?: string;
  category?: string;
  exercise_id: number;
  muscle_group?: string;
}

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
  const [sets, setSets] = useState<ExerciseSet[]>([{ id: "1", reps: "0", weight: "0" }]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedExercises, setSavedExercises] = useState<SavedExerciseWithDetails[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [currentExercise, setCurrentExercise] = useState<Exercise | undefined>(exercise);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);
  const [exerciseSetsData, setExerciseSetsData] = useState<Record<number, UserRoutineExerciseSet[]>>({});
  const [loadingSets, setLoadingSets] = useState<Record<number, boolean>>({});
  const [editingExercises, setEditingExercises] = useState(new Set<number>());
  const [editingSets, setEditingSets] = useState<Record<number, { reps: string; weight: string }>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savingAllChanges, setSavingAllChanges] = useState(false);
  const [deletedSetIds, setDeletedSetIds] = useState<Set<number>>(new Set());

  const { userToken } = useAuth();

  // --- Hybrid prefetch config ---
  const PREFETCH_SETS_COUNT = 3;       // how many exercises to prefetch
  const PREFETCH_CONCURRENCY = 3;      // how many requests in parallel

  // --- Scroll helpers ---
  const configCardRef = useRef<HTMLDivElement | null>(null);
  const expandedRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Keep inputs visible when keyboard opens
  const onFocusScroll: React.FocusEventHandler<HTMLInputElement> = (e) => {
    setTimeout(() => {
      e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 60);
  };

  // Scroll to configure card + focus first input when currentExercise appears
  useEffect(() => {
    if (!currentExercise) return;
    const id = window.setTimeout(() => {
      configCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      const first = configCardRef.current?.querySelector("input");
      if (first instanceof HTMLInputElement) first.focus({ preventScroll: true });
    }, 80);
    return () => clearTimeout(id);
  }, [currentExercise]);

  // Smooth scroll when expanding an existing card
  useEffect(() => {
    if (expandedExercise == null) return;
    const el = expandedRefs.current[expandedExercise];
    if (!el) return;
    const id = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
    return () => clearTimeout(id);
  }, [expandedExercise]);

  // Wire currentExercise from prop
  useEffect(() => {
    setCurrentExercise(exercise);
  }, [exercise]);

  // When coming back from AddExercises screen
  useEffect(() => {
    if (selectedExerciseForSetup) {
      setCurrentExercise(selectedExerciseForSetup);
      setSelectedExerciseForSetup(null);
    }
  }, [selectedExerciseForSetup, setSelectedExerciseForSetup]);

  // Load saved exercises
  useEffect(() => {
    const loadSavedExercises = async () => {
      if (!userToken) return;
      setIsLoadingSaved(true);
      try {
        const saved = await supabaseAPI.getUserRoutineExercisesWithDetails(routineId);
        setSavedExercises(saved as SavedExerciseWithDetails[]);
      } catch (error) {
        console.error("Failed to load saved exercises:", error);
        toast.error("Failed to load saved exercises");
      } finally {
        setIsLoadingSaved(false);
      }
    };
    loadSavedExercises();
  }, [routineId, userToken]);

  // HYBRID: prefetch the first N exercises' sets, keep lazy load for others
  useEffect(() => {
    if (!savedExercises.length) return;

    let cancelled = false;

    // Avoid refetch for already cached exercises
    const alreadyLoaded = new Set<number>(
      Object.keys(exerciseSetsData).map((k) => Number(k))
    );

    const idsToPrefetch = savedExercises
      .slice(0, PREFETCH_SETS_COUNT)
      .map((e) => e.routine_template_exercise_id)
      .filter((id) => !alreadyLoaded.has(id));

    if (!idsToPrefetch.length) return;

    const fetchOne = async (id: number) => {
      try {
        setLoadingSets((prev) => ({ ...prev, [id]: true }));
        const data = await supabaseAPI.getExerciseSetsForRoutine(id);
        if (!cancelled) {
          setExerciseSetsData((prev) => ({ ...prev, [id]: data }));
        }
      } catch (err) {
        console.warn("Prefetch sets failed for", id, err);
      } finally {
        if (!cancelled) {
          setLoadingSets((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
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
    // Intentionally *not* depending on exerciseSetsData to avoid loops
  }, [savedExercises]);

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
      const saved = await supabaseAPI.getUserRoutineExercisesWithDetails(routineId);
      setSavedExercises(saved as SavedExerciseWithDetails[]);
    } catch (error) {
      console.error("Failed to refresh saved exercises:", error);
    }
  };

  // chunk logger (kept)
  function logChunks(label: string, data: unknown, chunkSize = 4000) {
    let s: string;
    try {
      s = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    } catch {
      s = String(data);
    }
    for (let i = 0; i < s.length; i += chunkSize) {
      console.debug(`${label} [${i}-${mathMin(i + chunkSize, s.length)}/${s.length}]`, s.slice(i, i + chunkSize));
    }
  }
  const mathMin = (a: number, b: number) => Math.min(a, b);

  function validateSetsPayload(rows: Array<{ reps: number; weight: number; set_order: number }>) {
    const errors: string[] = [];
    rows.forEach((r, i) => {
      if (!Number.isInteger(r.reps) || r.reps < 0) errors.push(`row ${i}: reps must be int ≥ 0 (got ${r.reps})`);
      if (!(Number.isFinite(r.weight) && r.weight >= 0)) errors.push(`row ${i}: weight must be number ≥ 0 (got ${r.weight})`);
      if (!Number.isInteger(r.set_order) || r.set_order <= 0) errors.push(`row ${i}: set_order must be int ≥ 1 (got ${r.set_order})`);
    });
    const expectedSeq = rows.map((_, i) => i + 1).join(",");
    const actualSeq = rows.map((r) => r.set_order).join(",");
    if (expectedSeq !== actualSeq)
      errors.push(`set_order sequence mismatch. expected [${expectedSeq}] got [${actualSeq}]`);
    return errors;
  }

  const getExerciseIdForTemplate = (templateId: number) => {
    const row = savedExercises.find((e) => e.routine_template_exercise_id === templateId);
    return row?.exercise_id ?? null;
  };

  // Save newly configured exercise
  const handleSave = async () => {
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

      console.debug("🧪 [SAVE] context", {
        routineId,
        exerciseOrder,
        currentExercise: { id: currentExercise.exercise_id, name: currentExercise.name },
        savedExercisesLen: savedExercises.length,
      });
      logChunks("🧪 [SAVE] raw sets", sets);

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
      if (valErrors.length) console.warn("⚠️ [SETS VALIDATION ERRORS]", valErrors);

      await supabaseAPI.addExerciseSetsToRoutine(
        savedExercise.routine_template_exercise_id,
        currentExercise.exercise_id,
        setsToSave
      );

      await supabaseAPI.recomputeAndSaveRoutineMuscleSummary(routineId);

      toast.success(`Added ${currentExercise.name} with ${validSets.length} sets`);
      await refreshSavedExercises();

      setCurrentExercise(undefined);
      resetForm();
      onSave();
    } catch (error) {
      console.error("❌ [handleSave] Failed to save exercise", error);
      toast.error(error instanceof Error ? `Failed to save exercise: ${error.message}` : "Failed to save exercise. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const { userToken: _token } = useAuth(); // keep hook count stable

  // Expand/collapse, load sets, and prefill edit values
  const handleKebabClick = async (
    savedExercise: SavedExerciseWithDetails,
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();
    const exerciseTemplateId = savedExercise.routine_template_exercise_id;

    if (expandedExercise === exerciseTemplateId) {
      setExpandedExercise(null);
      return;
    }
    setExpandedExercise(exerciseTemplateId);

    // already cached
    if (exerciseSetsData[exerciseTemplateId]) {
      setEditingExercises((prev) => new Set([...prev, exerciseTemplateId]));
      const setsData = exerciseSetsData[exerciseTemplateId] || [];
      const newEditing: Record<number, { reps: string; weight: string }> = {};
      setsData.forEach((s) => {
        newEditing[s.routine_template_exercise_set_id] = {
          reps: s.planned_reps?.toString() || "0",
          weight: s.planned_weight_kg?.toString() || "0",
        };
      });
      setEditingSets((prev) => ({ ...prev, ...newEditing }));
      return;
    }

    setLoadingSets((prev) => ({ ...prev, [exerciseTemplateId]: true }));
    try {
      const setsData = await supabaseAPI.getExerciseSetsForRoutine(exerciseTemplateId);
      setExerciseSetsData((prev) => ({ ...prev, [exerciseTemplateId]: setsData }));

      setEditingExercises((prev) => new Set([...prev, exerciseTemplateId]));
      const newEditing: Record<number, { reps: string; weight: string }> = {};
      setsData.forEach((s) => {
        newEditing[s.routine_template_exercise_set_id] = {
          reps: s.planned_reps?.toString() || "0",
          weight: s.planned_weight_kg?.toString() || "0",
        };
      });
      setEditingSets((prev) => ({ ...prev, ...newEditing }));
    } catch (error) {
      console.error("Failed to fetch exercise sets:", error);
      toast.error("Failed to load exercise sets");
      setExpandedExercise(null);
    } finally {
      setLoadingSets((prev) => ({ ...prev, [exerciseTemplateId]: false }));
    }
  };

  const updateEditingSet = (setId: number, field: "reps" | "weight", value: string) => {
    setEditingSets((prev) => ({ ...prev, [setId]: { ...prev[setId], [field]: value } }));
    setHasUnsavedChanges(true);
  };

  const addSetToExercise = (exerciseTemplateId: number) => {
    const setsData = exerciseSetsData[exerciseTemplateId] || [];
    const maxOrder = setsData.reduce((m, s) => Math.max(m, s.set_order || 0), 0);
    const newSetOrder = maxOrder + 1;

    const tempSetId = -Date.now(); // negative = temporary

    setEditingSets((prev) => ({ ...prev, [tempSetId]: { reps: "0", weight: "0" } }));

    const tempSet: UserRoutineExerciseSet = {
      routine_template_exercise_set_id: tempSetId,
      routine_template_exercise_id: exerciseTemplateId,
      exercise_id: 0,
      set_order: newSetOrder,
      is_active: true,
      planned_reps: 0,
      planned_weight_kg: 0,
    };

    setExerciseSetsData((prev) => ({
      ...prev,
      [exerciseTemplateId]: [...(prev[exerciseTemplateId] || []), tempSet],
    }));

    setHasUnsavedChanges(true);
    setEditingExercises((prev) => new Set([...prev, exerciseTemplateId]));
  };

  const reindexLocalSetOrders = (
    _exerciseTemplateId: number,
    setsArr: UserRoutineExerciseSet[]
  ) => {
    const sorted = [...setsArr].sort((a, b) => (a.set_order || 0) - (b.set_order || 0));
    return sorted.map((s, idx) => ({ ...s, set_order: idx + 1 }));
  };

  const removeSetFromExercise = (exerciseTemplateId: number, setId: number) => {
    if (setId > 0) {
      setDeletedSetIds((prev) => new Set(prev).add(setId));
    }

    setEditingSets((prev) => {
      const next = { ...prev };
      delete next[setId];
      return next;
    });

    setExerciseSetsData((prev) => {
      const remaining = (prev[exerciseTemplateId] || []).filter(
        (s) => s.routine_template_exercise_set_id !== setId
      );
      const compacted = reindexLocalSetOrders(exerciseTemplateId, remaining);
      return { ...prev, [exerciseTemplateId]: compacted };
    });

    setHasUnsavedChanges(true);
    setEditingExercises((prev) => new Set([...prev, exerciseTemplateId]));
  };

  const handleCancelAllEdits = () => {
    setEditingExercises(new Set());
    setEditingSets({});
    setDeletedSetIds(new Set());
    setHasUnsavedChanges(false);
  };

  const handleSaveAllChanges = async () => {
    if (!userToken) {
      toast.error("Please sign in to save changes");
      return;
    }

    setSavingAllChanges(true);
    try {
      for (const exerciseTemplateId of Array.from(editingExercises)) {
        const setsData = exerciseSetsData[exerciseTemplateId] || [];

        // (1) Deletions (soft delete)
        if (deletedSetIds.size) {
          const deletionsForThisExercise = Array.from(deletedSetIds).filter((id) =>
            setsData.every((s) => s.routine_template_exercise_set_id !== id)
          );
          if (deletionsForThisExercise.length) {
            await Promise.all(deletionsForThisExercise.map((id) => supabaseAPI.deleteExerciseSet(id)));
          }
        }

        // (2) Update values for existing sets
        const existingSets = setsData.filter((s) => s.routine_template_exercise_set_id > 0);
        await Promise.all(
          existingSets.map(async (s) => {
            const edit = editingSets[s.routine_template_exercise_set_id];
            if (!edit) return s;
            const reps = parseInt(edit.reps) || 0;
            const weight = parseFloat(edit.weight) || 0;
            if (reps !== (s.planned_reps || 0) || weight !== (s.planned_weight_kg || 0)) {
              return await supabaseAPI.updateExerciseSet(s.routine_template_exercise_set_id, reps, weight);
            }
            return s;
          })
        );

        // (3) Reindex existing set_order to 1..K
        const stillExisting = (exerciseSetsData[exerciseTemplateId] || []).filter(
          (s) => s.routine_template_exercise_set_id > 0
        );
        const reindexedExisting = reindexLocalSetOrders(exerciseTemplateId, stillExisting);

        await Promise.all(
          reindexedExisting.map(async (s, idx) => {
            const desiredOrder = idx + 1;
            if (s.set_order !== desiredOrder) {
              await supabaseAPI.updateExerciseSetOrder(s.routine_template_exercise_set_id, desiredOrder);
            }
          })
        );

        // (4) Create new sets (temp ids < 0)
        const newTempSets = (exerciseSetsData[exerciseTemplateId] || [])
          .filter((s) => s.routine_template_exercise_set_id < 0)
          .sort((a, b) => (a.set_order || 0) - (b.set_order || 0));

        if (newTempSets.length > 0) {
          let nextOrder = reindexedExisting.length + 1;

          const newSetsData = newTempSets
            .map((s) => {
              const edit = editingSets[s.routine_template_exercise_set_id];
              const reps = parseInt(edit?.reps || "0") || 0;
              const weight = parseFloat(edit?.weight || "0") || 0;
              if (reps <= 0 && weight <= 0) return null;
              const payload = { reps, weight, set_order: nextOrder };
              nextOrder += 1;
              return payload;
            })
            .filter(Boolean) as { reps: number; weight: number; set_order: number }[];

          if (newSetsData.length > 0) {
            const fallbackExerciseId =
              reindexedExisting[0]?.exercise_id ?? getExerciseIdForTemplate(exerciseTemplateId);

            if (fallbackExerciseId) {
              await supabaseAPI.addExerciseSetsToRoutine(exerciseTemplateId, fallbackExerciseId, newSetsData);
            } else {
              console.warn("No exercise_id found for template", exerciseTemplateId);
            }
          }
        }

        // (5) Refresh from DB
        const updated = await supabaseAPI.getExerciseSetsForRoutine(exerciseTemplateId);
        setExerciseSetsData((prev) => ({ ...prev, [exerciseTemplateId]: updated }));
      }

      setEditingExercises(new Set());
      setEditingSets({});
      setDeletedSetIds(new Set());
      setHasUnsavedChanges(false);

      toast.success("All changes saved successfully!");
    } catch (error) {
      console.error("Failed to save changes:", error);
      toast.error("Failed to save changes");
    } finally {
      setSavingAllChanges(false);
    }
  };

  const getExerciseNote = () => {
    if (!currentExercise) return null;
    const name = currentExercise.name.toLowerCase();
    if (name.includes("dumbbell") && !name.includes("single")) {
      return "If lifting two dumbbells enter the combined weight of both.";
    }
    return null;
  };

  return (
    <AppScreen
      header={
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
      }
      maxContent="responsive"
      padContent={false}
      contentBottomPaddingClassName={hasUnsavedChanges ? "pb-24" : ""}
      bottomBar={
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
                {savingAllChanges ? "SAVING..." : `SAVE ALL (${editingExercises.size})`}
              </TactileButton>
            </div>
          </FooterBar>
        ) : null
      }
      showHeaderBorder={false}
      showBottomBarBorder={false}
      contentClassName=""
    >
      <Stack gap="fluid">
        <Spacer y="sm" />

        <Section variant="plain" padding="none">
          <div className="mt-2 mb-6">
            <h3 className="text-xs md:text-sm text-[var(--muted-foreground)] uppercase tracking-wider mb-3">
              EXERCISES IN ROUTINE ({savedExercises.length})
            </h3>

            {isLoadingSaved ? (
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
            ) : savedExercises.length > 0 ? (
              <div className="space-y-3">
                {savedExercises.map((savedExercise) => {
                  const isExpanded = expandedExercise === savedExercise.routine_template_exercise_id;
                  const setsData = exerciseSetsData[savedExercise.routine_template_exercise_id] || [];
                  const isLoadingSetsData = loadingSets[savedExercise.routine_template_exercise_id] || false;
                  const sortedSets = [...setsData].sort((a, b) => (a.set_order || 0) - (b.set_order || 0));

                  return (
                    <div
                      key={savedExercise.routine_template_exercise_id}
                      ref={(el) => {
                        expandedRefs.current[savedExercise.routine_template_exercise_id] = el;
                      }}
                      className="scroll-mt-24"
                    >
                      <ExpandingCard
                        variant="solid"
                        size="md"
                        expanded={isExpanded}
                        onToggle={() => handleKebabClick(savedExercise)}
                        title={savedExercise.exercise_name || ""}
                        subtitle={savedExercise.muscle_group || "Unknown"}
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
                        {isLoadingSetsData ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin w-4 h-4 border-2 border-[var(--warm-coral)] border-t-transparent rounded-full" />
                            <span className="ml-2 text-sm text-[var(--warm-brown)]/60">Loading sets...</span>
                          </div>
                        ) : (
                          <ExerciseSetEditorCard
                            showHeader={false} // hide duplicate title inside
                            name={savedExercise.exercise_name || ""}
                            initials={(savedExercise.exercise_name || "").substring(0, 2)}
                            items={sortedSets.map((s) => ({
                              key: s.routine_template_exercise_set_id,
                              order: s.set_order ?? 0,
                              reps: editingSets[s.routine_template_exercise_set_id]?.reps ?? String(s.planned_reps ?? "0"),
                              weight:
                                editingSets[s.routine_template_exercise_set_id]?.weight ??
                                String(s.planned_weight_kg ?? "0"),
                            }))}
                            onChange={(key, field, value) =>
                              updateEditingSet(Number(key), field as "reps" | "weight", value)
                            }
                            onRemove={(key) =>
                              removeSetFromExercise(savedExercise.routine_template_exercise_id, Number(key))
                            }
                            onAdd={() => addSetToExercise(savedExercise.routine_template_exercise_id)}
                            primaryDisabled // users save via global bar
                            disabled={access === RoutineAccess.ReadOnly}
                            onFocusScroll={onFocusScroll}
                            className="mb-2"
                          />
                        )}
                      </ExpandingCard>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-[var(--muted-foreground)]">Ready to add exercises to this routine</p>
              </div>
            )}
          </div>
        </Section>

        {/* Configure Card (only when a new exercise is selected) */}
        {currentExercise && (
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
                onChange={(key, field, value) =>
                  updateSet(String(key), field as "reps" | "weight", value)
                }
                onRemove={(key) => removeSet(String(key))}
                onAdd={addSet}
                onCancel={() => {
                  setCurrentExercise(undefined);
                  resetForm();
                }}
                onPrimary={handleSave}
                primaryLabel="SAVE EXERCISE"
                primaryDisabled={isSaving || access === RoutineAccess.ReadOnly}
                disabled={access === RoutineAccess.ReadOnly}
                onFocusScroll={onFocusScroll}
              />
            </ExpandingCard>
          </div>
        )}
      </Stack>
    </AppScreen>
  );
}