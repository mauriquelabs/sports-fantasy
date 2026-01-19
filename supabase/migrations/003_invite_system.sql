-- Invite System Migration
-- Adds functions for generating invite codes and joining leagues

-- Function to generate a random invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a 6-character alphanumeric code (uppercase)
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.leagues WHERE invite_code = code) INTO exists_check;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to generate/regenerate invite code for a league
CREATE OR REPLACE FUNCTION public.generate_league_invite_code(p_league_id UUID)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_invite_code TEXT;
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
    RAISE EXCEPTION 'Only the league commissioner can generate invite codes';
  END IF;
  
  -- Generate unique invite code
  v_invite_code := public.generate_invite_code();
  
  -- Update league with invite code
  UPDATE public.leagues
  SET invite_code = v_invite_code
  WHERE id = p_league_id;
  
  RETURN json_build_object(
    'message', 'Invite code generated',
    'invite_code', v_invite_code
  );
END;
$$ LANGUAGE plpgsql;

-- Function to join a league by invite code
CREATE OR REPLACE FUNCTION public.join_league_by_code(p_invite_code TEXT, p_team_name TEXT)
RETURNS JSON AS $$
DECLARE
  v_league_id UUID;
  v_user_id UUID;
  v_team_id UUID;
  v_current_teams INTEGER;
  v_max_teams INTEGER;
BEGIN
  -- Get current user ID from auth context
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Find league by invite code
  SELECT id, current_teams, max_teams INTO v_league_id, v_current_teams, v_max_teams
  FROM public.leagues
  WHERE invite_code = p_invite_code;
  
  IF v_league_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;
  
  -- Check if league is full
  IF v_current_teams >= v_max_teams THEN
    RAISE EXCEPTION 'League is full';
  END IF;
  
  -- Check if user already has a team in this league
  SELECT id INTO v_team_id
  FROM public.teams
  WHERE league_id = v_league_id AND owner_id = v_user_id;
  
  IF v_team_id IS NOT NULL THEN
    RAISE EXCEPTION 'You already have a team in this league';
  END IF;
  
  -- Check if team name is already taken in this league
  SELECT id INTO v_team_id
  FROM public.teams
  WHERE league_id = v_league_id AND name = p_team_name;
  
  IF v_team_id IS NOT NULL THEN
    RAISE EXCEPTION 'Team name already taken in this league';
  END IF;
  
  -- Create team
  INSERT INTO public.teams (league_id, owner_id, name)
  VALUES (v_league_id, v_user_id, p_team_name)
  RETURNING id INTO v_team_id;
  
  -- Update league team count
  UPDATE public.leagues
  SET current_teams = current_teams + 1
  WHERE id = v_league_id;
  
  RETURN json_build_object(
    'message', 'Successfully joined league',
    'league_id', v_league_id,
    'team_id', v_team_id
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invite code when league is created
CREATE OR REPLACE FUNCTION public.auto_generate_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := public.generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_invite_code ON public.leagues;
CREATE TRIGGER trigger_auto_generate_invite_code
  BEFORE INSERT ON public.leagues
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_invite_code();
