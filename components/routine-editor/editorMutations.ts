// src/state/routine-editor/editorMutations.ts
import { makeTempId } from "./editorTypes";
import type {
  EditorRoutine,
  EditorUserRoutineExercise,
  EditorUserRoutineExerciseSet,
} from "./editorTypes";

/** Recompute hasUnsaved from flags */
function recomputeHasUnsaved(editor: EditorRoutine) {
  const anyExerciseDirty = editor.exerciseOrder.some((exId) => {
    const e = editor.exercises[exId];
    if (e.created || e.deleted || e.dirty) return true;
    if (e.setOrder.some((sid) => {
      const s = e.sets[sid];
      return s.created || s.deleted || s.dirty;
    })) return true;
    return false;
  });
  editor.hasUnsaved = anyExerciseDirty;
}

/** Add a new exercise (temporary id, empty sets) */
export function addExercise(
  editor: EditorRoutine,
  exercise_id: number,
  meta?: { exercise_name?: string | null; muscle_group?: string | null; category?: string | null }
) {
  const tempId = makeTempId();
  const order = editor.exerciseOrder.length + 1;

  const ex: EditorUserRoutineExercise = {
    routine_template_exercise_id: tempId,
    routine_template_id: editor.routine_template_id,
    exercise_id,
    exercise_order: order,
    is_active: true,
    notes: undefined,
    sets: {},
    setOrder: [],
    exercise_name: meta?.exercise_name ?? null,
    muscle_group: meta?.muscle_group ?? null,
    category: meta?.category ?? null,
    created: true,
    deleted: false,
    dirty: false,
    _expanded: true,
  };

  editor.exercises[tempId] = ex;
  editor.exerciseOrder.push(tempId);
  recomputeHasUnsaved(editor);
}

/** Remove (soft) an exercise (flag deleted, drop from render order) */
export function removeExercise(editor: EditorRoutine, exerciseTemplateId: number) {
  const ex = editor.exercises[exerciseTemplateId];
  if (!ex) return;
  ex.deleted = true;

  // Also mark sets deleted (so diff can delete them)
  ex.setOrder.forEach((sid) => {
    ex.sets[sid].deleted = true;
  });

  // Optional: hide from UI order immediately
  editor.exerciseOrder = editor.exerciseOrder.filter((id) => id !== exerciseTemplateId);

  recomputeHasUnsaved(editor);
}

/** Add a new set (temporary id) */
export function addSet(editor: EditorRoutine, exerciseTemplateId: number) {
  const ex = editor.exercises[exerciseTemplateId];
  if (!ex || ex.deleted) return;

  const tempId = makeTempId();
  const order = ex.setOrder.length + 1;
  const s: EditorUserRoutineExerciseSet = {
    routine_template_exercise_set_id: tempId,
    routine_template_exercise_id: exerciseTemplateId,
    exercise_id: ex.exercise_id,
    set_order: order,
    is_active: true,
    planned_reps: 0,
    planned_weight_kg: 0,
    notes: undefined,
    created: true,
    deleted: false,
    dirty: false,
  };

  ex.sets[tempId] = s;
  ex.setOrder.push(tempId);
  recomputeHasUnsaved(editor);
}

/** Update reps/weight and mark dirty */
export function updateSetField(
  editor: EditorRoutine,
  exerciseTemplateId: number,
  setId: number,
  field: "planned_reps" | "planned_weight_kg" | "notes",
  value: number | string | null
) {
  const ex = editor.exercises[exerciseTemplateId];
  if (!ex) return;
  const s = ex.sets[setId];
  if (!s || s.deleted) return;

  if (field === "planned_weight_kg") {
    const num = typeof value === "string" ? parseFloat(value) || 0 : (value ?? 0);
    if (s.planned_weight_kg !== num) {
      s.planned_weight_kg = num as number;
      s.dirty = !s.created; // new rows are already created; dirty is more for updates
    }
  } else if (field === "planned_reps") {
    const num = typeof value === "string" ? parseInt(value) || 0 : (value ?? 0);
    if (s.planned_reps !== num) {
      s.planned_reps = num as number;
      s.dirty = !s.created;
    }
  } else if (field === "notes") {
    if (s.notes !== value) {
      s.notes = (value ?? undefined) as any;
      s.dirty = !s.created;
    }
  }

  recomputeHasUnsaved(editor);
}

/** Soft-delete a set (remove from render order) */
export function removeSet(editor: EditorRoutine, exerciseTemplateId: number, setId: number) {
  const ex = editor.exercises[exerciseTemplateId];
  if (!ex) return;
  const s = ex.sets[setId];
  if (!s) return;

  s.deleted = true;
  ex.setOrder = ex.setOrder.filter((id) => id !== setId);
  recomputeHasUnsaved(editor);
}

/** Stable reindex: 1..K on visible sets only */
export function reindexSetOrders(editor: EditorRoutine, exerciseTemplateId: number) {
  const ex = editor.exercises[exerciseTemplateId];
  if (!ex) return;
  ex.setOrder.forEach((sid, idx) => {
    const s = ex.sets[sid];
    if (!s || s.deleted) return;
    const desired = idx + 1;
    if (s.set_order !== desired) {
      s.set_order = desired;
      if (!s.created) s.dirty = true; // order update requires API call
    }
  });
  recomputeHasUnsaved(editor);
}
