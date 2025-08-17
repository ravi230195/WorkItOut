import { useState, useEffect, useRef, useCallback } from 'react';
import { supabaseAPI } from '../utils/supabase-api';
import { useAuth } from '../components/AuthContext';

interface StepData {
  steps: number;
  lastUpdated: number;
  goal: number;
}

interface UseStepTrackingReturn {
  steps: number;
  goal: number;
  progressPercentage: number;
  isLoading: boolean;
  refreshStepGoal: () => Promise<void>;
  forceRefreshStepData: () => Promise<void>;
}

export function useStepTracking(isOnDashboard: boolean): UseStepTrackingReturn {
  const [stepData, setStepData] = useState<StepData>({
    steps: 0,
    lastUpdated: 0,
    goal: 10000
  });
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastReadRef = useRef<number>(0);
  const { userToken } = useAuth();

  // Check if we're on a native platform (Capacitor)
  const isNativePlatform = useCallback((): boolean => {
    return !!(window as any).Capacitor && !!(window as any).Capacitor.isNativePlatform;
  }, []);

  // Check if app is in foreground
  const isAppInForeground = useCallback((): boolean => {
    return !document.hidden;
  }, []);

  // Check if enough time has passed since last read (10 minutes)
  const shouldReadStepData = useCallback((): boolean => {
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds
    return now - lastReadRef.current >= tenMinutes;
  }, []);

  // Load step goal from Supabase (separated from step data reading)
  const refreshStepGoal = useCallback(async (): Promise<void> => {
    if (!userToken) return;
    
    console.log('🔄 [DBG] Loading step goal from Supabase...');
    try {
      const goal = await supabaseAPI.getUserStepGoal();
      console.log('✅ [DBG] Step goal loaded from Supabase:', goal);
      
      setStepData(prev => ({
        ...prev,
        goal: goal
      }));
    } catch (error) {
      console.error('❌ [DBG] Error loading step goal from Supabase:', error);
    }
  }, [userToken]);

  // Read step data from native health platforms (no longer loads goal)
  const readStepData = useCallback(async (forceRead: boolean = false): Promise<void> => {
    // Only proceed if all conditions are met (or forced)
    if (!forceRead && (!isOnDashboard || !isAppInForeground() || !shouldReadStepData())) {
      return;
    }

    setIsLoading(true);
    lastReadRef.current = Date.now();

    console.log('📱 [DBG] Reading step data from native platform...');

    try {
      let steps = 0;
      
      if (isNativePlatform()) {
        // This would normally read from native health APIs
        // For now, only native platforms can have non-zero steps
        // Real implementation would use HealthKit/Health Connect
        console.log('📱 [DBG] Native platform detected - would read from health APIs');
        // steps would be set from actual health data
        // For testing, let's simulate some steps on native platforms
        steps = Math.floor(Math.random() * 5000) + 1000; // Random steps between 1000-6000
      } else {
        // Web platform always shows 0 steps
        console.log('🌍 [DBG] Web platform - showing 0 steps');
        steps = 0;
      }

      // Update step data using cached goal (no API call)
      setStepData(prev => {
        const newStepData: StepData = {
          steps: steps,
          lastUpdated: Date.now(),
          goal: prev.goal // Use current goal from state
        };
        console.log('✅ [DBG] Step data updated:', { steps, goal: prev.goal });
        return newStepData;
      });
    } catch (error) {
      console.error('❌ [DBG] Error reading step data:', error);
      // On error, show 0 steps and keep cached goal
      setStepData(prev => ({
        steps: 0,
        lastUpdated: Date.now(),
        goal: prev.goal // Use current goal from state
      }));
    } finally {
      setIsLoading(false);
    }
  }, [isOnDashboard, isAppInForeground, shouldReadStepData, isNativePlatform]);

  // Force refresh step data (bypass 10-minute rule)
  const forceRefreshStepData = useCallback(async (): Promise<void> => {
    console.log('🔄 [DBG] Force refreshing step data...');
    await readStepData(true);
  }, [readStepData]);

  // Initialize step goal on mount (only once)
  useEffect(() => {
    if (userToken) {
      console.log('🚀 [DBG] Initializing step goal on mount...');
      refreshStepGoal();
    }
  }, [userToken, refreshStepGoal]);

  // Set up interval to check conditions and read step data (no goal loading)
  useEffect(() => {
    if (isOnDashboard && userToken) {
      // Check immediately if conditions are met
      readStepData();

      // Set up interval to check every minute
      intervalRef.current = setInterval(() => {
        readStepData();
      }, 60000); // Check every minute, but only read if 10+ minutes have passed

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isOnDashboard, userToken, readStepData]); // Fixed: removed stepData.goal dependency

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const progressPercentage = Math.min((stepData.steps / stepData.goal) * 100, 100);

  return {
    steps: stepData.steps,
    goal: stepData.goal,
    progressPercentage,
    isLoading,
    refreshStepGoal,
    forceRefreshStepData
  };
}