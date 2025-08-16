export interface Exercise {
  id: string;
  name: string;
  category: string;
  muscleGroups: string[];
  equipment: string[];
  description?: string;
}

export const exerciseDatabase: Exercise[] = [
  // Push Exercises
  {
    id: "bench-press",
    name: "Bench Press",
    category: "Push",
    muscleGroups: ["Chest", "Triceps", "Shoulders"],
    equipment: ["Barbell", "Bench"]
  },
  {
    id: "incline-bench-press",
    name: "Incline Bench Press",
    category: "Push",
    muscleGroups: ["Chest", "Triceps", "Shoulders"],
    equipment: ["Barbell", "Incline Bench"]
  },
  {
    id: "dumbbell-press",
    name: "Dumbbell Press",
    category: "Push",
    muscleGroups: ["Chest", "Triceps", "Shoulders"],
    equipment: ["Dumbbells", "Bench"]
  },
  {
    id: "incline-dumbbell-press",
    name: "Incline Dumbbell Press",
    category: "Push",
    muscleGroups: ["Chest", "Triceps", "Shoulders"],
    equipment: ["Dumbbells", "Incline Bench"]
  },
  {
    id: "overhead-press",
    name: "Overhead Press",
    category: "Push",
    muscleGroups: ["Shoulders", "Triceps", "Core"],
    equipment: ["Barbell"]
  },
  {
    id: "dumbbell-shoulder-press",
    name: "Dumbbell Shoulder Press",
    category: "Push",
    muscleGroups: ["Shoulders", "Triceps"],
    equipment: ["Dumbbells"]
  },
  {
    id: "push-ups",
    name: "Push-ups",
    category: "Push",
    muscleGroups: ["Chest", "Triceps", "Shoulders"],
    equipment: ["Bodyweight"]
  },
  {
    id: "dips",
    name: "Dips",
    category: "Push",
    muscleGroups: ["Chest", "Triceps", "Shoulders"],
    equipment: ["Dip Bar", "Bodyweight"]
  },
  {
    id: "tricep-pushdown",
    name: "Tricep Pushdown",
    category: "Push",
    muscleGroups: ["Triceps"],
    equipment: ["Cable Machine"]
  },
  {
    id: "lateral-raises",
    name: "Lateral Raises",
    category: "Push",
    muscleGroups: ["Shoulders"],
    equipment: ["Dumbbells"]
  },

  // Pull Exercises
  {
    id: "deadlift",
    name: "Deadlift",
    category: "Pull",
    muscleGroups: ["Back", "Glutes", "Hamstrings", "Core"],
    equipment: ["Barbell"]
  },
  {
    id: "pull-ups",
    name: "Pull-ups",
    category: "Pull",
    muscleGroups: ["Back", "Biceps"],
    equipment: ["Pull-up Bar", "Bodyweight"]
  },
  {
    id: "chin-ups",
    name: "Chin-ups",
    category: "Pull",
    muscleGroups: ["Back", "Biceps"],
    equipment: ["Pull-up Bar", "Bodyweight"]
  },
  {
    id: "barbell-rows",
    name: "Barbell Rows",
    category: "Pull",
    muscleGroups: ["Back", "Biceps"],
    equipment: ["Barbell"]
  },
  {
    id: "dumbbell-rows",
    name: "Dumbbell Rows",
    category: "Pull",
    muscleGroups: ["Back", "Biceps"],
    equipment: ["Dumbbells"]
  },
  {
    id: "lat-pulldown",
    name: "Lat Pulldown",
    category: "Pull",
    muscleGroups: ["Back", "Biceps"],
    equipment: ["Cable Machine"]
  },
  {
    id: "cable-rows",
    name: "Cable Rows",
    category: "Pull",
    muscleGroups: ["Back", "Biceps"],
    equipment: ["Cable Machine"]
  },
  {
    id: "face-pulls",
    name: "Face Pulls",
    category: "Pull",
    muscleGroups: ["Rear Delts", "Upper Back"],
    equipment: ["Cable Machine"]
  },
  {
    id: "bicep-curls",
    name: "Bicep Curls",
    category: "Pull",
    muscleGroups: ["Biceps"],
    equipment: ["Dumbbells"]
  },
  {
    id: "hammer-curls",
    name: "Hammer Curls",
    category: "Pull",
    muscleGroups: ["Biceps", "Forearms"],
    equipment: ["Dumbbells"]
  },

  // Legs
  {
    id: "squat",
    name: "Squat",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes", "Core"],
    equipment: ["Barbell"]
  },
  {
    id: "front-squat",
    name: "Front Squat",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes", "Core"],
    equipment: ["Barbell"]
  },
  {
    id: "goblet-squat",
    name: "Goblet Squat",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes"],
    equipment: ["Dumbbell"]
  },
  {
    id: "lunges",
    name: "Lunges",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes", "Hamstrings"],
    equipment: ["Dumbbells", "Bodyweight"]
  },
  {
    id: "bulgarian-split-squat",
    name: "Bulgarian Split Squat",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes"],
    equipment: ["Dumbbells", "Bench"]
  },
  {
    id: "leg-press",
    name: "Leg Press",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes"],
    equipment: ["Leg Press Machine"]
  },
  {
    id: "leg-extension",
    name: "Leg Extension",
    category: "Legs",
    muscleGroups: ["Quadriceps"],
    equipment: ["Leg Extension Machine"]
  },
  {
    id: "leg-curl",
    name: "Leg Curl",
    category: "Legs",
    muscleGroups: ["Hamstrings"],
    equipment: ["Leg Curl Machine"]
  },
  {
    id: "calf-raises",
    name: "Calf Raises",
    category: "Legs",
    muscleGroups: ["Calves"],
    equipment: ["Dumbbells", "Bodyweight"]
  },
  {
    id: "romanian-deadlift",
    name: "Romanian Deadlift",
    category: "Legs",
    muscleGroups: ["Hamstrings", "Glutes", "Back"],
    equipment: ["Barbell", "Dumbbells"]
  },

  // Core & Abs
  {
    id: "plank",
    name: "Plank",
    category: "Core",
    muscleGroups: ["Core", "Shoulders"],
    equipment: ["Bodyweight"]
  },
  {
    id: "crunches",
    name: "Crunches",
    category: "Core",
    muscleGroups: ["Abs"],
    equipment: ["Bodyweight"]
  },
  {
    id: "russian-twists",
    name: "Russian Twists",
    category: "Core",
    muscleGroups: ["Obliques", "Core"],
    equipment: ["Bodyweight", "Medicine Ball"]
  },
  {
    id: "hanging-leg-raises",
    name: "Hanging Leg Raises",
    category: "Core",
    muscleGroups: ["Lower Abs", "Core"],
    equipment: ["Pull-up Bar"]
  },
  {
    id: "mountain-climbers",
    name: "Mountain Climbers",
    category: "Core",
    muscleGroups: ["Core", "Cardio"],
    equipment: ["Bodyweight"]
  },

  // Cardio
  {
    id: "treadmill",
    name: "Treadmill",
    category: "Cardio",
    muscleGroups: ["Cardiovascular"],
    equipment: ["Treadmill"]
  },
  {
    id: "rowing",
    name: "Rowing",
    category: "Cardio",
    muscleGroups: ["Cardiovascular", "Back", "Legs"],
    equipment: ["Rowing Machine"]
  },
  {
    id: "cycling",
    name: "Cycling",
    category: "Cardio",
    muscleGroups: ["Cardiovascular", "Legs"],
    equipment: ["Bike", "Stationary Bike"]
  },
  {
    id: "burpees",
    name: "Burpees",
    category: "Cardio",
    muscleGroups: ["Full Body", "Cardiovascular"],
    equipment: ["Bodyweight"]
  }
];

export const categories = ["All", "Push", "Pull", "Legs", "Core", "Cardio"];

export const muscleGroups = [
  "All", "Chest", "Back", "Shoulders", "Arms", "Biceps", "Triceps", 
  "Legs", "Quadriceps", "Hamstrings", "Glutes", "Calves", "Core", "Abs"
];