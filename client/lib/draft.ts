import { supabase } from "./supabase";

// Types
export interface DraftTeam {
  id: string;
  name: string;
  league_id: string;
  owner_id: string;
  created_at: string;
}

export interface DraftPlayer {
  id: string;
  name?: string;
  first_name: string;
  last_name: string;
  is_available?: boolean;
}

export interface DraftState {
  id: number;
  started: boolean;
  current_round: number;
  current_pick: number;
  draft_order: string[];
  max_teams: number;
  total_rounds: number;
}

export interface DraftPick {
  id: string;
  team_id: string;
  player_id: string;
  round: number;
  pick_number: number;
  created_at: string;
}

export interface DraftData {
  teams: DraftTeam[];
  players: DraftPlayer[];
  state: DraftState | null;
  picks: DraftPick[];
}

// Initialize Supabase client (already done in supabase.ts)
export const initSupabase = () => {
  return supabase;
};

// Fetch current draft state
export const fetchDraftState = async (leagueId?: string): Promise<DraftData> => {
  let targetLeagueId: string | null = leagueId || null;

  // If leagueId not provided, try to find it from draft state
  if (!targetLeagueId) {
    const { data: stateData } = await supabase
      .from("draft_state")
      .select("draft_id")
      .eq("id", 1)
      .single();

    // If there's a draft, get its league
    if (stateData?.draft_id) {
      const { data: draftData } = await supabase
        .from("drafts")
        .select("league_id")
        .eq("id", stateData.draft_id)
        .single();
      targetLeagueId = draftData?.league_id || null;
    }
  }

  // Get draft_id if available
  const { data: stateData } = await supabase
    .from("draft_state")
    .select("draft_id")
    .eq("id", 1)
    .single();

  const draftId = stateData?.draft_id;

  const [teamsRes, playersRes, stateRes, picksRes] = await Promise.all([
    targetLeagueId
      ? supabase
          .from("teams")
          .select("*")
          .eq("league_id", targetLeagueId)
          .order("created_at")
      : { data: [], error: null },
    supabase
      .from("players")
      .select("*")
      .order("first_name, last_name"),
    supabase.from("draft_state").select("*").eq("id", 1).single(),
    draftId
      ? supabase
          .from("draft_picks")
          .select("*")
          .eq("draft_id", draftId)
          .order("pick_number")
      : { data: [], error: null },
  ]);

  if (teamsRes.error) throw teamsRes.error;
  if (playersRes.error) throw playersRes.error;
  if (stateRes.error && stateRes.error.code !== "PGRST116") throw stateRes.error;
  if (picksRes.error) throw picksRes.error;

  return {
    teams: teamsRes.data || [],
    players: playersRes.data || [],
    state: stateRes.data || null,
    picks: picksRes.data || [],
  };
};

// Register a team
export const registerTeam = async (name: string, leagueId: string): Promise<DraftTeam> => {
  const { data, error } = await supabase.rpc("register_team", {
    p_team_name: name,
    p_league_id: leagueId,
  });

  if (error) throw error;
  
  // Fetch the created team
  const { data: teamData, error: teamError } = await supabase
    .from("teams")
    .select("*")
    .eq("league_id", leagueId)
    .eq("name", name)
    .single();

  if (teamError) throw teamError;
  return teamData;
};

// Start the draft
export const startDraft = async (leagueId: string): Promise<{ message: string; order: string[] }> => {
  const { data, error } = await supabase.rpc("start_draft", {
    p_league_id: leagueId,
  });

  if (error) throw error;
  return data;
};

// Make a pick
export const makePick = async (
  teamName: string,
  playerName: string
): Promise<{ message: string; pick_number: number; round: number }> => {
  const { data, error } = await supabase.rpc("make_pick", {
    p_team_name: teamName,
    p_player_name: playerName,
  });

  if (error) throw error;
  return data;
};

// Get next team to pick
export const getNextTeam = async (): Promise<string | null> => {
  const { data, error } = await supabase.rpc("get_next_team");

  if (error) throw error;
  return data;
};

// Reset draft (for testing)
export const resetDraft = async (): Promise<void> => {
  const { error } = await supabase.rpc("reset_draft");
  if (error) throw error;
};

// Subscribe to draft changes
export const subscribeToChanges = (
  callback: (data: DraftData) => void
) => {
  const channel = supabase
    .channel("draft")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "teams" },
      async () => {
        try {
          const data = await fetchDraftState();
          callback(data);
        } catch (error) {
          console.error("Error fetching draft state after teams change:", error);
        }
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "draft_state" },
      async () => {
        try {
          const data = await fetchDraftState();
          callback(data);
        } catch (error) {
          console.error("Error fetching draft state after state change:", error);
        }
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "draft_picks" },
      async () => {
        try {
          const data = await fetchDraftState();
          callback(data);
        } catch (error) {
          console.error("Error fetching draft state after picks change:", error);
        }
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "players" },
      async () => {
        try {
          const data = await fetchDraftState();
          callback(data);
        } catch (error) {
          console.error("Error fetching draft state after players change:", error);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
