-- Migration: Fix register_team to check league max_teams
-- This ensures the register_team function respects the league's max_teams setting

CREATE OR REPLACE FUNCTION public.register_team(p_team_name TEXT, p_league_id UUID)
RETURNS JSON AS $$
DECLARE
  v_team_id UUID;
  v_profile_id UUID;
  v_user_id UUID;
  v_current_teams INTEGER;
  v_max_teams INTEGER;
BEGIN
  -- Get current user ID from auth context
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Verify league exists and get team counts
  SELECT current_teams, max_teams INTO v_current_teams, v_max_teams
  FROM public.leagues 
  WHERE id = p_league_id;
  
  IF v_current_teams IS NULL THEN
    RAISE EXCEPTION 'League not found';
  END IF;
  
  -- Check if league is full
  IF v_current_teams >= v_max_teams THEN
    RAISE EXCEPTION 'League is full (% / % teams)', v_current_teams, v_max_teams;
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
