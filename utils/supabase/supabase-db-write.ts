import { SupabaseBase, SUPABASE_URL } from "./supabase-base";
import type { UserRoutine, UserRoutineExercise, UserRoutineExerciseSet, Profile, Workout, WorkoutExercise, Set } from "./supabase-types";
import { logger } from "../logging";

export class SupabaseDBWrite extends SupabaseBase {
    // Auth
    async signUp(email: string, password: string): Promise<{ token?: string; refresh_token?: string; needsSignIn?: boolean }> {
        const data = await this.fetchJson<any>(
            `${SUPABASE_URL}/auth/v1/signup`,
            false,
            "POST",
            { email, password }
        );
        if (data.error) throw new Error(data.error.message);
        if (data.access_token || data.session?.access_token) {
            return { 
                token: data.access_token || data.session!.access_token,
                refresh_token: data.refresh_token || data.session?.refresh_token
            };
        }
        return { needsSignIn: true };
    }

    async signIn(email: string, password: string): Promise<{ access_token: string; refresh_token: string }> {
        const data = await this.fetchJson<any>(
            `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
            false,
            "POST",
            { email, password }
        );
        if (data.error) throw new Error(data.error.message);
        if (!data.access_token) throw new Error("No access token received");
        if (!data.refresh_token) throw new Error("No refresh token received");
        
        return { 
            access_token: data.access_token, 
            refresh_token: data.refresh_token 
        };
    }

    async refreshToken(refreshToken: string): Promise<string> {
        const data = await this.fetchJson<any>(
            `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
            false,
            "POST",
            { refresh_token: refreshToken }
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
        const userId = await this.getUserId();
        const rows = await this.fetchJson<UserRoutine[]>(
            `${SUPABASE_URL}/rest/v1/user_routines`,
            true,
            "POST",
            { user_id: userId, name: name.trim(), version: 1, is_active: true },
            "return=representation"
        );
        await this.refreshRoutines(userId);
        return rows[0] ?? null;
    }

    // supabase-db-write.ts
    async renameRoutine(routineTemplateId: number, newName: string): Promise<void> {
        const userId = await this.getUserId();

        await this.fetchJson(
            `${SUPABASE_URL}/rest/v1/user_routines?routine_template_id=eq.${routineTemplateId}`,
            true, "PATCH", { name: newName.trim() }, "return=representation"
            // ask PostgREST to return the updated row (avoids 204)
        );
        await this.refreshRoutines(userId);
    }


    async deleteRoutine(routineTemplateId: number): Promise<void> {
        const userId = await this.getUserId();
        await this.fetchJson(
            `${SUPABASE_URL}/rest/v1/user_routines?routine_template_id=eq.${routineTemplateId}`,
            true, "PATCH", { is_active: false }, "return=representation");
        await this.refreshRoutines(userId);
    }

    async hardDeleteRoutine(routineTemplateId: number): Promise<void> {
        const userId = await this.getUserId();

        // Load all exercises for this routine
        const exercises = await this.fetchJson<
            Array<{ routine_template_exercise_id: number }>
        >(
            `${SUPABASE_URL}/rest/v1/user_routine_exercises_data?routine_template_id=eq.${routineTemplateId}&select=routine_template_exercise_id`,
            true
        );

        // Delegate deletion of each exercise (and its sets)
        for (const { routine_template_exercise_id: exId } of exercises) {
            await this.hardDeleteRoutineExercise(exId);
        }

        // Delete the routine itself
        await this.fetchJson(
            `${SUPABASE_URL}/rest/v1/user_routines?routine_template_id=eq.${routineTemplateId}`,
            true,
            "DELETE"
        );

        // Refresh caches for the now-removed routine
        await Promise.all([
            this.refreshRoutines(userId),
            this.refreshRoutineExercises(userId, routineTemplateId),
            this.refreshRoutineExercisesWithDetails(userId, routineTemplateId),
        ]);
    }

    // Routine exercises and sets
    async addExerciseToRoutine(
        routineTemplateId: number,
        exerciseId: number,
        exerciseOrder: number
    ): Promise<UserRoutineExercise | null> {
        const userId = await this.getUserId();
        const rows = await this.fetchJson<UserRoutineExercise[]>(
            `${SUPABASE_URL}/rest/v1/user_routine_exercises_data`,
            true,
            "POST",
            { routine_template_id: routineTemplateId, exercise_id: exerciseId, exercise_order: exerciseOrder, is_active: true },
            "return=representation"
        );
        await Promise.all([
            this.refreshRoutineExercises(userId, routineTemplateId),
            this.refreshRoutineExercisesWithDetails(userId, routineTemplateId),
        ]);
        return rows[0] ?? null;
    }

    async addExerciseSetsToRoutine(
        routineTemplateExerciseId: number,
        exerciseId: number,
        setsData: { reps: number; weight: number; set_order?: number }[]
    ): Promise<UserRoutineExerciseSet[]> {
        const userId = await this.getUserId();
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

        await this.refreshRoutineSets(userId, routineTemplateExerciseId);
        return rows;
    }

    // Helper function to find routine ID for an exercise
    private async findRoutineIdForExercise(routineTemplateExerciseId: number): Promise<number> {
        const lookup = await this.fetchJson<Array<{ routine_template_id: number }>>(
            `${SUPABASE_URL}/rest/v1/user_routine_exercises_data?routine_template_exercise_id=eq.${routineTemplateExerciseId}&select=routine_template_id`,
            true
        );
        const routineId = lookup[0]?.routine_template_id;
        if (!routineId) {
            throw new Error(`Could not find routine ID for exercise ${routineTemplateExerciseId}`);
        }
        return routineId;
    }

    // Soft delete routine exercise (sets is_active = false)
    async deleteRoutineExercise(routineTemplateExerciseId: number): Promise<void> {
        const userId = await this.getUserId();
        
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

        const routineId = await this.findRoutineIdForExercise(routineTemplateExerciseId);

        // Refresh the data
        await Promise.all([
            this.refreshRoutineExercises(userId, routineId),        // Routine ID
            this.refreshRoutineExercisesWithDetails(userId, routineId), // Routine ID
        ]);
    }

    async hardDeleteRoutineExercise(routineTemplateExerciseId: number): Promise<void> {
        const userId = await this.getUserId();

        // Determine parent routine before deleting rows
        const routineId = await this.findRoutineIdForExercise(
            routineTemplateExerciseId
        );

        // Load all set IDs for this exercise and delete via helper
        const sets = await this.fetchJson<
            Array<{ routine_template_exercise_set_id: number }>
        >(
            `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_id=eq.${routineTemplateExerciseId}&select=routine_template_exercise_set_id`,
            true
        );
        for (const { routine_template_exercise_set_id: setId } of sets) {
            await this.hardDeleteExerciseSet(setId);
        }

        // Delete the exercise row itself
        await this.fetchJson(
            `${SUPABASE_URL}/rest/v1/user_routine_exercises_data?routine_template_exercise_id=eq.${routineTemplateExerciseId}`,
            true,
            "DELETE"
        );

        await Promise.all([
            this.refreshRoutineExercises(userId, routineId),
            this.refreshRoutineExercisesWithDetails(userId, routineId),
        ]);
    }

    // ----- Workout flows -----
    async startWorkout(routineTemplateId: number): Promise<Workout> {
        const userId = await this.getUserId();
        const rows = await this.fetchJson<Workout[]>(
            `${SUPABASE_URL}/rest/v1/workouts`,
            true,
            "POST",
            { template_id: routineTemplateId, started_at: new Date().toISOString(), user_id: userId },
            "return=representation"
        );
        return rows[0];
    }

    async endWorkout(workoutId: string): Promise<void> {
        await this.fetchJson(
            `${SUPABASE_URL}/rest/v1/workouts?id=eq.${workoutId}`,
            true,
            "PATCH",
            { ended_at: new Date().toISOString() },
            "return=minimal"
        );
    }

    async addWorkoutExercise(workoutId: string, exerciseId: number, order_index: number): Promise<WorkoutExercise> {
        const rows = await this.fetchJson<WorkoutExercise[]>(
            `${SUPABASE_URL}/rest/v1/workout_exercises`,
            true,
            "POST",
            { workout_id: workoutId, exercise_id: exerciseId, order_index },
            "return=representation"
        );
        return rows[0];
    }

    async addWorkoutSet(
        workoutExerciseId: string,
        set_index: number,
        reps: number,
        weight: number,
        completed_at?: string
    ): Promise<Set> {
        const rows = await this.fetchJson<Set[]>(
            `${SUPABASE_URL}/rest/v1/sets`,
            true,
            "POST",
            { workout_exercise_id: workoutExerciseId, set_index, reps, weight, completed_at },
            "return=representation"
        );
        return rows[0];
    }

    async updateWorkoutSet(
        setId: string,
        patch: Partial<Pick<Set, "reps" | "weight" | "completed_at">>
    ): Promise<Set> {
        const rows = await this.fetchJson<Set[]>(
            `${SUPABASE_URL}/rest/v1/sets?id=eq.${setId}`,
            true,
            "PATCH",
            patch,
            "return=representation"
        );
        return rows[0];
    }

    async updateExerciseSet(
        routineTemplateExerciseSetId: number,
        plannedReps?: number,
        plannedWeightKg?: number
    ): Promise<UserRoutineExerciseSet | null> {
        const userId = await this.getUserId();

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
        if (parentId) await this.refreshRoutineSets(userId, parentId);
        return rows[0] ?? null;
    }

    async updateExerciseSetOrder(
        routineTemplateExerciseSetId: number,
        newOrder: number
    ): Promise<void> {
        const userId = await this.getUserId();

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
        if (parentId) await this.refreshRoutineSets(userId, parentId);
    }

    async deleteExerciseSet(routineTemplateExerciseSetId: number): Promise<void> {
        const userId = await this.getUserId();

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
        if (parentId) await this.refreshRoutineSets(userId, parentId);
    }

    async hardDeleteExerciseSet(routineTemplateExerciseSetId: number): Promise<void> {
        const userId = await this.getUserId();

        const lookup = await this.fetchJson<Array<{ routine_template_exercise_id: number }>>(
            `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_set_id=eq.${routineTemplateExerciseSetId}&select=routine_template_exercise_id`,
            true
        );
        const parentId = lookup[0]?.routine_template_exercise_id;

        await this.fetchJson(
            `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_set_id=eq.${routineTemplateExerciseSetId}`,
            true,
            "DELETE"
        );
        if (parentId) await this.refreshRoutineSets(userId, parentId);
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
        const id = userId ?? await this.getUserId();
        const rows = await this.fetchJson<Profile[]>(
            `${SUPABASE_URL}/rest/v1/profiles`,
            true,
            "POST",
            {
                user_id: id,
                first_name: firstName,
                last_name: lastName,
                display_name: displayName,
                height_cm: heightCm,
                weight_kg: weightKg,
            },
            "resolution=merge-duplicates"
        );
        await this.refreshProfile(id);
        return rows[0] ?? null;
    }

    // Steps write
    async createUserStepGoal(goal: number = 10000): Promise<number> {
        const userId = await this.getUserId();
        const rows = await this.fetchJson<{ goal: number }[]>(
            `${SUPABASE_URL}/rest/v1/user_steps`,
            true,
            "POST",
            { user_id: userId, goal },
            "return=representation"
        );
        await this.refreshSteps(userId);
        return rows[0]?.goal ?? goal;
    }

    async recomputeAndSaveRoutineMuscleSummary(routineTemplateId: number) {
        logger.db("🔍 DGB [MUSCLE SUMMARY] Starting recompute for routine:", routineTemplateId);
        
        // Load active exercises → muscle groups
        const urlEx =
            `${SUPABASE_URL}/rest/v1/user_routine_exercises_data` +
            `?routine_template_id=eq.${routineTemplateId}&is_active=eq.true` +
            `&select=exercises(muscle_group)`;
    
        logger.db("🔍 DGB [MUSCLE SUMMARY] Fetching exercises from URL:", urlEx);
        const rows = await this.fetchJson<Array<{ exercises?: { muscle_group?: string } }>>(urlEx, true);
        logger.db("🔍 DGB [MUSCLE SUMMARY] Found exercises:", rows.length);
    
        // Early exit if no active exercises - nothing to recompute
        if (rows.length === 0) {
            logger.db("🔍 DGB [MUSCLE SUMMARY] No active exercises found, skipping recomputation");
            logger.db("🔍 DGB [MUSCLE SUMMARY] No database update or cache refresh needed");
            return;
        }
    
        // Count frequency of each muscle group
        const muscleGroupCounts = new Map<string, number>();
        rows.forEach(r => {
            const muscleGroup = (r.exercises?.muscle_group ?? "").trim();
            if (muscleGroup) {
                muscleGroupCounts.set(muscleGroup, (muscleGroupCounts.get(muscleGroup) || 0) + 1);
            }
        });
    
        logger.db("🔍 DGB [MUSCLE SUMMARY] Muscle group counts:", Object.fromEntries(muscleGroupCounts));
    
        // Sort by frequency (descending) and take top 3
        const topMuscleGroups = Array.from(muscleGroupCounts.entries())
            .sort(([, a], [, b]) => b - a) // Sort by count descending
            .slice(0, 3) // Take top 3
            .map(([group]) => group); // Extract just the group names
    
        logger.db("🔍 DGB [MUSCLE SUMMARY] Top 3 muscle groups:", topMuscleGroups);
    
        // Use NULL when no groups (avoids DB pattern/CHECK failures on empty string)
        const summary = topMuscleGroups.length ? topMuscleGroups.join(" • ") : null;
        logger.db("🔍 DGB [MUSCLE SUMMARY] Final summary:", summary);
    
        // Patch base table
        const urlPatch = `${SUPABASE_URL}/rest/v1/user_routines?routine_template_id=eq.${routineTemplateId}`;
        logger.db("🔍 DGB [MUSCLE SUMMARY] Patching routine with URL:", urlPatch);
        await this.fetchJson<any[]>(
            urlPatch,
            true,
            "PATCH",
            [{ muscle_group_summary: summary }],
            "return=representation"
        );
    
        // Refresh routines cache so UI reflects changes
        logger.db("🔍 DGB [MUSCLE SUMMARY] Refreshing routines cache...");
        const userId = await this.getUserId();
        logger.db("🔍 DGB [MUSCLE SUMMARY] User ID for cache refresh:", userId);
        await this.refreshRoutines(userId);
        logger.db("🔍 DGB [MUSCLE SUMMARY] Cache refresh completed");
    }

    /**
     * Log a message to the database logger table
     * @param level - Log level (INFO, DEBUG, etc.)
     * @param message - Log message
     * @param args - Additional arguments
     */
    async logToDatabase(level: string, message: string, args: any[] = []): Promise<void> {
        try {
            const userId = await this.getUserId();
            const logEntry = {
                level,
                message,
                args: args.length > 0 ? JSON.stringify(args) : null,
                timestamp: new Date().toISOString(),
                user_id: userId
            };

            const url = `${SUPABASE_URL}/rest/v1/logger`;
            await this.fetchJson<any[]>(
                url,
                true,
                "POST",
                [logEntry],
                "return=minimal"
            );
        } catch (error) {
            // Don't log database logging errors to avoid infinite loops
            console.error("Failed to log to database:", error);
        }
    }
}


export default SupabaseDBWrite;
