-- Slagby production baseline: owner-managed campaigns and link-shared posters.
-- Public campaign reads are limited to published rows. Form responses remain private
-- to the campaign owner; the public can only submit bounded JSON while a campaign is live.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 60),
  phone text check (phone is null or phone ~ '^\+266[256][0-9]{7}$'),
  usage jsonb not null default '[]'::jsonb check (jsonb_typeof(usage) = 'array'),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id text primary key check (char_length(id) between 3 and 80),
  owner_id uuid not null references auth.users (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 48),
  title text not null check (char_length(title) between 1 and 160),
  purpose text not null check (purpose in ('event','product','service','announcement','offer','food','other')),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  visibility text not null default 'private' check (visibility in ('private','public')),
  theme jsonb not null check (jsonb_typeof(theme) = 'object'),
  template jsonb check (template is null or jsonb_typeof(template) = 'object'),
  blocks jsonb not null default '[]'::jsonb check (jsonb_typeof(blocks) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  starts_at timestamptz,
  expires_at timestamptz,
  duration_days integer check (duration_days is null or duration_days in (7,14,30,90)),
  expired_message text check (expired_message is null or char_length(expired_message) <= 500),
  expired_contact text check (expired_contact is null or char_length(expired_contact) <= 32),
  views bigint not null default 0 check (views >= 0),
  cta_clicks bigint not null default 0 check (cta_clicks >= 0),
  shares bigint not null default 0 check (shares >= 0),
  daily jsonb not null default '{}'::jsonb check (jsonb_typeof(daily) = 'object'),
  brief jsonb check (brief is null or jsonb_typeof(brief) = 'object'),
  constraint campaign_dates_valid check (expires_at is null or starts_at is not null and expires_at > starts_at)
);

create index if not exists campaigns_owner_updated_idx on public.campaigns (owner_id, updated_at desc);
create index if not exists campaigns_published_slug_idx on public.campaigns (slug) where status = 'published';

create table if not exists public.campaign_responses (
  id text primary key check (char_length(id) between 3 and 80),
  campaign_id text not null references public.campaigns (id) on delete cascade,
  submitted_at timestamptz not null default now(),
  response_data jsonb not null check (
    jsonb_typeof(response_data) = 'object'
    and octet_length(response_data::text) <= 10000
  )
);

create index if not exists campaign_responses_campaign_submitted_idx
  on public.campaign_responses (campaign_id, submitted_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists campaigns_set_updated_at on public.campaigns;
create trigger campaigns_set_updated_at
before update on public.campaigns
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_responses enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert to authenticated with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "campaigns_select_owner_or_published" on public.campaigns;
create policy "campaigns_select_owner_or_published" on public.campaigns
for select to anon, authenticated
using ((select auth.uid()) = owner_id or status = 'published');

drop policy if exists "campaigns_insert_own" on public.campaigns;
create policy "campaigns_insert_own" on public.campaigns
for insert to authenticated with check ((select auth.uid()) = owner_id);

drop policy if exists "campaigns_update_own" on public.campaigns;
create policy "campaigns_update_own" on public.campaigns
for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "campaigns_delete_own" on public.campaigns;
create policy "campaigns_delete_own" on public.campaigns
for delete to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists "campaign_responses_select_campaign_owner" on public.campaign_responses;
create policy "campaign_responses_select_campaign_owner" on public.campaign_responses
for select to authenticated
using (exists (
  select 1 from public.campaigns c
  where c.id = campaign_responses.campaign_id and c.owner_id = (select auth.uid())
));

drop policy if exists "campaign_responses_insert_live_campaign" on public.campaign_responses;
create policy "campaign_responses_insert_live_campaign" on public.campaign_responses
for insert to anon, authenticated
with check (exists (
  select 1 from public.campaigns c
  where c.id = campaign_responses.campaign_id
    and c.status = 'published'
    and c.starts_at <= now()
    and c.expires_at > now()
));

revoke all on public.profiles, public.campaigns, public.campaign_responses from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.campaigns to authenticated;
grant select (id, slug, title, purpose, status, theme, template, blocks,
              starts_at, expires_at, expired_message, expired_contact)
  on public.campaigns to anon;
grant select on public.campaign_responses to authenticated;
grant insert on public.campaign_responses to anon, authenticated;

-- URL readers see only the campaign fields needed to render a poster.
create or replace view public.public_campaigns
with (security_invoker = true)
as
select id, slug, title, purpose, status, theme, template, blocks,
       starts_at, expires_at, expired_message, expired_contact
from public.campaigns
where status = 'published';

grant select on public.public_campaigns to anon, authenticated;
