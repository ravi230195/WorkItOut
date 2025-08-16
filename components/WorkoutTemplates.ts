export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  exercises: string[]; // Exercise names from the database
  estimatedDuration: string;
}