import { useState, useEffect } from "react";
import { ArrowLeft, Plus, X, Trash2, MoreVertical, ChevronUp } from "lucide-react";
import { TactileButton } from "./TactileButton";
import { Input } from "./ui/input";
import { supabaseAPI, Exercise, UserRoutineExercise, UserRoutineExerciseSet } from "../utils/supabase-api";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useKeyboardInset } from "../hooks/useKeyboardInset";

interface Set {
  id: string;
  reps: string;
  weight: string;
}

interface ExerciseSetupScreenProps {
  exercise?: Exercise; // Made optional - might not have exercise selected
  routineId: number;
  routineName: string;
  onBack: () => void;
  onSave: () => void;
  onAddMoreExercises: () => void;
  isEditingExistingRoutine?: boolean; // New prop to differentiate flow
  onShowExerciseSelector?: () => void; // New prop for exercise selection
}

interface SavedExerciseWithDetails extends UserRoutineExercise {
  exercise_name?: string;
  category?: string;
}

export function ExerciseSetupScreen({ 
  exercise, 
  routineId, 
  routineName, 
  onBack, 
  onSave,
  onAddMoreExercises,
  isEditingExistingRoutine = false,
  onShowExerciseSelector
}: ExerciseSetupScreenProps) {
  // Keyboard-aware scrolling
  useKeyboardInset();
  
  const [sets, setSets] = useState<Set[]>([
    { id: '1', reps: '0', weight: '0' },
    { id: '2', reps: '0', weight: '0' },
    { id: '3', reps: '0', weight: '0' }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedExercises, setSavedExercises] = useState<SavedExerciseWithDetails[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [currentExercise, setCurrentExercise] = useState<Exercise | undefined>(exercise);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);
  const [exerciseSetsData, setExerciseSetsData] = useState<Record<number, UserRoutineExerciseSet[]>>({});
  const [loadingSets, setLoadingSets] = useState<Record<number, boolean>>({});
  const [editingExercises, setEditingExercises] = useState<Set<number>>(new Set());
  const [editingSets, setEditingSets] = useState<Record<number, { reps: string; weight: string }>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savingAllChanges, setSavingAllChanges] = useState(false);
  const { userToken } = useAuth();

  // Update current exercise when prop changes
  useEffect(() => {
    setCurrentExercise(exercise);
  }, [exercise]);

  // Load saved exercises for this routine
  useEffect(() => {
    const loadSavedExercises = async () => {
      if (!userToken) return;
      
      setIsLoadingSaved(true);
      try {
        // Load saved exercises for this routine (with exercise details from join)
        const saved = await supabaseAPI.getUserRoutineExercisesWithDetails(routineId);
        setSavedExercises(saved);
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
    setSets([...sets, { id: newId, reps: '0', weight: '0' }]);
  };

  const removeSet = (setId: string) => {
    if (sets.length > 1) {
      setSets(sets.filter(set => set.id !== setId));
    }
  };

  const updateSet = (setId: string, field: 'reps' | 'weight', value: string) => {
    setSets(sets.map(set => 
      set.id === setId 
        ? { ...set, [field]: value }
        : set
    ));
  };

  const resetForm = () => {
    setSets([
      { id: '1', reps: '0', weight: '0' },
      { id: '2', reps: '0', weight: '0' },
      { id: '3', reps: '0', weight: '0' }
    ]);
  };

  const refreshSavedExercises = async () => {
    try {
      const saved = await supabaseAPI.getUserRoutineExercisesWithDetails(routineId);
      setSavedExercises(saved);
    } catch (error) {
      console.error("Failed to refresh saved exercises:", error);
    }
  };

  const handleSave = async () => {
    if (!currentExercise) {
      toast.error("No exercise selected");
      return;
    }

    if (!userToken) {
      toast.error("Please sign in to save exercise");
      return;
    }

    // Validate that at least one set has reps or weight > 0
    const hasValidSet = sets.some(set => 
      (parseInt(set.reps) > 0) || (parseFloat(set.weight) > 0)
    );
    
    if (!hasValidSet) {
      toast.error("Please add at least one set with reps or weight");
      return;
    }

    setIsSaving(true);
    try {
      // Get the current number of exercises in the routine for ordering
      const exerciseOrder = savedExercises.length + 1;

      // Calculate valid sets that have reps or weight > 0
      const validSets = sets.filter(set => 
        parseInt(set.reps) > 0 || parseFloat(set.weight) > 0
      );
      
      // Add the exercise to the routine (basic info only - detailed sets go to separate table)
      const savedExercise = await supabaseAPI.addExerciseToRoutine(
        routineId, 
        currentExercise.exercise_id, 
        exerciseOrder
      );

      if (!savedExercise) {
        throw new Error("Failed to save exercise to routine");
      }

      // Now save the individual sets data to the new table
      const setsToSave = validSets.map(set => ({
        reps: parseInt(set.reps) || 0,
        weight: parseFloat(set.weight) || 0
      }));

      await supabaseAPI.addExerciseSetsToRoutine(
        savedExercise.routine_template_exercise_id,
        currentExercise.exercise_id,
        setsToSave
      );

      toast.success(`Added ${currentExercise.name} with ${validSets.length} sets to routine`);
      
      // Refresh the saved exercises list and clear the current exercise - STAY ON SCREEN
      await refreshSavedExercises();
      
      // Clear the current exercise locally and reset form
      setCurrentExercise(undefined);
      resetForm();
      
      // Call onSave to trigger clearing the selected exercise in parent
      onSave();
      
    } catch (error) {
      console.error("Failed to save exercise:", error);
      if (error instanceof Error) {
        toast.error(`Failed to save exercise: ${error.message}`);
      } else {
        toast.error("Failed to save exercise. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleKebabClick = async (savedExercise: SavedExerciseWithDetails, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent any parent click handlers
    
    const exerciseTemplateId = savedExercise.routine_template_exercise_id;
    console.log('🔥 KEBAB MENU CLICKED for:', savedExercise.exercise_name, 'Template ID:', exerciseTemplateId);
    
    // Toggle expanded state
    if (expandedExercise === exerciseTemplateId) {
      console.log('Closing expanded exercise');
      setExpandedExercise(null);
      setEditingExercise(null); // Exit edit mode when closing
      return;
    }

    console.log('Expanding exercise, loading sets data...');
    setExpandedExercise(exerciseTemplateId);

    // If we already have the data, don't fetch again
    if (exerciseSetsData[exerciseTemplateId]) {
      console.log('Using cached sets data');
      return;
    }

    // Fetch sets data for this routine exercise
    setLoadingSets(prev => ({ ...prev, [exerciseTemplateId]: true }));
    try {
      console.log('Fetching sets for routine exercise:', exerciseTemplateId);
      const setsData = await supabaseAPI.getExerciseSetsForRoutine(exerciseTemplateId);
      console.log('Fetched sets data:', setsData);
      setExerciseSetsData(prev => ({ ...prev, [exerciseTemplateId]: setsData }));
    } catch (error) {
      console.error("Failed to fetch exercise sets:", error);
      toast.error("Failed to load exercise sets");
      setExpandedExercise(null); // Close on error
    } finally {
      setLoadingSets(prev => ({ ...prev, [exerciseTemplateId]: false }));
    }
  };

  const handleEditSets = (exerciseTemplateId: number) => {
    const setsData = exerciseSetsData[exerciseTemplateId] || [];
    
    // Add to editing exercises set
    setEditingExercises(prev => new Set([...prev, exerciseTemplateId]));
    
    // Initialize editing state with current values
    const newEditingState: Record<number, { reps: string; weight: string }> = {};
    setsData.forEach(set => {
      newEditingState[set.routine_template_exercise_set_id] = {
        reps: set.planned_reps?.toString() || '0',
        weight: set.planned_weight_kg?.toString() || '0'
      };
    });
    
    setEditingSets(prev => ({ ...prev, ...newEditingState }));
    setHasUnsavedChanges(true);
  };

  const handleCancelEdit = (exerciseTemplateId: number) => {
    // Remove from editing exercises
    setEditingExercises(prev => {
      const newSet = new Set(prev);
      newSet.delete(exerciseTemplateId);
      return newSet;
    });
    
    // Remove editing data for this exercise
    const setsData = exerciseSetsData[exerciseTemplateId] || [];
    const setIdsToRemove = setsData.map(set => set.routine_template_exercise_set_id);
    
    setEditingSets(prev => {
      const newState = { ...prev };
      setIdsToRemove.forEach(id => delete newState[id]);
      return newState;
    });
    
    // Check if any exercises are still being edited
    const remainingEditing = Array.from(editingExercises).filter(id => id !== exerciseTemplateId);
    if (remainingEditing.length === 0) {
      setHasUnsavedChanges(false);
    }
  };

  const handleCancelAllEdits = () => {
    setEditingExercises(new Set());
    setEditingSets({});
    setHasUnsavedChanges(false);
  };

  const updateEditingSet = (setId: number, field: 'reps' | 'weight', value: string) => {
    setEditingSets(prev => ({
      ...prev,
      [setId]: {
        ...prev[setId],
        [field]: value
      }
    }));
  };

  const addSetToExercise = (exerciseTemplateId: number) => {
    const setsData = exerciseSetsData[exerciseTemplateId] || [];
    const newSetOrder = setsData.length + 1;
    
    // Create a temporary set with negative ID (will be created on save)
    const tempSetId = -(Date.now()); // Negative ID for temp sets
    
    // Add to editing state
    setEditingSets(prev => ({
      ...prev,
      [tempSetId]: {
        reps: '0',
        weight: '0'
      }
    }));
    
    // Add to local sets data for display
    const tempSet: UserRoutineExerciseSet = {
      routine_template_exercise_set_id: tempSetId,
      routine_template_exercise_id: exerciseTemplateId,
      exercise_id: 0, // Will be set properly on save
      set_order: newSetOrder,
      is_active: true,
      planned_reps: 0,
      planned_weight_kg: 0
    };
    
    setExerciseSetsData(prev => ({
      ...prev,
      [exerciseTemplateId]: [...(prev[exerciseTemplateId] || []), tempSet]
    }));
  };

  const removeSetFromExercise = (exerciseTemplateId: number, setId: number) => {
    // Remove from editing state
    setEditingSets(prev => {
      const newState = { ...prev };
      delete newState[setId];
      return newState;
    });
    
    // Remove from local sets data
    setExerciseSetsData(prev => ({
      ...prev,
      [exerciseTemplateId]: (prev[exerciseTemplateId] || []).filter(
        set => set.routine_template_exercise_set_id !== setId
      )
    }));
  };

  const handleSaveAllChanges = async () => {
    if (!userToken) {
      toast.error("Please sign in to save changes");
      return;
    }

    setSavingAllChanges(true);
    
    try {
      // Process all editing exercises
      for (const exerciseTemplateId of editingExercises) {
        const setsData = exerciseSetsData[exerciseTemplateId] || [];
        
        // Handle existing sets (update)
        const existingSets = setsData.filter(set => set.routine_template_exercise_set_id > 0);
        const updatePromises = existingSets.map(async (set) => {
          const editingData = editingSets[set.routine_template_exercise_set_id];
          if (editingData) {
            const reps = parseInt(editingData.reps) || 0;
            const weight = parseFloat(editingData.weight) || 0;
            
            return await supabaseAPI.updateExerciseSet(
              set.routine_template_exercise_set_id,
              reps,
              weight
            );
          }
          return set;
        });
        
        await Promise.all(updatePromises);
        
        // Handle new sets (create)
        const newSets = setsData.filter(set => set.routine_template_exercise_set_id < 0);
        if (newSets.length > 0) {
          const newSetsData = newSets.map(set => {
            const editingData = editingSets[set.routine_template_exercise_set_id];
            return {
              reps: parseInt(editingData?.reps || '0') || 0,
              weight: parseFloat(editingData?.weight || '0') || 0
            };
          }).filter(set => set.reps > 0 || set.weight > 0); // Only save sets with data
          
          if (newSetsData.length > 0) {
            // Get the exercise ID from the existing sets
            const existingSet = existingSets[0];
            if (existingSet) {
              await supabaseAPI.addExerciseSetsToRoutine(
                exerciseTemplateId,
                existingSet.exercise_id,
                newSetsData
              );
            }
          }
        }
        
        // Refresh the sets data for this exercise
        const updatedSetsData = await supabaseAPI.getExerciseSetsForRoutine(exerciseTemplateId);
        setExerciseSetsData(prev => ({ ...prev, [exerciseTemplateId]: updatedSetsData }));
      }
      
      // Clear all editing state
      setEditingExercises(new Set());
      setEditingSets({});
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
    if (name.includes('dumbbell') && !name.includes('single')) {
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
          onClick={isEditingExistingRoutine && onShowExerciseSelector ? onShowExerciseSelector : onAddMoreExercises}
          className="p-2 h-auto bg-[var(--warm-sage)]/80 border-[var(--border)] text-white hover:bg-[var(--warm-sage)] btn-tactile-sage"
        >
          <Plus size={20} />
        </TactileButton>
      </div>

      <div className="flex-1">
        {/* Saved Exercises - ALWAYS SHOW */}
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
                
                return (
                  <div key={savedExercise.routine_template_exercise_id || index} className="space-y-2">
                    <div className={`flex items-center gap-3 p-3 border rounded-xl transition-all ${
                      isEditing 
                        ? 'bg-[var(--warm-coral)]/5 border-[var(--warm-coral)]/30' 
                        : 'bg-white/70 border-[var(--border)]'
                    }`}>
                      <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center overflow-hidden">
                        {savedExercise.exercise_name?.includes('Press') || savedExercise.exercise_name?.includes('Arnold') ? (
                          <ImageWithFallback 
                            src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop&crop=center"
                            alt={savedExercise.exercise_name}
                            className="w-full h-full object-cover"
                          />
                        ) : savedExercise.exercise_name?.includes('Bike') || savedExercise.exercise_name?.includes('Assault') ? (
                          <ImageWithFallback 
                            src="https://images.unsplash.com/photo-1544397886-6bd04d7a922e?w=100&h=100&fit=crop&crop=center"
                            alt={savedExercise.exercise_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium text-[var(--muted-foreground)]">
                            {(savedExercise.exercise_name || '').substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[var(--foreground)]">{savedExercise.exercise_name}</p>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          Exercise #{savedExercise.exercise_order} • {savedExercise.category || 'Exercise'}
                          {isEditing && <span className="text-[var(--warm-coral)] ml-2">• Editing</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <TactileButton
                          variant="secondary"
                          size="sm"
                          onClick={(e) => handleKebabClick(savedExercise, e)}
                          className={`p-2 h-auto bg-transparent hover:bg-[var(--warm-brown)]/10 text-[var(--warm-brown)]/60 hover:text-[var(--warm-brown)] ${
                            isEditing ? 'ring-2 ring-[var(--warm-coral)]/30' : ''
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
                        ) : setsData.length > 0 ? (
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
                              // Edit Mode
                              <div className="space-y-3">
                                <div className="grid grid-cols-4 gap-3 text-xs text-[var(--warm-brown)]/60 uppercase tracking-wider">
                                  <span>Set</span>
                                  <span className="text-center">Reps</span>
                                  <span className="text-center">Weight (kg)</span>
                                  <span></span>
                                </div>
                                {setsData.map((set, setIndex) => (
                                  <div key={set.routine_template_exercise_set_id} className="grid grid-cols-4 gap-3 items-center py-2 px-3 bg-[var(--soft-gray)]/30 rounded-lg border border-[var(--border)]/20">
                                    <span className="text-sm font-medium text-[var(--warm-brown)]/80">
                                      {set.set_order}
                                    </span>
                                    <Input
                                      type="number"
                                      value={editingSets[set.routine_template_exercise_set_id]?.reps || '0'}
                                      onChange={(e) => updateEditingSet(set.routine_template_exercise_set_id, 'reps', e.target.value)}
                                      className="bg-white border-[var(--border)] text-[var(--foreground)] text-center h-8 rounded-md focus:border-[var(--warm-sage)] focus:ring-[var(--warm-sage)]/20 text-sm"
                                      min="0"
                                    />
                                    <Input
                                      type="number"
                                      step="0.5"
                                      value={editingSets[set.routine_template_exercise_set_id]?.weight || '0'}
                                      onChange={(e) => updateEditingSet(set.routine_template_exercise_set_id, 'weight', e.target.value)}
                                      className="bg-white border-[var(--border)] text-[var(--foreground)] text-center h-8 rounded-md focus:border-[var(--warm-coral)] focus:ring-[var(--warm-coral)]/20 text-sm"
                                      min="0"
                                    />
                                    <TactileButton
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => removeSetFromExercise(savedExercise.routine_template_exercise_id, set.routine_template_exercise_set_id)}
                                      disabled={setsData.length <= 1}
                                      className={`p-1 h-auto ${setsData.length <= 1 ? 'opacity-30 cursor-not-allowed' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
                                      title="Remove this set"
                                    >
                                      <X size={14} />
                                    </TactileButton>
                                  </div>
                                ))}
                                
                                {/* Add Set Button */}
                                <TactileButton
                                  onClick={() => addSetToExercise(savedExercise.routine_template_exercise_id)}
                                  className="w-full py-2 text-sm bg-[var(--warm-sage)]/10 text-[var(--warm-sage)] hover:bg-[var(--warm-sage)]/20 border-2 border-dashed border-[var(--warm-sage)]/30 rounded-lg"
                                >
                                  <Plus size={16} className="mr-2" />
                                  Add Set
                                </TactileButton>
                              </div>
                            ) : (
                              // View Mode
                              <div className="space-y-2">
                                {setsData.map((set, setIndex) => (
                                  <div key={set.routine_template_exercise_set_id} className="flex items-center justify-between py-2 px-3 bg-[var(--soft-gray)]/30 rounded-lg border border-[var(--border)]/20">
                                    <span className="text-sm font-medium text-[var(--warm-brown)]/80">Set {set.set_order}</span>
                                    <div className="flex items-center gap-3 text-sm text-[var(--warm-brown)]">
                                      {set.planned_reps && (
                                        <span className="bg-[var(--warm-sage)]/20 text-[var(--warm-sage)] px-2 py-1 rounded-md">
                                          {set.planned_reps} reps
                                        </span>
                                      )}
                                      {set.planned_weight_kg && (
                                        <span className="bg-[var(--warm-coral)]/20 text-[var(--warm-coral)] px-2 py-1 rounded-md">
                                          {set.planned_weight_kg}kg
                                        </span>
                                      )}
                                      {!set.planned_reps && !set.planned_weight_kg && (
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

        {/* Current Exercise Setup - ONLY SHOW IF EXERCISE SELECTED */}
        {currentExercise && (
          <div className="mx-4 mb-6 p-4 bg-white/70 border border-[var(--border)] rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-[var(--muted)] rounded-lg flex items-center justify-center overflow-hidden">
                {currentExercise.name.includes('Press') || currentExercise.name.includes('Arnold') ? (
                  <ImageWithFallback 
                    src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop&crop=center"
                    alt={currentExercise.name}
                    className="w-full h-full object-cover"
                  />
                ) : currentExercise.name.includes('Bike') || currentExercise.name.includes('Assault') ? (
                  <ImageWithFallback 
                    src="https://images.unsplash.com/photo-1544397886-6bd04d7a922e?w=100&h=100&fit=crop&crop=center"
                    alt={currentExercise.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-medium text-[var(--muted-foreground)]">
                    {currentExercise.name.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h2 className="font-medium text-[var(--foreground)] mb-1">{currentExercise.name}</h2>
                <p className="text-sm text-[var(--muted-foreground)]">{sets.length} Sets</p>
              </div>
              <span className="text-xs bg-[var(--warm-coral)]/20 text-[var(--warm-coral)] px-2 py-1 rounded-full">
                CONFIGURING
              </span>
            </div>

            {/* Exercise Note */}
            {getExerciseNote() && (
              <p className="text-sm text-[var(--muted-foreground)] mb-4 italic bg-[var(--warm-cream)]/50 p-3 rounded-lg">
                {getExerciseNote()}
              </p>
            )}

            {/* Sets Headers */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div></div>
              <div className="text-center">
                <h3 className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-2">REPS</h3>
              </div>
              <div className="text-center">
                <h3 className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-2">WEIGHT (KG)</h3>
              </div>
            </div>

            {/* Sets */}
            <div className="space-y-3">
              {sets.map((set, index) => (
                <div key={set.id} className="grid grid-cols-3 gap-4 items-center">
                  <div className="flex items-center justify-center">
                    <span className="text-lg font-medium text-[var(--foreground)]">{index + 1}</span>
                  </div>
                  <div>
                    <Input
                      type="number"
                      value={set.reps}
                      onChange={(e) => updateSet(set.id, 'reps', e.target.value)}
                      className="bg-[var(--input-background)] border-[var(--border)] text-[var(--foreground)] text-center h-12 rounded-lg focus:border-[var(--warm-coral)] focus:ring-[var(--warm-coral)]/20"
                      min="0"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.5"
                      value={set.weight}
                      onChange={(e) => updateSet(set.id, 'weight', e.target.value)}
                      className="bg-[var(--input-background)] border-[var(--border)] text-[var(--foreground)] text-center h-12 rounded-lg focus:border-[var(--warm-coral)] focus:ring-[var(--warm-coral)]/20"
                      min="0"
                    />
                    <TactileButton
                      variant="secondary"
                      size="sm"
                      onClick={() => removeSet(set.id)}
                      disabled={sets.length <= 1}
                      className={`p-2 h-auto bg-white/70 border-[var(--border)] hover:bg-red-50 ${
                        sets.length <= 1 ? 'opacity-30 cursor-not-allowed' : 'text-red-500'
                      }`}
                    >
                      <X size={16} />
                    </TactileButton>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Set Button */}
            <div className="mt-4 flex justify-between items-center">
              <TactileButton
                onClick={addSet}
                className="flex items-center gap-2 bg-white/70 border-[var(--border)] text-[var(--foreground)] hover:bg-white px-4 py-2 rounded-lg btn-tactile"
              >
                <Plus size={16} />
                <span className="text-sm font-medium uppercase tracking-wider">Add Set</span>
              </TactileButton>

              <TactileButton
                variant="secondary"
                size="sm"
                className="p-3 h-auto bg-white/70 border-red-200 text-red-500 hover:bg-red-50 btn-tactile"
              >
                <Trash2 size={18} />
              </TactileButton>
            </div>

            {/* Save Button */}
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

      {/* Master Save/Cancel Bar - Fixed at bottom when editing */}
      {hasUnsavedChanges && (
        <div 
          className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-[var(--border)] z-50 px-4 pt-4" 

        >
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
              {savingAllChanges 
                ? "SAVING..." 
                : `SAVE ALL (${editingExercises.size})`
              }
            </TactileButton>
          </div>
        </div>
      )}
    </div>
  );
}