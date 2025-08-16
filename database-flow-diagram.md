# Database ID Generation Flow

## How Primary Keys are Auto-Generated

### 1. Adding Exercise to Routine
```
ExerciseSetupScreen.handleSave()
    ↓
supabaseAPI.addExerciseToRoutine(routineId, exerciseId, order)
    ↓
POST /rest/v1/user_routine_exercises_data
    ↓ 
Database auto-generates routine_template_exercise_id
    ↓
Returns complete record with new ID: { routine_template_exercise_id: 123, ... }
```

### 2. Adding Sets Data
```
ExerciseSetupScreen.handleSave() (continued)
    ↓
supabaseAPI.addExerciseSetsToRoutine(123, exerciseId, setsData)
    ↓
POST /rest/v1/user_routine_exercises_set_data
    ↓
Database auto-generates routine_template_exercise_set_id for each set
    ↓
Returns array: [
  { routine_template_exercise_set_id: 456, routine_template_exercise_id: 123, ... },
  { routine_template_exercise_set_id: 457, routine_template_exercise_id: 123, ... },
  { routine_template_exercise_set_id: 458, routine_template_exercise_id: 123, ... }
]
```

## Database Schema (Inferred)

### user_routine_exercises_data
```sql
CREATE TABLE user_routine_exercises_data (
  routine_template_exercise_id SERIAL PRIMARY KEY,  -- Auto-increment
  routine_template_id INTEGER REFERENCES user_routines(routine_template_id),
  exercise_id INTEGER REFERENCES exercises(exercise_id),
  exercise_order INTEGER,
  is_active BOOLEAN DEFAULT true,
  notes TEXT
);
```

### user_routine_exercises_set_data  
```sql
CREATE TABLE user_routine_exercises_set_data (
  routine_template_exercise_set_id SERIAL PRIMARY KEY,  -- Auto-increment
  routine_template_exercise_id INTEGER REFERENCES user_routine_exercises_data(routine_template_exercise_id),
  exercise_id INTEGER REFERENCES exercises(exercise_id),
  set_order INTEGER,
  is_active BOOLEAN DEFAULT true,
  planned_reps INTEGER,
  planned_weight_kg DECIMAL,
  notes TEXT
);
```

## Key Points

1. **Database handles all ID generation** - We never manually set these IDs
2. **SERIAL/AUTO_INCREMENT** - PostgreSQL automatically increments these fields
3. **Prefer header** - `"Prefer": "return=representation"` ensures we get back the complete record with IDs
4. **Proper foreign key relationships** - Sets reference the exercise via routine_template_exercise_id
5. **Ordering handled manually** - We set exercise_order and set_order manually for sorting

## Flow Summary
1. Save exercise → Get back routine_template_exercise_id (auto-generated)
2. Use that ID to save sets → Get back routine_template_exercise_set_id (auto-generated for each)
3. All relationships properly maintained via foreign keys