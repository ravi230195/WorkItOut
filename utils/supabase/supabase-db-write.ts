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

    // supabase-db-write.ts
    async renameRoutine(routineTemplateId: number, newName: string): Promise<void> {
        const user = await this.getCurrentUser();

        await this.fetchJson(
            `${SUPABASE_URL}/rest/v1/user_routines?routine_template_id=eq.${routineTemplateId}`,
            true, "PATCH", { name: newName.trim() }, "return=representation"
            // ask PostgREST to return the updated row (avoids 204)
        );
        await this.refreshRoutines(user.id);
    }


    async deleteRoutine(routineTemplateId: number): Promise<void> {
        const user = await this.getCurrentUser();
        await this.fetchJson(
            `${SUPABASE_URL}/rest/v1/user_routines?routine_template_id=eq.${routineTemplateId}`,
            true, "PATCH", { is_active: false }, "return=representation");
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

    // Soft delete routine exercise (sets is_active = false)
    async deleteRoutineExercise(routineTemplateExerciseId: number): Promise<void> {
        const user = await this.getCurrentUser();
        
        // Soft delete the exercise row
        await this.fetchJson(
            `${SUPABASE_URL}/rest/v1/user_routine_exercises_data?routine_template_exercise_id=eq.${routineTemplateExerciseId}`,
            true,
            "PATCH",
            { is_active: false },
            "return=minimal"
        );

        // Also soft delete all associated sets
        await this.fetchJson(
            `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_id=eq.${routineTemplateExerciseId}`,
            true,
            "PATCH",
            { is_active: false },
            "return=minimal"
        );

        // Refresh the data
        await Promise.all([
            this.refreshRoutineExercises(user.id, routineTemplateExerciseId),
            this.refreshRoutineExercisesWithDetails(user.id, routineTemplateExerciseId),
        ]);
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

    async recomputeAndSaveRoutineMuscleSummary(routineTemplateId: number) {
        // Load active exercises → muscle groups
        const urlEx =
            `${SUPABASE_URL}/rest/v1/user_routine_exercises_data` +
            `?routine_template_id=eq.${routineTemplateId}&is_active=eq.true` +
            `&select=exercises(muscle_group)`;

        const rows = await this.fetchJson<Array<{ exercises?: { muscle_group?: string } }>>(urlEx, true);

        const groups = Array.from(
            new Set(
                rows.map(r => (r.exercises?.muscle_group ?? "").trim()).filter(Boolean)
            )
        ).sort();

        // Use NULL when no groups (avoids DB pattern/CHECK failures on empty string)
        const summary = groups.length ? groups.join(" • ") : null;

        // Patch base table
        const urlPatch = `${SUPABASE_URL}/rest/v1/user_routines?routine_template_id=eq.${routineTemplateId}`;
        await this.fetchJson<any[]>(
            urlPatch,
            true,
            "PATCH",
            [{ muscle_group_summary: summary }],
            "return=representation"
        );

        // Refresh routines cache so UI reflects changes
        const { id: userId } = await this.getCurrentUser();
        await this.refreshRoutines(userId);
    }
}


export default SupabaseDBWrite;
