// Shared types (re-exported by the facade so your imports don’t change)

export interface Exercise {
    exercise_id: number;
    name: string;
    muscle_group: string;
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
  
  export type UnitLength = "cm" | "m";
  export type UnitWeight = "kg" | "lbs";
  export type GenderType = "male" | "female" | "non_binary" | "prefer_not_to_say";

  export interface Profile {
    id?: string;
    user_id?: string;
    first_name?: string;
    last_name?: string;
    display_name: string;
    height_cm?: number;
    weight_kg?: number;
    length_unit?: UnitLength;
    weight_unit?: UnitWeight;
    gender?: GenderType;
  }
  
  export interface AuthUserMetadata {
    full_name?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    first_name?: string;
    last_name?: string;
    preferred_username?: string;
    nickname?: string;
    email?: string;
    [key: string]: unknown;
  }

  export interface AuthUser {
    id: string;
    email: string | null;
    user_metadata?: AuthUserMetadata;
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

  export interface BodyMeasurement {
    id: number;
    user_id: string;
    measured_on: string;
    chest_cm?: number | null;
    right_arm_cm?: number | null;
    left_arm_cm?: number | null;
    waist_cm?: number | null;
    hip_cm?: number | null;
    glutes_cm?: number | null;
    left_quad_cm?: number | null;
    right_quad_cm?: number | null;
    left_calf_cm?: number | null;
    right_calf_cm?: number | null;
    notes?: string | null;
  }
