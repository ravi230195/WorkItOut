## Example: User Adds "Dumbbell Press" with 3 Sets

**User Input:**
- Set 1: 12 reps @ 25kg  
- Set 2: 10 reps @ 25kg
- Set 3: 8 reps @ 30kg

**When SAVE is clicked:**

### 1. Exercise Entry → `user_routine_exercises_data`
```sql
INSERT INTO user_routine_exercises_data (
  routine_template_id: 123,
  exercise_id: 456,
  exercise_order: 1,
  planned_sets: 3,
  planned_reps: 10,  -- average of 12,10,8
  planned_weight_kg: 26.67  -- average of 25,25,30
)
```

### 2. Individual Set Entries → `user_routine_exercises_set_data`
```sql
INSERT INTO user_routine_exercises_set_data VALUES
(routine_template_exercise_id: 789, exercise_id: 456, set_order: 1, planned_reps: 12, planned_weight_kg: 25.0),
(routine_template_exercise_id: 789, exercise_id: 456, set_order: 2, planned_reps: 10, planned_weight_kg: 25.0),
(routine_template_exercise_id: 789, exercise_id: 456, set_order: 3, planned_reps: 8, planned_weight_kg: 30.0)
```

**Result:** 
- ✅ Exercise summary saved with averages
- ✅ Individual set details preserved with exact reps/weight
- ✅ Proper set ordering (1, 2, 3)
- ✅ All connected via `routine_template_exercise_id` foreign key