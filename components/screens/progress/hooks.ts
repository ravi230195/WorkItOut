import { useEffect, useState } from "react";

import type { HistoryEntry } from "../../progress/Progress.types";
import { supabaseAPI, SAMPLE_ROUTINE_USER_ID } from "../../../utils/supabase/supabase-api";
import { loadRoutineExercisesWithSets } from "../../../utils/routineLoader";
import type { Profile } from "../../../utils/supabase/supabase-types";
import { calculateTotalWeight, estimateRoutineDurationMinutes, extractFirstName, formatDuration, formatWeight } from "./util";

export function useUserFirstName(userToken: string | null | undefined) {
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!userToken) {
      setFirstName(null);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const profile: Profile | null = await supabaseAPI.getMyProfile();
        if (!cancelled) {
          setFirstName(extractFirstName(profile));
        }
      } catch (error) {
        if (!cancelled) {
          setFirstName(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userToken]);

  return firstName;
}

export function useStrengthHistory(userToken: string | null | undefined) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const routines = await supabaseAPI.getSampleRoutines();
        const entries: HistoryEntry[] = [];

        for (const routine of routines.slice(0, 5)) {
          if (cancelled) break;
          try {
            const exercises = await loadRoutineExercisesWithSets(routine.routine_template_id, {
              userIdOverride: SAMPLE_ROUTINE_USER_ID,
            });
            const durationMinutes = estimateRoutineDurationMinutes(exercises.length);
            const totalWeightKg = calculateTotalWeight(exercises);
            entries.push({
              type: "strength",
              id: String(routine.routine_template_id),
              routineTemplateId: routine.routine_template_id,
              name: routine.name,
              date: routine.created_at ?? new Date().toISOString(),
              duration: formatDuration(durationMinutes),
              totalWeight: formatWeight(totalWeightKg),
            });
          } catch (error) {
            // Ignore routines that fail to load
          }
        }

        if (!cancelled) {
          entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setHistory(entries);
        }
      } catch (error) {
        if (!cancelled) {
          setHistory([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userToken]);

  return { history, loading };
}
