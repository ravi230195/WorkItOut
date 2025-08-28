// src/state/routine-editor/editorMappers.ts
import type {
    UserRoutine,
    UserRoutineExercise,
    UserRoutineExerciseSet,
  } from "../../utils/supabase/supabase-types";
  import type {
    EditorRoutine,
    EditorUserRoutineExercise,
    EditorUserRoutineExerciseSet,
  } from "./editorTypes";
  
  /** Coerce decimal/string weights to number */
  function coerceWeight(w: number | string | null | undefined): number {
    if (typeof w === "string") return parseFloat(w) || 0;
    return w ?? 0;
  }
  
  export function rowToEditorExercise(
    row: UserRoutineExercise & {
      exercise_name?: string | null;
      muscle_group?: string | null;
      category?: string | null;
    }
  ): EditorUserRoutineExercise {
    return {
      ...row,
      exercise_name: row.exercise_name ?? null,
      muscle_group: row.muscle_group ?? null,
      category: row.category ?? null,
      sets: {},
      setOrder: [],
      created: false,
      deleted: false,
      dirty: false,
      _expanded: false,
      _loading: false,
    };
  }
  
  export function rowToEditorSet(
    row: UserRoutineExerciseSet
  ): EditorUserRoutineExerciseSet {
    return {
      ...row,
      planned_reps: row.planned_reps ?? 0,
      planned_weight_kg: coerceWeight(row.planned_weight_kg),
      created: false,
      deleted: false,
      dirty: false,
    };
  }
  
  /**
   * Build the full EditorRoutine tree from DB rows.
   * - exercisesWithMeta: your existing joined query that includes exercise_name/muscle_group
   */
  export function initEditorRoutine(
    routine: UserRoutine,
    exercisesWithMeta: Array<
      UserRoutineExercise & { exercise_name?: string | null; muscle_group?: string | null; category?: string | null }
    >,
    sets: UserRoutineExerciseSet[]
  ): EditorRoutine {
    const editor: EditorRoutine = {
      ...routine,
      exercises: {},
      exerciseOrder: [],
      created: false,
      deleted: false,
      dirty: false,
      hasUnsaved: false,
    };
  
    // map exercises
    exercisesWithMeta
      .sort((a, b) => a.exercise_order - b.exercise_order)
      .forEach((ex) => {
        const e = rowToEditorExercise(ex);
        editor.exercises[ex.routine_template_exercise_id] = e;
        editor.exerciseOrder.push(ex.routine_template_exercise_id);
      });
  
    // map sets
    sets
      .sort((a, b) => a.set_order - b.set_order)
      .forEach((s) => {
        const e = editor.exercises[s.routine_template_exercise_id];
        if (!e) return; // defensive
        e.sets[s.routine_template_exercise_set_id] = rowToEditorSet(s);
        e.setOrder.push(s.routine_template_exercise_set_id);
      });
  
    return editor;
  }
  