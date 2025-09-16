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
    exerciseTimer.endWithLog();

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
    metaTimer.endWithLog();

    const toLoadedSets = (setRows?: UserRoutineExerciseSet[]): LoadedSet[] =>
      (setRows ?? [])
        .filter((set): set is UserRoutineExerciseSet => !!set && set.is_active !== false)
        .slice()
        .sort((a, b) => (a.set_order ?? 0) - (b.set_order ?? 0))
        .map((s) => ({
          id: s.routine_template_exercise_set_id,
          set_order: s.set_order ?? 0,
          reps: String(s.planned_reps ?? "0"),
          weight: String(s.planned_weight_kg ?? "0"),
        }));

    const fetchSetsIndividually = async (): Promise<Map<number, LoadedSet[]>> => {
      const setsMap = new Map<number, LoadedSet[]>();
      for (let i = 0; i < rows.length; i += concurrency) {
        const batch = rows.slice(i, i + concurrency);
        const setsBatch = await Promise.all(
          batch.map((r) =>
            supabaseAPI
              .getExerciseSetsForRoutine(r.routine_template_exercise_id)
              .then((setRows) => toLoadedSets(setRows as UserRoutineExerciseSet[]))
              .catch((err) => {
                logger.warn(
                  "Failed to fetch sets for",
                  r.routine_template_exercise_id,
                  err
                );
                return [] as LoadedSet[];
              })
          )
        );

        batch.forEach((r, idx) => {
          setsMap.set(r.routine_template_exercise_id, setsBatch[idx]);
        });
      }
      return setsMap;
    };

    const exerciseIds = rows.map((r) => r.routine_template_exercise_id);
    let setsByExercise = new Map<number, LoadedSet[]>();

    if (exerciseIds.length > 0) {
      const bulkTimer = timer.start("routineLoader - fetch routine sets (bulk)");
      let bulkMap: Map<number, UserRoutineExerciseSet[]> | undefined;
      try {
        bulkMap = await supabaseAPI.getExerciseSetsForRoutineBulk(exerciseIds);
      } catch (err) {
        logger.warn("Failed to fetch routine sets in bulk; falling back", err);
      } finally {
        bulkTimer.endWithLog();
      }

      if (bulkMap && typeof bulkMap.get === "function") {
        setsByExercise = new Map(
          exerciseIds.map((id) => [id, toLoadedSets(bulkMap!.get(id))])
        );
      } else {
        if (bulkMap && typeof (bulkMap as any).get !== "function") {
          logger.warn("Bulk routine set fetch returned unexpected shape", bulkMap);
        }
        const fallbackTimer = timer.start("routineLoader - fetch routine sets (fallback)");
        try {
          setsByExercise = await fetchSetsIndividually();
        } finally {
          fallbackTimer.endWithLog();
        }
      }
    }

    return rows.map((r) => {
      const nameDb = normalizeField(r.exercise_name);
      const mgDb = normalizeField(r.muscle_group);
      const meta = !nameDb || !mgDb ? metaById.get(r.exercise_id) : undefined;
      const name = nameDb || normalizeField(meta?.name);
      const mg = mgDb || normalizeField(meta?.muscle_group);

      return {
        templateId: r.routine_template_exercise_id,
        exerciseId: r.exercise_id,
        name,
        muscle_group: mg || undefined,
        sets: setsByExercise.get(r.routine_template_exercise_id) ?? [],
      };
    });
  } finally {
    mainTimer.endWithLog();
  }
}

export default loadRoutineExercisesWithSets;
