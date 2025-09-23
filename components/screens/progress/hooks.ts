import { useEffect, useState } from "react";

import type { TimeRange, CardioFocus, CardioProgressSnapshot } from "@/types/progress";
import { CardioProgressProvider } from "@/screen/progress/CardioProgress";
import type { HistoryEntry, Snapshot } from "../../progress/Progress.types";
import { supabaseAPI, SAMPLE_ROUTINE_USER_ID } from "../../../utils/supabase/supabase-api";
import { loadRoutineExercisesWithSets } from "../../../utils/routineLoader";
import type { Profile } from "../../../utils/supabase/supabase-types";
import { calculateTotalWeight, estimateRoutineDurationMinutes, extractFirstName, formatDuration, formatWeight } from "./util";
import { logger } from "../../../utils/logging";

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

const CARDIO_FOCUS_ORDER: CardioFocus[] = ["activeMinutes", "distance", "calories", "steps"];
const cardioProvider = new CardioProgressProvider();
const integerFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const distanceFormatter = new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function formatHistoryDuration(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "00:00:00";
  const totalSeconds = Math.max(0, Math.round(minutes * 60));
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function toSnapshot(raw: CardioProgressSnapshot): Snapshot {
  const series = CARDIO_FOCUS_ORDER.map((focus) => {
    const entry = raw.series[focus];
    if (!entry) return [];
    return entry.current.map((point) => ({
      x: point.iso,
      y: point.value,
      isPersonalBest: point.isPersonalBest,
    }));
  });

  const kpis = raw.kpis.map(({ title, value, unit, previous, currentNumeric }) => ({
    title,
    value,
    unit,
    previous,
    currentNumeric,
  }));

  const history: HistoryEntry[] = raw.workouts.map((workout) => ({
    type: "cardio",
    id: workout.id,
    activity: workout.activity,
    date: workout.start,
    duration: formatHistoryDuration(workout.durationMinutes),
    distance: workout.distanceKm ? `${distanceFormatter.format(workout.distanceKm)} km` : "0 km",
    calories: typeof workout.calories === "number" ? `${integerFormatter.format(Math.round(workout.calories))} kcal` : undefined,
  }));

  return { series, kpis, history };
}

export function useCardioProgressSnapshot(range: TimeRange) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    cardioProvider
      .snapshot(range)
      .then((raw) => {
        if (cancelled) return;
        setSnapshot(toSnapshot(raw));
      })
      .catch((error) => {
        if (!cancelled) {
          logger.debug("[cardio] Failed to load cardio snapshot", error);
          setSnapshot(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [range]);

  return { snapshot, loading };
}
