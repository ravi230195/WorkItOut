// components/routine-editor/collapseJournal.ts

/**
 * Utilities for turning an append-only edit journal (user actions on exercises/sets)
 * into a minimal, backend-ready SavePlan by collapsing adds/updates/deletes/reorders.
 */

import type { EditJournal, Id } from "./journalTypes";

// Debug logging utility
const JNL = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`📝 JNL [${timestamp}] ${message}`, data);
  } else {
    console.log(`📝 JNL [${timestamp}] ${message}`);
  }
};

/**
 * SavePlan describes the minimal set of operations required to persist all
 * user edits captured in the journal (exercise and set creates/updates/deletes/reorders).
 */
export type SavePlan = {
  /** IDs of existing routine_template_exercise rows to delete (DB ids only). */
  deleteExercises: number[];

  /** IDs of existing routine_template_exercise_set rows to delete (DB ids only). */
  deleteSets: number[];

  /** Existing set rows to update with new values (DB ids only). */
  updateSets: { id: number; reps: number; weight: number }[];

  /** Existing set rows to reorder (DB ids only, with final contiguous set_order). */
  orderSets: { id: number; set_order: number }[];

  /**
   * New exercises to create (tempExId is a negative client id; the server
   * will return a DB id which you can map back).
   */
  createExercises: {
    tempExId: Id;
    exerciseId: number;
    order: number;
    name: string;
  }[];

  /**
   * New sets to create, grouped by their parent exercise id (which can be a temp
   * negative id for newly added exercises, or a DB id for existing ones).
   */
  createSetsByExercise: Record<
    Id,
    {
      setId: Id; // negative client id for new sets
      reps: number;
      weight: number;
      set_order: number;
    }[]
  >;
};

/** Internal accumulator for exercise-level actions while collapsing the journal. */
type ExerciseActionFold = {
  added?: { exerciseId: number; name: string; order?: number };
  deleted?: boolean;
  finalOrder?: number;
  meta?: { name?: string; muscle_group?: string };
};

/** Internal accumulator for set-level actions while collapsing the journal. */
type SetActionFold = {
  added?: { reps: string; weight: string; set_order?: number };
  deleted?: boolean;
  final?: { reps?: string; weight?: string; set_order?: number };
  touched?: boolean; // any mutation (add/update/delete/reorder) encountered
};

/**
 * collapseJournal converts an append-only EditJournal into a deduplicated SavePlan
 * by resolving sequences like add→update→delete into no-ops and coalescing final values/orders.
 */
export function collapseJournal(journal: EditJournal): SavePlan {
  JNL(`Starting collapseJournal with journal:`, journal);
  JNL(`Exercise actions: ${journal.ex.length}, Set actions: ${journal.sets.length}`);
  
  const exerciseActionMap = new Map<Id, ExerciseActionFold>();
  const setActionMap = new Map<string, SetActionFold>(); // composite key: `${exId}:${setId}`

  // 1) Fold exercise actions.
  JNL(`=== FOLDING EXERCISE ACTIONS ===`);
  for (const action of journal.ex) {
    JNL(`Processing exercise action:`, action);
    const fold = exerciseActionMap.get(action.exId) ?? {};
    if (action.t === "EX_ADD") {
      fold.added = {
        exerciseId: action.exerciseId,
        name: action.name,
        order: action.order,
      };
      JNL(`Added exercise to fold:`, fold.added);
    }
    if (action.t === "EX_DELETE") {
      fold.deleted = true;
      JNL(`Marked exercise as deleted in fold:`, fold);
    }
    if (action.t === "EX_REORDER") {
      fold.finalOrder = action.order;
      JNL(`Updated final order in fold:`, fold);
    }
    if (action.t === "EX_UPDATE_META") {
      fold.meta = { ...fold.meta, ...action };
      JNL(`Updated meta in fold:`, fold.meta);
    }
    exerciseActionMap.set(action.exId, fold);
    JNL(`Updated exercise action map for exId ${action.exId}:`, fold);
  }

  // 2) Fold set actions per (exercise, set) composite key.
  const makeCompositeSetKey = (exerciseId: Id, setId: Id) => `${exerciseId}:${setId}`;

  for (const action of journal.sets) {
    const compositeKey = makeCompositeSetKey(action.exId, action.setId);
    const fold = setActionMap.get(compositeKey) ?? {};

    switch (action.t) {
      case "SET_ADD":
        fold.added = {
          reps: action.reps,
          weight: action.weight,
          set_order: action.set_order,
        };
        fold.touched = true;
        break;

      case "SET_UPDATE":
        fold.final = {
          ...fold.final,
          ...(action.reps !== undefined ? { reps: action.reps } : {}),
          ...(action.weight !== undefined ? { weight: action.weight } : {}),
        };
        fold.touched = true;
        break;

      case "SET_DELETE":
        fold.deleted = true;
        fold.touched = true;
        break;

      case "SET_REORDER":
        fold.final = { ...fold.final, set_order: action.set_order };
        fold.touched = true;
        break;
    }

    setActionMap.set(compositeKey, fold);
  }

  // 3) Build the save plan from the folded results.
  const plan: SavePlan = {
    deleteExercises: [],
    deleteSets: [],
    updateSets: [],
    orderSets: [],
    createExercises: [],
    createSetsByExercise: {},
  };

  // Exercises: add / delete / reorder.
  for (const [exerciseId, fold] of exerciseActionMap.entries()) {
    // If added then deleted before save → no-op.
    if (fold.added && fold.deleted) continue;

    // Deleting an existing exercise.
    if (fold.deleted && exerciseId > 0) {
      plan.deleteExercises.push(exerciseId);
      continue;
    }

    // Creating a new exercise (temp negative id).
    if (fold.added) {
      plan.createExercises.push({
        tempExId: exerciseId, // negative temp id
        exerciseId: fold.added.exerciseId,
        order: fold.finalOrder ?? fold.added.order ?? 1,
        name: fold.added.name,
      });
    }
  }

  // Sets: add / update / delete / reorder.
  for (const [compositeKey, fold] of setActionMap.entries()) {
    const [exerciseIdStr, setIdStr] = compositeKey.split(":");
    const exerciseId = Number(exerciseIdStr) as Id;
    const setId = Number(setIdStr) as Id;

    const parentExerciseFold = exerciseActionMap.get(exerciseId);

    // If the parent exercise is deleted, ignore all of its set actions.
    if (parentExerciseFold?.deleted) continue;

    // If a set was added and then deleted before save → no-op.
    if (fold.added && fold.deleted) continue;

    // Deleting an existing set (DB id).
    if (fold.deleted && setId > 0) {
      plan.deleteSets.push(setId);
      continue;
    }

    // Creating a new set (temp negative id) under either a new or existing exercise.
    if (fold.added && setId < 0) {
      if (!plan.createSetsByExercise[exerciseId]) {
        plan.createSetsByExercise[exerciseId] = [];
      }
      const reps = parseInt((fold.final?.reps ?? fold.added.reps) || "0", 10) || 0;
      const weight = parseFloat((fold.final?.weight ?? fold.added.weight) || "0") || 0;
      const set_order = (fold.final?.set_order ?? fold.added.set_order ?? 0) || 0;

      // Skip empty rows (0 reps AND 0 weight).
      if (reps > 0 || weight > 0) {
        plan.createSetsByExercise[exerciseId].push({
          setId,
          reps,
          weight,
          set_order,
        });
      }
      continue;
    }

    // Updating an existing set (values and/or order).
    if (setId > 0 && fold.touched && !fold.deleted) {
      if (fold.final?.reps !== undefined || fold.final?.weight !== undefined) {
        const reps = parseInt((fold.final?.reps ?? "0") || "0", 10) || 0;
        const weight = parseFloat((fold.final?.weight ?? "0") || "0") || 0;
        plan.updateSets.push({ id: setId, reps, weight });
      }
      if (fold.final?.set_order !== undefined) {
        plan.orderSets.push({ id: setId, set_order: fold.final.set_order });
      }
    }
  }

  // Optional: re-index set_order to be contiguous per exercise here,
  // if your backend does not do this as part of an RPC/transaction.

  return plan;
}

/**
 * journalIsNoop returns true if the supplied EditJournal contains no actions
 * (i.e., there is nothing to save).
 */
export function journalIsNoop(journal: EditJournal): boolean {
  return journal.ex.length === 0 && journal.sets.length === 0;
}
