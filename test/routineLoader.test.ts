import { loadRoutineExercisesWithSets } from "../utils/routineLoader";
import { supabaseAPI } from "../utils/supabase/supabase-api";
import { performanceTimer } from "../utils/performanceTimer";

jest.mock("../utils/supabase/supabase-api", () => ({
  supabaseAPI: {
    getUserRoutineExercisesWithDetails: jest.fn(),
    getExercise: jest.fn(),
    getExerciseSetsForRoutine: jest.fn(),
  },
}));

const api = supabaseAPI as jest.Mocked<typeof supabaseAPI>;

describe("loadRoutineExercisesWithSets", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("limits concurrent set fetches", async () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      routine_template_exercise_id: i + 1,
      routine_template_id: 1,
      exercise_id: i + 1,
      exercise_name: `Ex${i + 1}`,
      muscle_group: "mg",
      exercise_order: i + 1,
      is_active: true,
    }));
    api.getUserRoutineExercisesWithDetails.mockResolvedValue(rows as any);
    api.getExercise.mockResolvedValue(null as any);

    let active = 0;
    let maxConcurrent = 0;
    api.getExerciseSetsForRoutine.mockImplementation(async (id: number) => {
      active++;
      maxConcurrent = Math.max(maxConcurrent, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return [
        {
          routine_template_exercise_set_id: id * 10,
          routine_template_exercise_id: id,
          exercise_id: id,
          set_order: 1,
          is_active: true,
          planned_reps: 5,
          planned_weight_kg: 10,
        },
      ];
    });

    const res = await loadRoutineExercisesWithSets(1, {
      concurrency: 2,
      timer: performanceTimer,
    });

    expect(res).toHaveLength(5);
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  test("hydrates metadata and sorts sets", async () => {
    const rows = [
      {
        routine_template_exercise_id: 1,
        routine_template_id: 1,
        exercise_id: 10,
        exercise_name: null,
        muscle_group: null,
        exercise_order: 1,
        is_active: true,
      },
      {
        routine_template_exercise_id: 2,
        routine_template_id: 1,
        exercise_id: 20,
        exercise_name: "Name",
        muscle_group: "Group",
        exercise_order: 2,
        is_active: true,
      },
    ];
    api.getUserRoutineExercisesWithDetails.mockResolvedValue(rows as any);
    api.getExercise.mockResolvedValue({
      exercise_id: 10,
      name: "MetaName",
      muscle_group: "MetaGroup",
    } as any);

    api.getExerciseSetsForRoutine.mockImplementation(async (id: number) => {
      if (id === 1)
        return [
          {
            routine_template_exercise_set_id: 11,
            routine_template_exercise_id: 1,
            exercise_id: 10,
            set_order: 2,
            is_active: true,
            planned_reps: 5,
            planned_weight_kg: 10,
          },
          {
            routine_template_exercise_set_id: 12,
            routine_template_exercise_id: 1,
            exercise_id: 10,
            set_order: 1,
            is_active: true,
            planned_reps: 5,
            planned_weight_kg: 10,
          },
        ];
      return [
        {
          routine_template_exercise_set_id: 21,
          routine_template_exercise_id: 2,
          exercise_id: 20,
          set_order: 1,
          is_active: true,
          planned_reps: 8,
          planned_weight_kg: 20,
        },
      ];
    });

    const res = await loadRoutineExercisesWithSets(1, {
      concurrency: 2,
      timer: performanceTimer,
    });

    expect(res[0].name).toBe("MetaName");
    expect(res[0].muscle_group).toBe("MetaGroup");
    expect(res[0].sets.map((s) => s.set_order)).toEqual([1, 2]);
    expect(res[1].name).toBe("Name");
  });

  test("handles individual fetch failures", async () => {
    const rows = [
      {
        routine_template_exercise_id: 1,
        routine_template_id: 1,
        exercise_id: 10,
        exercise_name: null,
        muscle_group: "MG",
        exercise_order: 1,
        is_active: true,
      },
      {
        routine_template_exercise_id: 2,
        routine_template_id: 1,
        exercise_id: 20,
        exercise_name: "B",
        muscle_group: "MG2",
        exercise_order: 2,
        is_active: true,
      },
    ];
    api.getUserRoutineExercisesWithDetails.mockResolvedValue(rows as any);
    api.getExercise.mockRejectedValue(new Error("meta fail"));
    api.getExerciseSetsForRoutine.mockImplementation(async (id: number) => {
      if (id === 1) return [];
      throw new Error("set fail");
    });

    const res = await loadRoutineExercisesWithSets(1, {
      concurrency: 2,
      timer: performanceTimer,
    });

    expect(res).toHaveLength(2);
    expect(res[0].name).toBe("");
    expect(res[0].sets).toEqual([]);
    expect(res[1].sets).toEqual([]);
  });
});
