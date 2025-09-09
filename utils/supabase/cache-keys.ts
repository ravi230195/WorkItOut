// All cache keys use the `fullCacheKey*` naming convention
export const fullCacheKeyExercise = (exerciseId: number) =>
  `supabase:exercise:${exerciseId}`;
export const fullCacheKeyExercisesPage = (limit: number, offset: number) =>
  `supabase:exercises:${limit}:${offset}`;
export const fullCacheKeyExercisesMuscleGroup = (
  group: string,
  limit: number,
  offset: number
) => `supabase:exercises:muscle_group:${group}:${limit}:${offset}`;
export const fullCacheKeyExerciseMuscleGroups =
  "supabase:exercises:muscle_groups";
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
export const fullCacheKeyBodyMeasurements = (userId: string) =>
  `supabase:${userId}:bodyMeasurements`;
