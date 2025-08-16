# Database Example: Saving Exercise Sets

## Scenario
User creates a routine "Push Day" and adds "Dumbbell Bench Press" with 3 sets:
- Set 1: 12 reps @ 25kg
- Set 2: 10 reps @ 27.5kg  
- Set 3: 8 reps @ 30kg

## Database Operations When SAVE is Clicked

### 1. First: Save Exercise to Routine (`user_routine_exercises_data`)

```sql
INSERT INTO user_routine_exercises_data (
    routine_template_id,
    exercise_id,
    exercise_order,
    is_active,
    planned_sets,
    planned_reps,
    planned_weight_kg,
    notes
) VALUES (
    123,                    -- routine_template_id (existing routine)
    456,                    -- exercise_id (Dumbbell Bench Press)
    1,                      -- exercise_order (first exercise in routine)
    true,                   -- is_active
    3,                      -- planned_sets (total sets)
    10,                     -- planned_reps (avg: (12+10+8)/3 = 10)
    27.5,                   -- planned_weight_kg (avg: (25+27.5+30)/3 = 27.5)
    null                    -- notes
) RETURNING routine_template_exercise_id;

-- Returns: routine_template_exercise_id = 789
```

### 2. Then: Save Individual Sets (`user_routine_exercises_set_data`)

```sql
INSERT INTO user_routine_exercises_set_data (
    routine_template_exercise_id,
    exercise_id,
    set_order,
    is_active,
    planned_reps,
    planned_weight_kg,
    notes
) VALUES 
-- Set 1
(
    789,                    -- routine_template_exercise_id (from step 1)
    456,                    -- exercise_id (Dumbbell Bench Press)
    1,                      -- set_order (first set)
    true,                   -- is_active
    12,                     -- planned_reps (exact value)
    25.0,                   -- planned_weight_kg (exact value)
    null                    -- notes
),
-- Set 2  
(
    789,                    -- routine_template_exercise_id (from step 1)
    456,                    -- exercise_id (Dumbbell Bench Press)
    2,                      -- set_order (second set)
    true,                   -- is_active
    10,                     -- planned_reps (exact value)
    27.5,                   -- planned_weight_kg (exact value)
    null                    -- notes
),
-- Set 3
(
    789,                    -- routine_template_exercise_id (from step 1)
    456,                    -- exercise_id (Dumbbell Bench Press)
    3,                      -- set_order (third set)
    true,                   -- is_active
    8,                      -- planned_reps (exact value)
    30.0,                   -- planned_weight_kg (exact value)
    null                    -- notes
);

-- Returns 3 records with routine_template_exercise_set_id values
```

## Final Database State

### `user_routines` table
| routine_template_id | user_id | name     | version | is_active |
|-------------------|---------|----------|---------|-----------|
| 123               | 1       | Push Day | 1       | true      |

### `user_routine_exercises_data` table  
| routine_template_exercise_id | routine_template_id | exercise_id | exercise_order | planned_sets | planned_reps | planned_weight_kg |
|----------------------------|-------------------|-------------|---------------|-------------|-------------|------------------|
| 789                        | 123               | 456         | 1             | 3           | 10          | 27.5            |

### `user_routine_exercises_set_data` table
| routine_template_exercise_set_id | routine_template_exercise_id | exercise_id | set_order | planned_reps | planned_weight_kg |
|--------------------------------|----------------------------|-------------|-----------|-------------|------------------|
| 1001                           | 789                        | 456         | 1         | 12          | 25.0            |
| 1002                           | 789                        | 456         | 2         | 10          | 27.5            |
| 1003                           | 789                        | 456         | 3         | 8           | 30.0            |

### `exercises` table (reference)
| exercise_id | name                  | category | muscle_group |
|-------------|----------------------|----------|-------------|
| 456         | Dumbbell Bench Press | Strength | Chest       |

## Key Relationships

```
user_routines (123)
    ↓ (routine_template_id)
user_routine_exercises_data (789) 
    ↓ (routine_template_exercise_id)
user_routine_exercises_set_data (1001, 1002, 1003)
```

## Querying the Data

### Get routine with exercises and sets:
```sql
SELECT 
    ur.name as routine_name,
    e.name as exercise_name,
    ured.planned_sets,
    ured.planned_reps as avg_reps,
    ured.planned_weight_kg as avg_weight,
    uresd.set_order,
    uresd.planned_reps as set_reps,
    uresd.planned_weight_kg as set_weight
FROM user_routines ur
JOIN user_routine_exercises_data ured ON ur.routine_template_id = ured.routine_template_id
JOIN exercises e ON ured.exercise_id = e.exercise_id
LEFT JOIN user_routine_exercises_set_data uresd ON ured.routine_template_exercise_id = uresd.routine_template_exercise_id
WHERE ur.routine_template_id = 123
ORDER BY ured.exercise_order, uresd.set_order;
```

### Result:
| routine_name | exercise_name         | planned_sets | avg_reps | avg_weight | set_order | set_reps | set_weight |
|-------------|-----------------------|-------------|----------|------------|-----------|----------|------------|
| Push Day    | Dumbbell Bench Press  | 3           | 10       | 27.5       | 1         | 12       | 25.0       |
| Push Day    | Dumbbell Bench Press  | 3           | 10       | 27.5       | 2         | 10       | 27.5       |
| Push Day    | Dumbbell Bench Press  | 3           | 10       | 27.5       | 3         | 8        | 30.0       |

## Data Validation in Code

```typescript
// Only save sets with valid data
const validSets = sets.filter(set => 
  parseInt(set.reps) > 0 || parseFloat(set.weight) > 0
);

// Skip empty sets: { reps: '0', weight: '0' } → not saved
// Save valid sets: { reps: '12', weight: '25' } → saved as planned_reps: 12, planned_weight_kg: 25.0
```