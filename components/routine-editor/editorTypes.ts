// src/state/routine-editor/editorTypes.ts
import type {
    UserRoutine,
    UserRoutineExercise,
    UserRoutineExerciseSet,
  } from "../../utils/supabase/supabase-types";
  
  /** Local flags for optimistic edits; never sent to DB */
  export type EditorFlags = {
    created?: boolean; // new (id < 0)
    deleted?: boolean; // marked for deletion
    dirty?: boolean;   // values changed
  };
  
  /** Set node mirrors DB fields + flags */
  export type EditorUserRoutineExerciseSet =
    UserRoutineExerciseSet & EditorFlags;
  
  /** Exercise node mirrors DB fields + flags + child sets */
  export type EditorUserRoutineExercise =
    UserRoutineExercise &
    EditorFlags & {
      // Optional joined fields you commonly show in UI:
      exercise_name?: string | null;
      muscle_group?: string | null;
      category?: string | null;
  
      // Children
      sets: Record<number, EditorUserRoutineExerciseSet>;
  
      // Orders for deterministic rendering
      setOrder: number[];
  
      // Optional UI-only fields (expand, loading, etc.)
      _expanded?: boolean;
      _loading?: boolean;
    };
  
  /** Root node mirrors DB fields + flags + child exercises */
  export type EditorRoutine =
    UserRoutine &
    EditorFlags & {
      exercises: Record<number, EditorUserRoutineExercise>;
      exerciseOrder: number[];
  
      // Rollup to quickly know if there's anything to save
      hasUnsaved: boolean;
    };
  
  // Utility: negative ids for new rows
  export const makeTempId = () => -Date.now();
  