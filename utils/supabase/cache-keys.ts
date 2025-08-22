// All cache keys renamed to “fullCacheKey*” as requested

export const fullCacheKeyExercises = () => `supabase:exercises`;

export const fullCacheKeyUserRoutines = (userId: string) =>
  `supabase:${userId}:routines`;

export const fullCacheKeyRoutineExercises = (userId: string, routineTemplateId: number) =>
  `supabase:${userId}:routine:${routineTemplateId}:exercises`;

export const fullCacheKeyRoutineExercisesWithDetails = (userId: string, routineTemplateId: number) =>
  `supabase:${userId}:routine:${routineTemplateId}:exercises+details`;

export const fullCacheKeyRoutineSets = (userId: string, routineTemplateExerciseId: number) =>
  `supabase:${userId}:rtex:${routineTemplateExerciseId}:sets`;

export const fullCacheKeyProfile = (userId: string) =>
  `supabase:${userId}:profile`;

export const fullCacheKeySteps = (userId: string) =>
  `supabase:${userId}:steps`;
