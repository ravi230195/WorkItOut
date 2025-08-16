import { useState } from 'react';
import { supabaseAPI, Workout } from '../utils/supabase-api';
import { useAuth } from '../components/AuthContext';
import { toast } from 'sonner';

interface WorkoutStats {
  thisWeek: number;
  total: number;
}

interface UseRefreshDataReturn {
  isRefreshing: boolean;
  refreshAllData: () => Promise<void>;
}

interface RefreshCallbacks {
  onWorkoutsUpdated?: (workouts: Workout[]) => void;
  onStatsUpdated?: (stats: WorkoutStats) => void;
  onStepGoalRefreshed?: () => Promise<void>;
  onStepDataRefreshed?: () => Promise<void>;
}

export function useRefreshData(callbacks: RefreshCallbacks = {}): UseRefreshDataReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { userToken } = useAuth();

  const refreshAllData = async (): Promise<void> => {
    if (!userToken) {
      console.log('⚠️ [DBG] Refresh cancelled: No user token');
      return;
    }
    
    if (isRefreshing) {
      console.log('⚠️ [DBG] Refresh cancelled: Already refreshing');
      return;
    }

    console.log('🔄 [DBG] Setting isRefreshing to true');
    setIsRefreshing(true);
    console.log('🔄 [DBG] Starting full dashboard data refresh...');

    try {
      // Create array of refresh promises to run in parallel
      const refreshPromises: Promise<any>[] = [];

      // 1. Refresh recent workouts
      console.log('🔄 [DBG] Refreshing recent workouts from Supabase...');
      const workoutsPromise = supabaseAPI.getRecentWorkouts().then(workouts => {
        console.log('✅ [DBG] Recent workouts refreshed:', workouts.length);
        
        // Calculate stats
        const thisWeekCount = workouts.filter(w => {
          const workoutDate = new Date(w.started_at);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return workoutDate >= weekAgo;
        }).length;
        
        const stats: WorkoutStats = {
          thisWeek: thisWeekCount,
          total: workouts.length
        };

        console.log('✅ [DBG] Workout stats calculated:', stats);

        // Call callbacks
        callbacks.onWorkoutsUpdated?.(workouts);
        callbacks.onStatsUpdated?.(stats);
      }).catch(error => {
        console.error('❌ [DBG] Error refreshing workouts:', error);
        if (error instanceof Error && error.message === "UNAUTHORIZED") {
          toast.error("Session expired. Please sign in.");
        } else {
          console.warn("Failed to refresh workouts");
        }
      });

      refreshPromises.push(workoutsPromise);

      // 2. Refresh step goal
      if (callbacks.onStepGoalRefreshed) {
        console.log('🔄 [DBG] Refreshing step goal...');
        const stepGoalPromise = callbacks.onStepGoalRefreshed().then(() => {
          console.log('✅ [DBG] Step goal refreshed');
        }).catch(error => {
          console.error('❌ [DBG] Error refreshing step goal:', error);
        });
        
        refreshPromises.push(stepGoalPromise);
      }

      // 3. Force refresh step data
      if (callbacks.onStepDataRefreshed) {
        console.log('🔄 [DBG] Force refreshing step data...');
        const stepDataPromise = callbacks.onStepDataRefreshed().then(() => {
          console.log('✅ [DBG] Step data force refreshed');
        }).catch(error => {
          console.error('❌ [DBG] Error force refreshing step data:', error);
        });
        
        refreshPromises.push(stepDataPromise);
      }

      // Wait for all refresh operations to complete
      console.log('🔄 [DBG] Waiting for all refresh promises to settle...');
      const results = await Promise.allSettled(refreshPromises);
      
      // Log results
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`❌ [DBG] Refresh promise ${index} rejected:`, result.reason);
        } else {
          console.log(`✅ [DBG] Refresh promise ${index} fulfilled`);
        }
      });

      console.log('✅ [DBG] Full dashboard data refresh completed');
      toast.success("Data refreshed!");

    } catch (error) {
      console.error('❌ [DBG] Error during full data refresh:', error);
      toast.error("Failed to refresh data");
    } finally {
      console.log('🔄 [DBG] Setting isRefreshing to false');
      setIsRefreshing(false);
      
      // Add a small delay to ensure state propagation
      setTimeout(() => {
        console.log('✅ [DBG] Refresh cleanup completed');
      }, 100);
    }
  };

  return {
    isRefreshing,
    refreshAllData
  };
}