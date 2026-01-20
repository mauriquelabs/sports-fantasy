-- Mock Draft System Migration
-- Allows creating mock drafts with bot opponents for testing/practice

-- Add is_bot column to teams table (nullable to support bot teams without owners)
ALTER TABLE public.teams 
  ALTER COLUMN owner_id DROP NOT NULL;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'teams' 
    AND column_name = 'is_bot'
  ) THEN
    ALTER TABLE public.teams ADD COLUMN is_bot BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add is_mock column to leagues table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leagues' 
    AND column_name = 'is_mock'
  ) THEN
    ALTER TABLE public.leagues ADD COLUMN is_mock BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Update RLS policy for teams to allow bot team insertion
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
CREATE POLICY "Users can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (auth.uid() = owner_id OR owner_id IS NULL);

-- Update RLS policy for teams to allow anyone to update bot teams
DROP POLICY IF EXISTS "Team owners can update their teams" ON public.teams;
CREATE POLICY "Team owners can update their teams"
  ON public.teams FOR UPDATE
  USING (auth.uid() = owner_id OR owner_id IS NULL);

-- Function to create a mock draft league with bot teams
CREATE OR REPLACE FUNCTION public.create_mock_draft(
  p_user_team_name TEXT,
  p_num_bots INTEGER DEFAULT 3,
  p_total_rounds INTEGER DEFAULT 5
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_league_id UUID;
  v_user_team_id UUID;
  v_total_teams INTEGER;
  v_bot_names TEXT[] := ARRAY[
    'Bot Warriors', 'AI Titans', 'Robo Raiders', 'Cyber Crusaders',
    'Digital Dragons', 'Machine Monsters', 'Virtual Vikings', 'Binary Bears',
    'Circuit Sharks', 'Data Demons', 'Neural Knights'
  ];
  v_bot_name TEXT;
  i INTEGER;
BEGIN
  -- Get current user ID from auth context
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_total_teams := p_num_bots + 1;

  -- Create a mock league
  INSERT INTO public.leagues (
    name, 
    description, 
    commissioner_id, 
    max_teams, 
    current_teams,
    is_mock
  )
  VALUES (
    'Mock Draft - ' || to_char(NOW(), 'MM/DD/YYYY HH:MI'),
    'Practice draft with bot opponents',
    v_user_id,
    v_total_teams,
    0,
    TRUE
  )
  RETURNING id INTO v_league_id;

  -- Create user's team
  INSERT INTO public.teams (league_id, owner_id, name, is_bot)
  VALUES (v_league_id, v_user_id, p_user_team_name, FALSE)
  RETURNING id INTO v_user_team_id;

  -- Create bot teams
  FOR i IN 1..p_num_bots LOOP
    v_bot_name := v_bot_names[(i - 1) % array_length(v_bot_names, 1) + 1];
    
    INSERT INTO public.teams (league_id, owner_id, name, is_bot)
    VALUES (v_league_id, NULL, v_bot_name, TRUE);
  END LOOP;

  -- Update league team count
  UPDATE public.leagues
  SET current_teams = v_total_teams
  WHERE id = v_league_id;

  RETURN json_build_object(
    'league_id', v_league_id,
    'user_team_id', v_user_team_id,
    'total_teams', v_total_teams,
    'message', 'Mock draft created successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to make a bot pick (can be called by any authenticated user in the league)
CREATE OR REPLACE FUNCTION public.make_bot_pick(p_team_name TEXT)
RETURNS JSON AS $$
DECLARE
  state public.draft_state%ROWTYPE;
  v_team_id UUID;
  v_player_id UUID;
  v_player_name TEXT;
  next_team TEXT;
  team_count INTEGER;
  new_pick_number INTEGER;
  new_round INTEGER;
  v_is_bot BOOLEAN;
  v_available_players UUID[];
BEGIN
  SELECT * INTO state FROM public.draft_state WHERE id = 1;
  IF NOT state.started THEN 
    RAISE EXCEPTION 'Draft has not started'; 
  END IF;
  
  -- Verify it's this team's turn
  next_team := public.get_next_team();
  IF next_team != p_team_name THEN 
    RAISE EXCEPTION 'Not this team''s turn! Current turn: %', next_team; 
  END IF;
  
  -- Find team and verify it's a bot
  SELECT t.id, t.is_bot INTO v_team_id, v_is_bot 
  FROM public.teams t
  JOIN public.drafts d ON d.league_id = t.league_id
  WHERE t.name = p_team_name 
  AND d.id = state.draft_id;
  
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;
  
  IF NOT COALESCE(v_is_bot, FALSE) THEN
    RAISE EXCEPTION 'This function is only for bot teams';
  END IF;
  
  -- Get random available player
  SELECT ARRAY_AGG(id) INTO v_available_players
  FROM public.players 
  WHERE is_available = TRUE OR is_available IS NULL;
  
  IF array_length(v_available_players, 1) IS NULL OR array_length(v_available_players, 1) = 0 THEN
    RAISE EXCEPTION 'No players available';
  END IF;
  
  -- Pick a random player
  v_player_id := v_available_players[1 + floor(random() * array_length(v_available_players, 1))::int];
  
  -- Get player name
  SELECT first_name || ' ' || last_name INTO v_player_name
  FROM public.players
  WHERE id = v_player_id;
  
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
    'message', p_team_name || ' picked ' || v_player_name,
    'pick_number', new_pick_number,
    'round', new_round,
    'player_name', v_player_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update start_draft to work with mock drafts (allow less than 4 teams based on max_teams)
CREATE OR REPLACE FUNCTION public.start_draft(p_league_id UUID)
RETURNS JSON AS $$
DECLARE
  team_count INTEGER;
  required_teams INTEGER;
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
  
  -- Get required teams from league settings
  SELECT max_teams INTO required_teams
  FROM public.leagues
  WHERE id = p_league_id;
  
  -- Count teams in this league
  SELECT COUNT(*) INTO team_count 
  FROM public.teams 
  WHERE league_id = p_league_id;
  
  IF team_count != required_teams THEN 
    RAISE EXCEPTION 'Need exactly % teams to start (currently have %)', required_teams, team_count; 
  END IF;
  
  -- Get team names and shuffle
  SELECT ARRAY_AGG(name ORDER BY random()) INTO shuffled_teams 
  FROM public.teams 
  WHERE league_id = p_league_id;
  
  -- Create draft record
  INSERT INTO public.drafts (league_id, status, current_pick, total_picks, current_round)
  VALUES (p_league_id, 'in_progress', 0, required_teams * 5, 1)
  RETURNING id INTO v_draft_id;
  
  -- Update draft state
  UPDATE public.draft_state 
  SET started = TRUE, 
      draft_order = shuffled_teams, 
      current_round = 1, 
      current_pick = 0,
      draft_id = v_draft_id,
      max_teams = required_teams
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index for bot teams
CREATE INDEX IF NOT EXISTS idx_teams_is_bot ON public.teams(is_bot);
