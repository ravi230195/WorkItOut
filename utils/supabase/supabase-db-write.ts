import { SupabaseBase, SUPABASE_URL } from "./supabase-base";
import type { UserRoutine, UserRoutineExercise, UserRoutineExerciseSet, Profile } from "./supabase-types";


export class SupabaseDBWrite extends SupabaseBase {
  // Auth
  async signUp(email: string, password: string): Promise<{ token?: string; needsSignIn?: boolean }> {
    const data = await this.fetchJson<any>(
      `${SUPABASE_URL}/auth/v1/signup`,
      false,
      "POST",
      { email, password }
    );
    if (data.error) throw new Error(data.error.message);
    if (data.access_token || data.session?.access_token) {
      return { token: data.access_token || data.session!.access_token };
    }
    return { needsSignIn: true };
  }

  async signIn(email: string, password: string): Promise<string> {
    const data = await this.fetchJson<any>(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      false,
      "POST",
      { email, password }
    );
    if (data.error) throw new Error(data.error.message);
    if (!data.access_token) throw new Error("No access token received");
    return data.access_token;
  }

  async signOut(): Promise<void> {
    await this.fetchJson(`${SUPABASE_URL}/auth/v1/logout`, true, "POST");
    this.setToken(null);
  }

  // Routines
  async createUserRoutine(name: string): Promise<UserRoutine | null> {
    const user = await this.getCurrentUser();
    const rows = await this.fetchJson<UserRoutine[]>(
      `${SUPABASE_URL}/rest/v1/user_routines`,
      true,
      "POST",
      { user_id: user.id, name: name.trim(), version: 1, is_active: true },
      "return=representation"
    );
    await this.refreshRoutines(user.id);
    return rows[0] ?? null;
  }

  async renameRoutine(routineTemplateId: number, newName: string): Promise<void> {
    const user = await this.getCurrentUser();
    await this.fetchJson(
      `${SUPABASE_URL}/rest/v1/user_routines?routine_template_id=eq.${routineTemplateId}`,
      true,
      "PATCH",
      { name: newName.trim() },
      "return=minimal"
    );
    await this.refreshRoutines(user.id);
  }

  async deleteRoutine(routineTemplateId: number): Promise<void> {
    const user = await this.getCurrentUser();
    await this.fetchJson(
      `${SUPABASE_URL}/rest/v1/user_routines?routine_template_id=eq.${routineTemplateId}`,
      true,
      "PATCH",
      { is_active: false },
      "return=minimal"
    );
    await this.refreshRoutines(user.id);
  }

  // Routine exercises and sets
  async addExerciseToRoutine(
    routineTemplateId: number,
    exerciseId: number,
    exerciseOrder: number
  ): Promise<UserRoutineExercise | null> {
    const user = await this.getCurrentUser();
    const rows = await this.fetchJson<UserRoutineExercise[]>(
      `${SUPABASE_URL}/rest/v1/user_routine_exercises_data`,
      true,
      "POST",
      { routine_template_id: routineTemplateId, exercise_id: exerciseId, exercise_order: exerciseOrder, is_active: true },
      "return=representation"
    );
    await Promise.all([
      this.refreshRoutineExercises(user.id, routineTemplateId),
      this.refreshRoutineExercisesWithDetails(user.id, routineTemplateId),
    ]);
    return rows[0] ?? null;
  }

  async addExerciseSetsToRoutine(
    routineTemplateExerciseId: number,
    exerciseId: number,
    setsData: { reps: number; weight: number; set_order?: number }[]
  ): Promise<UserRoutineExerciseSet[]> {
    const user = await this.getCurrentUser();
    const setsToInsert = setsData.map((set, index) => ({
      routine_template_exercise_id: routineTemplateExerciseId,
      exercise_id: exerciseId,
      set_order: set.set_order ?? index + 1,
      is_active: true,
      planned_reps: set.reps > 0 ? set.reps : null,
      planned_weight_kg: set.weight > 0 ? set.weight : null,
    }));
    const rows = await this.fetchJson<UserRoutineExerciseSet[]>(
      `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data`,
      true,
      "POST",
      setsToInsert,
      "return=representation"
    );
    await this.refreshRoutineSets(user.id, routineTemplateExerciseId);
    return rows;
  }

  async updateExerciseSet(
    routineTemplateExerciseSetId: number,
    plannedReps?: number,
    plannedWeightKg?: number
  ): Promise<UserRoutineExerciseSet | null> {
    const user = await this.getCurrentUser();

    // find parent rtex id to know which cache to refresh
    const lookup = await this.fetchJson<Array<{ routine_template_exercise_id: number }>>(
      `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_set_id=eq.${routineTemplateExerciseSetId}&select=routine_template_exercise_id`,
      true
    );
    const parentId = lookup[0]?.routine_template_exercise_id;

    const rows = await this.fetchJson<UserRoutineExerciseSet[]>(
      `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_set_id=eq.${routineTemplateExerciseSetId}`,
      true,
      "PATCH",
      {
        planned_reps: plannedReps && plannedReps > 0 ? plannedReps : null,
        planned_weight_kg: plannedWeightKg && plannedWeightKg > 0 ? plannedWeightKg : null,
      },
      "return=representation"
    );
    if (parentId) await this.refreshRoutineSets(user.id, parentId);
    return rows[0] ?? null;
  }

  async updateExerciseSetOrder(
    routineTemplateExerciseSetId: number,
    newOrder: number
  ): Promise<void> {
    const user = await this.getCurrentUser();

    const lookup = await this.fetchJson<Array<{ routine_template_exercise_id: number }>>(
      `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_set_id=eq.${routineTemplateExerciseSetId}&select=routine_template_exercise_id`,
      true
    );
    const parentId = lookup[0]?.routine_template_exercise_id;

    await this.fetchJson(
      `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_set_id=eq.${routineTemplateExerciseSetId}`,
      true,
      "PATCH",
      { set_order: newOrder },
      "return=minimal"
    );
    if (parentId) await this.refreshRoutineSets(user.id, parentId);
  }

  async deleteExerciseSet(routineTemplateExerciseSetId: number): Promise<void> {
    const user = await this.getCurrentUser();

    const lookup = await this.fetchJson<Array<{ routine_template_exercise_id: number }>>(
      `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_set_id=eq.${routineTemplateExerciseSetId}&select=routine_template_exercise_id`,
      true
    );
    const parentId = lookup[0]?.routine_template_exercise_id;

    await this.fetchJson(
      `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_set_id=eq.${routineTemplateExerciseSetId}`,
      true,
      "PATCH",
      { is_active: false },
      "return=minimal"
    );
    if (parentId) await this.refreshRoutineSets(user.id, parentId);
  }

  // Profile write
  async upsertProfile(
    firstName: string,
    lastName: string,
    displayName: string,
    heightCm?: number,
    weightKg?: number,
    userId?: string
  ): Promise<Profile | null> {
    const user = userId ? { id: userId } : await this.getCurrentUser();
    const rows = await this.fetchJson<Profile[]>(
      `${SUPABASE_URL}/rest/v1/profiles`,
      true,
      "POST",
      {
        user_id: user.id,
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
        height_cm: heightCm,
        weight_kg: weightKg,
      },
      "resolution=merge-duplicates"
    );
    await this.refreshProfile(user.id);
    return rows[0] ?? null;
  }

  // Steps write
  async createUserStepGoal(goal: number = 10000): Promise<number> {
    const user = await this.getCurrentUser();
    const rows = await this.fetchJson<{ goal: number }[]>(
      `${SUPABASE_URL}/rest/v1/user_steps`,
      true,
      "POST",
      { user_id: user.id, goal },
      "return=representation"
    );
    await this.refreshSteps(user.id);
    return rows[0]?.goal ?? goal;
  }

  // Recompute and persist muscle group summary (also refresh routines cache)
  async recomputeAndSaveRoutineMuscleSummary(routineTemplateId: number): Promise<string> {
    const rows: Array<{ exercises?: { muscle_group?: string } }> = await this.fetchJson(
      `${SUPABASE_URL}/rest/v1/user_routine_exercises_data?routine_template_id=eq.${routineTemplateId}&is_active=eq.true&select=exercise_id,exercises(muscle_group)`,
      true
    );

    const counts = new Map<string, number>();
    for (const r of rows) {
      const g = (r.exercises?.muscle_group || "").trim();
      if (!g) continue;
      counts.set(g, (counts.get(g) || 0) + 1);
    }
    const summary = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([g]) => g)
      .join(" • ");

    await this.fetchJson(
      `${SUPABASE_URL}/rest/v1/user_routines?routine_template_id=eq.${routineTemplateId}`,
      true,
      "PATCH",
      { muscle_group_summary: summary || null },
      "return=minimal"
    );

    const user = await this.getCurrentUser();
    await this.refreshRoutines(user.id);
    return summary;
  }
}

export default SupabaseDBWrite;
