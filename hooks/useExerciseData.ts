import { useState, useEffect } from 'react';
import { supabaseAPI, Exercise } from '../utils/supabase/supabase-api';
import { toast } from 'sonner';

export function useExerciseData() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadExercises = async () => {
      try {
        console.log('Loading exercises from Supabase...');
        const exerciseData = await supabaseAPI.getExercises();
        
        if (isMounted) {
          setExercises(exerciseData);
          setIsInitialized(true);
          console.log(`Exercise data loaded: ${exerciseData.length} exercises`);
          
          if (exerciseData.length === 0) {
            toast.error('No exercises found in database. Please contact support.');
          }
        }
      } catch (error) {
        console.error('Failed to load exercises:', error);
        if (isMounted) {
          // Don't show error toast on first load, just log it
          console.warn('Running without exercise database. Some features may not work.');
          setIsInitialized(true); // Still mark as initialized to prevent blocking
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadExercises();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    exercises,
    isLoading,
    isInitialized
  };
}