# Sports Fantasy - YourLeague

## Overview

A modern fantasy sports platform where users can create private leagues, draft real players, and compete with friends. The application follows a full-stack architecture with a React SPA frontend and Express API backend, using Supabase as the backend-as-a-service for authentication, database, and real-time features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: React Router 6 in SPA mode - routes defined in `client/App.tsx`, page components in `client/pages/`
- **State Management**: TanStack Query for server state, React Context for auth state (`client/contexts/AuthContext.tsx`)
- **UI Components**: Radix UI primitives with TailwindCSS 3 styling, component library in `client/components/ui/`
- **Styling**: TailwindCSS with CSS variables for theming (defined in `client/global.css`)

### Backend Architecture
- **Server**: Express.js integrated with Vite dev server during development
- **API Pattern**: RESTful endpoints under `/api/` prefix, handlers in `server/routes/`
- **Design Principle**: Minimal server-side logic - only create endpoints when strictly necessary (e.g., for secret key handling, server-only operations)
- **Production Build**: Compiled to ES modules, serves static SPA files with fallback routing

### Authentication & Authorization
- **Provider**: Supabase Auth with email/password authentication
- **Client-side**: Uses `@supabase/supabase-js` with anon key, respects Row Level Security (RLS)
- **Server-side**: Service role key for admin operations (bypasses RLS) - stored securely in environment variables
- **Protected Routes**: Implemented via `ProtectedRoute` component wrapper

### Data Layer
- **Database**: Supabase (PostgreSQL) with Row Level Security policies
- **Schema**: Defined in `shared/database.types.ts` - includes profiles, leagues, teams, players, draft picks
- **Real-time**: Supabase real-time subscriptions for live draft updates

### Key Features Implementation
- **Leagues**: Create/join leagues with invite codes, commissioner management
- **Drafting**: Real-time draft board with turn-based picking, snake draft order
- **Mock Drafts**: Practice drafts with configurable bot opponents
- **Player Management**: Virtualized player tables for performance with large datasets

### Project Structure
```
client/                   # React SPA frontend
├── pages/                # Route components (Index, Dashboard, Draft, League, etc.)
├── components/           # Reusable components including ui/ library
├── contexts/             # React contexts (AuthContext)
├── hooks/                # Custom hooks (use-toast, use-mobile)
├── lib/                  # Utilities and API clients (supabase, leagues, draft, mockDraft)
└── global.css            # TailwindCSS theming

server/                   # Express API backend
├── index.ts              # Server setup and middleware
├── routes/               # API route handlers
└── lib/                  # Server utilities (supabase admin client)

shared/                   # Shared types between client & server
├── api.ts                # API response interfaces
└── database.types.ts     # Supabase database types
```

## External Dependencies

### Supabase (Primary Backend Service)
- **Purpose**: Authentication, PostgreSQL database, real-time subscriptions
- **Configuration**: Requires `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (client), `SUPABASE_SERVICE_ROLE_KEY` (server)
- **Setup Guide**: See `SUPABASE_SETUP.md` for detailed instructions

### Environment Variables Required
- `VITE_SUPABASE_URL` - Supabase project URL (client-side)
- `VITE_SUPABASE_ANON_KEY` - Supabase anon/public key (client-side)
- `SUPABASE_URL` - Supabase project URL (server-side)
- `SUPABASE_ANON_KEY` - Supabase anon key (server-side)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only, never expose to client)

### UI Libraries
- Radix UI - Accessible component primitives
- TailwindCSS 3 - Utility-first CSS framework
- Lucide React - Icon library
- TanStack Virtual - Virtualized lists for performance

### Build & Development
- Vite - Build tool and dev server
- Vitest - Testing framework
- TypeScript - Type safety across the codebase