// Shared types (re-exported by the facade so your imports don’t change)

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
    last_active_at?: string;
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
    muscle_group_summary?: string | null;
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
    planned_reps?: number | null;
    planned_weight_kg?: number | null;
    notes?: string;
  } 
  // src/utils/supabase/supabase-types.ts
export interface Exercise { /* ... */ }
export interface Workout { /* ... */ }
export interface WorkoutExercise { /* ... */ }
export interface Set { /* ... */ }
export interface Profile { /* ... */ }
export interface AuthUser { id: string; email: string }
export interface AuthResponse { /* ... */ }
export interface UserSteps { /* ... */ }
export interface UserRoutine { /* ... */ }
export interface UserRoutineExercise { /* ... */ }
export interface UserRoutineExerciseSet { /* ... */ }