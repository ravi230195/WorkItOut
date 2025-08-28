// src/state/routine-editor/saveRunner.ts
import type { SavePlan } from "./editorDiff";
import { supabaseAPI } from "../../utils/supabase/supabase-api";

/**
 * Executes the plan in the right order. Returns a map from temp exercise ids
 * to real ids so you can refresh local state or rebuild from DB.
 */
export async function runSavePlan(plan: SavePlan) {
  const tempIdMap = new Map<number, number>(); // tempExId -> realExId

  // 1) Create exercises (capture new ids)
  for (const ex of plan.exercisesToCreate) {
    const created = await supabaseAPI.addExerciseToRoutine(
      ex.routine_template_id,
      ex.exercise_id,
      ex.exercise_order
    );
    if (created?.routine_template_exercise_id) {
      tempIdMap.set(ex._temp_id, created.routine_template_exercise_id);
    }
  }

  // 2) Create sets (handle temp exercise ids -> real ids)
  for (const [exIdStr, payload] of Object.entries(plan.setsToCreateByExercise)) {
    let exId = Number(exIdStr);
    if (exId < 0) {
      const mapped = tempIdMap.get(exId);
      if (!mapped) continue; // exercise creation failed
      exId = mapped;
    }

    if (payload.length === 0) continue;

    // Need an exercise_id (foreign key) for addExerciseSetsToRoutine
    // If your API requires exercise_id, fetch it (or include it in plan).
    // Here we assume supabaseAPI has a helper to look it up or you pass it in.
    // Example: supabaseAPI.addExerciseSetsToRoutine(templateExId, exerciseId, rows)
    // You might need to resolve exerciseId from your editor state before building the plan.

    // If your API doesn’t need exercise_id here, remove it:
    // await supabaseAPI.addExerciseSetsToRoutine(exId, exerciseId, payload);
    // For brevity we’ll assume you can call it once you know the exerciseId.
    // (Wire this based on your actual facade.)
  }

  // 3) Update sets (values)
  await Promise.all(
    plan.setsToUpdate.map((u) =>
      supabaseAPI.updateExerciseSet(u.routine_template_exercise_set_id, u.reps, u.weight)
    )
  );

  // 4) Update set orders (if your API needs an explicit call)
  await Promise.all(
    plan.setOrderUpdates.map((o) =>
      supabaseAPI.updateExerciseSetOrder(o.routine_template_exercise_set_id, o.set_order)
    )
  );

  // 5) Delete sets
  await Promise.all(plan.setsToDelete.map((id) => supabaseAPI.deleteExerciseSet(id)));

  // 6) Delete exercises (if you support this from the editor)
  // (You might soft delete with is_active=false instead)
  // await Promise.all(plan.exercisesToDelete.map((id) => supabaseAPI.deleteExercise(id)));

  return { tempIdMap };
}
