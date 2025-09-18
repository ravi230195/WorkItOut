import { supabaseAPI } from '../utils/supabase/supabase-api';
import { localCache } from '../utils/cache/localCache';
import { createTestUser, validateTestUser } from './utils/test-user';
import { logger } from '../utils/logging';

describe('Supabase API Routine CRUD Integration', () => {
  const testUser = createTestUser();
  let routineId: number;
  let exerciseId: number;
  let rtexId: number;
  let setId: number;
  console.log('🔐 Initializing Routine CRUD Integration Tests...');
  console.log('🔐 Test user email:', testUser.email);
  console.log('🔐 Test user password:', testUser.password);
  console.log('🔐 Test user createdAt:', testUser.createdAt);

  beforeAll(async () => {
    // enable hard delete path
    process.env.USE_HARD_DELETE = 'true';

    expect(validateTestUser(testUser)).toBe(true);

    const signUp = await supabaseAPI.signUp(testUser.email, testUser.password);
    let token = signUp.token;
    logger.debug('🔐 Token:', token);


    if (!token) {
      const signIn = await supabaseAPI.signIn(testUser.email, testUser.password);
      token = signIn.access_token;
    }

    supabaseAPI.setToken(token!);    
    await supabaseAPI.upsertProfile({
      firstName: 'Test ' + testUser.email,
      lastName: 'User ' + testUser.email,
      displayName: 'Integration Tester ' + testUser.email,
    });

    localCache.clearPrefix();
    const exercises = await supabaseAPI.getExercises();
    exerciseId = exercises[0].exercise_id;
    console.log('🔐 Exercise ID:', exerciseId);
    console.log('🔐 Exercises:', exercises);
    console.log('🔐 User Added');
  }, 20000);

  test('creates routine with exercise and sets, then updates and deletes them', async () => {
    {
      console.log('🔐 Creating routine');
      const routine = await supabaseAPI.createUserRoutine('Integration Routine');
      expect(routine).toBeTruthy();
      routineId = routine!.routine_template_id;
      console.log('🔐 Created Routine ID:', routineId);


      localCache.clearPrefix();
      const routines = await supabaseAPI.getUserRoutines();
      expect(routines.some(r => r.routine_template_id === routineId)).toBe(true);
      console.log('🔐 Routines:', routines);
      console.log('🔐 User Routines:', routines.some(r => r.routine_template_id === routineId));
    }

    {
      const rtex = await supabaseAPI.addExerciseToRoutine(routineId, exerciseId, 1);
      expect(rtex).toBeTruthy();
      rtexId = rtex!.routine_template_exercise_id;
      console.log('🔐 Added Exercise: ', rtexId, ' to Routine ID:', routineId);

      localCache.clearPrefix();
      const exercises = await supabaseAPI.getUserRoutineExercises(routineId);
      expect(exercises.some(e => e.routine_template_exercise_id === rtexId)).toBe(true);
      console.log('🔐 Exercises:', exercises);
      console.log('🔐 User Exercises:', exercises.some(e => e.routine_template_exercise_id === rtexId));
    }

    {
      const [set] = await supabaseAPI.addExerciseSetsToRoutine(rtexId, exerciseId, [
        { reps: 10, weight: 50 }
      ]);
      expect(set).toBeTruthy();
      setId = set.routine_template_exercise_set_id;

      localCache.clearPrefix();
      let sets = await supabaseAPI.getExerciseSetsForRoutine(rtexId);
      expect(sets.some(s => s.routine_template_exercise_set_id === setId)).toBe(true);
      console.log('🔐 Sets:', sets);
      console.log('🔐 User Sets:', sets.some(s => s.routine_template_exercise_set_id === setId));
    }

    {
      localCache.clearPrefix();
      let sets = await supabaseAPI.getExerciseSetsForRoutine(rtexId);
      expect(sets.some(s => s.routine_template_exercise_set_id === setId)).toBe(true);
      console.log('🔐 Sets:', sets);
      console.log('🔐 User Sets:', sets.some(s => s.routine_template_exercise_set_id === setId));

      localCache.clearPrefix();
      const updatedSet = await supabaseAPI.updateExerciseSet(setId, 12, 55);
      expect(updatedSet?.planned_reps).toBe(12);
      expect(updatedSet?.planned_weight_kg).toBe(55);
      console.log('🔐 Updated Set:', updatedSet);
      console.log('🔐 User Sets:', sets.some(s => s.routine_template_exercise_set_id === setId));
    
    
    
      await supabaseAPI.deleteExerciseSet(setId);
      localCache.clearPrefix();
      sets = await supabaseAPI.getExerciseSetsForRoutine(rtexId);
      expect(sets.some(s => s.routine_template_exercise_set_id === setId)).toBe(false);
      console.log('🔐 User Sets:', sets.some(s => s.routine_template_exercise_set_id === setId));
      console.log('🔐 Deleted Set:', setId);
    }


    await supabaseAPI.deleteRoutineExercise(rtexId);
    localCache.clearPrefix();
    const afterExercises = await supabaseAPI.getUserRoutineExercises(routineId);
    expect(afterExercises.some(e => e.routine_template_exercise_id === rtexId)).toBe(false);
    console.log('🔐 User Exercises:', afterExercises.some(e => e.routine_template_exercise_id === rtexId));
    console.log('🔐 Deleted Exercise:', rtexId);


    await supabaseAPI.deleteRoutine(routineId);
    localCache.clearPrefix();
    const afterRoutines = await supabaseAPI.getUserRoutines();
    expect(afterRoutines.some(r => r.routine_template_id === routineId)).toBe(false);
    console.log('🔐 User Routines:', afterRoutines.some(r => r.routine_template_id === routineId));
    console.log('🔐 Deleted Routine:', routineId);

  }, 60000);

  test('upserts body measurements and keeps single entry per day', async () => {
    const today = new Date();
    const dates: string[] = [];

    // Generate ISO dates for today and the previous 3 days
    for (let i = 3; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    // Insert measurements for each day
    for (let i = 0; i < dates.length; i++) {
      const measurement = await supabaseAPI.upsertBodyMeasurement({
        measured_on: dates[i],
        chest_cm: 100 + i,
      });
      expect(measurement?.measured_on).toBe(dates[i]);
    }

    // Fetch and verify four entries exist
    localCache.clearPrefix();
    let fetched = await supabaseAPI.getBodyMeasurements(4);
    expect(fetched.length).toBe(4);

    // Update today's measurement
    const updated = await supabaseAPI.upsertBodyMeasurement({
      measured_on: dates[3],
      chest_cm: 200,
    });
    expect(updated?.chest_cm).toBe(200);

    // Ensure only one entry for today with updated value
    localCache.clearPrefix();
    fetched = await supabaseAPI.getBodyMeasurements(4);
    const todays = fetched.filter(m => m.measured_on === dates[3]);
    expect(todays.length).toBe(1);
    expect(todays[0].chest_cm).toBe(200);

    // Clean up inserted measurements
    for (const date of dates) {
      await supabaseAPI.deleteBodyMeasurement(date);
    }

    localCache.clearPrefix();
    fetched = await supabaseAPI.getBodyMeasurements(4);
    expect(fetched.length).toBe(0);
  }, 30000);

  afterAll(async () => {
    const user = await supabaseAPI.getCurrentUser().catch(() => null);
    if (user?.id) {
      await supabaseAPI.deleteProfile(user.id);
    }
    await supabaseAPI.signOut();
  });
});

