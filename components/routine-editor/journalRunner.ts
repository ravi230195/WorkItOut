// components/routine-editor/journalRunner.ts
import { supabaseAPI } from "../../utils/supabase/supabase-api";
import type { SavePlan } from "./collapseJournal";
import type { Id } from "./journalTypes";
import { logger } from "../../utils/logging";

// Debug logging utility
const DGB = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  if (data) {
    logger.debug(`🔍 DGB [${timestamp}] ${message}`, data);
  } else {
    logger.debug(`🔍 DGB [${timestamp}] ${message}`);
  }
};

/** Map both temp and DB exercise ids to (templateId, exerciseId) */
export type ExIdMap = Record<Id, { templateId?: number; exerciseId: number }>;

export async function runJournal(plan: SavePlan, routineId: number, exMap: ExIdMap) {
  DGB(`Starting runJournal with plan:`, plan);
  DGB(`Routine ID: ${routineId}, Exercise Map:`, exMap);
  
  // 1) delete whole exercises
  if (plan.deleteExercises.length) {
    DGB(`Deleting ${plan.deleteExercises.length} exercises:`, plan.deleteExercises);
    await Promise.all(plan.deleteExercises.map((id) => supabaseAPI.deleteRoutineExercise(id)));
  }

  // 2) delete sets
  if (plan.deleteSets.length) {
    DGB(`Deleting ${plan.deleteSets.length} sets:`, plan.deleteSets);
    await Promise.all(plan.deleteSets.map((id) => supabaseAPI.deleteExerciseSet(id)));
  }

  // 3) update values
  if (plan.updateSets.length) {
    DGB(`Updating ${plan.updateSets.length} sets:`, plan.updateSets);
    await Promise.all(plan.updateSets.map((u) => supabaseAPI.updateExerciseSet(u.id, u.reps, u.weight)));
  }

  // 4) update orders
  if (plan.orderSets.length) {
    DGB(`Reordering ${plan.orderSets.length} sets:`, plan.orderSets);
    await Promise.all(plan.orderSets.map((o) => supabaseAPI.updateExerciseSetOrder(o.id, o.set_order)));
  }

  // 5) create new exercises, keep their new templateIds
  DGB(`Creating ${plan.createExercises.length} new exercises:`, plan.createExercises);
  const createdTemplateIds = new Map<Id, number>(); // temp exId -> templateId
  for (const e of plan.createExercises) {
    const sets = plan.createSetsByExercise[e.tempExId];
    if (!sets || sets.length === 0) {
      DGB(`Skipping exercise ${e.tempExId} - no set payloads`);
      continue;
    }
    DGB(`Creating exercise:`, e);
    const saved = await supabaseAPI.addExerciseToRoutine(routineId, e.exerciseId, e.order);
    if (saved) {
      createdTemplateIds.set(e.tempExId, saved.routine_template_exercise_id);
      DGB(`Exercise created with template ID: ${saved.routine_template_exercise_id}`);
    }
  }

  // 6) create sets (for new and existing exercises)
  DGB(`Creating sets for exercises:`, Object.keys(plan.createSetsByExercise));
  for (const [exIdStr, rows] of Object.entries(plan.createSetsByExercise)) {
    const exId = Number(exIdStr) as Id;
    DGB(`Processing sets for exercise ID: ${exId}, rows:`, rows);
    const entry = exMap[exId];
    const templateId = createdTemplateIds.get(exId) ?? entry?.templateId;
    const exerciseId = entry?.exerciseId;
    DGB(`Template ID: ${templateId}, Exercise ID: ${exerciseId}`);
    
    if (!templateId || !exerciseId) {
      DGB(`Skipping exercise ${exId} - missing templateId or exerciseId`);
      continue;
    }

    const payload = rows
      .map((r) => ({ reps: r.reps, weight: r.weight, set_order: r.set_order || 0 }))
      .filter((r) => r.reps > 0 || r.weight > 0);

    DGB(`Filtered payload for exercise ${exId}:`, payload);
    if (payload.length) {
      DGB(`Adding ${payload.length} sets to routine`);
      await supabaseAPI.addExerciseSetsToRoutine(templateId, exerciseId, payload);
    }
  }

  // 7) recompute summary
  DGB(`Recomputing muscle summary for routine ${routineId}`);
  await supabaseAPI.recomputeAndSaveRoutineMuscleSummary(routineId);
  DGB(`Journal execution completed successfully`);
}
