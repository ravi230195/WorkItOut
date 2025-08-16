import { useState, useEffect } from 'react';
import { supabaseAPI, UserRoutine, UserRoutineExercise, Exercise } from '../utils/supabase-api';
import { WorkoutTemplate } from '../components/WorkoutTemplates';
import { exerciseDatabase } from '../components/ExerciseDatabase';
import { toast } from 'sonner@2.0.3';

export function useWorkoutTemplates(userToken: string | null) {
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to convert database exercises to template format
  const convertToWorkoutTemplates = async (
    routines: UserRoutine[], 
    allExercises: Exercise[]
  ): Promise<WorkoutTemplate[]> => {
    const templates: WorkoutTemplate[] = [];

    for (const routine of routines) {
      try {
        // Get exercises for this routine
        const routineExercises = await supabaseAPI.getUserRoutineExercises(routine.routine_template_id);
        
        // Map exercise IDs to exercise names
        const exerciseNames: string[] = [];
        
        for (const routineExercise of routineExercises) {
          const exercise = allExercises.find(ex => 
            (typeof ex.id === 'number' ? ex.id : parseInt(ex.id)) === routineExercise.exercise_id
          );
          
          if (exercise) {
            exerciseNames.push(exercise.name);
          } else {
            console.warn(`Exercise with ID ${routineExercise.exercise_id} not found in exercise database`);
            // Try to find it in local exercise database as fallback
            const localExercise = exerciseDatabase.find(ex => 
              ex.name.toLowerCase().includes(routineExercise.exercise_id.toString()) ||
              ex.id === routineExercise.exercise_id.toString()
            );
            if (localExercise) {
              exerciseNames.push(localExercise.name);
              console.log(`Using local exercise fallback: ${localExercise.name} for ID ${routineExercise.exercise_id}`);
            } else {
              // As a last resort, create a generic name from the ID
              exerciseNames.push(`Exercise ${routineExercise.exercise_id}`);
              console.warn(`No exercise found for ID ${routineExercise.exercise_id}, using generic name`);
            }
          }
        }

        if (exerciseNames.length > 0) {
          const template: WorkoutTemplate = {
            id: routine.name.toLowerCase().replace(/\s+/g, '-'), // Convert name to slug format
            name: routine.name,
            description: '', // Empty for now as specified
            exercises: exerciseNames,
            estimatedDuration: '' // Empty for now as specified
          };

          templates.push(template);
        } else {
          console.warn(`No exercises found for routine: ${routine.name}`);
        }
      } catch (error) {
        console.error(`Failed to process routine ${routine.name}:`, error);
        // Continue with other routines instead of failing completely
      }
    }

    return templates;
  };

  useEffect(() => {
    const loadWorkoutTemplates = async () => {
      if (!userToken) {
        setWorkoutTemplates([]);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log('Loading workout templates from database...');
        
        // Fetch user routines and exercises in parallel
        const [routines, allExercises] = await Promise.all([
          supabaseAPI.getUserRoutines(),
          supabaseAPI.getExercises()
        ]);

        console.log(`Found ${routines.length} user routines and ${allExercises.length} exercises`);

        if (routines.length === 0) {
          console.log('No user routines found, showing empty state');
          setWorkoutTemplates([]);
          setError(null); // Clear any previous errors
        } else {
          // Convert routines to workout templates
          const templates = await convertToWorkoutTemplates(routines, allExercises);
          console.log(`Converted to ${templates.length} workout templates:`, templates.map(t => t.name));
          setWorkoutTemplates(templates);
          setError(null); // Clear any previous errors
        }
      } catch (error) {
        console.error('Failed to load workout templates:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        if (errorMessage === 'UNAUTHORIZED') {
          setError('Session expired. Please sign in again.');
          toast.error('Session expired. Please sign in.');
        } else if (errorMessage.includes('Exercise mapping')) {
          // Handle exercise mapping errors more gracefully
          console.warn('Exercise mapping failed, but continuing with empty templates');
          setWorkoutTemplates([]);
          setError(null); // Don't show error for mapping issues
        } else {
          setError(`Failed to load workouts: ${errorMessage}`);
          console.warn('Failed to load workout templates from database, using empty state');
          setWorkoutTemplates([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkoutTemplates();
  }, [userToken]);

  // Function to manually refresh templates
  const refreshTemplates = async () => {
    if (!userToken) return;
    
    setIsLoading(true);
    try {
      const [routines, allExercises] = await Promise.all([
        supabaseAPI.getUserRoutines(),
        supabaseAPI.getExercises()
      ]);

      const templates = await convertToWorkoutTemplates(routines, allExercises);
      setWorkoutTemplates(templates);
      setError(null);
    } catch (error) {
      console.error('Failed to refresh workout templates:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (errorMessage === 'UNAUTHORIZED') {
        setError('Session expired. Please sign in again.');
      } else {
        setError(`Failed to refresh workouts: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    workoutTemplates,
    isLoading,
    error,
    refreshTemplates
  };
}