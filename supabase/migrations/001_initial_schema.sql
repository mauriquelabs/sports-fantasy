-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: Row Level Security is enabled per-table below
-- JWT secrets are managed by Supabase platform, not set via SQL

-- Users table (extends Supabase auth.users)
-- We'll use Supabase's built-in auth.users table, but create a profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Leagues table
CREATE TABLE IF NOT EXISTS public.leagues (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  commissioner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  max_teams INTEGER DEFAULT 12 NOT NULL,
  current_teams INTEGER DEFAULT 0 NOT NULL,
  draft_date TIMESTAMP WITH TIME ZONE,
  draft_status TEXT DEFAULT 'pending' CHECK (draft_status IN ('pending', 'in_progress', 'completed')),
  invite_code TEXT UNIQUE,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  draft_position INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(league_id, owner_id) -- One team per user per league
);

-- Players table
CREATE TABLE IF NOT EXISTS public.players (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  external_id TEXT UNIQUE, -- ID from external sports API
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  position TEXT NOT NULL CHECK (position IN ('QB', 'RB', 'WR', 'TE', 'K', 'DEF')),
  team TEXT, -- NFL team abbreviation
  jersey_number INTEGER,
  stats JSONB DEFAULT '{}'::jsonb, -- Flexible stats storage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Rosters table (players on teams)
CREATE TABLE IF NOT EXISTS public.rosters (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  position TEXT NOT NULL,
  is_starter BOOLEAN DEFAULT false NOT NULL,
  acquired_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(team_id, player_id) -- One roster entry per player per team
);

-- Drafts table
CREATE TABLE IF NOT EXISTS public.drafts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) NOT NULL,
  current_pick INTEGER DEFAULT 1 NOT NULL,
  total_picks INTEGER NOT NULL,
  pick_time_limit INTEGER DEFAULT 120, -- seconds per pick
  draft_order JSONB, -- Array of team IDs in draft order
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Draft picks table
CREATE TABLE IF NOT EXISTS public.draft_picks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  draft_id UUID REFERENCES public.drafts(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  pick_number INTEGER NOT NULL,
  made_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(draft_id, pick_number),
  UNIQUE(draft_id, player_id) -- Can't draft same player twice
);

-- Trades table
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE NOT NULL,
  team1_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  team2_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')) NOT NULL,
  team1_players UUID[] DEFAULT '{}', -- Array of player IDs
  team2_players UUID[] DEFAULT '{}', -- Array of player IDs
  proposed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Scores table (weekly/season scores)
CREATE TABLE IF NOT EXISTS public.scores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE NOT NULL,
  week INTEGER,
  season INTEGER,
  points DECIMAL(10, 2) DEFAULT 0 NOT NULL,
  breakdown JSONB DEFAULT '{}'::jsonb, -- Detailed scoring breakdown
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(team_id, league_id, week, season)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_teams_league_id ON public.teams(league_id);
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON public.teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_rosters_team_id ON public.rosters(team_id);
CREATE INDEX IF NOT EXISTS idx_rosters_player_id ON public.rosters(player_id);
CREATE INDEX IF NOT EXISTS idx_draft_picks_draft_id ON public.draft_picks(draft_id);
CREATE INDEX IF NOT EXISTS idx_draft_picks_team_id ON public.draft_picks(team_id);
CREATE INDEX IF NOT EXISTS idx_trades_league_id ON public.trades(league_id);
CREATE INDEX IF NOT EXISTS idx_trades_team1_id ON public.trades(team1_id);
CREATE INDEX IF NOT EXISTS idx_trades_team2_id ON public.trades(team2_id);
CREATE INDEX IF NOT EXISTS idx_scores_team_id ON public.scores(team_id);
CREATE INDEX IF NOT EXISTS idx_scores_league_id ON public.scores(league_id);
CREATE INDEX IF NOT EXISTS idx_players_position ON public.players(position);
CREATE INDEX IF NOT EXISTS idx_players_team ON public.players(team);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Leagues policies
CREATE POLICY "Users can view all leagues"
  ON public.leagues FOR SELECT
  USING (true);

CREATE POLICY "Users can create leagues"
  ON public.leagues FOR INSERT
  WITH CHECK (auth.uid() = commissioner_id);

CREATE POLICY "Commissioners can update their leagues"
  ON public.leagues FOR UPDATE
  USING (auth.uid() = commissioner_id);

-- Teams policies
CREATE POLICY "Users can view all teams"
  ON public.teams FOR SELECT
  USING (true);

CREATE POLICY "Users can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Team owners can update their teams"
  ON public.teams FOR UPDATE
  USING (auth.uid() = owner_id);

-- Players policies (public read, admin write)
CREATE POLICY "Anyone can view players"
  ON public.players FOR SELECT
  USING (true);

-- Rosters policies
CREATE POLICY "Users can view all rosters"
  ON public.rosters FOR SELECT
  USING (true);

CREATE POLICY "Team owners can manage their rosters"
  ON public.rosters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = rosters.team_id
      AND teams.owner_id = auth.uid()
    )
  );

-- Drafts policies
CREATE POLICY "Users can view all drafts"
  ON public.drafts FOR SELECT
  USING (true);

CREATE POLICY "League commissioners can manage drafts"
  ON public.drafts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.leagues
      WHERE leagues.id = drafts.league_id
      AND leagues.commissioner_id = auth.uid()
    )
  );

-- Draft picks policies
CREATE POLICY "Users can view all draft picks"
  ON public.draft_picks FOR SELECT
  USING (true);

CREATE POLICY "Team owners can make draft picks"
  ON public.draft_picks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = draft_picks.team_id
      AND teams.owner_id = auth.uid()
    )
  );

-- Trades policies
CREATE POLICY "Users can view trades in their leagues"
  ON public.trades FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE (teams.id = trades.team1_id OR teams.id = trades.team2_id)
      AND teams.owner_id = auth.uid()
    )
  );

CREATE POLICY "Team owners can create trades"
  ON public.trades FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = trades.team1_id
      AND teams.owner_id = auth.uid()
    )
  );

CREATE POLICY "Team owners can update their trades"
  ON public.trades FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE (teams.id = trades.team1_id OR teams.id = trades.team2_id)
      AND teams.owner_id = auth.uid()
    )
  );

-- Scores policies
CREATE POLICY "Users can view all scores"
  ON public.scores FOR SELECT
  USING (true);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leagues_updated_at BEFORE UPDATE ON public.leagues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drafts_updated_at BEFORE UPDATE ON public.drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scores_updated_at BEFORE UPDATE ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
