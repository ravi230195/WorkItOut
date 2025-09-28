import { useEffect, useState } from "react";

import type { TimeRange, CardioFocus, CardioProgressSnapshot } from "@/types/progress";
import { CardioProgressProvider } from "@/screen/progress/CardioProgress";
import type { Snapshot } from "../../progress/Progress.types";
import { supabaseAPI } from "../../../utils/supabase/supabase-api";
import type { Profile } from "../../../utils/supabase/supabase-types";
import { extractFirstName } from "./util";
import { logger } from "../../../utils/logging";
import { printCardioProgressSnapshot } from "../../../src/types/progress";

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
function toSnapshot(raw: CardioProgressSnapshot): Snapshot {
  const series = WORKOUTS_FOCUS_ORDER.map((focus) => {
    const entry = raw.series[focus];
    if (!entry) return [];
    return entry.current.map((point) => ({
      x: new Date(point.date.getTime()),
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

  return { series, kpis, workouts: raw.workouts ?? {} };
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
          workoutDays: raw.workouts ? Object.keys(raw.workouts).length : 0,
          workoutCount: raw.workouts
            ? Object.values(raw.workouts).reduce((total: number, day: unknown) => {
                if (Array.isArray(day)) {
                  return total + day.length;
                }
                return total;
              }, 0)
            : 0,
          hasTargetLine: !!raw.targetLine,
        });

        const converted = toSnapshot(raw);

        // ADD: Log converted data
        logger.debug("[workouts] useWorkoutsProgressSnapshot: Converted to Snapshot format", {
          range,
          seriesCount: converted.series?.length || 0,
          kpiCount: converted.kpis?.length || 0,
          workoutDayCount: Object.keys(converted.workouts || {}).length,
          workoutCount: Object.values(converted.workouts || {}).reduce((total, day) => total + day.length, 0)
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
