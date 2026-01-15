# Supabase Setup Guide

This guide will help you set up Supabase for the Sports Fantasy platform.

## 🚀 Quick Start

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: Sports Fantasy (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait 2-3 minutes for the project to be created

### 2. Get Your Supabase Credentials

Once your project is created:

1. Go to **Settings** → **API** (in the left sidebar)
2. You'll see a section called **Project API keys**
3. You'll need these values:
   - **Project URL** (SUPABASE_URL) - Found at the top of the page
   - **anon/public key** (SUPABASE_ANON_KEY) - The `anon` `public` key (safe for client-side)
   - **service_role key** (SUPABASE_SERVICE_ROLE_KEY) - The `service_role` `secret` key ⚠️ **Keep this secret!**

**Where to find the service_role key:**

- Scroll down in the API settings page
- Look for the **service_role** key (it's labeled as `secret`)
- Click the **eye icon** or **reveal** button to show it
- Copy it immediately (it's long, starts with `eyJ...`)

**⚠️ IMPORTANT:** The service_role key:

- **Bypasses Row Level Security (RLS)** - has full database access
- **Should NEVER be used in client-side code** (React components)
- **Should ONLY be used server-side** (Express API routes)
- **Should NEVER be committed to git** (keep it in `.env` only)
- If exposed, an attacker could access/modify all your data

### 3. Install Dependencies

Run this command in your project root:

```bash
npm install @supabase/supabase-js
```

### 4. Set Up Environment Variables

Create a `.env` file in the root directory (if it doesn't exist):

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Client-side (these will be prefixed with VITE_)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important:**

- Never commit `.env` to git (it should be in `.gitignore`)
- The `SUPABASE_SERVICE_ROLE_KEY` should **ONLY** be used server-side
- The `SUPABASE_ANON_KEY` is safe to use client-side (RLS protects your data)

### 5. Run Database Migrations

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/migrations/001_initial_schema.sql`
4. Copy the entire SQL content
5. Paste it into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)

This will create:

- All necessary tables (profiles, leagues, teams, players, etc.)
- Indexes for performance
- Row Level Security (RLS) policies
- Triggers for auto-updating timestamps
- Function to auto-create profiles on signup

### 6. Verify Setup

After running the migration, check:

1. **Tables**: Go to **Table Editor** - you should see all tables created
2. **Policies**: Go to **Authentication** → **Policies** - RLS policies should be active
3. **Functions**: Go to **Database** → **Functions** - you should see `handle_new_user` and `update_updated_at_column`

## 📁 Project Structure

After setup, your project will have:

```
sports-fantasy/
├── client/
│   └── lib/
│       └── supabase.ts          # Client-side Supabase client
├── server/
│   └── lib/
│       └── supabase.ts          # Server-side Supabase clients
├── shared/
│   └── database.types.ts         # TypeScript types for database
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql  # Initial database schema
```

## 🔐 Authentication Setup

Supabase provides built-in authentication! You can use:

- Email/Password (default)
- OAuth providers (Google, GitHub, etc.)
- Magic links
- Phone authentication

The schema automatically creates a profile when a user signs up via the `handle_new_user` trigger.

## 🛡️ Row Level Security (RLS)

All tables have RLS enabled with policies that:

- Allow users to read public data (players, leagues, etc.)
- Restrict writes to owners (team owners can only edit their teams)
- Protect sensitive operations (only commissioners can manage drafts)

## 📊 Database Schema Overview

### Core Tables

- **profiles**: User profiles (extends Supabase auth.users)
- **leagues**: Fantasy leagues
- **teams**: Teams within leagues
- **players**: Player database
- **rosters**: Players on teams
- **drafts**: Draft sessions
- **draft_picks**: Individual draft selections
- **trades**: Trade proposals
- **scores**: Team scores and statistics

## 🔄 Using Supabase in Your Code

### Client-Side (React Components)

**Use the regular client** (uses anon key, respects RLS):

```typescript
import { supabase } from "@/lib/supabase";

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: "user@example.com",
  password: "password123",
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password: "password123",
});

// Query data (respects RLS policies)
const { data: leagues, error } = await supabase
  .from("leagues")
  .select("*")
  .eq("commissioner_id", userId);
```

### Server-Side (Express API)

**Use the admin client** (uses service_role key, bypasses RLS) **ONLY when needed**:

```typescript
import { supabaseAdmin } from "@/server/lib/supabase";

// Admin operations (bypasses RLS) - Use sparingly!
// Only use when you need to:
// - Access data as admin (not as a specific user)
// - Perform operations that RLS would block
// - Run background jobs or migrations
const { data, error } = await supabaseAdmin.from("leagues").select("*");
```

**When to use each:**

| Use Case                           | Which Client                   | Why                                  |
| ---------------------------------- | ------------------------------ | ------------------------------------ |
| User authentication (signup/login) | `supabase` (anon)              | Users authenticate themselves        |
| User queries their own data        | `supabase` (anon)              | RLS ensures they only see their data |
| User creates/updates their leagues | `supabase` (anon)              | RLS policies allow this              |
| Admin needs to see all leagues     | `supabaseAdmin` (service_role) | Bypasses RLS for admin operations    |
| Background job processing          | `supabaseAdmin` (service_role) | No user context, needs admin access  |
| Migration scripts                  | `supabaseAdmin` (service_role) | Needs full database access           |

**Best Practice:** Use the regular `supabase` client (anon key) whenever possible. Only use `supabaseAdmin` (service_role) when you absolutely need to bypass RLS.

## 🧪 Testing Your Setup

1. **Test Authentication**:

   - Try signing up a new user
   - Check that a profile is automatically created

2. **Test RLS**:

   - Create a league as one user
   - Try to update it as another user (should fail)

3. **Test Queries**:
   - Query leagues, teams, players
   - Verify data is returned correctly

## 🚨 Common Issues

### "relation does not exist"

- Make sure you ran the migration SQL
- Check that you're connected to the correct database

### "new row violates row-level security policy"

- This is expected! RLS is working
- Make sure you're authenticated
- Check that your user has the right permissions

### "JWT secret not found"

- This is a warning, not an error
- Supabase handles JWT automatically
- You can ignore this for now

## 📚 Next Steps

1. ✅ Database setup (you're here!)
2. ⏭️ Implement authentication endpoints
3. ⏭️ Connect Login/SignUp forms
4. ⏭️ Create protected routes
5. ⏭️ Build league management features

## 🔗 Useful Links

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase TypeScript Types](https://supabase.com/docs/reference/javascript/typescript-support)

---

**Need Help?** Check the Supabase dashboard for logs and error messages.
