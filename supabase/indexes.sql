-- Indexing for exercises table to optimize search and filtering
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS exercises_name_trgm_idx ON exercises USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS exercises_muscle_group_idx ON exercises (muscle_group);
