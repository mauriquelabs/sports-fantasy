import { supabase } from "./supabase";

export interface League {
  id: string;
  name: string;
  description: string | null;
  commissioner_id: string;
  max_teams: number;
  current_teams: number;
  draft_date: string | null;
  draft_status: "pending" | "in_progress" | "completed";
  invite_code: string | null;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Create a new league
export const createLeague = async (
  name: string,
  description?: string,
  maxTeams: number = 12
): Promise<League> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("leagues")
    .insert({
      name,
      description: description || null,
      commissioner_id: user.id,
      max_teams: maxTeams,
      current_teams: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Get user's leagues (as commissioner or member)
export const getUserLeagues = async (): Promise<League[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get leagues where user is commissioner or has a team
  const { data: teams } = await supabase
    .from("teams")
    .select("league_id")
    .eq("owner_id", user.id);

  const leagueIds = teams?.map((t) => t.league_id) || [];

  const { data, error } = await supabase
    .from("leagues")
    .select("*")
    .or(`commissioner_id.eq.${user.id},id.in.(${leagueIds.join(",")})`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

// Get league by ID
export const getLeague = async (leagueId: string): Promise<League> => {
  const { data, error } = await supabase
    .from("leagues")
    .select("*")
    .eq("id", leagueId)
    .single();

  if (error) throw error;
  return data;
};

// Update league
export const updateLeague = async (
  leagueId: string,
  updates: Partial<League>
): Promise<League> => {
  const { data, error } = await supabase
    .from("leagues")
    .update(updates)
    .eq("id", leagueId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete league
export const deleteLeague = async (leagueId: string): Promise<void> => {
  const { error } = await supabase
    .from("leagues")
    .delete()
    .eq("id", leagueId);

  if (error) throw error;
};

// Generate/regenerate invite code for a league
export const generateInviteCode = async (leagueId: string): Promise<string> => {
  const { data, error } = await supabase.rpc("generate_league_invite_code", {
    p_league_id: leagueId,
  });

  if (error) throw error;
  return data.invite_code;
};

// Join a league by invite code
export const joinLeagueByCode = async (
  inviteCode: string,
  teamName: string
): Promise<{ league_id: string; team_id: string }> => {
  const { data, error } = await supabase.rpc("join_league_by_code", {
    p_invite_code: inviteCode.toUpperCase(),
    p_team_name: teamName,
  });

  if (error) throw error;
  return {
    league_id: data.league_id,
    team_id: data.team_id,
  };
};

// Get league by invite code
export const getLeagueByInviteCode = async (inviteCode: string): Promise<League> => {
  const { data, error } = await supabase
    .from("leagues")
    .select("*")
    .eq("invite_code", inviteCode.toUpperCase())
    .single();

  if (error) throw error;
  return data;
};
