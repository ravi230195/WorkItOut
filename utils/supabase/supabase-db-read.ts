import { SupabaseBase, SUPABASE_URL, CACHE_TTL, CacheStatus } from "./supabase-base";
import type {
  Exercise,
  UserRoutine,
  UserRoutineExercise,
  UserRoutineExerciseSet,
  Profile,
  BodyMeasurement,
} from "./supabase-types";
import { localCache } from "../cache/localCache";

export class SupabaseDBRead extends SupabaseBase {
  // Exercises (global)
  async getExercises(opts: {
    limit?: number;
    offset?: number;
    muscleGroup?: string;
    search?: string;
    other?: boolean;
  } = {}): Promise<Exercise[]> {
    const { limit, offset, muscleGroup, search, other } = opts;

    let url = `${SUPABASE_URL}/rest/v1/exercises?select=exercise_id,name,muscle_group`;
    if (muscleGroup) {
      url += `&muscle_group=eq.${encodeURIComponent(muscleGroup)}`;
    } else if (other) {
      url += `&or=(muscle_group.is.null,muscle_group.eq.)`;
    }
    if (search) {
      url += `&name=ilike.*${encodeURIComponent(search)}*`;
    }
    if (limit != null) url += `&limit=${limit}`;
    if (offset != null) url += `&offset=${offset}`;

    const pageLimit = limit ?? 0;
    const pageOffset = offset ?? 0;
    const key = muscleGroup
      ? this.keyExercisesMuscleGroup(muscleGroup, pageLimit, pageOffset)
      : other
      ? this.keyExercisesMuscleGroup("other", pageLimit, pageOffset)
      : this.keyExercisesPage(pageLimit, pageOffset);

    const { data: exercises, status } = await this.getOrFetchAndCache<Exercise[]>(
      url,
      key,
      CACHE_TTL.exercisePages,
      true
    );

    // ✅ ONLY cache individually if this was a fresh fetch (not cache hit)
    if (status === CacheStatus.FRESH_FETCH) {
      exercises.forEach((exercise) => {
        const individualKey = this.keyExercise(exercise.exercise_id); // ✅ Using correct property name
        localCache.set(individualKey, exercise, CACHE_TTL.exercises);
      });
    }

    return exercises;
  }

  async getMuscleGroups(): Promise<string[]> {
    // Fetch just the muscle_group column for all exercises and
    // deduplicate client-side. This avoids using PostgREST
    // `group` queries, which can fail on some deployments.
    const url = `${SUPABASE_URL}/rest/v1/exercises?select=muscle_group&order=muscle_group`;
    const { data } = await this.getOrFetchAndCache<
      { muscle_group: string | null }[]
    >(url, this.keyExerciseMuscleGroups(), CACHE_TTL.exerciseMuscleGroups, true);

    const set = new Set<string>();
    let hasOther = false;
    for (const row of data) {
      const g = (row.muscle_group || "").trim();
      if (g) set.add(g);
      else hasOther = true;
    }

    const groups = Array.from(set).sort((a, b) => a.localeCompare(b));
    if (hasOther) groups.push("Other");

    return groups;
  }

  // Individual exercise by ID
  async getExercise(id: number): Promise<Exercise | null> {
    const url = `${SUPABASE_URL}/rest/v1/exercises?exercise_id=eq.${id}&select=exercise_id,name,muscle_group&limit=1`;
    const key = this.keyExercise(id);

    const { data: result } = await this.getOrFetchAndCache<Exercise[]>(url, key, CACHE_TTL.exercises, true);
    return (Array.isArray(result) ? result[0] : result) ?? null;
  }

  // Routines (per user)
  async getUserRoutines(): Promise<UserRoutine[]> {
    const userId = await this.getUserId();
    const url = `${SUPABASE_URL}/rest/v1/user_routines?user_id=eq.${userId}&is_active=eq.true&select=*&order=created_at.asc`;
    const key = this.keyUserRoutines(userId);
    
    // Add post-filter for consistency and to handle old cache data with inactive routines
    const { data: routines } = await this.getOrFetchAndCache<UserRoutine[]>(
      url, 
      key, 
      CACHE_TTL.routines, 
      true,
      (data: UserRoutine[]) => data.filter(r => r.is_active === true)
    );
    
    return routines;
  }

  // Routines (per user)
  async getSampleRoutines(): Promise<UserRoutine[]> {
    const user = "58b39a78-0284-445f-8c88-4fed2944c8be"
    const url = `${SUPABASE_URL}/rest/v1/user_routines?user_id=eq.${user}&is_active=eq.true&select=*&order=created_at.asc`;
    const key = this.keyUserRoutines(user);
    const { data: routines } = await this.getOrFetchAndCache<UserRoutine[]>(url, key, CACHE_TTL.routines, true);
    return routines;
  }

  // Routine exercises (per routine)
  async getUserRoutineExercises(routineTemplateId: number): Promise<UserRoutineExercise[]> {
    const userId = await this.getUserId();
    const url = `${SUPABASE_URL}/rest/v1/user_routine_exercises_data?routine_template_id=eq.${routineTemplateId}&is_active=is.true&select=*`;
    const key = this.keyRoutineExercises(userId, routineTemplateId);
    
    const { data: result } = await this.getOrFetchAndCache<UserRoutineExercise[]>(url, key, CACHE_TTL.routineExercises, true, 
      (data: UserRoutineExercise[]) => data.filter(ex => ex.is_active === true)
    );

    return result;
  }

  // Routine exercises with details (flattened)
  async getUserRoutineExercisesWithDetails(
    routineTemplateId: number
  ): Promise<Array<UserRoutineExercise & { exercise_name?: string; category?: string }>> {
    const userId = await this.getUserId();
    const url = `${SUPABASE_URL}/rest/v1/user_routine_exercises_data?routine_template_id=eq.${routineTemplateId}&select=*,exercises(name,category)`;
    const key = this.keyRoutineExercisesWithDetails(userId, routineTemplateId);

    // Use standardized getOrFetchAndCache like other functions with post-filter for active exercises
    const { data: raw } = await this.getOrFetchAndCache<any[]>(url, key, CACHE_TTL.routineExercisesWithDetails, true,
      (data: any[]) => data.filter(ex => ex.is_active === true)
    );
    
    // Flatten the data after caching
    const flattened = raw.map((ex: any) => ({
      ...ex,
      exercise_name: ex.exercises?.name || "Unknown Exercise",
      category: ex.exercises?.category || "Unknown",
      muscle_group: ex.exercises?.muscle_group || "Unknown",
    }));

    return flattened;
  }

  // Sets per routine exercise
  async getExerciseSetsForRoutine(routineTemplateExerciseId: number): Promise<UserRoutineExerciseSet[]> {
    const result = await this.getExerciseSetsForRoutineBulk([routineTemplateExerciseId]);
    return result.get(routineTemplateExerciseId) ?? [];
  }

  async getExerciseSetsForRoutineBulk(
    routineTemplateExerciseIds: number[]
  ): Promise<Map<number, UserRoutineExerciseSet[]>> {
    const uniqueIds = Array.from(
      new Set(
        routineTemplateExerciseIds.filter(
          (id): id is number => typeof id === "number" && Number.isFinite(id)
        )
      )
    );

    const setsByExercise = new Map<number, UserRoutineExerciseSet[]>();
    if (uniqueIds.length === 0) return setsByExercise;

    const userId = await this.getUserId();
    const missing: number[] = [];

    for (const id of uniqueIds) {
      const cached = localCache.get<UserRoutineExerciseSet[]>(
        this.keyRoutineSets(userId, id),
        CACHE_TTL.routineSets
      );
      if (cached != null) {
        setsByExercise.set(id, cached);
      } else {
        missing.push(id);
      }
    }

    if (missing.length === 0) {
      return setsByExercise;
    }

    const filter = missing.join(",");
    const url =
      `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_id=in.(${filter})` +
      `&is_active=eq.true&order=routine_template_exercise_id.asc,set_order.asc`;
    const rows = (await this.fetchJson<UserRoutineExerciseSet[]>(url, true)) ?? [];

    const grouped = new Map<number, UserRoutineExerciseSet[]>();
    for (const row of rows) {
      if (!row) continue;
      const id = row.routine_template_exercise_id;
      if (!grouped.has(id)) grouped.set(id, []);
      grouped.get(id)!.push(row);
    }

    for (const id of missing) {
      const sets = grouped.get(id) ?? [];
      const normalized = sets.map((set) => ({ ...set }));
      setsByExercise.set(id, normalized);
      localCache.set(this.keyRoutineSets(userId, id), normalized, CACHE_TTL.routineSets);
    }

    return setsByExercise;
  }

  // Profile
  async getMyProfile(): Promise<Profile | null> {
    const userId = await this.getUserId();
    const url = `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=*`;
    const key = this.keyProfile(userId);
    const { data: rows } = await this.getOrFetchAndCache<Profile[]>(url, key, CACHE_TTL.profile, true);
    return rows[0] ?? null;
  }

  async getBodyMeasurements(limit = 4): Promise<BodyMeasurement[]> {
    const userId = await this.getUserId();
    const url = `${SUPABASE_URL}/rest/v1/user_body_measurements?user_id=eq.${userId}&select=*&order=measured_on.desc&limit=${limit}`;
    const key = this.keyBodyMeasurements(userId);
    const { data: rows } = await this.getOrFetchAndCache<BodyMeasurement[]>(url, key, CACHE_TTL.bodyMeasurements, true);
    return rows;
  }

  // Steps goal (creates a default on first read if none exists)
  async getUserStepGoal(): Promise<number> {
    const userId = await this.getUserId();
    const url = `${SUPABASE_URL}/rest/v1/user_steps?user_id=eq.${userId}&select=goal`;
    const key = this.keySteps(userId);
    const { data: rows } = await this.getOrFetchAndCache<{ goal: number }[]>(url, key, CACHE_TTL.steps, true);
    if (rows.length > 0) return rows[0].goal;

    // No row yet: create default and refresh cache
      const created = await this.fetchJson<{ goal: number }[]>(
        `${SUPABASE_URL}/rest/v1/user_steps`,
        true,
        "POST",
        { user_id: userId, goal: 10000 },
        "return=representation"
      );
    await this.refreshSteps(userId);
    return created[0]?.goal ?? 10000;
  }
}
export default SupabaseDBRead;