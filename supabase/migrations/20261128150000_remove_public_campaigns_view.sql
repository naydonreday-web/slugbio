-- Public campaign posters are served by the rate-limited campaign-public
-- Edge Function, which selects only the fields needed by the public page.
-- Remove the owner-context view that bypassed caller RLS.
drop view if exists public.public_campaigns;
