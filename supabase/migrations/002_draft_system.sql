-- Fantasy Draft System Migration
-- Extends existing schema to support simple standalone drafts
-- Uses existing tables: drafts, draft_picks, teams, players

-- Add round column to draft_picks table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'draft_picks' 
    AND column_name = 'round'
  ) THEN
    ALTER TABLE public.draft_picks ADD COLUMN round INTEGER;
  END IF;
END $$;

-- Add current_round to drafts table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'drafts' 
    AND column_name = 'current_round'
  ) THEN
    ALTER TABLE public.drafts ADD COLUMN current_round INTEGER DEFAULT 1;
  END IF;
END $$;

-- Add is_available to players table for draft availability tracking
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'players' 
    AND column_name = 'is_available'
  ) THEN
    ALTER TABLE public.players ADD COLUMN is_available BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Create a simple draft state table (singleton)
-- This tracks the current simple draft session
CREATE TABLE IF NOT EXISTS public.draft_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  draft_id UUID REFERENCES public.drafts(id) ON DELETE SET NULL,
  started BOOLEAN DEFAULT FALSE,
  current_round INTEGER DEFAULT 1,
  current_pick INTEGER DEFAULT 0,
  draft_order TEXT[] DEFAULT '{}',
  max_teams INTEGER DEFAULT 4,
  total_rounds INTEGER DEFAULT 5
);

-- Initialize draft state
INSERT INTO public.draft_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Database Functions

-- Get next team to pick (snake draft logic)
CREATE OR REPLACE FUNCTION public.get_next_team()
RETURNS TEXT AS $$
DECLARE
  state public.draft_state%ROWTYPE;
  team_count INTEGER;
  draft_sequence TEXT[];
  position_in_round INTEGER;
BEGIN
  SELECT * INTO state FROM public.draft_state WHERE id = 1;
  IF NOT state.started THEN RETURN NULL; END IF;
  
  team_count := array_length(state.draft_order, 1);
  IF team_count IS NULL OR team_count = 0 THEN RETURN NULL; END IF;
  
  -- Calculate position within current round (0 to team_count-1)
  position_in_round := state.current_pick % team_count;
  
  -- Snake draft: reverse order on even rounds
  IF state.current_round % 2 = 0 THEN
    -- Reverse the array for even rounds
    draft_sequence := ARRAY(
      SELECT state.draft_order[i] 
      FROM generate_series(array_length(state.draft_order, 1), 1, -1) AS i
    );
  ELSE
    draft_sequence := state.draft_order;
  END IF;
  
  RETURN draft_sequence[position_in_round + 1];
END;
$$ LANGUAGE plpgsql;

-- Register team (requires league_id parameter)
CREATE OR REPLACE FUNCTION public.register_team(p_team_name TEXT, p_league_id UUID)
RETURNS JSON AS $$
DECLARE
  v_team_id UUID;
  v_profile_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current user ID from auth context
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Verify league exists
  IF NOT EXISTS (SELECT 1 FROM public.leagues WHERE id = p_league_id) THEN
    RAISE EXCEPTION 'League not found';
  END IF;
  
  -- Check if team already exists in this league
  SELECT id INTO v_team_id 
  FROM public.teams 
  WHERE name = p_team_name AND league_id = p_league_id;
  
  IF v_team_id IS NOT NULL THEN
    RAISE EXCEPTION 'Team name already taken';
  END IF;
  
  -- Check if user already has a team in this league
  SELECT id INTO v_team_id
  FROM public.teams
  WHERE league_id = p_league_id AND owner_id = v_user_id;
  
  IF v_team_id IS NOT NULL THEN
    RAISE EXCEPTION 'You already have a team in this league';
  END IF;
  
  -- Create team
  INSERT INTO public.teams (league_id, owner_id, name)
  VALUES (p_league_id, v_user_id, p_team_name)
  RETURNING id INTO v_team_id;
  
  -- Update league team count
  UPDATE public.leagues
  SET current_teams = current_teams + 1
  WHERE id = p_league_id;
  
  RETURN json_build_object(
    'message', 'Team registered',
    'team_id', v_team_id,
    'league_id', p_league_id
  );
END;
$$ LANGUAGE plpgsql;

-- Start draft (requires league_id parameter)
CREATE OR REPLACE FUNCTION public.start_draft(p_league_id UUID)
RETURNS JSON AS $$
DECLARE
  team_count INTEGER;
  shuffled_teams TEXT[];
  v_draft_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current user ID from auth context
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Verify user is commissioner of the league
  IF NOT EXISTS (
    SELECT 1 FROM public.leagues 
    WHERE id = p_league_id AND commissioner_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Only the league commissioner can start the draft';
  END IF;
  
  -- Count teams in this league
  SELECT COUNT(*) INTO team_count 
  FROM public.teams 
  WHERE league_id = p_league_id;
  
  IF team_count != 4 THEN 
    RAISE EXCEPTION 'Need exactly 4 teams to start'; 
  END IF;
  
  -- Get team names and shuffle
  SELECT ARRAY_AGG(name ORDER BY random()) INTO shuffled_teams 
  FROM public.teams 
  WHERE league_id = p_league_id;
  
  -- Create draft record
  INSERT INTO public.drafts (league_id, status, current_pick, total_picks, current_round)
  VALUES (p_league_id, 'in_progress', 0, 20, 1)
  RETURNING id INTO v_draft_id;
  
  -- Update draft state
  UPDATE public.draft_state 
  SET started = TRUE, 
      draft_order = shuffled_teams, 
      current_round = 1, 
      current_pick = 0,
      draft_id = v_draft_id
  WHERE id = 1;
  
  -- Update league draft status
  UPDATE public.leagues
  SET draft_status = 'in_progress'
  WHERE id = p_league_id;
  
  RETURN json_build_object(
    'message', 'Draft started', 
    'order', shuffled_teams,
    'draft_id', v_draft_id,
    'league_id', p_league_id
  );
END;
$$ LANGUAGE plpgsql;

-- Make a pick
CREATE OR REPLACE FUNCTION public.make_pick(p_team_name TEXT, p_player_name TEXT)
RETURNS JSON AS $$
DECLARE
  state public.draft_state%ROWTYPE;
  v_team_id UUID;
  v_player_id UUID;
  next_team TEXT;
  team_count INTEGER;
  new_pick_number INTEGER;
  new_round INTEGER;
BEGIN
  SELECT * INTO state FROM public.draft_state WHERE id = 1;
  IF NOT state.started THEN 
    RAISE EXCEPTION 'Draft has not started'; 
  END IF;
  
  next_team := public.get_next_team();
  IF next_team != p_team_name THEN 
    RAISE EXCEPTION 'Not your turn!'; 
  END IF;
  
  -- Find team by name in the draft's league
  SELECT t.id INTO v_team_id 
  FROM public.teams t
  JOIN public.drafts d ON d.league_id = t.league_id
  WHERE t.name = p_team_name 
  AND d.id = state.draft_id;
  
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;
  
  -- Find available player by name (check both name format and first_name/last_name)
  SELECT id INTO v_player_id 
  FROM public.players 
  WHERE (
    (first_name || ' ' || last_name = p_player_name) OR
    (COALESCE(first_name, '') || COALESCE(last_name, '') = p_player_name) OR
    (name = p_player_name)
  )
  AND (is_available = TRUE OR is_available IS NULL);
  
  IF v_player_id IS NULL THEN 
    RAISE EXCEPTION 'Player not available!'; 
  END IF;
  
  new_pick_number := state.current_pick + 1;
  team_count := array_length(state.draft_order, 1);
  new_round := state.current_round;
  
  -- Check if we need to move to next round
  IF new_pick_number % team_count = 0 THEN
    new_round := state.current_round + 1;
  END IF;
  
  -- Insert pick into draft_picks table
  INSERT INTO public.draft_picks (draft_id, team_id, player_id, round, pick_number) 
  VALUES (state.draft_id, v_team_id, v_player_id, state.current_round, new_pick_number);
  
  -- Mark player as unavailable
  UPDATE public.players 
  SET is_available = FALSE 
  WHERE id = v_player_id;
  
  -- Update draft state
  UPDATE public.draft_state 
  SET current_pick = new_pick_number, 
      current_round = new_round 
  WHERE id = 1;
  
  -- Update draft record
  UPDATE public.drafts
  SET current_pick = new_pick_number,
      current_round = new_round
  WHERE id = state.draft_id;
  
  RETURN json_build_object(
    'message', p_team_name || ' picked ' || p_player_name,
    'pick_number', new_pick_number,
    'round', new_round
  );
END;
$$ LANGUAGE plpgsql;

-- Reset draft (for testing)
CREATE OR REPLACE FUNCTION public.reset_draft()
RETURNS VOID AS $$
DECLARE
  v_draft_id UUID;
  v_league_id UUID;
BEGIN
  SELECT draft_id INTO v_draft_id FROM public.draft_state WHERE id = 1;
  
  -- Delete picks for this draft
  IF v_draft_id IS NOT NULL THEN
    SELECT league_id INTO v_league_id FROM public.drafts WHERE id = v_draft_id;
    DELETE FROM public.draft_picks WHERE draft_id = v_draft_id;
    DELETE FROM public.drafts WHERE id = v_draft_id;
    
    -- Delete teams in the draft's league
    IF v_league_id IS NOT NULL THEN
      DELETE FROM public.teams WHERE league_id = v_league_id;
      -- Optionally delete the league too (or keep it for history)
      -- DELETE FROM public.leagues WHERE id = v_league_id;
    END IF;
  END IF;
  
  -- Reset all players to available
  UPDATE public.players SET is_available = TRUE WHERE TRUE;
  
  -- Reset draft state
  UPDATE public.draft_state 
  SET started = FALSE, 
      current_round = 1, 
      current_pick = 0, 
      draft_order = '{}',
      draft_id = NULL
  WHERE id = 1;
END;
$$ LANGUAGE plpgsql;

-- Initialize players for simple draft (20 players)
CREATE OR REPLACE FUNCTION public.init_draft_players()
RETURNS VOID AS $$
BEGIN
  -- Insert 20 simple players if they don't exist
  INSERT INTO public.players (first_name, last_name, position, is_available)
  SELECT 
    'Player',
    i::TEXT,
    'QB', -- Default position
    TRUE
  FROM generate_series(1, 20) AS i
  WHERE NOT EXISTS (
    SELECT 1 FROM public.players 
    WHERE first_name = 'Player' AND last_name = i::TEXT
  );
END;
$$ LANGUAGE plpgsql;

-- Row Level Security for draft_state
ALTER TABLE public.draft_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read draft_state" ON public.draft_state FOR SELECT USING (true);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_draft_picks_round ON public.draft_picks(round);
CREATE INDEX IF NOT EXISTS idx_players_available ON public.players(is_available);

-- Initialize players for the draft system
SELECT public.init_draft_players();
