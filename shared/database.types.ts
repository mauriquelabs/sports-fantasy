/**
 * Database types for Supabase
 * These types are generated from your Supabase schema
 * You can regenerate these using: npx supabase gen types typescript --project-id <your-project-id>
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      leagues: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          commissioner_id: string;
          max_teams: number;
          current_teams: number;
          draft_date: string | null;
          draft_status: "pending" | "in_progress" | "completed";
          invite_code: string | null;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          commissioner_id: string;
          max_teams?: number;
          current_teams?: number;
          draft_date?: string | null;
          draft_status?: "pending" | "in_progress" | "completed";
          invite_code?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          commissioner_id?: string;
          max_teams?: number;
          current_teams?: number;
          draft_date?: string | null;
          draft_status?: "pending" | "in_progress" | "completed";
          invite_code?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      teams: {
        Row: {
          id: string;
          league_id: string;
          owner_id: string;
          name: string;
          logo_url: string | null;
          draft_position: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          owner_id: string;
          name: string;
          logo_url?: string | null;
          draft_position?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          owner_id?: string;
          name?: string;
          logo_url?: string | null;
          draft_position?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      players: {
        Row: {
          id: string;
          external_id: string | null;
          first_name: string;
          last_name: string;
          position: "QB" | "RB" | "WR" | "TE" | "K" | "DEF";
          team: string | null;
          jersey_number: number | null;
          stats: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          external_id?: string | null;
          first_name: string;
          last_name: string;
          position: "QB" | "RB" | "WR" | "TE" | "K" | "DEF";
          team?: string | null;
          jersey_number?: number | null;
          stats?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          external_id?: string | null;
          first_name?: string;
          last_name?: string;
          position?: "QB" | "RB" | "WR" | "TE" | "K" | "DEF";
          team?: string | null;
          jersey_number?: number | null;
          stats?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      rosters: {
        Row: {
          id: string;
          team_id: string;
          player_id: string;
          position: string;
          is_starter: boolean;
          acquired_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          player_id: string;
          position: string;
          is_starter?: boolean;
          acquired_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          player_id?: string;
          position?: string;
          is_starter?: boolean;
          acquired_at?: string;
        };
      };
      drafts: {
        Row: {
          id: string;
          league_id: string;
          status: "pending" | "in_progress" | "completed" | "cancelled";
          current_pick: number;
          total_picks: number;
          pick_time_limit: number | null;
          draft_order: Json | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          status?: "pending" | "in_progress" | "completed" | "cancelled";
          current_pick?: number;
          total_picks: number;
          pick_time_limit?: number | null;
          draft_order?: Json | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          status?: "pending" | "in_progress" | "completed" | "cancelled";
          current_pick?: number;
          total_picks?: number;
          pick_time_limit?: number | null;
          draft_order?: Json | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      draft_picks: {
        Row: {
          id: string;
          draft_id: string;
          team_id: string;
          player_id: string;
          pick_number: number;
          made_at: string;
        };
        Insert: {
          id?: string;
          draft_id: string;
          team_id: string;
          player_id: string;
          pick_number: number;
          made_at?: string;
        };
        Update: {
          id?: string;
          draft_id?: string;
          team_id?: string;
          player_id?: string;
          pick_number?: number;
          made_at?: string;
        };
      };
      trades: {
        Row: {
          id: string;
          league_id: string;
          team1_id: string;
          team2_id: string;
          status: "pending" | "accepted" | "rejected" | "cancelled";
          team1_players: string[];
          team2_players: string[];
          proposed_by: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          team1_id: string;
          team2_id: string;
          status?: "pending" | "accepted" | "rejected" | "cancelled";
          team1_players?: string[];
          team2_players?: string[];
          proposed_by?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          team1_id?: string;
          team2_id?: string;
          status?: "pending" | "accepted" | "rejected" | "cancelled";
          team1_players?: string[];
          team2_players?: string[];
          proposed_by?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      scores: {
        Row: {
          id: string;
          team_id: string;
          league_id: string;
          week: number | null;
          season: number | null;
          points: number;
          breakdown: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          league_id: string;
          week?: number | null;
          season?: number | null;
          points?: number;
          breakdown?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          league_id?: string;
          week?: number | null;
          season?: number | null;
          points?: number;
          breakdown?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
