-- Optional: Cleanup old draft tables if you're only using the new standalone system
-- WARNING: This will delete all data in these tables!
-- Only run this if you're sure you don't need the old league-based draft system

-- Uncomment the lines below if you want to remove the old draft system:

-- DROP TABLE IF EXISTS public.draft_picks CASCADE;
-- DROP TABLE IF EXISTS public.drafts CASCADE;

-- Note: We keep teams, players, leagues, etc. as they may be used elsewhere
-- If you want to keep the old system, just don't run this migration
