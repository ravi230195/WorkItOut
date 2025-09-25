import { useEffect, useState } from "react";

import type { TimeRange, CardioFocus, CardioProgressSnapshot } from "@/types/progress";
import { CardioProgressProvider } from "@/screen/progress/CardioProgress";
import type { HistoryEntry, Snapshot } from "../../progress/Progress.types";
import { supabaseAPI } from "../../../utils/supabase/supabase-api";
import type { Profile } from "../../../utils/supabase/supabase-types";
import { extractFirstName } from "./util";
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

const WORKOUTS_FOCUS_ORDER: CardioFocus[] = ["activeMinutes", "distance", "calories", "steps"];
const workoutsProvider = new CardioProgressProvider();
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

function formatHistoryTime(iso?: string) {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function sanitizeSteps(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  const normalized = Math.round(value);
  return normalized >= 0 ? normalized : undefined;
}

function toSnapshot(raw: CardioProgressSnapshot): Snapshot {
  const series = WORKOUTS_FOCUS_ORDER.map((focus) => {
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
    calories: typeof workout.calories === "number"
      ? `${integerFormatter.format(Math.round(workout.calories))} kcal`
      : undefined,
    time: formatHistoryTime(workout.start),
    steps: sanitizeSteps(workout.steps),
  }));

  return { series, kpis, history };
}

export function useWorkoutsProgressSnapshot(range: TimeRange) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(() =>
    toSnapshot(workoutsProvider.getUnavailableSnapshot(range)),
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    
    // ADD: Log hook initialization
    logger.debug("[workouts] useWorkoutsProgressSnapshot: Hook initialized", { range });
    
    const unavailable = toSnapshot(workoutsProvider.getUnavailableSnapshot(range));
    setSnapshot(unavailable);
    
    // ADD: Log when calling provider
    logger.debug("[workouts] useWorkoutsProgressSnapshot: Calling workoutsProvider.snapshot", { range });

    workoutsProvider
      .snapshot(range)
      .then((raw: any) => {
        if (cancelled) return;
        
        // ADD: Log raw data received from provider
        logger.debug("[workouts] useWorkoutsProgressSnapshot: Raw snapshot received from provider", {
          range,
          seriesKeys: Object.keys(raw.series || {}),
          kpiCount: raw.kpis?.length || 0,
          workoutCount: raw.workouts?.length || 0,
          bestCount: raw.bests?.length || 0,
          hasTargetLine: !!raw.targetLine
        });
        
        const converted = toSnapshot(raw);
        
        // ADD: Log converted data
        logger.debug("[workouts] useWorkoutsProgressSnapshot: Converted to Snapshot format", {
          range,
          seriesCount: converted.series?.length || 0,
          kpiCount: converted.kpis?.length || 0,
          historyCount: converted.history?.length || 0
        });
        
        setSnapshot(converted);
      })
      .catch((error: any) => {
        if (!cancelled) {
          logger.debug("[workouts] useWorkoutsProgressSnapshot: Failed to load workouts snapshot", { range, error });
          setSnapshot(unavailable);
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
