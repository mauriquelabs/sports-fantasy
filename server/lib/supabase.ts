import { createClient } from "@supabase/supabase-js";

// Supabase client for server-side operations
// Uses service role key for admin operations (server-side only)
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Supabase client for user operations (uses anon key)
// This can be used for operations that should respect RLS policies
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
    },
  }
);
