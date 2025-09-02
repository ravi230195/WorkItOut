import { collapseJournal } from '../components/routine-editor/collapseJournal';
import type { EditJournal } from '../components/routine-editor/journalTypes';

test('skip creating exercise when all sets are empty', () => {
  const journal: EditJournal = {
    ex: [
      { t: 'EX_ADD', exId: -1, exerciseId: 1, name: 'Test', order: 1 },
    ],
    sets: [
      { t: 'SET_ADD', exId: -1, setId: -1, reps: '0', weight: '0', set_order: 1 },
    ],
  };

  const plan = collapseJournal(journal);
  expect(plan.createExercises).toHaveLength(0);
  expect(Object.keys(plan.createSetsByExercise)).toHaveLength(0);
});
