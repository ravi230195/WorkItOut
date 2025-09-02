import { supabaseAPI, type UserRoutineExercise, type UserRoutineExerciseSet, type Exercise } from "./supabase/supabase-api";
import { performanceTimer } from "./performanceTimer";
import { logger } from "./logging";

export const SETS_PREFETCH_CONCURRENCY = 5;

export interface LoadedSet {
  id: number;
  set_order: number;
  reps: string;
  weight: string;
}

export interface LoadedExercise {
  templateId: number;
  exerciseId: number;
  name: string;
  muscle_group?: string;
  sets: LoadedSet[];
}

interface SavedExerciseWithDetails extends UserRoutineExercise {
  exercise_name?: string;
  category?: string;
  muscle_group?: string;
}

const normalizeField = (val: unknown): string => {
  const s = (val ?? "").toString().trim();
  if (!s) return "";
  if (/^(unknown|undefined|null|n\/a)$/i.test(s)) return "";
  return s;
};

export async function loadRoutineExercisesWithSets(
  routineId: number,
  opts: { concurrency?: number; timer?: typeof performanceTimer } = {}
): Promise<LoadedExercise[]> {
  const { concurrency = SETS_PREFETCH_CONCURRENCY, timer = performanceTimer } = opts;
  const mainTimer = timer.start("routineLoader - load routine exercises");

  try {
    const exerciseTimer = timer.start("routineLoader - fetch routine exercises");
    const rows = (await supabaseAPI.getUserRoutineExercisesWithDetails(
      routineId
    )) as SavedExerciseWithDetails[];
    exerciseTimer.endWithLog("debug");

    const metaTimer = timer.start("routineLoader - fetch exercise meta");
    const metaById = new Map<number, Exercise>();
    await Promise.all(
      rows.map(async (r) => {
        const hasName = !!normalizeField(r.exercise_name);
        const hasMG = !!normalizeField(r.muscle_group);
        if (hasName && hasMG) return;
        try {
          const meta = await supabaseAPI.getExercise(r.exercise_id);
          if (meta) metaById.set(r.exercise_id, meta as Exercise);
        } catch (err) {
          logger.warn("Failed to fetch exercise meta", r.exercise_id, err);
        }
      })
    );
    metaTimer.endWithLog("debug");

    const batches: SavedExerciseWithDetails[][] = [];
    for (let i = 0; i < rows.length; i += concurrency) {
      batches.push(rows.slice(i, i + concurrency));
    }

    const results: LoadedExercise[] = [];
    for (const batch of batches) {
      const setsBatch = await Promise.all(
        batch.map((r) =>
          supabaseAPI
            .getExerciseSetsForRoutine(r.routine_template_exercise_id)
            .then((rows) =>
              (rows as UserRoutineExerciseSet[])
                .sort((a, b) => (a.set_order || 0) - (b.set_order || 0))
                .map((s) => ({
                  id: s.routine_template_exercise_set_id,
                  set_order: s.set_order ?? 0,
                  reps: String(s.planned_reps ?? "0"),
                  weight: String(s.planned_weight_kg ?? "0"),
                }))
            )
            .catch((err) => {
              logger.warn("Failed to fetch sets for", r.routine_template_exercise_id, err);
              return [] as LoadedSet[];
            })
        )
      );

      batch.forEach((r, idx) => {
        const nameDb = normalizeField(r.exercise_name);
        const mgDb = normalizeField(r.muscle_group);
        const meta = !nameDb || !mgDb ? metaById.get(r.exercise_id) : undefined;
        const name = nameDb || normalizeField(meta?.name);
        const mg = mgDb || normalizeField(meta?.muscle_group);

        results.push({
          templateId: r.routine_template_exercise_id,
          exerciseId: r.exercise_id,
          name,
          muscle_group: mg || undefined,
          sets: setsBatch[idx],
        });
      });
    }

    return results;
  } finally {
    mainTimer.endWithLog("info");
  }
}

export default loadRoutineExercisesWithSets;
