-- Hosted Wiby template versions and a role-gated review queue.
-- Admin authority comes only from trusted app_metadata, never user-editable user_metadata.

create table public.template_registry (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,47}$'),
  name text not null check (char_length(name) between 1 and 48),
  source text not null check (source in ('wiby', 'admin')),
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'rejected')),
  current_version text not null check (current_version ~ '^\d+\.\d+\.\d+$'),
  published_version text check (published_version is null or published_version ~ '^\d+\.\d+\.\d+$'),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index template_registry_pending_updated_idx
  on public.template_registry (updated_at desc)
  where status = 'pending_review';

create table public.template_versions (
  template_id text not null references public.template_registry (id) on delete cascade,
  version text not null check (version ~ '^\d+\.\d+\.\d+$'),
  config jsonb not null check (
    jsonb_typeof(config) = 'object'
    and octet_length(config::text) <= 65536
    and config->>'id' = template_id
    and config->>'version' = version
    and config->>'schemaVersion' = '1'
  ),
  created_by uuid not null references auth.users (id) on delete cascade,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (template_id, version)
);

create index template_versions_owner_idx
  on public.template_versions (created_by, created_at desc);

create table public.template_reviews (
  id text primary key check (char_length(id) between 3 and 80),
  template_id text not null,
  version text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  note text check (note is null or char_length(note) <= 1000),
  foreign key (template_id, version)
    references public.template_versions (template_id, version) on delete cascade,
  constraint template_review_state_valid check (
    (status = 'pending' and reviewed_at is null and reviewed_by is null)
    or (status <> 'pending' and reviewed_at is not null and reviewed_by is not null)
  )
);

create index template_reviews_pending_idx
  on public.template_reviews (submitted_at)
  where status = 'pending';

create or replace function public.submit_template_for_review(p_config jsonb)
returns public.template_registry
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_id text := p_config->>'id';
  v_version text := p_config->>'version';
  v_source text := p_config->>'source';
  v_result public.template_registry;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_config is null
    or jsonb_typeof(p_config) <> 'object'
    or octet_length(p_config::text) > 65536
    or p_config->>'schemaVersion' <> '1'
    or v_id !~ '^[a-z0-9][a-z0-9-]{1,47}$'
    or v_version !~ '^\d+\.\d+\.\d+$'
    or char_length(coalesce(p_config->>'name', '')) not between 1 and 48
    or v_source not in ('wiby', 'admin') then
    raise exception 'Template metadata is invalid';
  end if;
  if exists (
    select 1 from public.template_versions v
    where v.template_id = v_id and v.version = v_version and v.is_published
  ) then
    raise exception 'Published versions are immutable; submit a new version';
  end if;

  insert into public.template_registry (id, name, source, status, current_version, created_by)
  values (v_id, p_config->>'name', v_source, 'pending_review', v_version, v_user_id)
  on conflict (id) do update
    set name = excluded.name,
        source = excluded.source,
        status = 'pending_review',
        current_version = excluded.current_version,
        updated_at = now()
    where public.template_registry.created_by = v_user_id;

  select * into v_result
  from public.template_registry
  where id = v_id and created_by = v_user_id;
  if not found then
    raise exception 'Template ID is already owned by another account';
  end if;

  insert into public.template_versions (template_id, version, config, created_by)
  values (v_id, v_version, p_config, v_user_id)
  on conflict (template_id, version) do nothing;

  if not exists (
    select 1 from public.template_versions v
    where v.template_id = v_id and v.version = v_version
      and v.created_by = v_user_id and v.config = p_config
  ) then
    raise exception 'Template version already exists with different content';
  end if;

  insert into public.template_reviews (id, template_id, version)
  select 'rev-' || gen_random_uuid()::text, v_id, v_version
  where not exists (
    select 1 from public.template_reviews r
    where r.template_id = v_id and r.version = v_version and r.status = 'pending'
  );

  return v_result;
end;
$$;

create or replace function public.review_template(
  p_template_id text,
  p_version text,
  p_decision text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null
    or (select auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'Administrator access required';
  end if;
  if p_decision not in ('approved', 'rejected')
    or char_length(coalesce(p_note, '')) > 1000 then
    raise exception 'Review decision is invalid';
  end if;
  if not exists (
    select 1 from public.template_registry r
    where r.id = p_template_id and r.current_version = p_version
  ) then
    raise exception 'Template version is no longer the current review';
  end if;

  update public.template_reviews
  set status = p_decision,
      reviewed_at = now(),
      reviewed_by = v_user_id,
      note = nullif(p_note, '')
  where template_id = p_template_id
    and version = p_version
    and status = 'pending';

  if not found then
    raise exception 'Pending template review not found';
  end if;

  update public.template_versions
  set is_published = (p_decision = 'approved')
  where template_id = p_template_id and version = p_version;

  update public.template_registry
  set status = p_decision,
      published_version = case when p_decision = 'approved' then p_version else published_version end,
      updated_at = now()
  where id = p_template_id and current_version = p_version;
end;
$$;

alter table public.template_registry enable row level security;
alter table public.template_versions enable row level security;
alter table public.template_reviews enable row level security;

create policy template_registry_read_published_or_owner_or_admin
on public.template_registry for select to anon, authenticated
using (
  published_version is not null
  or (select auth.uid()) = created_by
  or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

create policy template_versions_read_published_or_owner_or_admin
on public.template_versions for select to anon, authenticated
using (
  is_published
  or (select auth.uid()) = created_by
  or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

create policy template_reviews_read_owner_or_admin
on public.template_reviews for select to authenticated
using (
  exists (
    select 1 from public.template_registry r
    where r.id = template_reviews.template_id and r.created_by = (select auth.uid())
  )
  or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

revoke all on public.template_registry, public.template_versions, public.template_reviews from anon, authenticated;
grant select on public.template_registry, public.template_versions to anon, authenticated;
grant select on public.template_reviews to authenticated;
revoke all on function public.submit_template_for_review(jsonb) from public, anon;
revoke all on function public.review_template(text, text, text, text) from public, anon;
grant execute on function public.submit_template_for_review(jsonb) to authenticated;
grant execute on function public.review_template(text, text, text, text) to authenticated;
