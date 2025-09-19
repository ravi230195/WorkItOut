jest.mock('../utils/supabase/supabase-api', () => ({
  supabaseAPI: {
    deleteRoutineExercise: jest.fn().mockResolvedValue(undefined),
    deleteExerciseSet: jest.fn().mockResolvedValue(undefined),
    updateExerciseSet: jest.fn().mockResolvedValue(undefined),
    updateExerciseSetOrder: jest.fn().mockResolvedValue(undefined),
    addExerciseToRoutine: jest.fn().mockResolvedValue(undefined),
    addExerciseSetsToRoutine: jest.fn().mockResolvedValue(undefined),
    recomputeAndSaveRoutineMuscleSummary: jest.fn().mockResolvedValue({
      muscle_group_summary: null,
      exercise_count: 0,
    }),
  },
}));

import { runJournal } from '../components/routine-editor/journalRunner';
import type { SavePlan } from '../components/routine-editor/collapseJournal';
import type { ExIdMap } from '../components/routine-editor/journalRunner';
import { supabaseAPI } from '../utils/supabase/supabase-api';

test('runJournal skips creating exercises without set payloads', async () => {
  const plan: SavePlan = {
    deleteExercises: [],
    deleteSets: [],
    updateSets: [],
    orderSets: [],
    createExercises: [
      { tempExId: -1, exerciseId: 1, order: 1, name: 'Test' },
    ],
    createSetsByExercise: {},
  };
  const exMap: ExIdMap = { [-1]: { exerciseId: 1 } };

  await runJournal(plan, 1, exMap);

  expect(supabaseAPI.addExerciseToRoutine).not.toHaveBeenCalled();
});
