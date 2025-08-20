import { useState, useEffect } from "react";
import { ArrowLeft, Plus, X, Trash2, MoreVertical, ChevronUp } from "lucide-react";
import { TactileButton } from "../TactileButton";
import { Input } from "../ui/input";
import { supabaseAPI, Exercise, UserRoutineExercise, UserRoutineExerciseSet } from "../../utils/supabase-api";
import { useAuth } from "../AuthContext";
import { toast } from "sonner";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";

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
  onShowExerciseSelector
}: ExerciseSetupScreenProps) {
  useKeyboardInset();

  const [sets, setSets] = useState<ExerciseSet[]>([
    { id: "1", reps: "0", weight: "0" },
    { id: "2", reps: "0", weight: "0" },
    { id: "3", reps: "0", weight: "0" }
  ]);
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
    setSets([...sets, { id: newId, reps: "0", weight: "0" }]);
  };

  const removeSet = (setId: string) => {
    if (sets.length > 1) {
      setSets(sets.filter((s) => s.id !== setId));
    }
  };

  const updateSet = (setId: string, field: "reps" | "weight", value: string) => {
    setSets((prev) => prev.map((s) => (s.id === setId ? { ...s, [field]: value } : s)));
  };

  const resetForm = () => {
    setSets([
      { id: "1", reps: "0", weight: "0" },
      { id: "2", reps: "0", weight: "0" },
      { id: "3", reps: "0", weight: "0" }
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

      const validSets = sets.filter((s) => parseInt(s.reps) > 0 || parseFloat(s.weight) > 0);

      const savedExercise = await supabaseAPI.addExerciseToRoutine(
        routineId,
        currentExercise.exercise_id,
        exerciseOrder
      );
      if (!savedExercise) throw new Error("Failed to save exercise to routine");

      // Include explicit set_order (1..n) so DB doesn't default to 1
      const setsToSave = validSets.map((s, idx) => ({
        reps: parseInt(s.reps) || 0,
        weight: parseFloat(s.weight) || 0,
        set_order: idx + 1
      }));

      await supabaseAPI.addExerciseSetsToRoutine(
        savedExercise.routine_template_exercise_id,
        currentExercise.exercise_id,
        setsToSave
      );

      toast.success(`Added ${currentExercise.name} with ${validSets.length} sets`);
      await refreshSavedExercises();

      setCurrentExercise(undefined);
      resetForm();
      onSave();
    } catch (error) {
      console.error("Failed to save exercise:", error);
      toast.error(
        error instanceof Error ? `Failed to save exercise: ${error.message}` : "Failed to save exercise. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleKebabClick = async (savedExercise: SavedExerciseWithDetails, e: React.MouseEvent) => {
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
        weight: s.planned_weight_kg?.toString() || "0"
      };
    });
    setEditingSets((prev) => ({ ...prev, ...newEditing }));

    setHasUnsavedChanges(true); // mark dirty as soon as edit mode starts
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
      [setId]: { ...prev[setId], [field]: value }
    }));
    setHasUnsavedChanges(true);
  };

  // Add a new inline set (edit mode) with correct next set_order
  const addSetToExercise = (exerciseTemplateId: number) => {
    const setsData = exerciseSetsData[exerciseTemplateId] || [];
    // next order based on max existing (avoids duplicates after deletes)
    const maxOrder = setsData.reduce((m, s) => Math.max(m, s.set_order || 0), 0);
    const newSetOrder = maxOrder + 1;

    const tempSetId = -Date.now(); // negative = temporary

    setEditingSets((prev) => ({
      ...prev,
      [tempSetId]: { reps: "0", weight: "0" }
    }));

    const tempSet: UserRoutineExerciseSet = {
      routine_template_exercise_set_id: tempSetId,
      routine_template_exercise_id: exerciseTemplateId,
      exercise_id: 0, // will be supplied at save
      set_order: newSetOrder,
      is_active: true,
      planned_reps: 0,
      planned_weight_kg: 0
    };

    setExerciseSetsData((prev) => ({
      ...prev,
      [exerciseTemplateId]: [...(prev[exerciseTemplateId] || []), tempSet]
    }));

    setHasUnsavedChanges(true);
  };

  // Local reindex helper (1..N) for a routine exercise — keeps UI compact immediately
  const reindexLocalSetOrders = (exerciseTemplateId: number, setsArr: UserRoutineExerciseSet[]) => {
    const sorted = [...setsArr].sort((a, b) => (a.set_order || 0) - (b.set_order || 0));
    return sorted.map((s, idx) => ({ ...s, set_order: idx + 1 }));
  };

  // Remove inline set (edit mode)
  const removeSetFromExercise = (exerciseTemplateId: number, setId: number) => {
    // queue deletion for persisted sets
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

    // remove locally and reindex remaining 1..N so labels look right
    setExerciseSetsData((prev) => {
      const remaining = (prev[exerciseTemplateId] || []).filter(
        (s) => s.routine_template_exercise_set_id !== setId
      );
      const compacted = reindexLocalSetOrders(exerciseTemplateId, remaining);
      return { ...prev, [exerciseTemplateId]: compacted };
    });

    setHasUnsavedChanges(true);
  };

  // Persist all edit-mode changes (delete → update values → reindex orders → create new)
  const handleSaveAllChanges = async () => {
    if (!userToken) {
      toast.error("Please sign in to save changes");
      return;
    }

    setSavingAllChanges(true);
    try {
      for (const exerciseTemplateId of Array.from(editingExercises)) {
        const setsData = exerciseSetsData[exerciseTemplateId] || [];

        // 1) Process deletions (soft delete)
        if (deletedSetIds.size) {
          // operate on ids that were actually deleted from this exercise
          const deletionsForThisExercise = Array.from(deletedSetIds).filter((id) =>
            setsData.every((s) => s.routine_template_exercise_set_id !== id)
          );
          if (deletionsForThisExercise.length) {
            await Promise.all(deletionsForThisExercise.map((id) => supabaseAPI.deleteExerciseSet(id)));
          }
        }

        // 2) Update planned reps/weight for existing sets
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

        // 3) Reindex orders for remaining existing sets to 1..K and persist
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

        // 4) Create new sets (temp id < 0) appended after reindexed existing
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
              await supabaseAPI.addExerciseSetsToRoutine(exerciseTemplateId, fallbackExerciseId, newSetsData);
            } else {
              console.warn("No exercise_id found for template", exerciseTemplateId);
            }
          }
        }

        // 5) Refresh this exercise's sets from DB (source of truth)
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
    <div className="bg-gradient-to-br from-[var(--soft-gray)] via-[var(--background)] to-[var(--warm-cream)]/30 flex flex-col kb-aware">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-12 bg-gradient-to-r from-[var(--background)] to-[var(--warm-cream)]/20 sticky top-0 z-10 border-b border-[var(--border)]">
        <TactileButton
          variant="secondary"
          size="sm"
          onClick={onBack}
          className="p-2 h-auto bg-white/70 border-[var(--border)] text-[var(--foreground)] hover:bg-white btn-tactile"
        >
          <ArrowLeft size={20} />
        </TactileButton>
        <h1 className="font-medium text-[var(--foreground)] uppercase tracking-wide">
          {routineName || "ROUTINE"}
        </h1>
        <TactileButton
          variant="secondary"
          size="sm"
          onClick={() => {
            if (isEditingExistingRoutine && onShowExerciseSelector) {
              onShowExerciseSelector();
            } else {
              onAddMoreExercises();
            }
          }}
          className="p-2 h-auto bg-green-500 border-green-600 text-white hover:bg-green-600 btn-tactile-sage"
        >
          <Plus size={20} />
        </TactileButton>
      </div>

      <div className="flex-1">
        {/* Saved Exercises */}
        <div className="mx-4 mt-6 mb-6">
          <h3 className="text-sm text-[var(--muted-foreground)] uppercase tracking-wider mb-3">
            EXERCISES IN ROUTINE ({savedExercises.length})
          </h3>

          {isLoadingSaved ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/50 rounded-xl animate-pulse">
                  <div className="w-10 h-10 bg-[var(--muted)] rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[var(--muted)] rounded w-3/4"></div>
                    <div className="h-3 bg-[var(--muted)] rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : savedExercises.length > 0 ? (
            <div className="space-y-3">
              {savedExercises.map((savedExercise, index) => {
                const isExpanded = expandedExercise === savedExercise.routine_template_exercise_id;
                const setsData = exerciseSetsData[savedExercise.routine_template_exercise_id] || [];
                const isLoadingSetsData = loadingSets[savedExercise.routine_template_exercise_id] || false;
                const isEditing = editingExercises.has(savedExercise.routine_template_exercise_id);

                // always sort by set_order to keep UI stable
                const sortedSets = [...setsData].sort(
                  (a, b) => (a.set_order || 0) - (b.set_order || 0)
                );

                return (
                  <div key={savedExercise.routine_template_exercise_id || index} className="space-y-2">
                    <div
                      className={`flex items-center gap-3 p-3 border rounded-xl transition-all cursor-pointer ${
                        isEditing
                          ? "bg-[var(--warm-coral)]/5 border-[var(--warm-coral)]/30"
                          : "bg-white/70 border-[var(--border)] hover:bg-white/90"
                      }`}
                      onClick={(e) => handleKebabClick(savedExercise, e)}
                    >
                      <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center overflow-hidden">
                        <span className="text-sm font-medium text-[var(--muted-foreground)]">
                          {(savedExercise.exercise_name || "").substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[var(--foreground)]">{savedExercise.exercise_name}</p>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          Exercise #{savedExercise.exercise_order} • {savedExercise.category || "Exercise"}
                          {isEditing && <span className="text-[var(--warm-coral)] ml-2">• Editing</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <TactileButton
                          variant="secondary"
                          size="sm"
                          onClick={(e) => handleKebabClick(savedExercise, e)}
                          className={`p-2 h-auto bg-transparent hover:bg-[var(--warm-brown)]/10 text-[var(--warm-brown)]/60 hover:text-[var(--warm-brown)] ${
                            isEditing ? "ring-2 ring-[var(--warm-coral)]/30" : ""
                          }`}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <MoreVertical size={16} />}
                        </TactileButton>
                      </div>
                    </div>

                    {/* Sets Data Dropdown */}
                    {isExpanded && (
                      <div className="bg-white/80 border border-[var(--border)] rounded-lg p-3 ml-4 mr-2 transition-all duration-200">
                        {isLoadingSetsData ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin w-4 h-4 border-2 border-[var(--warm-coral)] border-t-transparent rounded-full"></div>
                            <span className="ml-2 text-sm text-[var(--warm-brown)]/60">Loading sets...</span>
                          </div>
                        ) : sortedSets.length > 0 ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-[var(--warm-brown)]">Sets in this Routine</h4>
                              {!isEditing && (
                                <TactileButton
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleEditSets(savedExercise.routine_template_exercise_id)}
                                  className="px-3 py-1 text-xs bg-[var(--warm-coral)]/10 text-[var(--warm-coral)] hover:bg-[var(--warm-coral)]/20 border-[var(--warm-coral)]/30"
                                >
                                  Edit Sets
                                </TactileButton>
                              )}
                            </div>

                            {isEditing ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-4 gap-3 text-xs text-[var(--warm-brown)]/60 uppercase tracking-wider">
                                  <span>Set</span>
                                  <span className="text-center">Reps</span>
                                  <span className="text-center">Weight (kg)</span>
                                  <span></span>
                                </div>

                                {sortedSets.map((s) => (
                                  <div
                                    key={s.routine_template_exercise_set_id}
                                    className="grid grid-cols-4 gap-3 items-center py-2 px-3 bg-[var(--soft-gray)]/30 rounded-lg border border-[var(--border)]/20"
                                  >
                                    <span className="text-sm font-medium text-[var(--warm-brown)]/80">
                                      {s.set_order}
                                    </span>
                                    <Input
                                      type="number"
                                      value={editingSets[s.routine_template_exercise_set_id]?.reps || "0"}
                                      onChange={(e) =>
                                        updateEditingSet(s.routine_template_exercise_set_id, "reps", e.target.value)
                                      }
                                      className="bg-white border-[var(--border)] text-[var(--foreground)] text-center h-8 rounded-md focus:border-[var(--warm-sage)] focus:ring-[var(--warm-sage)]/20 text-sm"
                                      min="0"
                                    />
                                    <Input
                                      type="number"
                                      step="0.5"
                                      value={editingSets[s.routine_template_exercise_set_id]?.weight || "0"}
                                      onChange={(e) =>
                                        updateEditingSet(s.routine_template_exercise_set_id, "weight", e.target.value)
                                      }
                                      className="bg-white border-[var(--border)] text-[var(--foreground)] text-center h-8 rounded-md focus:border-[var(--warm-coral)] focus:ring-[var(--warm-coral)]/20 text-sm"
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
                                      disabled={sortedSets.length <= 1}
                                      className={`p-1 h-auto ${
                                        sortedSets.length <= 1
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
                                  onClick={() => addSetToExercise(savedExercise.routine_template_exercise_id)}
                                  className="w-full py-2 text-sm bg-[var(--warm-sage)]/10 text-[var(--warm-sage)] hover:bg-[var(--warm-sage)]/20 border-2 border-dashed border-[var(--warm-sage)]/30 rounded-lg"
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
                                        <span className="text-[var(--warm-brown)]/50 italic">No data</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-3">
                            <p className="text-sm text-[var(--warm-brown)]/60">No sets data found</p>
                            {!isEditing && (
                              <TactileButton
                                variant="secondary"
                                size="sm"
                                onClick={() => handleEditSets(savedExercise.routine_template_exercise_id)}
                                className="mt-2 px-3 py-1 text-xs bg-[var(--warm-coral)]/10 text-[var(--warm-coral)] hover:bg-[var(--warm-coral)]/20 border-[var(--warm-coral)]/30"
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
              <p className="text-[var(--muted-foreground)]">Ready to add exercises to this routine</p>
            </div>
          )}
        </div>

        {/* Configure Card (only when a new exercise is selected) */}
        {currentExercise && (
          <div className="mx-4 mb-6 p-4 bg-white/70 border border-[var(--border)] rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-[var(--muted)] rounded-lg flex items-center justify-center overflow-hidden">
                <span className="text-lg font-medium text-[var(--muted-foreground)]">
                  {currentExercise.name.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="font-medium text-[var(--foreground)] mb-1">{currentExercise.name}</h2>
                <p className="text-sm text-[var(--muted-foreground)]">{sets.length} Sets</p>
              </div>
              <span className="text-xs bg-[var(--warm-coral)]/20 text-[var(--warm-coral)] px-2 py-1 rounded-full">
                CONFIGURING
              </span>
            </div>

            {getExerciseNote() && (
              <p className="text-sm text-[var(--muted-foreground)] mb-4 italic bg-[var(--warm-cream)]/50 p-3 rounded-lg">
                {getExerciseNote()}
              </p>
            )}

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div></div>
              <div className="text-center">
                <h3 className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-2">REPS</h3>
              </div>
              <div className="text-center">
                <h3 className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-2">WEIGHT (KG)</h3>
              </div>
            </div>

            <div className="space-y-3">
              {sets.map((s, index) => (
                <div key={s.id} className="grid grid-cols-3 gap-4 items-center">
                  <div className="flex items-center justify-center">
                    <span className="text-lg font-medium text-[var(--foreground)]">{index + 1}</span>
                  </div>
                  <div>
                    <Input
                      type="number"
                      value={s.reps}
                      onChange={(e) => updateSet(s.id, "reps", e.target.value)}
                      className="bg-[var(--input-background)] border-[var(--border)] text-[var(--foreground)] text-center h-12 rounded-lg focus:border-[var(--warm-coral)] focus:ring-[var(--warm-coral)]/20"
                      min="0"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.5"
                      value={s.weight}
                      onChange={(e) => updateSet(s.id, "weight", e.target.value)}
                      className="bg-[var(--input-background)] border-[var(--border)] text-[var(--foreground)] text-center h-12 rounded-lg focus:border-[var(--warm-coral)] focus:ring-[var(--warm-coral)]/20"
                      min="0"
                    />
                    <TactileButton
                      variant="secondary"
                      size="sm"
                      onClick={() => removeSet(s.id)}
                      disabled={sets.length <= 1}
                      className={`p-2 h-auto bg-white/70 border-[var(--border)] hover:bg-red-50 ${
                        sets.length <= 1 ? "opacity-30 cursor-not-allowed" : "text-red-500"
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
                className="flex items-center gap-2 bg-white/70 border-[var(--border)] text-[var(--foreground)] hover:bg-white px-4 py-2 rounded-lg btn-tactile"
              >
                <Plus size={16} />
                <span className="text-sm font-medium uppercase tracking-wider">Add Set</span>
              </TactileButton>

              {/* Trash cancels configure */}
              <TactileButton
                variant="secondary"
                size="sm"
                onClick={() => {
                  setCurrentExercise(undefined);
                  resetForm();
                }}
                className="p-3 h-auto bg-white/70 border-red-200 text-red-500 hover:bg-red-50 btn-tactile"
              >
                <Trash2 size={18} />
              </TactileButton>
            </div>

            <div className="mt-6">
              <TactileButton
                onClick={handleSave}
                disabled={isSaving}
                className="w-full h-14 bg-[var(--warm-coral)] text-white font-medium rounded-full hover:bg-[var(--warm-coral)]/90 btn-tactile"
              >
                {isSaving ? "SAVING..." : "SAVE EXERCISE"}
              </TactileButton>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Save/Cancel bar when editing inline */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-[var(--border)] z-50 px-4 pt-4">
          <div className="flex gap-3">
            <TactileButton
              variant="secondary"
              onClick={handleCancelAllEdits}
              className="flex-1 h-12 bg-transparent border-[var(--warm-brown)]/20 text-[var(--warm-brown)]/60 hover:bg-[var(--soft-gray)] font-medium"
            >
              CANCEL ALL
            </TactileButton>
            <TactileButton
              onClick={handleSaveAllChanges}
              disabled={savingAllChanges}
              className="flex-1 h-12 font-medium border-0 transition-all bg-[var(--warm-coral)] hover:bg-[var(--warm-coral)]/90 text-white btn-tactile"
            >
              {savingAllChanges ? "SAVING..." : `SAVE ALL (${editingExercises.size})`}
            </TactileButton>
          </div>
        </div>
      )}
    </div>
  );
}