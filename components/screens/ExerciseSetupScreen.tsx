// components/screens/ExerciseSetupScreen.tsx
import { useState, useEffect } from "react";
import { Plus, X, Trash2, MoreVertical, ChevronUp } from "lucide-react";
import { TactileButton } from "../TactileButton";
import { Input } from "../ui/input";
import {
  supabaseAPI,
  Exercise,
  UserRoutineExercise,
  UserRoutineExerciseSet,
} from "../../utils/supabase/supabase-api";
import { useAuth } from "../AuthContext";
import { toast } from "sonner";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";
import { AppScreen, Section, ScreenHeader, FooterBar, Stack, Spacer } from "../layouts";
import { RoutineAccess } from "../../hooks/useAppNavigation";

interface ExerciseSet {
  id: string;
  reps: string;
  weight: string;
}

interface ExerciseSetupScreenProps {
  exercise?: Exercise; // Might be undefined (comes from the + flow)
  routineId: number;
  routineName: string;
  selectedExerciseForSetup: Exercise | null;
  setSelectedExerciseForSetup: (exercise: Exercise | null) => void;
  onBack: () => void;
  onSave: () => void;
  onAddMoreExercises: () => void;
  isEditingExistingRoutine?: boolean;
  onShowExerciseSelector?: () => void;
  access?: RoutineAccess; // Add access control
}

interface SavedExerciseWithDetails extends UserRoutineExercise {
  exercise_name?: string;
  category?: string;
  exercise_id: number; // keep non-optional to avoid TS extends error
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
  access = RoutineAccess.Editable, // Default to editable
}: ExerciseSetupScreenProps) {
  useKeyboardInset();

  const [sets, setSets] = useState<ExerciseSet[]>([
    { id: "1", reps: "0", weight: "0" },
    { id: "2", reps: "0", weight: "0" },
    { id: "3", reps: "0", weight: "0" },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedExercises, setSavedExercises] = useState<SavedExerciseWithDetails[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [currentExercise, setCurrentExercise] = useState<Exercise | undefined>(exercise);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);
  const [exerciseSetsData, setExerciseSetsData] = useState<
    Record<number, UserRoutineExerciseSet[]>
  >({});
  const [loadingSets, setLoadingSets] = useState<Record<number, boolean>>({});
  const [editingExercises, setEditingExercises] = useState(new Set<number>());
  const [editingSets, setEditingSets] = useState<
    Record<number, { reps: string; weight: string }>
  >({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savingAllChanges, setSavingAllChanges] = useState(false);

  // Track deletions for Save All (soft delete in DB)
  const [deletedSetIds, setDeletedSetIds] = useState<Set<number>>(new Set());

  const { userToken } = useAuth();

  // Wire currentExercise from prop
  useEffect(() => {
    setCurrentExercise(exercise);
  }, [exercise]);

  // When coming back from AddExercises screen with a selection
  useEffect(() => {
    if (selectedExerciseForSetup) {
      setCurrentExercise(selectedExerciseForSetup);
      setSelectedExerciseForSetup(null);
    }
  }, [selectedExerciseForSetup, setSelectedExerciseForSetup]);

  // Load saved exercises for this routine
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

  const addSet = () => {
    const newId = (sets.length + 1).toString();
    setSets((prev) => [...prev, { id: newId, reps: "0", weight: "0" }]);
  };

  const removeSet = (setId: string) => {
    if (sets.length > 1) {
      setSets((prev) => prev.filter((s) => s.id !== setId));
    }
  };

  const updateSet = (setId: string, field: "reps" | "weight", value: string) => {
    setSets((prev) => prev.map((s) => (s.id === setId ? { ...s, [field]: value } : s)));
  };

  const resetForm = () => {
    setSets([
      { id: "1", reps: "0", weight: "0" },
      { id: "2", reps: "0", weight: "0" },
      { id: "3", reps: "0", weight: "0" },
    ]);
  };

  const refreshSavedExercises = async () => {
    try {
      const saved = await supabaseAPI.getUserRoutineExercisesWithDetails(routineId);
      setSavedExercises(saved as SavedExerciseWithDetails[]);
    } catch (error) {
      console.error("Failed to refresh saved exercises:", error);
    }
  };

  // Pretty, safe chunk logger (avoids WebKit/Xcode truncation)
  function logChunks(label: string, data: unknown, chunkSize = 4000) {
    let s: string;
    try {
      s = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    } catch {
      s = String(data);
    }
    for (let i = 0; i < s.length; i += chunkSize) {
      console.debug(
        `${label} [${i}-${mathMin(i + chunkSize, s.length)}/${s.length}]`,
        s.slice(i, i + chunkSize)
      );
    }
  }
  // small helper to avoid TS complaining about Math.min in template literal
  const mathMin = (a: number, b: number) => Math.min(a, b);

  // Sanity checks for sets payload before sending to DB
  function validateSetsPayload(rows: Array<{ reps: number; weight: number; set_order: number }>) {
    const errors: string[] = [];
    rows.forEach((r, i) => {
      if (!Number.isInteger(r.reps) || r.reps < 0)
        errors.push(`row ${i}: reps must be int ≥ 0 (got ${r.reps})`);
      if (!(Number.isFinite(r.weight) && r.weight >= 0))
        errors.push(`row ${i}: weight must be number ≥ 0 (got ${r.weight})`);
      if (!Number.isInteger(r.set_order) || r.set_order <= 0)
        errors.push(`row ${i}: set_order must be int ≥ 1 (got ${r.set_order})`);
    });
    const expectedSeq = rows.map((_, i) => i + 1).join(",");
    const actualSeq = rows.map((r) => r.set_order).join(",");
    if (expectedSeq !== actualSeq)
      errors.push(`set_order sequence mismatch. expected [${expectedSeq}] got [${actualSeq}]`);
    return errors;
  }

  // Helper to find exercise_id when creating new sets (no existing rows)
  const getExerciseIdForTemplate = (templateId: number) => {
    const row = savedExercises.find((e) => e.routine_template_exercise_id === templateId);
    return row?.exercise_id ?? null;
  };

  // Save the configure-card (newly selected exercise)
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

      const validSets = sets.filter(
        (s) => parseInt(s.reps) > 0 || parseFloat(s.weight) > 0
      );
      logChunks("🧪 [SAVE] validSets", validSets);

      const savedExercise = await supabaseAPI.addExerciseToRoutine(
        routineId,
        currentExercise.exercise_id,
        exerciseOrder
      );
      if (!savedExercise) throw new Error("Failed to save exercise to routine");

      console.debug("✅ [addExerciseToRoutine] ok", {
        routine_template_id: routineId,
        routine_template_exercise_id: savedExercise.routine_template_exercise_id,
        exercise_id: currentExercise.exercise_id,
      });

      const setsToSave = validSets.map((s, idx) => ({
        reps: parseInt(s.reps) || 0,
        weight: parseFloat(s.weight) || 0,
        set_order: idx + 1,
      }));

      const valErrors = validateSetsPayload(setsToSave);
      if (valErrors.length) console.warn("⚠️ [SETS VALIDATION ERRORS]", valErrors);
      console.table(setsToSave);
      logChunks("🧪 [SAVE] setsToSave (payload to API)", setsToSave);

      if (setsToSave.length && !("planned_reps" in setsToSave[0])) {
        console.warn(
          "ℹ️ Your setsToSave use keys {reps, weight, set_order}. If API expects {planned_reps, planned_weight_kg}, this will fail."
        );
      }

      console.debug("➡️ [addExerciseSetsToRoutine] sending", {
        rtexId: savedExercise.routine_template_exercise_id,
        exerciseId: currentExercise.exercise_id,
        count: setsToSave.length,
      });

      await supabaseAPI.addExerciseSetsToRoutine(
        savedExercise.routine_template_exercise_id,
        currentExercise.exercise_id,
        setsToSave
      );

      console.debug("✅ [addExerciseSetsToRoutine] ok");

      // Update muscle summary
      await supabaseAPI.recomputeAndSaveRoutineMuscleSummary(routineId);

      toast.success(`Added ${currentExercise.name} with ${validSets.length} sets`);
      await refreshSavedExercises();

      setCurrentExercise(undefined);
      resetForm();
      onSave();
    } catch (error) {
      console.error("❌ [handleSave] Failed to save exercise", {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorObj: error,
      });
      toast.error(
        error instanceof Error
          ? `Failed to save exercise: ${error.message}`
          : "Failed to save exercise. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const { userToken: _token } = useAuth(); // keep hook count stable

  const handleKebabClick = async (
    savedExercise: SavedExerciseWithDetails,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    const exerciseTemplateId = savedExercise.routine_template_exercise_id;

    if (expandedExercise === exerciseTemplateId) {
      setExpandedExercise(null);
      setEditingExercises(new Set<number>());
      return;
    }

    setExpandedExercise(exerciseTemplateId);

    if (exerciseSetsData[exerciseTemplateId]) return; // cached

    setLoadingSets((prev) => ({ ...prev, [exerciseTemplateId]: true }));
    try {
      const setsData = await supabaseAPI.getExerciseSetsForRoutine(exerciseTemplateId);
      setExerciseSetsData((prev) => ({ ...prev, [exerciseTemplateId]: setsData }));
    } catch (error) {
      console.error("Failed to fetch exercise sets:", error);
      toast.error("Failed to load exercise sets");
      setExpandedExercise(null);
    } finally {
      setLoadingSets((prev) => ({ ...prev, [exerciseTemplateId]: false }));
    }
  };

  const handleEditSets = (exerciseTemplateId: number) => {
    const setsData = exerciseSetsData[exerciseTemplateId] || [];

    setEditingExercises((prev: Set<number>) => new Set<number>([...prev, exerciseTemplateId]));

    const newEditing: Record<number, { reps: string; weight: string }> = {};
    setsData.forEach((s) => {
      newEditing[s.routine_template_exercise_set_id] = {
        reps: s.planned_reps?.toString() || "0",
        weight: s.planned_weight_kg?.toString() || "0",
      };
    });
    setEditingSets((prev) => ({ ...prev, ...newEditing }));

    setHasUnsavedChanges(true);
  };

  const handleCancelAllEdits = () => {
    setEditingExercises(new Set());
    setEditingSets({});
    setDeletedSetIds(new Set());
    setHasUnsavedChanges(false);
  };

  const updateEditingSet = (setId: number, field: "reps" | "weight", value: string) => {
    setEditingSets((prev) => ({
      ...prev,
      [setId]: { ...prev[setId], [field]: value },
    }));
    setHasUnsavedChanges(true);
  };

  const addSetToExercise = (exerciseTemplateId: number) => {
    const setsData = exerciseSetsData[exerciseTemplateId] || [];
    const maxOrder = setsData.reduce((m, s) => Math.max(m, s.set_order || 0), 0);
    const newSetOrder = maxOrder + 1;

    const tempSetId = -Date.now(); // negative = temporary

    setEditingSets((prev) => ({
      ...prev,
      [tempSetId]: { reps: "0", weight: "0" },
    }));

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
  };

  const reindexLocalSetOrders = (
    exerciseTemplateId: number,
    setsArr: UserRoutineExerciseSet[]
  ) => {
    const sorted = [...setsArr].sort((a, b) => (a.set_order || 0) - (b.set_order || 0));
    return sorted.map((s, idx) => ({ ...s, set_order: idx + 1 }));
  };

  const removeSetFromExercise = (exerciseTemplateId: number, setId: number) => {
    if (setId > 0) {
      setDeletedSetIds((prev) => {
        const next = new Set(prev);
        next.add(setId);
        return next;
      });
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
            await Promise.all(
              deletionsForThisExercise.map((id) => supabaseAPI.deleteExerciseSet(id))
            );
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
              return await supabaseAPI.updateExerciseSet(
                s.routine_template_exercise_set_id,
                reps,
                weight
              );
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
              await supabaseAPI.updateExerciseSetOrder(
                s.routine_template_exercise_set_id,
                desiredOrder
              );
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
              if (reps <= 0 && weight <= 0) return null; // skip empty
              const payload = { reps, weight, set_order: nextOrder };
              nextOrder += 1;
              return payload;
            })
            .filter(Boolean) as { reps: number; weight: number; set_order: number }[];

          if (newSetsData.length > 0) {
            const fallbackExerciseId =
              reindexedExisting[0]?.exercise_id ?? getExerciseIdForTemplate(exerciseTemplateId);

            if (fallbackExerciseId) {
              await supabaseAPI.addExerciseSetsToRoutine(
                exerciseTemplateId,
                fallbackExerciseId,
                newSetsData
              );
            } else {
              console.warn("No exercise_id found for template", exerciseTemplateId);
            }
          }
        }

        // (5) Refresh from DB
        const updated = await supabaseAPI.getExerciseSetsForRoutine(exerciseTemplateId);
        setExerciseSetsData((prev) => ({ ...prev, [exerciseTemplateId]: updated }));
      }

      // Clear edit state
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
        />
      }
      // Wider on big devices, but still centered; we own horizontal gutters here
      maxContent="responsive"
      padContent={false}
      contentClassName={hasUnsavedChanges ? "pb-24" : "pb-20"}
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
                className={`flex-1 h-11 md:h-12 ${access === RoutineAccess.ReadOnly
                    ? "opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200"
                    : "bg-transparent border-[var(--warm-brown)]/20 text-[var(--warm-brown)]/60 hover:bg-[var(--soft-gray)]"
                  } font-medium`}
              >
                CANCEL ALL
              </TactileButton>
              <TactileButton
                onClick={handleSaveAllChanges}
                disabled={savingAllChanges || access === RoutineAccess.ReadOnly}
                className={`flex-1 h-11 md:h-12 font-medium border-0 transition-all ${access === RoutineAccess.ReadOnly
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
      bottomBarSticky
    >
      <Stack gap="fluid">
        <Spacer y="sm" />

        {/* Saved Exercises */}
        <Section variant="plain" padding="none">
          <div className="mt-2 mb-6">
            <h3 className="text-xs md:text-sm text-[var(--muted-foreground)] uppercase tracking-wider mb-3">
              EXERCISES IN ROUTINE ({savedExercises.length})
            </h3>

            {isLoadingSaved ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-white/50 rounded-xl animate-pulse"
                  >
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
                {savedExercises.map((savedExercise, index) => {
                  const isExpanded =
                    expandedExercise === savedExercise.routine_template_exercise_id;
                  const setsData =
                    exerciseSetsData[savedExercise.routine_template_exercise_id] || [];
                  const isLoadingSetsData =
                    loadingSets[savedExercise.routine_template_exercise_id] || false;
                  const isEditing = editingExercises.has(
                    savedExercise.routine_template_exercise_id
                  );

                  const sortedSets = [...setsData].sort(
                    (a, b) => (a.set_order || 0) - (b.set_order || 0)
                  );

                  return (
                    <div
                      key={savedExercise.routine_template_exercise_id || index}
                      className="space-y-2"
                    >
                      <div
                        className={`flex items-center gap-3 p-3 border rounded-xl transition-all ${isEditing
                            ? "bg-[var(--warm-coral)]/5 border-[var(--warm-coral)]/30"
                            : "bg-white/70 border-[var(--border)]"
                          }`}
                        onClick={(e) => handleKebabClick(savedExercise, e)}
                      >
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-[var(--muted)] rounded-lg flex items-center justify-center overflow-hidden">
                          <span className="text-sm md:text-base font-medium text-[var(--muted-foreground)]">
                            {(savedExercise.exercise_name || "")
                              .substring(0, 2)
                              .toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[var(--foreground)] truncate">
                            {savedExercise.exercise_name}
                          </p>
                          <p className="text-xs md:text-sm text-[var(--muted-foreground)] truncate">
                            Exercise #{savedExercise.exercise_order} •{" "}
                            {savedExercise.category || "Exercise"}
                            {isEditing && (
                              <span className="text-[var(--warm-coral)] ml-2">• Editing</span>
                            )}
                          </p>
                        </div>
                        <TactileButton
                          variant="secondary"
                          size="sm"
                          onClick={(e) => handleKebabClick(savedExercise, e)}
                          className={`p-2 h-auto bg-transparent hover:bg-[var(--warm-brown)]/10 text-[var(--warm-brown)]/60 hover:text-[var(--warm-brown)] ${isEditing ? "ring-2 ring-[var(--warm-coral)]/30" : ""
                            }`}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <MoreVertical size={16} />}
                        </TactileButton>
                      </div>

                      {/* Sets Data Dropdown */}
                      {isExpanded && (
                        <div className="bg-white/80 border border-[var(--border)] rounded-lg p-3 transition-all duration-200">
                          {isLoadingSetsData ? (
                            <div className="flex items-center justify-center py-4">
                              <div className="animate-spin w-4 h-4 border-2 border-[var(--warm-coral)] border-t-transparent rounded-full" />
                              <span className="ml-2 text-sm text-[var(--warm-brown)]/60">
                                Loading sets...
                              </span>
                            </div>
                          ) : sortedSets.length > 0 ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-[var(--warm-brown)]">
                                  Sets in this Routine
                                </h4>
                                {!isEditing && (
                                  <TactileButton
                                    variant="secondary"
                                    size="sm"
                                    onClick={() =>
                                      handleEditSets(
                                        savedExercise.routine_template_exercise_id
                                      )
                                    }
                                    disabled={access === RoutineAccess.ReadOnly}
                                    className={`px-3 py-1 text-xs md:text-sm ${access === RoutineAccess.ReadOnly
                                        ? "opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200"
                                        : "bg-[var(--warm-coral)]/10 text-[var(--warm-coral)] hover:bg-[var(--warm-coral)]/20 border-[var(--warm-coral)]/30"
                                      }`}
                                  >
                                    Edit Sets
                                  </TactileButton>
                                )}
                              </div>

                              {isEditing ? (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-4 gap-3 md:gap-4 text-[10px] md:text-xs text-[var(--warm-brown)]/60 uppercase tracking-wider">
                                    <span>Set</span>
                                    <span className="text-center">Reps</span>
                                    <span className="text-center">Weight (kg)</span>
                                    <span></span>
                                  </div>

                                  {sortedSets.map((s) => (
                                    <div
                                      key={s.routine_template_exercise_set_id}
                                      className="grid grid-cols-4 gap-3 md:gap-4 items-center py-2 px-3 bg-[var(--soft-gray)]/30 rounded-lg border border-[var(--border)]/20"
                                    >
                                      <span className="text-sm font-medium text-[var(--warm-brown)]/80">
                                        {s.set_order}
                                      </span>
                                      <Input
                                        type="number"
                                        value={
                                          editingSets[s.routine_template_exercise_set_id]?.reps ||
                                          "0"
                                        }
                                        onChange={(e) =>
                                          updateEditingSet(
                                            s.routine_template_exercise_set_id,
                                            "reps",
                                            e.target.value
                                          )
                                        }
                                        disabled={access === RoutineAccess.ReadOnly}
                                        className={`bg-white border-[var(--border)] text-[var(--foreground)] text-center h-10 md:h-8 rounded-md focus:border-[var(--warm-sage)] focus:ring-[var(--warm-sage)]/20 text-sm ${access === RoutineAccess.ReadOnly ? "opacity-50 cursor-not-allowed" : ""
                                          }`}
                                        min="0"
                                      />
                                      <Input
                                        type="number"
                                        step="0.5"
                                        value={
                                          editingSets[s.routine_template_exercise_set_id]?.weight ||
                                          "0"
                                        }
                                        onChange={(e) =>
                                          updateEditingSet(
                                            s.routine_template_exercise_set_id,
                                            "weight",
                                            e.target.value
                                          )
                                        }
                                        disabled={access === RoutineAccess.ReadOnly}
                                        className={`bg-white border-[var(--border)] text-[var(--foreground)] text-center h-10 md:h-8 rounded-md focus:border-[var(--warm-coral)] focus:ring-[var(--warm-coral)]/20 text-sm ${access === RoutineAccess.ReadOnly ? "opacity-50 cursor-not-allowed" : ""
                                          }`}
                                        min="0"
                                      />
                                      <TactileButton
                                        variant="secondary"
                                        size="sm"
                                        onClick={() =>
                                          removeSetFromExercise(
                                            savedExercise.routine_template_exercise_id,
                                            s.routine_template_exercise_set_id
                                          )
                                        }
                                        disabled={sortedSets.length <= 1 || access === RoutineAccess.ReadOnly}
                                        className={`p-1 h-auto ${sortedSets.length <= 1 || access === RoutineAccess.ReadOnly
                                            ? "opacity-30 cursor-not-allowed"
                                            : "bg-red-50 text-red-500 hover:bg-red-100"
                                          }`}
                                        title="Remove this set"
                                      >
                                        <X size={14} />
                                      </TactileButton>
                                    </div>
                                  ))}

                                  <TactileButton
                                    onClick={() =>
                                      addSetToExercise(
                                        savedExercise.routine_template_exercise_id
                                      )
                                    }
                                    disabled={access === RoutineAccess.ReadOnly}
                                    className={`w-full py-2 text-xs md:text-sm ${access === RoutineAccess.ReadOnly
                                        ? "opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200"
                                        : "bg-[var(--warm-sage)]/10 text-[var(--warm-sage)] hover:bg-[var(--warm-sage)]/20 border-2 border-dashed border-[var(--warm-sage)]/30"
                                      } rounded-lg`}
                                  >
                                    <Plus size={16} className="mr-2" />
                                    Add Set
                                  </TactileButton>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {sortedSets.map((s) => (
                                    <div
                                      key={s.routine_template_exercise_set_id}
                                      className="flex items-center justify-between py-2 px-3 bg-[var(--soft-gray)]/30 rounded-lg border border-[var(--border)]/20"
                                    >
                                      <span className="text-sm font-medium text-[var(--warm-brown)]/80">
                                        Set {s.set_order}
                                      </span>
                                      <div className="flex items-center gap-3 text-sm text-[var(--warm-brown)]">
                                        {s.planned_reps ? (
                                          <span className="bg-[var(--warm-sage)]/20 text-[var(--warm-sage)] px-2 py-1 rounded-md">
                                            {s.planned_reps} reps
                                          </span>
                                        ) : null}
                                        {s.planned_weight_kg ? (
                                          <span className="bg-[var(--warm-coral)]/20 text-[var(--warm-coral)] px-2 py-1 rounded-md">
                                            {s.planned_weight_kg}kg
                                          </span>
                                        ) : null}
                                        {!s.planned_reps && !s.planned_weight_kg && (
                                          <span className="text-[var(--warm-brown)]/50 italic">
                                            No data
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-3">
                              <p className="text-sm text-[var(--warm-brown)]/60">
                                No sets data found
                              </p>
                              {!isEditing && (
                                <TactileButton
                                  variant="secondary"
                                  size="sm"
                                  onClick={() =>
                                    handleEditSets(savedExercise.routine_template_exercise_id)
                                  }
                                  disabled={access === RoutineAccess.ReadOnly}
                                  className={`mt-2 px-3 py-1 text-xs md:text-sm ${access === RoutineAccess.ReadOnly
                                      ? "opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200"
                                      : "bg-[var(--warm-coral)]/10 text-[var(--warm-coral)] hover:bg-[var(--warm-coral)]/20 border-[var(--warm-coral)]/30"
                                    }`}
                                >
                                  Add Sets
                                </TactileButton>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-[var(--muted-foreground)]">
                  Ready to add exercises to this routine
                </p>
              </div>
            )}
          </div>
        </Section>

        {/* Configure Card (only when a new exercise is selected) */}
        {currentExercise && (
          <Section variant="card" padding="md" className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-[var(--muted)] rounded-lg flex items-center justify-center overflow-hidden">
                <span className="text-base md:text-lg font-medium text-[var(--muted-foreground)]">
                  {currentExercise.name.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-medium text-[var(--foreground)] mb-1 truncate">
                  {currentExercise.name}
                </h2>
                <p className="text-xs md:text-sm text-[var(--muted-foreground)]">
                  {sets.length} Sets
                </p>
              </div>
              <span className="text-[10px] md:text-xs bg-[var(--warm-coral)]/20 text-[var(--warm-coral)] px-2 py-1 rounded-full">
                CONFIGURING
              </span>
            </div>

            {getExerciseNote() && (
              <p className="text-xs md:text-sm text-[var(--muted-foreground)] mb-4 italic bg-[var(--warm-cream)]/50 p-3 rounded-lg">
                {getExerciseNote()}
              </p>
            )}

            <div className="grid grid-cols-3 gap-3 md:gap-4 mb-4">
              <div />
              <div className="text-center">
                <h3 className="text-[10px] md:text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                  REPS
                </h3>
              </div>
              <div className="text-center">
                <h3 className="text-[10px] md:text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                  WEIGHT (KG)
                </h3>
              </div>
            </div>

            <div className="space-y-3 md:space-y-4">
              {sets.map((s, index) => (
                <div key={s.id} className="grid grid-cols-3 gap-3 md:gap-4 items-center">
                  <div className="flex items-center justify-center">
                    <span className="text-base md:text-lg font-medium text-[var(--foreground)]">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <Input
                      type="number"
                      value={s.reps}
                      onChange={(e) => updateSet(s.id, "reps", e.target.value)}
                      disabled={access === RoutineAccess.ReadOnly}
                      className={`bg-[var(--input-background)] border-[var(--border)] text-[var(--foreground)] text-center h-11 md:h-12 rounded-lg focus:border-[var(--warm-coral)] focus:ring-[var(--warm-coral)]/20 ${access === RoutineAccess.ReadOnly ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      min="0"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.5"
                      value={s.weight}
                      onChange={(e) => updateSet(s.id, "weight", e.target.value)}
                      disabled={access === RoutineAccess.ReadOnly}
                      className={`bg-[var(--input-background)] border-[var(--border)] text-[var(--foreground)] text-center h-11 md:h-12 rounded-lg focus:border-[var(--warm-coral)] focus:ring-[var(--warm-coral)]/20 ${access === RoutineAccess.ReadOnly ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      min="0"
                    />
                    <TactileButton
                      variant="secondary"
                      size="sm"
                      onClick={() => removeSet(s.id)}
                      disabled={sets.length <= 1 || access === RoutineAccess.ReadOnly}
                      className={`p-2 h-auto bg-white/70 border-[var(--border)] hover:bg-red-50 ${sets.length <= 1 || access === RoutineAccess.ReadOnly ? "opacity-30 cursor-not-allowed" : "text-red-500"
                        }`}
                    >
                      <X size={16} />
                    </TactileButton>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-between items-center">
              <TactileButton
                onClick={addSet}
                disabled={access === RoutineAccess.ReadOnly}
                className={`flex items-center gap-2 bg-white/70 border-[var(--border)] text-[var(--foreground)] hover:bg-white px-4 py-2 rounded-lg btn-tactile ${access === RoutineAccess.ReadOnly ? "opacity-50 cursor-not-allowed" : ""
                  }`}
              >
                <Plus size={16} />
                <span className="text-xs md:text-sm font-medium uppercase tracking-wider">
                  Add Set
                </span>
              </TactileButton>

              {/* Trash cancels configure */}
              <TactileButton
                variant="secondary"
                size="sm"
                onClick={() => {
                  setCurrentExercise(undefined);
                  resetForm();
                }}
                disabled={access === RoutineAccess.ReadOnly}
                className={`p-3 h-auto bg-white/70 border-red-200 text-red-500 hover:bg-red-50 btn-tactile ${access === RoutineAccess.ReadOnly ? "opacity-50 cursor-not-allowed" : ""
                  }`}
              >
                <Trash2 size={18} />
              </TactileButton>
            </div>

            <div className="mt-6">
              <TactileButton
                onClick={handleSave}
                disabled={isSaving || access === RoutineAccess.ReadOnly}
                className={`w-full h-12 md:h-14 bg-[var(--warm-coral)] text-white font-medium rounded-full hover:bg-[var(--warm-coral)]/90 btn-tactile ${access === RoutineAccess.ReadOnly ? "opacity-50 cursor-not-allowed" : ""
                  }`}
              >
                {isSaving ? "SAVING..." : "SAVE EXERCISE"}
              </TactileButton>
            </div>
          </Section>
        )}
      </Stack>
    </AppScreen>
  );
}