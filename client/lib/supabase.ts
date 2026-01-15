import { createClient } from "@supabase/supabase-js";

// Supabase client for client-side operations
// Uses anon key and respects Row Level Security (RLS) policies
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);
