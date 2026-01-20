import { supabase } from "./supabase";

// Bot team names for mock drafts
const BOT_TEAM_NAMES = [
  "Bot Warriors",
  "AI Titans",
  "Robo Raiders",
  "Cyber Crusaders",
  "Digital Dragons",
  "Machine Monsters",
  "Virtual Vikings",
  "Binary Bears",
  "Circuit Sharks",
  "Data Demons",
  "Neural Knights",
];

export interface MockDraftConfig {
  numBots: number; // Number of bot teams (1-11)
  botPickDelay: number; // Delay in ms before bots make picks
  totalRounds: number;
}

export interface MockDraftTeam {
  id: string;
  mock_draft_id: string;
  name: string;
  is_bot: boolean;
  owner_id: string | null;
  created_at: string;
}

export interface MockDraftPick {
  id: string;
  mock_draft_id: string;
  mock_team_id: string;
  player_id: string;
  round: number;
  pick_number: number;
  team_name: string;
  player_name: string;
}

export interface MockDraft {
  id: string;
  league_id: string;
  creator_id: string;
  status: "in_progress" | "completed" | "cancelled";
  num_bots: number;
  total_rounds: number;
  current_round: number;
  current_pick: number;
  draft_order: string[];
  created_at: string;
  completed_at: string | null;
}

export interface MockDraftState {
  id: string;
  league_id: string;
  creator_id: string;
  status: "in_progress" | "completed" | "cancelled";
  num_bots: number;
  total_rounds: number;
  current_round: number;
  current_pick: number;
  draft_order: string[];
  teams: MockDraftTeam[];
  picks: MockDraftPick[];
  next_team: string | null;
  total_picks: number;
}

const DEFAULT_CONFIG: MockDraftConfig = {
  numBots: 3,
  botPickDelay: 1500, // 1.5 seconds
  totalRounds: 5,
};

// Create a mock draft within an existing league
export const createLeagueMockDraft = async (
  leagueId: string,
  userTeamName: string,
  config: Partial<MockDraftConfig> = {}
): Promise<{ mockDraftId: string; userTeamId: string; draftOrder: string[] }> => {
  const { numBots, totalRounds } = { ...DEFAULT_CONFIG, ...config };

  const { data, error } = await supabase.rpc("create_league_mock_draft", {
    p_league_id: leagueId,
    p_user_team_name: userTeamName,
    p_num_bots: numBots,
    p_total_rounds: totalRounds,
  });

  if (error) throw error;

  return {
    mockDraftId: data.mock_draft_id,
    userTeamId: data.user_team_id,
    draftOrder: data.draft_order,
  };
};

// Get mock draft state
export const getMockDraftState = async (
  mockDraftId: string
): Promise<MockDraftState> => {
  const { data, error } = await supabase.rpc("get_mock_draft_state", {
    p_mock_draft_id: mockDraftId,
  });

  if (error) throw error;
  return data;
};

// Get all mock drafts for a league
export const getLeagueMockDrafts = async (
  leagueId: string
): Promise<MockDraft[]> => {
  const { data, error } = await supabase.rpc("get_league_mock_drafts", {
    p_league_id: leagueId,
  });

  if (error) throw error;
  return data || [];
};

// Check if a team name belongs to a bot
export const isBotByName = (teamName: string): boolean => {
  return BOT_TEAM_NAMES.includes(teamName);
};

// Get the next team name from mock draft state
export const getNextTeamName = (state: MockDraftState): string | null => {
  if (state.status !== "in_progress") return null;
  return state.next_team;
};

// Check if the next team to pick is a bot
export const isNextPickBot = (state: MockDraftState): boolean => {
  const nextTeam = state.next_team;
  if (!nextTeam) return false;

  const team = state.teams.find((t) => t.name === nextTeam);
  return team?.is_bot === true;
};

// Make a pick in mock draft
export const makeMockDraftPick = async (
  mockDraftId: string,
  teamName: string,
  playerId: string
): Promise<{ success: boolean; message?: string; playerName?: string; isComplete?: boolean }> => {
  const { data, error } = await supabase.rpc("make_mock_draft_pick", {
    p_mock_draft_id: mockDraftId,
    p_team_name: teamName,
    p_player_id: playerId,
  });

  if (error) {
    return { success: false, message: error.message };
  }

  return {
    success: true,
    message: data.message,
    playerName: data.player_name,
    isComplete: data.is_complete === true || data.is_complete === "true",
  };
};

// Make a bot pick
export const makeMockDraftBotPick = async (
  mockDraftId: string,
  config: Partial<MockDraftConfig> = {}
): Promise<{ success: boolean; message?: string; playerName?: string; isComplete?: boolean }> => {
  const { botPickDelay } = { ...DEFAULT_CONFIG, ...config };

  // Wait for the delay to simulate "thinking"
  await new Promise((resolve) => setTimeout(resolve, botPickDelay));

  const { data, error } = await supabase.rpc("make_mock_draft_bot_pick", {
    p_mock_draft_id: mockDraftId,
  });

  if (error) {
    return { success: false, message: error.message };
  }

  if (!data.success) {
    return { success: false, message: data.message };
  }

  return {
    success: true,
    message: data.message,
    playerName: data.player_name,
    isComplete: data.is_complete === true || data.is_complete === "true",
  };
};

// Process all pending bot picks
export const processAllBotPicks = async (
  mockDraftId: string,
  config: Partial<MockDraftConfig> = {},
  onBotPick?: (message: string) => void
): Promise<MockDraftState> => {
  let state = await getMockDraftState(mockDraftId);

  while (state.status === "in_progress") {
    const isBotTurn = isNextPickBot(state);

    if (!isBotTurn) {
      // It's the user's turn, stop processing
      break;
    }

    const result = await makeMockDraftBotPick(mockDraftId, config);

    if (!result.success) {
      console.error("Bot pick failed:", result.message);
      break;
    }

    if (onBotPick && result.message) {
      onBotPick(result.message);
    }

    // Refresh state for next iteration
    state = await getMockDraftState(mockDraftId);

    if (result.isComplete) {
      break;
    }
  }

  return state;
};

// Get available players for mock draft (players not yet picked)
export const getMockDraftAvailablePlayers = async (
  mockDraftId: string
): Promise<Array<{ id: string; name: string; position?: string }>> => {
  // Get all players
  const { data: allPlayers, error: playersError } = await supabase
    .from("players")
    .select("id, first_name, last_name, position");

  if (playersError) throw playersError;

  // Get picked player IDs
  const { data: picks, error: picksError } = await supabase
    .from("mock_draft_picks")
    .select("player_id")
    .eq("mock_draft_id", mockDraftId);

  if (picksError) throw picksError;

  const pickedIds = new Set(picks?.map((p) => p.player_id) || []);

  // Filter out picked players
  const available = (allPlayers || [])
    .filter((p) => !pickedIds.has(p.id))
    .map((p) => ({
      id: p.id,
      name: `${p.first_name} ${p.last_name}`,
      position: p.position,
    }));

  return available;
};

// Cancel/delete a mock draft
export const cancelMockDraft = async (mockDraftId: string): Promise<void> => {
  const { error } = await supabase
    .from("mock_drafts")
    .update({ status: "cancelled" })
    .eq("id", mockDraftId);

  if (error) throw error;
};

// Get count of user's active mock drafts (in_progress status)
export const getActiveMockDraftsCount = async (): Promise<number> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("mock_drafts")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", user.id)
    .eq("status", "in_progress");

  if (error) {
    console.error("Error fetching active mock drafts count:", error);
    return 0;
  }

  return count || 0;
};
