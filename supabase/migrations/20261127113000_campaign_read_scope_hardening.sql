-- Keep full campaign rows private to their owner. Anonymous poster readers
-- use the explicitly projected public_campaigns view instead.
drop policy if exists "campaigns_select_owner_or_published" on public.campaigns;
drop policy if exists "campaigns_select_own" on public.campaigns;

create policy "campaigns_select_own" on public.campaigns
for select to authenticated
using ((select auth.uid()) = owner_id);

revoke select on public.campaigns from anon;
revoke select (id, slug, title, purpose, status, theme, template, blocks,
               starts_at, expires_at, expired_message, expired_contact)
  on public.campaigns from anon;

-- This owner-scoped view exposes only poster fields and published rows.
alter view public.public_campaigns set (security_invoker = false);
