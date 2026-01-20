-- Mock Draft System Refactor
-- Mock drafts are now created within existing leagues, not as separate leagues
-- Users can practice drafting while waiting for the real draft

-- Create mock_drafts table to track mock draft sessions
CREATE TABLE IF NOT EXISTS public.mock_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  num_bots INTEGER NOT NULL DEFAULT 3,
  total_rounds INTEGER NOT NULL DEFAULT 5,
  current_round INTEGER DEFAULT 1,
  current_pick INTEGER DEFAULT 0,
  draft_order TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT valid_num_bots CHECK (num_bots >= 1 AND num_bots <= 11)
);

-- Create mock_draft_teams table (virtual teams for mock drafts)
CREATE TABLE IF NOT EXISTS public.mock_draft_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_draft_id UUID NOT NULL REFERENCES public.mock_drafts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_bot BOOLEAN NOT NULL DEFAULT FALSE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create mock_draft_picks table
CREATE TABLE IF NOT EXISTS public.mock_draft_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_draft_id UUID NOT NULL REFERENCES public.mock_drafts(id) ON DELETE CASCADE,
  mock_team_id UUID NOT NULL REFERENCES public.mock_draft_teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id),
  round INTEGER NOT NULL,
  pick_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.mock_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_draft_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_draft_picks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mock_drafts
CREATE POLICY "Users can view mock drafts in their leagues"
  ON public.mock_drafts FOR SELECT
  USING (
    creator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.league_id = mock_drafts.league_id
      AND teams.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create mock drafts in their leagues"
  ON public.mock_drafts FOR INSERT
  WITH CHECK (
    creator_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.league_id = mock_drafts.league_id
      AND teams.owner_id = auth.uid()
    )
  );

CREATE POLICY "Creators can update their mock drafts"
  ON public.mock_drafts FOR UPDATE
  USING (creator_id = auth.uid());

CREATE POLICY "Creators can delete their mock drafts"
  ON public.mock_drafts FOR DELETE
  USING (creator_id = auth.uid());

-- RLS Policies for mock_draft_teams
CREATE POLICY "Users can view mock draft teams"
  ON public.mock_draft_teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mock_drafts
      WHERE mock_drafts.id = mock_draft_teams.mock_draft_id
      AND (
        mock_drafts.creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.teams
          WHERE teams.league_id = mock_drafts.league_id
          AND teams.owner_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create mock draft teams"
  ON public.mock_draft_teams FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mock_drafts
      WHERE mock_drafts.id = mock_draft_teams.mock_draft_id
      AND mock_drafts.creator_id = auth.uid()
    )
  );

-- RLS Policies for mock_draft_picks
CREATE POLICY "Users can view mock draft picks"
  ON public.mock_draft_picks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mock_drafts
      WHERE mock_drafts.id = mock_draft_picks.mock_draft_id
      AND (
        mock_drafts.creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.teams
          WHERE teams.league_id = mock_drafts.league_id
          AND teams.owner_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create picks in their mock drafts"
  ON public.mock_draft_picks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mock_drafts
      WHERE mock_drafts.id = mock_draft_picks.mock_draft_id
      AND mock_drafts.creator_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mock_drafts_league_id ON public.mock_drafts(league_id);
CREATE INDEX IF NOT EXISTS idx_mock_drafts_creator_id ON public.mock_drafts(creator_id);
CREATE INDEX IF NOT EXISTS idx_mock_draft_teams_mock_draft_id ON public.mock_draft_teams(mock_draft_id);
CREATE INDEX IF NOT EXISTS idx_mock_draft_picks_mock_draft_id ON public.mock_draft_picks(mock_draft_id);

-- Function to create a mock draft within an existing league
CREATE OR REPLACE FUNCTION public.create_league_mock_draft(
  p_league_id UUID,
  p_user_team_name TEXT,
  p_num_bots INTEGER DEFAULT 3,
  p_total_rounds INTEGER DEFAULT 5
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_mock_draft_id UUID;
  v_user_team_id UUID;
  v_total_teams INTEGER;
  v_bot_names TEXT[] := ARRAY[
    'Bot Warriors', 'AI Titans', 'Robo Raiders', 'Cyber Crusaders',
    'Digital Dragons', 'Machine Monsters', 'Virtual Vikings', 'Binary Bears',
    'Circuit Sharks', 'Data Demons', 'Neural Knights'
  ];
  v_bot_name TEXT;
  v_shuffled_teams TEXT[];
  i INTEGER;
BEGIN
  -- Get current user ID from auth context
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user has a team in this league
  IF NOT EXISTS (
    SELECT 1 FROM public.teams
    WHERE league_id = p_league_id AND owner_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You must have a team in this league to create a mock draft';
  END IF;

  -- Verify league exists and is not a mock league
  IF NOT EXISTS (
    SELECT 1 FROM public.leagues
    WHERE id = p_league_id AND (is_mock IS NULL OR is_mock = FALSE)
  ) THEN
    RAISE EXCEPTION 'League not found or is already a mock league';
  END IF;

  v_total_teams := p_num_bots + 1;

  -- Create the mock draft record
  INSERT INTO public.mock_drafts (
    league_id,
    creator_id,
    num_bots,
    total_rounds,
    status
  )
  VALUES (
    p_league_id,
    v_user_id,
    p_num_bots,
    p_total_rounds,
    'in_progress'
  )
  RETURNING id INTO v_mock_draft_id;

  -- Create user's mock team
  INSERT INTO public.mock_draft_teams (mock_draft_id, name, is_bot, owner_id)
  VALUES (v_mock_draft_id, p_user_team_name, FALSE, v_user_id)
  RETURNING id INTO v_user_team_id;

  -- Create shuffled team order starting with user
  v_shuffled_teams := ARRAY[p_user_team_name];

  -- Create bot teams
  FOR i IN 1..p_num_bots LOOP
    v_bot_name := v_bot_names[(i - 1) % array_length(v_bot_names, 1) + 1];
    
    INSERT INTO public.mock_draft_teams (mock_draft_id, name, is_bot, owner_id)
    VALUES (v_mock_draft_id, v_bot_name, TRUE, NULL);
    
    v_shuffled_teams := array_append(v_shuffled_teams, v_bot_name);
  END LOOP;

  -- Shuffle the draft order
  SELECT ARRAY_AGG(name ORDER BY random()) INTO v_shuffled_teams
  FROM public.mock_draft_teams
  WHERE mock_draft_id = v_mock_draft_id;

  -- Update mock draft with shuffled order
  UPDATE public.mock_drafts
  SET draft_order = v_shuffled_teams
  WHERE id = v_mock_draft_id;

  RETURN json_build_object(
    'mock_draft_id', v_mock_draft_id,
    'league_id', p_league_id,
    'user_team_id', v_user_team_id,
    'total_teams', v_total_teams,
    'draft_order', v_shuffled_teams,
    'message', 'Mock draft created and started successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to make a pick in a mock draft
CREATE OR REPLACE FUNCTION public.make_mock_draft_pick(
  p_mock_draft_id UUID,
  p_team_name TEXT,
  p_player_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_mock_draft public.mock_drafts%ROWTYPE;
  v_team_id UUID;
  v_player_name TEXT;
  v_next_team TEXT;
  v_team_count INTEGER;
  v_new_pick_number INTEGER;
  v_new_round INTEGER;
  v_position_in_round INTEGER;
BEGIN
  -- Get mock draft state
  SELECT * INTO v_mock_draft FROM public.mock_drafts WHERE id = p_mock_draft_id;
  
  IF v_mock_draft.id IS NULL THEN 
    RAISE EXCEPTION 'Mock draft not found'; 
  END IF;
  
  IF v_mock_draft.status != 'in_progress' THEN
    RAISE EXCEPTION 'Mock draft is not in progress';
  END IF;
  
  -- Calculate whose turn it is (snake draft)
  v_team_count := array_length(v_mock_draft.draft_order, 1);
  v_position_in_round := v_mock_draft.current_pick % v_team_count;
  
  IF v_mock_draft.current_round % 2 = 0 THEN
    -- Even round: reverse order
    v_next_team := v_mock_draft.draft_order[v_team_count - v_position_in_round];
  ELSE
    -- Odd round: normal order
    v_next_team := v_mock_draft.draft_order[v_position_in_round + 1];
  END IF;
  
  IF v_next_team != p_team_name THEN 
    RAISE EXCEPTION 'Not this team''s turn! Current turn: %', v_next_team; 
  END IF;
  
  -- Find team
  SELECT id INTO v_team_id 
  FROM public.mock_draft_teams
  WHERE mock_draft_id = p_mock_draft_id AND name = p_team_name;
  
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Team not found in mock draft';
  END IF;
  
  -- Verify player is not already picked in this mock draft
  IF EXISTS (
    SELECT 1 FROM public.mock_draft_picks
    WHERE mock_draft_id = p_mock_draft_id AND player_id = p_player_id
  ) THEN
    RAISE EXCEPTION 'Player already picked in this mock draft';
  END IF;
  
  -- Get player name
  SELECT first_name || ' ' || last_name INTO v_player_name
  FROM public.players
  WHERE id = p_player_id;
  
  IF v_player_name IS NULL THEN
    RAISE EXCEPTION 'Player not found';
  END IF;
  
  v_new_pick_number := v_mock_draft.current_pick + 1;
  v_new_round := v_mock_draft.current_round;
  
  -- Check if we need to move to next round
  IF v_new_pick_number % v_team_count = 0 THEN
    v_new_round := v_mock_draft.current_round + 1;
  END IF;
  
  -- Insert pick
  INSERT INTO public.mock_draft_picks (mock_draft_id, mock_team_id, player_id, round, pick_number) 
  VALUES (p_mock_draft_id, v_team_id, p_player_id, v_mock_draft.current_round, v_new_pick_number);
  
  -- Update mock draft state
  UPDATE public.mock_drafts 
  SET current_pick = v_new_pick_number, 
      current_round = v_new_round,
      status = CASE 
        WHEN v_new_round > v_mock_draft.total_rounds THEN 'completed'
        ELSE 'in_progress'
      END,
      completed_at = CASE 
        WHEN v_new_round > v_mock_draft.total_rounds THEN NOW()
        ELSE NULL
      END
  WHERE id = p_mock_draft_id;
  
  RETURN json_build_object(
    'message', p_team_name || ' picked ' || v_player_name,
    'pick_number', v_new_pick_number,
    'round', v_new_round,
    'player_name', v_player_name,
    'is_complete', v_new_round > v_mock_draft.total_rounds
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to make a bot pick in mock draft
CREATE OR REPLACE FUNCTION public.make_mock_draft_bot_pick(p_mock_draft_id UUID)
RETURNS JSON AS $$
DECLARE
  v_mock_draft public.mock_drafts%ROWTYPE;
  v_team record;
  v_next_team TEXT;
  v_team_count INTEGER;
  v_position_in_round INTEGER;
  v_player_id UUID;
  v_result JSON;
BEGIN
  -- Get mock draft state
  SELECT * INTO v_mock_draft FROM public.mock_drafts WHERE id = p_mock_draft_id;
  
  IF v_mock_draft.id IS NULL THEN 
    RAISE EXCEPTION 'Mock draft not found'; 
  END IF;
  
  IF v_mock_draft.status != 'in_progress' THEN
    RETURN json_build_object('success', false, 'message', 'Mock draft not in progress');
  END IF;
  
  -- Calculate whose turn it is
  v_team_count := array_length(v_mock_draft.draft_order, 1);
  v_position_in_round := v_mock_draft.current_pick % v_team_count;
  
  IF v_mock_draft.current_round % 2 = 0 THEN
    v_next_team := v_mock_draft.draft_order[v_team_count - v_position_in_round];
  ELSE
    v_next_team := v_mock_draft.draft_order[v_position_in_round + 1];
  END IF;
  
  -- Get team and verify it's a bot
  SELECT * INTO v_team
  FROM public.mock_draft_teams
  WHERE mock_draft_id = p_mock_draft_id AND name = v_next_team;
  
  IF NOT COALESCE(v_team.is_bot, FALSE) THEN
    RETURN json_build_object('success', false, 'message', 'Not a bot''s turn', 'next_team', v_next_team);
  END IF;
  
  -- Get a random available player (not yet picked in this mock draft)
  SELECT id INTO v_player_id
  FROM public.players
  WHERE id NOT IN (
    SELECT player_id FROM public.mock_draft_picks WHERE mock_draft_id = p_mock_draft_id
  )
  ORDER BY random()
  LIMIT 1;
  
  IF v_player_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'No players available');
  END IF;
  
  -- Make the pick
  SELECT public.make_mock_draft_pick(p_mock_draft_id, v_next_team, v_player_id) INTO v_result;
  
  RETURN json_build_object(
    'success', true,
    'team_name', v_next_team,
    'player_name', v_result->>'player_name',
    'message', v_result->>'message',
    'pick_number', v_result->>'pick_number',
    'round', v_result->>'round',
    'is_complete', v_result->>'is_complete'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get mock draft state
CREATE OR REPLACE FUNCTION public.get_mock_draft_state(p_mock_draft_id UUID)
RETURNS JSON AS $$
DECLARE
  v_mock_draft public.mock_drafts%ROWTYPE;
  v_teams JSON;
  v_picks JSON;
  v_next_team TEXT;
  v_team_count INTEGER;
  v_position_in_round INTEGER;
BEGIN
  -- Get mock draft
  SELECT * INTO v_mock_draft FROM public.mock_drafts WHERE id = p_mock_draft_id;
  
  IF v_mock_draft.id IS NULL THEN 
    RAISE EXCEPTION 'Mock draft not found'; 
  END IF;
  
  -- Get teams
  SELECT json_agg(row_to_json(t)) INTO v_teams
  FROM (
    SELECT id, mock_draft_id, name, is_bot, owner_id, created_at
    FROM public.mock_draft_teams
    WHERE mock_draft_id = p_mock_draft_id
    ORDER BY created_at
  ) t;
  
  -- Get picks
  SELECT json_agg(row_to_json(p)) INTO v_picks
  FROM (
    SELECT 
      mdp.id, 
      mdp.mock_draft_id, 
      mdp.mock_team_id, 
      mdp.player_id, 
      mdp.round, 
      mdp.pick_number,
      mdt.name as team_name,
      pl.first_name || ' ' || pl.last_name as player_name
    FROM public.mock_draft_picks mdp
    JOIN public.mock_draft_teams mdt ON mdt.id = mdp.mock_team_id
    JOIN public.players pl ON pl.id = mdp.player_id
    WHERE mdp.mock_draft_id = p_mock_draft_id
    ORDER BY mdp.pick_number
  ) p;
  
  -- Calculate next team
  v_team_count := array_length(v_mock_draft.draft_order, 1);
  IF v_team_count > 0 THEN
    v_position_in_round := v_mock_draft.current_pick % v_team_count;
    
    IF v_mock_draft.current_round % 2 = 0 THEN
      v_next_team := v_mock_draft.draft_order[v_team_count - v_position_in_round];
    ELSE
      v_next_team := v_mock_draft.draft_order[v_position_in_round + 1];
    END IF;
  END IF;
  
  RETURN json_build_object(
    'id', v_mock_draft.id,
    'league_id', v_mock_draft.league_id,
    'creator_id', v_mock_draft.creator_id,
    'status', v_mock_draft.status,
    'num_bots', v_mock_draft.num_bots,
    'total_rounds', v_mock_draft.total_rounds,
    'current_round', v_mock_draft.current_round,
    'current_pick', v_mock_draft.current_pick,
    'draft_order', v_mock_draft.draft_order,
    'teams', COALESCE(v_teams, '[]'::json),
    'picks', COALESCE(v_picks, '[]'::json),
    'next_team', v_next_team,
    'total_picks', v_team_count * v_mock_draft.total_rounds
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's mock drafts for a league
CREATE OR REPLACE FUNCTION public.get_league_mock_drafts(p_league_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(row_to_json(m)) INTO v_result
  FROM (
    SELECT 
      id, 
      league_id, 
      creator_id, 
      status, 
      num_bots, 
      total_rounds,
      current_round,
      current_pick,
      created_at,
      completed_at
    FROM public.mock_drafts
    WHERE league_id = p_league_id AND creator_id = auth.uid()
    ORDER BY created_at DESC
  ) m;
  
  RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
