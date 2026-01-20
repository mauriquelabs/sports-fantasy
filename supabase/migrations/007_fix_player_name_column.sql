-- Fix make_pick function to not reference non-existent 'name' column
-- The players table only has first_name and last_name columns

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
  
  -- Find available player by name (first_name + last_name only)
  SELECT id INTO v_player_id 
  FROM public.players 
  WHERE (
    (first_name || ' ' || last_name = p_player_name) OR
    (COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') = p_player_name) OR
    (TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) = p_player_name)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix make_bot_pick function
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
  
  -- Get player name (using first_name and last_name only)
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
