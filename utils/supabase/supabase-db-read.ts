import { SupabaseBase, SUPABASE_URL, CACHE_TTL, PREFER_CACHE_ON_READ } from "./supabase-base";
import type {
  Exercise,
  UserRoutine,
  UserRoutineExercise,
  UserRoutineExerciseSet,
  Profile,
} from "./supabase-types";
import { localCache } from "../cache/localCache";

export class SupabaseDBRead extends SupabaseBase {
  // Exercises (global)
  async getExercises(): Promise<Exercise[]> {
    const url = `${SUPABASE_URL}/rest/v1/exercises?select=*`;
    const key = this.keyExercises();
    return this.getOrFetchAndCache<Exercise[]>(url, key, CACHE_TTL.exercises, true);
  }

  // Routines (per user)
  async getUserRoutines(): Promise<UserRoutine[]> {
    const user = await this.getCurrentUser();
    const url = `${SUPABASE_URL}/rest/v1/user_routines?user_id=eq.${user.id}&is_active=eq.true&select=*`;
    const key = this.keyUserRoutines(user.id);
    return this.getOrFetchAndCache<UserRoutine[]>(url, key, CACHE_TTL.routines, true);
  }

  // Routines (per user)
  async getSampleRoutines(): Promise<UserRoutine[]> {
    const user = "58b39a78-0284-445f-8c88-4fed2944c8be"
    const url = `${SUPABASE_URL}/rest/v1/user_routines?user_id=eq.${user}&is_active=eq.true&select=*`;
    const key = this.keyUserRoutines(user);
    return this.getOrFetchAndCache<UserRoutine[]>(url, key, CACHE_TTL.routines, true);
  }

  // Routine exercises (per routine)
  async getUserRoutineExercises(routineTemplateId: number): Promise<UserRoutineExercise[]> {
    const user = await this.getCurrentUser();
    const url = `${SUPABASE_URL}/rest/v1/user_routine_exercises_data?routine_template_id=eq.${routineTemplateId}&select=*`;
    const key = this.keyRoutineExercises(user.id, routineTemplateId);
    return this.getOrFetchAndCache<UserRoutineExercise[]>(url, key, CACHE_TTL.routineExercises, true);
  }

  // Routine exercises with details (flattened)
  async getUserRoutineExercisesWithDetails(
    routineTemplateId: number
  ): Promise<Array<UserRoutineExercise & { exercise_name?: string; category?: string }>> {
    const user = await this.getCurrentUser();
    const url = `${SUPABASE_URL}/rest/v1/user_routine_exercises_data?routine_template_id=eq.${routineTemplateId}&select=*,exercises(name,category)`;
    const key = this.keyRoutineExercisesWithDetails(user.id, routineTemplateId);

    if (PREFER_CACHE_ON_READ) {
      const hit = localCache.get<Array<UserRoutineExercise & { exercise_name?: string; category?: string }>>(
        key,
        CACHE_TTL.routineExercisesWithDetails
      );
      if (hit) {
        console.log("🗂️ [CACHE HIT]", key);
        return hit;
      }
    }
    console.log("🌐 [FETCH]", url);
    const raw = await this.fetchJson<any[]>(url, true);
    const flattened = raw.map((ex: any) => ({
      ...ex,
      exercise_name: ex.exercises?.name || "Unknown Exercise",
      category: ex.exercises?.category || "Unknown",
    }));
    localCache.set(key, flattened);
    console.log("🗂️ [CACHE WRITE] →", key);
    return flattened;
  }

  // Sets per routine exercise
  async getExerciseSetsForRoutine(routineTemplateExerciseId: number): Promise<UserRoutineExerciseSet[]> {
    const user = await this.getCurrentUser();
    const url = `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_id=eq.${routineTemplateExerciseId}&is_active=eq.true&order=set_order`;
    const key = this.keyRoutineSets(user.id, routineTemplateExerciseId);
    return this.getOrFetchAndCache<UserRoutineExerciseSet[]>(url, key, CACHE_TTL.routineSets, true);
  }

  // Profile
  async getMyProfile(): Promise<Profile | null> {
    const user = await this.getCurrentUser();
    const url = `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=*`;
    const key = this.keyProfile(user.id);
    const rows = await this.getOrFetchAndCache<Profile[]>(url, key, CACHE_TTL.profile, true);
    return rows[0] ?? null;
  }

  // Steps goal (creates a default on first read if none exists)
  async getUserStepGoal(): Promise<number> {
    const user = await this.getCurrentUser();
    const url = `${SUPABASE_URL}/rest/v1/user_steps?user_id=eq.${user.id}&select=goal`;
    const key = this.keySteps(user.id);
    const rows = await this.getOrFetchAndCache<{ goal: number }[]>(url, key, CACHE_TTL.steps, true);
    if (rows.length > 0) return rows[0].goal;

    // No row yet: create default and refresh cache
    const created = await this.fetchJson<{ goal: number }[]>(
      `${SUPABASE_URL}/rest/v1/user_steps`,
      true,
      "POST",
      { user_id: user.id, goal: 10000 },
      "return=representation"
    );
    await this.refreshSteps(user.id);
    return created[0]?.goal ?? 10000;
  }
}
export default SupabaseDBRead;