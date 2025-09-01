// components/routine-editor/journalTypes.ts
import { logger } from "../../utils/logging";

// Debug logging utility
const JNL = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  if (data) {
    logger.debug(`📝 JNL [${timestamp}] ${message}`, data);
  } else {
    logger.debug(`📝 JNL [${timestamp}] ${message}`);
  }
};

export type Id = number; // >0 = DB id, <0 = temp id
export const tempId = () => {
  const id = -Math.floor(Math.random() * 1e9) - 1;
  JNL(`Generated temp ID: ${id}`);
  return id;
};

export type ExAction =
  | { t: "EX_ADD"; exId: Id; exerciseId: number; name: string; order?: number }
  | { t: "EX_DELETE"; exId: Id }
  | { t: "EX_REORDER"; exId: Id; order: number } // optional if you let users reorder exercises
  | { t: "EX_UPDATE_META"; exId: Id; name?: string; muscle_group?: string };

export type SetAction =
  | { t: "SET_ADD"; exId: Id; setId: Id; set_order?: number; reps: string; weight: string }
  | { t: "SET_UPDATE"; exId: Id; setId: Id; reps?: string; weight?: string }
  | { t: "SET_DELETE"; exId: Id; setId: Id }
  | { t: "SET_REORDER"; exId: Id; setId: Id; set_order: number };

export type EditJournal = {
  ex: ExAction[];
  sets: SetAction[];
};
