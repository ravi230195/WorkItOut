// components/routine-editor/journal.ts
import type { EditJournal, Id } from "./journalTypes";

// Journal logging utility
const JNL = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`📝 JNL [${timestamp}] ${message}`, data);
  } else {
    console.log(`📝 JNL [${timestamp}] ${message}`);
  }
};

// Helper function to print entire journal
const printJournal = (journal: EditJournal, action: string) => {
  JNL(`=== JOURNAL STATE AFTER ${action} ===`);
  JNL(`Exercise Actions (${journal.ex.length}):`, journal.ex);
  JNL(`Set Actions (${journal.sets.length}):`, journal.sets);
  JNL(`Total Actions: ${journal.ex.length + journal.sets.length}`);
  JNL(`=== END JOURNAL STATE ===`);
};

export function makeJournal(): EditJournal {
  const journal = { ex: [], sets: [] };
  return journal;
}

export function recordExAdd(j: EditJournal, exId: Id, exerciseId: number, name: string, order?: number) {
  const action = { t: "EX_ADD" as const, exId, exerciseId, name, order };
  JNL(`Recording EX_ADD action:`, action);
  j.ex.push(action);
  printJournal(j, "EX_ADD");
}
export function recordExDelete(j: EditJournal, exId: Id) {
  const action = { t: "EX_DELETE" as const, exId };
  JNL(`Recording EX_DELETE action:`, action);
  j.ex.push(action);
  printJournal(j, "EX_DELETE");
}
export function recordSetAdd(j: EditJournal, exId: Id, setId: Id, set_order: number, reps: string, weight: string) {
  const action = { t: "SET_ADD" as const, exId, setId, set_order, reps, weight };
  JNL(`Recording SET_ADD action:`, action);
  j.sets.push(action);
  printJournal(j, "SET_ADD");
}
export function recordSetUpdate(j: EditJournal, exId: Id, setId: Id, reps?: string, weight?: string) {
  const action = { t: "SET_UPDATE" as const, exId, setId, reps, weight };
  JNL(`Recording SET_UPDATE action:`, action);
  j.sets.push(action);
  printJournal(j, "SET_UPDATE");
}
export function recordSetDelete(j: EditJournal, exId: Id, setId: Id) {
  const action = { t: "SET_DELETE" as const, exId, setId };
  JNL(`Recording SET_DELETE action:`, action);
  j.sets.push(action);
  printJournal(j, "SET_DELETE");
}

export function recordSetReorder(j: EditJournal, exId: Id, setId: Id, set_order: number) {
  const action = { t: "SET_REORDER" as const, exId, setId, set_order };
  JNL(`Recording SET_REORDER action:`, action);
  j.sets.push(action);
  printJournal(j, "SET_REORDER");
}
