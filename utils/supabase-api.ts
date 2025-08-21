// Supabase configuration
const SUPABASE_URL = "https://lledulwstlcejiholstu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsZWR1bHdzdGxjZWppaG9sc3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NzYyNjQsImV4cCI6MjA3MDQ1MjI2NH0.c8-ZOMk76dUOhWiekUks04KFAn52F3_OOvNM28ZmjdU";

export interface Exercise {
  exercise_id: number;
  name: string;
  category: string;
  muscle_group: string;
  equipment?: string;
  description?: string;
  added_by_user_id?: number;
  created_at?: string;
}

export interface Workout {
  id: string;
  template_id?: string | number;
  started_at: string;
  ended_at?: string;
  duration_minutes?: number;
  user_id?: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string | number;
  order_index: number;
}

export interface Set {
  id?: string;
  workout_exercise_id: string;
  set_index?: number;
  reps: number;
  weight: number;
  rpe?: number;
  completed_at: string;
}

export interface Profile {
  id?: string;
  user_id?: string;
  first_name?: string;
  last_name?: string;
  display_name: string;
  height_cm?: number;
  weight_kg?: number;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthResponse {
  access_token?: string;
  session?: {
    access_token: string;
  };
  user?: any;
  error?: {
    message: string;
  };
}

export interface UserSteps {
  user_step_id: number;
  user_id: string;
  goal: number;
}

export interface UserRoutine {
  routine_template_id: number;
  user_id: number;
  name: string;
  version: number;
  is_active: boolean;
  created_at: string;
}

export interface UserRoutineExercise {
  routine_template_exercise_id: number;
  routine_template_id: number;
  exercise_id: number;
  exercise_order: number;
  is_active: boolean;
  notes?: string;
}

export interface UserRoutineExerciseSet {
  routine_template_exercise_set_id: number;
  routine_template_exercise_id: number;
  exercise_id: number;
  set_order: number;
  is_active: boolean;
  planned_reps?: number;
  planned_weight_kg?: number;
  notes?: string;
}

// Exercise mapping status helper functions
export const isExerciseMappingReady = (): boolean => true;

export const getMappingStatus = () => ({
  totalMapped: 0,
  availableFrontendIds: [],
  availableDbIds: []
});

export class SupabaseAPI {
  private userToken: string | null = null;

  setToken(token: string | null) {
    this.userToken = token;
    if (token) {
      console.log("🔐 [DBG] Supabase API: Token set successfully");
    } else {
      console.log("🔐 [DBG] Supabase API: Token cleared");
    }
  }

  private getHeaders(includeAuth = false, includePrefer = false, preferValue = "return=representation") {
    const headers: Record<string, string> = {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    };
    if (includeAuth && this.userToken) headers.Authorization = `Bearer ${this.userToken}`;
    if (includePrefer) headers.Prefer = preferValue;
    return headers;
  }

  private getNowISO(): string {
    return new Date().toISOString();
  }

  private getISOSevenDaysAgo(): string {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString();
  }

  // Exercise mapping methods
  isExerciseMappingReady(): boolean {
    return isExerciseMappingReady();
  }
  getMappingStatus() {
    return getMappingStatus();
  }

  // -------------------
  // Auth methods
  // -------------------
  async signUp(email: string, password: string): Promise<{ token?: string; needsSignIn?: boolean }> {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    const data: AuthResponse = await response.json();

    if (data.error) throw new Error(data.error.message);
    if (data.access_token || data.session?.access_token) {
      const token = data.access_token || data.session!.access_token;
      return { token };
    }
    return { needsSignIn: true };
  }

  async signIn(email: string, password: string): Promise<string> {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    const data: AuthResponse = await response.json();
    if (data.error) throw new Error(data.error.message);
    if (!data.access_token) throw new Error("No access token received");
    return data.access_token;
  }

  async getCurrentUser(): Promise<AuthUser> {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: this.getHeaders(true),
    });
    if (!response.ok) throw new Error(`Failed to get current user: ${response.statusText}`);
    const user = await response.json();
    return { id: user.id, email: user.email };
  }

  async signOut(): Promise<void> {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: this.getHeaders(true),
    });
    this.setToken(null);
  }

  // -------------------
  // Exercise methods
  // -------------------
  async getExercises(): Promise<Exercise[]> {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/exercises?select=*`, {
      headers: this.getHeaders(true),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
    }
    const exercises = await response.json();
    return exercises;
  }

  // -------------------
  // Routine methods
  // -------------------
  async getUserRoutines(): Promise<UserRoutine[]> {
    const user = await this.getCurrentUser();
    // ✅ only active routines
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/user_routines?user_id=eq.${user.id}&is_active=eq.true&select=*`,
      { headers: this.getHeaders(true) }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
    }
    const routines = await response.json();
    return routines;
  }

  async getUserRoutineExercises(routineTemplateId: number): Promise<UserRoutineExercise[]> {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/user_routine_exercises_data?routine_template_id=eq.${routineTemplateId}&select=*`,
      { headers: this.getHeaders(true) }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
    }
    return response.json();
  }

  async getUserRoutineExercisesWithDetails(
    routineTemplateId: number
  ): Promise<Array<UserRoutineExercise & { exercise_name?: string; category?: string }>> {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/user_routine_exercises_data?routine_template_id=eq.${routineTemplateId}&select=*,exercises(name,category)`,
      { headers: this.getHeaders(true) }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
    }

    const exercises = await response.json();
    const flattened = exercises.map((ex: any) => ({
      ...ex,
      exercise_name: ex.exercises?.name || "Unknown Exercise",
      category: ex.exercises?.category || "Unknown",
    }));
    return flattened;
  }

  async createUserRoutine(name: string): Promise<UserRoutine | null> {
    const user = await this.getCurrentUser();
    const response = await fetch(`${SUPABASE_URL}/rest/v1/user_routines`, {
      method: "POST",
      headers: this.getHeaders(true, true),
      body: JSON.stringify({
        user_id: user.id,
        name: name.trim(),
        version: 1,
        is_active: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
    }

    const routines = await response.json();
    return routines[0] ?? null;
  }

  /** ✅ Rename routine */
  async renameRoutine(routineTemplateId: number, newName: string): Promise<void> {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/user_routines?routine_template_id=eq.${routineTemplateId}`,
      {
        method: "PATCH",
        headers: this.getHeaders(true, true, "return=minimal"),
        body: JSON.stringify({ name: newName.trim() }),
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to rename routine: ${response.status} ${response.statusText}. ${errorText}`);
    }
  }

  /** ✅ Soft-delete routine (mark inactive) */
  async deleteRoutine(routineTemplateId: number): Promise<void> {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/user_routines?routine_template_id=eq.${routineTemplateId}`,
      {
        method: "PATCH",
        headers: this.getHeaders(true, true, "return=minimal"),
        body: JSON.stringify({ is_active: false }),
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete routine: ${response.status} ${response.statusText}. ${errorText}`);
    }
  }

  async addExerciseToRoutine(
    routineTemplateId: number,
    exerciseId: number,
    exerciseOrder: number,
    plannedSets?: number,
    plannedReps?: number,
    plannedWeightKg?: number,
    notes?: string
  ): Promise<UserRoutineExercise | null> {
    const body: any = {
      routine_template_id: routineTemplateId,
      exercise_id: exerciseId,
      exercise_order: exerciseOrder,
      is_active: true,
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/user_routine_exercises_data`, {
      method: "POST",
      headers: this.getHeaders(true, true),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
    }

    const exercises = await response.json();
    return exercises[0] ?? null;
  }

  async addExerciseSetsToRoutine(
    routineTemplateExerciseId: number,
    exerciseId: number,
    // accepts optional set_order per set
    setsData: { reps: number; weight: number; set_order?: number }[]
  ): Promise<UserRoutineExerciseSet[]> {
    const setsToInsert = setsData.map((set, index) => ({
      routine_template_exercise_id: routineTemplateExerciseId,
      exercise_id: exerciseId,
      set_order: set.set_order ?? index + 1,
      is_active: true,
      planned_reps: set.reps > 0 ? set.reps : null,
      planned_weight_kg: set.weight > 0 ? set.weight : null,
    }));

    const response = await fetch(`${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data`, {
      method: "POST",
      headers: this.getHeaders(true, true),
      body: JSON.stringify(setsToInsert),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
    }

    return response.json();
  }

  async getExerciseSetsForRoutine(routineTemplateExerciseId: number): Promise<UserRoutineExerciseSet[]> {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_id=eq.${routineTemplateExerciseId}&is_active=eq.true&order=set_order`,
      { headers: this.getHeaders(true) }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
    }

    return response.json();
  }

  async updateExerciseSet(
    routineTemplateExerciseSetId: number,
    plannedReps?: number,
    plannedWeightKg?: number
  ): Promise<UserRoutineExerciseSet | null> {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_set_id=eq.${routineTemplateExerciseSetId}`,
      {
        method: "PATCH",
        headers: this.getHeaders(true, true),
        body: JSON.stringify({
          planned_reps: plannedReps && plannedReps > 0 ? plannedReps : null,
          planned_weight_kg: plannedWeightKg && plannedWeightKg > 0 ? plannedWeightKg : null,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
    }

    const updatedSets = await response.json();
    return updatedSets[0] ?? null;
  }

  /** Update set_order for a set */
  async updateExerciseSetOrder(
    routineTemplateExerciseSetId: number,
    newOrder: number
  ): Promise<void> {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_set_id=eq.${routineTemplateExerciseSetId}`,
      {
        method: "PATCH",
        headers: this.getHeaders(true, true, "return=minimal"),
        body: JSON.stringify({ set_order: newOrder }),
      }
    );
    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`Failed to update set order: ${resp.status} ${resp.statusText}. ${errorText}`);
    }
  }

  /** SOFT DELETE: mark a set inactive instead of removing it */
  async deleteExerciseSet(routineTemplateExerciseSetId: number): Promise<void> {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_set_id=eq.${routineTemplateExerciseSetId}`,
      {
        method: "PATCH",
        headers: this.getHeaders(true, true, "return=minimal"),
        body: JSON.stringify({ is_active: false }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
    }
  }

  // -------------------
  // Workout methods (mocked)
  // -------------------
  async getRecentWorkouts(): Promise<Workout[]> {
    const mockWorkouts: Workout[] = [
      { id: "1", started_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), duration_minutes: 45 },
      { id: "2", started_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), duration_minutes: 52 },
      { id: "3", started_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), duration_minutes: 38 },
    ];
    return mockWorkouts;
  }

  async startWorkout(templateId: string | number): Promise<Workout | null> {
    const mockWorkout: Workout = {
      id: Date.now().toString(),
      template_id: templateId,
      started_at: new Date().toISOString(),
    };
    return mockWorkout;
  }

  // -------------------
  // Profile methods
  // -------------------
  async getMyProfile(): Promise<Profile | null> {
    const user = await this.getCurrentUser();
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=*`,
      { headers: this.getHeaders(true) }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
    }

    const profiles = await response.json();
    return profiles.length > 0 ? profiles[0] : null;
  }

  async upsertProfile(
    firstName: string,
    lastName: string,
    displayName: string,
    heightCm?: number,
    weightKg?: number,
    userId?: string
  ): Promise<Profile | null> {
    const user = userId ? { id: userId } : await this.getCurrentUser();

    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: "POST",
      headers: this.getHeaders(true, true, "resolution=merge-duplicates"),
      body: JSON.stringify({
        user_id: user.id,
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
        height_cm: heightCm,
        weight_kg: weightKg,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
    }

    const profiles = await response.json();
    return profiles.length > 0 ? profiles[0] : null;
  }

  // -------------------
  // User Steps methods
  // -------------------
  async getUserStepGoal(): Promise<number> {
    const user = await this.getCurrentUser();
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/user_steps?user_id=eq.${user.id}&select=goal`,
      { headers: this.getHeaders(true) }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
    }

    const steps = await response.json();
    if (steps.length > 0) return steps[0].goal;

    const defaultGoal = await this.createUserStepGoal(10000);
    return defaultGoal;
  }

  async createUserStepGoal(goal: number = 10000): Promise<number> {
    const user = await this.getCurrentUser();

    const response = await fetch(`${SUPABASE_URL}/rest/v1/user_steps`, {
      method: "POST",
      headers: this.getHeaders(true, true),
      body: JSON.stringify({ user_id: user.id, goal }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
    }

    const steps = await response.json();
    return steps.length > 0 ? steps[0].goal : goal;
  }
}

// Create a singleton instance
export const supabaseAPI = new SupabaseAPI();