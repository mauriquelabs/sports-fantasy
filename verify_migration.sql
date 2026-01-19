-- Verification queries for draft system migration
-- Run these in Supabase SQL Editor to verify the migration was successful

-- 1. Check if new columns were added
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'draft_picks' AND column_name = 'round') OR
    (table_name = 'drafts' AND column_name = 'current_round') OR
    (table_name = 'players' AND column_name = 'is_available')
  )
ORDER BY table_name, column_name;

-- 2. Check if draft_state table exists
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'draft_state'
ORDER BY ordinal_position;

-- 3. Check if all functions were created
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_next_team',
    'register_team',
    'start_draft',
    'make_pick',
    'reset_draft',
    'init_draft_players'
  )
ORDER BY routine_name;

-- 4. Check if indexes were created
SELECT 
  indexname,
  tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_draft_picks_round',
    'idx_players_available'
  )
ORDER BY tablename;

-- 5. Check if RLS policies exist for draft_state
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'draft_state';

-- 6. Check if draft_state was initialized
SELECT * FROM public.draft_state WHERE id = 1;

-- 7. Check if players were initialized (should show 20 players)
SELECT COUNT(*) as player_count
FROM public.players
WHERE first_name = 'Player' AND last_name ~ '^[0-9]+$';

-- 8. Test that functions are callable (this should return NULL if draft not started)
SELECT public.get_next_team();
