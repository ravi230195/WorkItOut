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
export const isExerciseMappingReady = (): boolean => {
  return true;
};

export const getMappingStatus = () => {
  return {
    totalMapped: 0,
    availableFrontendIds: [],
    availableDbIds: []
  };
};

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
      "apikey": SUPABASE_ANON_KEY,
      "Content-Type": "application/json"
    };

    if (includeAuth && this.userToken) {
      headers["Authorization"] = `Bearer ${this.userToken}`;
    }

    if (includePrefer) {
      headers["Prefer"] = preferValue;
    }

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

  // Auth methods
  async signUp(email: string, password: string): Promise<{ token?: string; needsSignIn?: boolean }> {
    try {
      console.log("🔄 [DBG] Supabase API: Starting signup process for", email);
      const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ email, password })
      });

      const data: AuthResponse = await response.json();

      if (data.error) {
        console.error("❌ [DBG] Supabase API: Signup error:", data.error.message);
        throw new Error(data.error.message);
      }

      if (data.access_token || data.session?.access_token) {
        const token = data.access_token || data.session!.access_token;
        console.log("✅ [DBG] Supabase API: Signup successful, token received");
        return { token };
      }

      console.log("ℹ️ [DBG] Supabase API: Signup successful, needs sign in");
      return { needsSignIn: true };
    } catch (error) {
      console.error('❌ [DBG] Supabase API: SignUp error:', error);
      throw error;
    }
  }

  async signIn(email: string, password: string): Promise<string> {
    try {
      console.log("🔄 [DBG] Supabase API: Starting signin process for", email);
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ email, password })
      });

      const data: AuthResponse = await response.json();

      if (data.error) {
        console.error("❌ [DBG] Supabase API: Signin error:", data.error.message);
        throw new Error(data.error.message);
      }

      if (data.access_token) {
        console.log("✅ [DBG] Supabase API: Signin successful");
        return data.access_token;
      }

      console.error("❌ [DBG] Supabase API: No access token received");
      throw new Error('No access token received');
    } catch (error) {
      console.error('❌ [DBG] Supabase API: SignIn error:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<AuthUser> {
    try {
      console.log("🔄 [DBG] Supabase API: Getting current user");
      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: this.getHeaders(true)
      });

      if (!response.ok) {
        console.error("❌ [DBG] Supabase API: Failed to get current user:", response.statusText);
        throw new Error(`Failed to get current user: ${response.statusText}`);
      }

      const user = await response.json();
      console.log("✅ [DBG] Supabase API: Current user retrieved:", user.id);
      return { id: user.id, email: user.email };
    } catch (error) {
      console.error('❌ [DBG] Supabase API: Get current user error:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      console.log("🔄 [DBG] Supabase API: Starting signout process");
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: this.getHeaders(true)
      });
      this.setToken(null);
      console.log("✅ [DBG] Supabase API: Signout successful");
    } catch (error) {
      console.error('❌ [DBG] Supabase API: SignOut error:', error);
      throw error;
    }
  }

  // Exercise methods
  async getExercises(): Promise<Exercise[]> {
    try {
      console.log("🔄 [DBG] Supabase API: Fetching exercises from database");
      const response = await fetch(`${SUPABASE_URL}/rest/v1/exercises?select=*`, {
        headers: this.getHeaders(true)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [DBG] Supabase API: Error response body:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
      }

      const exercises = await response.json();
      console.log(`✅ [DBG] Supabase API: Fetched ${exercises.length} exercises from database`);
      return exercises;
    } catch (error) {
      console.error('❌ [DBG] Supabase API: Get exercises error:', error);
      throw error;
    }
  }

  // Routine methods
  async getUserRoutines(): Promise<UserRoutine[]> {
    try {
      const user = await this.getCurrentUser();
      console.log(`🔄 [DBG] Supabase API: Fetching routines for user: ${user.id}`);
      
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/user_routines?user_id=eq.${user.id}&select=*`,
        { headers: this.getHeaders(true) }
      );

      console.log(`ℹ️ [DBG] Supabase API: Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [DBG] Supabase API: Error response body:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
      }

      const routines = await response.json();
      console.log(`✅ [DBG] Supabase API: Fetched ${routines.length} user routines from database`);
      return routines;
    } catch (error) {
      console.error('❌ [DBG] Supabase API: Get user routines error:', error);
      throw new Error(`Failed to fetch routines: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUserRoutineExercises(routineTemplateId: number): Promise<UserRoutineExercise[]> {
    try {
      console.log(`🔄 [DBG] Supabase API: Fetching exercises for routine ${routineTemplateId}`);
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/user_routine_exercises_data?routine_template_id=eq.${routineTemplateId}&select=*`,
        { headers: this.getHeaders(true) }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [DBG] Supabase API: Error response body:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
      }

      const exercises = await response.json();
      console.log(`✅ [DBG] Supabase API: Found ${exercises.length} exercises for routine ${routineTemplateId}`);
      return exercises;
    } catch (error) {
      console.error('❌ [DBG] Supabase API: Get user routine exercises error:', error);
      throw error;
    }
  }

  async getUserRoutineExercisesWithDetails(
    routineTemplateId: number
  ): Promise<Array<UserRoutineExercise & { exercise_name?: string; category?: string }>> {
    try {
      console.log(`🔄 [DBG] Supabase API: Fetching exercises with details for routine ${routineTemplateId}`);
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/user_routine_exercises_data?routine_template_id=eq.${routineTemplateId}&select=*,exercises(name,category)`,
        { headers: this.getHeaders(true) }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [DBG] Supabase API: Error response body:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
      }

      const exercises = await response.json();
      console.log(`✅ [DBG] Supabase API: Found ${exercises.length} exercises with details for routine ${routineTemplateId}`);
      
      // Flatten the nested exercise data
      const flattened = exercises.map((ex: any) => ({
        ...ex,
        exercise_name: ex.exercises?.name || 'Unknown Exercise',
        category: ex.exercises?.category || 'Unknown'
      }));
      
      return flattened;
    } catch (error) {
      console.error('❌ [DBG] Supabase API: Get user routine exercises with details error:', error);
      throw error;
    }
  }

  async createUserRoutine(name: string): Promise<UserRoutine | null> {
    try {
      const user = await this.getCurrentUser();
      console.log(`🔄 [DBG] Supabase API: Creating routine '${name}' for user ${user.id}`);
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/user_routines`, {
        method: 'POST',
        headers: this.getHeaders(true, true),
        body: JSON.stringify({
          user_id: user.id,
          name: name.trim(),
          version: 1,
          is_active: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [DBG] Supabase API: Error response body:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
      }

      const routines = await response.json();
      const routine = routines[0];
      
      if (routine) {
        console.log(`✅ [DBG] Supabase API: Created routine with ID: ${routine.routine_template_id}`);
        return routine;
      }
      
      console.log("⚠️ [DBG] Supabase API: No routine returned from creation");
      return null;
    } catch (error) {
      console.error('❌ [DBG] Supabase API: Create user routine error:', error);
      throw error;
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
    try {
      console.log(`🔄 [DBG] Supabase API: Adding exercise ${exerciseId} to routine ${routineTemplateId}`);
      const body: any = {
        routine_template_id: routineTemplateId,
        exercise_id: exerciseId,
        exercise_order: exerciseOrder,
        is_active: true
      };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/user_routine_exercises_data`, {
        method: 'POST',
        headers: this.getHeaders(true, true),
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [DBG] Supabase API: Error response body:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
      }

      const exercises = await response.json();
      const exercise = exercises[0];
      
      if (exercise) {
        console.log(`✅ [DBG] Supabase API: Added exercise to routine successfully`);
        return exercise;
      }
      
      console.log("⚠️ [DBG] Supabase API: No exercise returned from addition");
      return null;
    } catch (error) {
      console.error('❌ [DBG] Supabase API: Add exercise to routine error:', error);
      throw error;
    }
  }

  async addExerciseSetsToRoutine(
    routineTemplateExerciseId: number,
    exerciseId: number,
    // now accepts optional set_order per set
    setsData: { reps: number; weight: number; set_order?: number }[]
  ): Promise<UserRoutineExerciseSet[]> {
    try {
      console.log(`🔄 [DBG] Supabase API: Adding ${setsData.length} sets to routine exercise ${routineTemplateExerciseId}`);
      const setsToInsert = setsData.map((set, index) => ({
        routine_template_exercise_id: routineTemplateExerciseId,
        exercise_id: exerciseId,
        set_order: set.set_order ?? index + 1, // ✅ respect provided set_order
        is_active: true,
        planned_reps: set.reps > 0 ? set.reps : null,
        planned_weight_kg: set.weight > 0 ? set.weight : null
      }));

      const response = await fetch(`${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data`, {
        method: 'POST',
        headers: this.getHeaders(true, true),
        body: JSON.stringify(setsToInsert)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [DBG] Supabase API: Error response body:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
      }

      const savedSets = await response.json();
      console.log(`✅ [DBG] Supabase API: Added ${savedSets.length} sets to routine exercise ${routineTemplateExerciseId}`);
      return savedSets;
    } catch (error) {
      console.error('❌ [DBG] Supabase API: Add exercise sets to routine error:', error);
      throw error;
    }
  }

  async getExerciseSetsForRoutine(routineTemplateExerciseId: number): Promise<UserRoutineExerciseSet[]> {
    try {
      console.log(`🔄 [DBG] Supabase API: Fetching sets for routine exercise ${routineTemplateExerciseId}`);
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_id=eq.${routineTemplateExerciseId}&is_active=eq.true&order=set_order`,
        { headers: this.getHeaders(true) }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [DBG] Supabase API: Error response body:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
      }

      const sets = await response.json();
      console.log(`✅ [DBG] Supabase API: Found ${sets.length} sets for routine exercise ${routineTemplateExerciseId}`);
      return sets;
    } catch (error) {
      console.error('❌ [DBG] Supabase API: Get exercise sets for routine error:', error);
      throw error;
    }
  }

  async updateExerciseSet(
    routineTemplateExerciseSetId: number,
    plannedReps?: number,
    plannedWeightKg?: number
  ): Promise<UserRoutineExerciseSet | null> {
    try {
      console.log(`🔄 [DBG] Supabase API: Updating set ${routineTemplateExerciseSetId}`);
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_set_id=eq.${routineTemplateExerciseSetId}`,
        {
          method: 'PATCH',
          headers: this.getHeaders(true, true),
          body: JSON.stringify({
            planned_reps: plannedReps && plannedReps > 0 ? plannedReps : null,
            planned_weight_kg: plannedWeightKg && plannedWeightKg > 0 ? plannedWeightKg : null
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [DBG] Supabase API: Error response body:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
      }

      const updatedSets = await response.json();
      const updatedSet = updatedSets[0];
      console.log(`✅ [DBG] Supabase API: Updated set ${routineTemplateExerciseSetId}`);
      return updatedSet;
    } catch (error) {
      console.error('❌ [DBG] Supabase API: Update exercise set error:', error);
      throw error;
    }
  }

  /** ✅ Update set_order for a set */
  async updateExerciseSetOrder(
    routineTemplateExerciseSetId: number,
    newOrder: number
  ): Promise<void> {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_set_id=eq.${routineTemplateExerciseSetId}`,
      {
        method: "PATCH",
        headers: this.getHeaders(true, true, "return=minimal"),
        body: JSON.stringify({ set_order: newOrder })
      }
    );
    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`Failed to update set order: ${resp.status} ${resp.statusText}. ${errorText}`);
    }
  }

  /** ✅ SOFT DELETE: mark a set inactive instead of removing it */
  async deleteExerciseSet(routineTemplateExerciseSetId: number): Promise<void> {
    try {
      console.log(`🗑️ [DBG] Supabase API: Soft-deleting set ${routineTemplateExerciseSetId}`);
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_set_id=eq.${routineTemplateExerciseSetId}`,
        {
          method: 'PATCH',
          headers: this.getHeaders(true, true, "return=minimal"),
          body: JSON.stringify({ is_active: false })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [DBG] Supabase API: Soft delete error body:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
      }

      console.log(`✅ [DBG] Supabase API: Marked set ${routineTemplateExerciseSetId} as inactive`);
    } catch (error) {
      console.error('❌ [DBG] Supabase API: Soft delete exercise set error:', error);
      throw error;
    }
  }

  // Workout methods
  async getRecentWorkouts(): Promise<Workout[]> {
    try {
      console.log('🔄 [DBG] Supabase API: Returning mock workout data (workouts table not available)');
      const mockWorkouts: Workout[] = [
        { id: '1', started_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), duration_minutes: 45 },
        { id: '2', started_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), duration_minutes: 52 },
        { id: '3', started_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), duration_minutes: 38 }
      ];
      console.log(`✅ [DBG] Supabase API: Returning ${mockWorkouts.length} mock workouts`);
      return mockWorkouts;
    } catch (error) {
      console.error('❌ [DBG] Supabase API: Get recent workouts error:', error);
      return [];
    }
  }

  async startWorkout(templateId: string | number): Promise<Workout | null> {
    try {
      console.log(`🔄 [DBG] Supabase API: Starting workout with template ID: ${templateId}`);
      const mockWorkout: Workout = {
        id: Date.now().toString(),
        template_id: templateId,
        started_at: new Date().toISOString()
      };
      console.log(`✅ [DBG] Supabase API: Mock workout started with ID: ${mockWorkout.id}`);
      return mockWorkout;
    } catch (error) {
      console.error('❌ [DBG] Supabase API: Start workout error:', error);
      return null;
    }
  }

  // Profile methods
  async getMyProfile(): Promise<Profile | null> {
    try {
      const user = await this.getCurrentUser();
      console.log(`🔄 [DBG] Supabase API: Fetching profile for user: ${user.id}`);
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=*`,
        { headers: this.getHeaders(true) }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [DBG] Supabase API: Error response body:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
      }

      const profiles = await response.json();
      console.log(`✅ [DBG] Supabase API: Profile fetch result: ${profiles.length > 0 ? 'found' : 'not found'}`);
      return profiles.length > 0 ? profiles[0] : null;
    } catch (error) {
      console.error('❌ [DBG] Supabase API: Get profile error:', error);
      throw error;
    }
  }

  async upsertProfile(
    firstName: string,
    lastName: string,
    displayName: string,
    heightCm?: number,
    weightKg?: number,
    userId?: string
  ): Promise<Profile | null> {
    try {
      const user = userId ? { id: userId } : await this.getCurrentUser();
      console.log(`🔄 [DBG] Supabase API: Upserting profile for user: ${user.id}`);
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: this.getHeaders(true, true, "resolution=merge-duplicates"),
        body: JSON.stringify({
          user_id: user.id,
          first_name: firstName,
          last_name: lastName,
          display_name: displayName,
          height_cm: heightCm,
          weight_kg: weightKg
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [DBG] Supabase API: Error response body:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
      }

      const profiles = await response.json();
      console.log(`✅ [DBG] Supabase API: Profile upserted successfully`);
      return profiles.length > 0 ? profiles[0] : null;
    } catch (error) {
      console.error('❌ [DBG] Supabase API: Upsert profile error:', error);
      throw error;
    }
  }

  // User Steps methods
  async getUserStepGoal(): Promise<number> {
    try {
      const user = await this.getCurrentUser();
      console.log(`🔄 [DBG] Supabase API: Fetching step goal for user: ${user.id}`);
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/user_steps?user_id=eq.${user.id}&select=goal`,
        { headers: this.getHeaders(true) }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [DBG] Supabase API: Error response body:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
      }

      const steps = await response.json();
      if (steps.length > 0) {
        console.log(`✅ [DBG] Supabase API: Step goal found: ${steps[0].goal}`);
        return steps[0].goal;
      } else {
        console.log(`ℹ️ [DBG] Supabase API: No step goal found, creating default`);
        const defaultGoal = await this.createUserStepGoal(10000);
        return defaultGoal;
      }
    } catch (error) {
      console.error('❌ [DBG] Supabase API: Get user step goal error:', error);
      return 10000;
    }
  }

  async createUserStepGoal(goal: number = 10000): Promise<number> {
    try {
      const user = await this.getCurrentUser();
      console.log(`🔄 [DBG] Supabase API: Creating step goal (${goal}) for user: ${user.id}`);
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/user_steps`, {
        method: 'POST',
        headers: this.getHeaders(true, true),
        body: JSON.stringify({ user_id: user.id, goal })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [DBG] Supabase API: Error response body:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
      }

      const steps = await response.json();
      if (steps.length > 0) {
        console.log(`✅ [DBG] Supabase API: Step goal created successfully: ${steps[0].goal}`);
        return steps[0].goal;
      }
      
      console.log(`✅ [DBG] Supabase API: Step goal creation completed with default: ${goal}`);
      return goal;
    } catch (error) {
      console.error('❌ [DBG] Supabase API: Create user step goal error:', error);
      return goal;
    }
  }
}

// Create a singleton instance
export const supabaseAPI = new SupabaseAPI();