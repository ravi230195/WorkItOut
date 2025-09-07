import { supabaseAPI } from '../utils/supabase/supabase-api';
import { createTestUser, validateTestUser } from './utils/test-user';

describe('Supabase API Routine CRUD Integration', () => {
  const testUser = createTestUser();
  let routineId: number;
  let exerciseId: number;
  let rtexId: number;
  let setId: number;

  beforeAll(async () => {
    // enable hard delete path
    process.env.USE_HARD_DELETE = 'true';

    expect(validateTestUser(testUser)).toBe(true);

    const signUp = await supabaseAPI.signUp(testUser.email, testUser.password);
    let token = signUp.token;

    if (!token) {
      const signIn = await supabaseAPI.signIn(testUser.email, testUser.password);
      token = signIn.access_token;
    }

    supabaseAPI.setToken(token!);

    const exercises = await supabaseAPI.getExercises();
    exerciseId = exercises[0].exercise_id;
  }, 20000);

  test('creates routine with exercise and sets, then updates and deletes them', async () => {
    const routine = await supabaseAPI.createUserRoutine('Integration Routine');
    expect(routine).toBeTruthy();
    routineId = routine!.routine_template_id;

    const routines = await supabaseAPI.getUserRoutines();
    expect(routines.some(r => r.routine_template_id === routineId)).toBe(true);

    const rtex = await supabaseAPI.addExerciseToRoutine(routineId, exerciseId, 1);
    expect(rtex).toBeTruthy();
    rtexId = rtex!.routine_template_exercise_id;

    const exercises = await supabaseAPI.getUserRoutineExercises(routineId);
    expect(exercises.some(e => e.routine_template_exercise_id === rtexId)).toBe(true);

    const [set] = await supabaseAPI.addExerciseSetsToRoutine(rtexId, exerciseId, [
      { reps: 10, weight: 50 }
    ]);
    expect(set).toBeTruthy();
    setId = set.routine_template_exercise_set_id;

    let sets = await supabaseAPI.getExerciseSetsForRoutine(rtexId);
    expect(sets.some(s => s.routine_template_exercise_set_id === setId)).toBe(true);

    const updatedSet = await supabaseAPI.updateExerciseSet(setId, 12, 55);
    expect(updatedSet?.planned_reps).toBe(12);
    expect(updatedSet?.planned_weight_kg).toBe(55);

    await supabaseAPI.deleteExerciseSet(setId);
    sets = await supabaseAPI.getExerciseSetsForRoutine(rtexId);
    expect(sets.some(s => s.routine_template_exercise_set_id === setId)).toBe(false);

    await supabaseAPI.deleteRoutineExercise(rtexId);
    const afterExercises = await supabaseAPI.getUserRoutineExercises(routineId);
    expect(afterExercises.some(e => e.routine_template_exercise_id === rtexId)).toBe(false);

    await supabaseAPI.deleteRoutine(routineId);
    const afterRoutines = await supabaseAPI.getUserRoutines();
    expect(afterRoutines.some(r => r.routine_template_id === routineId)).toBe(false);
  }, 60000);
});

