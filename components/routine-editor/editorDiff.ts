// src/state/routine-editor/editorDiff.ts
import type { EditorRoutine } from "./editorTypes";

/** What your save flow will execute */
export type SavePlan = {
  exercisesToCreate: Array<{
    routine_template_id: number;
    exercise_id: number;
    exercise_order: number;
    // local temp id so we can map new ids back if you want (optional)
    _temp_id: number;
  }>;
  exercisesToDelete: number[]; // routine_template_exercise_id

  setsToCreateByExercise: Record<
    number, // routine_template_exercise_id (final id; for brand new ex you may need a second pass)
    Array<{ reps: number; weight: number; set_order: number }>
  >;

  setsToUpdate: Array<{
    routine_template_exercise_set_id: number;
    reps: number;
    weight: number;
  }>;

  setOrderUpdates: Array<{
    routine_template_exercise_set_id: number;
    set_order: number;
  }>;

  setsToDelete: number[]; // routine_template_exercise_set_id
};

/** Build plan from flags; you then call your supabaseAPI in this order */
export function buildSavePlan(editor: EditorRoutine): SavePlan {
  const plan: SavePlan = {
    exercisesToCreate: [],
    exercisesToDelete: [],
    setsToCreateByExercise: {},
    setsToUpdate: [],
    setOrderUpdates: [],
    setsToDelete: [],
  };

  // Exercises
  for (const exId of editor.exerciseOrder.concat(
    // include deleted ones that were removed from order
    Object.keys(editor.exercises)
      .map(Number)
      .filter((id) => !editor.exerciseOrder.includes(id))
  )) {
    const ex = editor.exercises[exId];
    if (!ex) continue;

    if (ex.deleted && ex.routine_template_exercise_id > 0) {
      plan.exercisesToDelete.push(ex.routine_template_exercise_id);
      continue;
    }

    if (ex.created) {
      plan.exercisesToCreate.push({
        routine_template_id: editor.routine_template_id,
        exercise_id: ex.exercise_id,
        exercise_order: ex.exercise_order,
        _temp_id: ex.routine_template_exercise_id,
      });
    }

    // Sets
    const createBucket: Array<{ reps: number; weight: number; set_order: number }> = [];
    ex.setOrder.forEach((sid) => {
      const s = ex.sets[sid];
      if (!s) return;

      if (s.deleted && s.routine_template_exercise_set_id > 0) {
        plan.setsToDelete.push(s.routine_template_exercise_set_id);
        return;
      }

      if (s.created) {
        const reps = s.planned_reps || 0;
        const weight = s.planned_weight_kg || 0;
        if (reps > 0 || weight > 0) {
          createBucket.push({ reps, weight, set_order: s.set_order });
        }
      } else if (s.dirty) {
        // if value changed OR order changed
        const reps = s.planned_reps || 0;
        const weight = s.planned_weight_kg || 0;
        plan.setsToUpdate.push({
          routine_template_exercise_set_id: s.routine_template_exercise_set_id,
          reps,
          weight,
        });
        // also push explicit order update (optional if your update call handles it)
        plan.setOrderUpdates.push({
          routine_template_exercise_set_id: s.routine_template_exercise_set_id,
          set_order: s.set_order,
        });
      }
    });

    if (createBucket.length) {
      // If the exercise itself is newly created, you’ll need to:
      // 1) create exercise -> get new id -> 2) create sets under that id
      // Keep bucket under the (possibly temp) ex id; your save flow will remap.
      plan.setsToCreateByExercise[ex.routine_template_exercise_id] = createBucket;
    }
  }

  return plan;
}
