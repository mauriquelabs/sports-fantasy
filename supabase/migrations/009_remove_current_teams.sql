-- Remove redundant current_teams column from leagues table
-- The team count can always be derived by counting from the teams table

-- Drop the column
ALTER TABLE public.leagues DROP COLUMN IF EXISTS current_teams;
