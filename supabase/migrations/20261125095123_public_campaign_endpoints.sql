-- Put public campaign writes behind a short-window IP rate limit and retain
-- counters in the database without allowing browser clients to edit metrics.

drop policy if exists "campaign_responses_insert_live_campaign" on public.campaign_responses;
revoke insert on public.campaign_responses from anon, authenticated;

drop policy if exists "campaign_responses_delete_campaign_owner" on public.campaign_responses;
create policy "campaign_responses_delete_campaign_owner" on public.campaign_responses
for delete to authenticated
using (exists (
  select 1 from public.campaigns c
  where c.id = campaign_responses.campaign_id and c.owner_id = (select auth.uid())
));
grant delete on public.campaign_responses to authenticated;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table private.public_form_rate_limits (
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  hit_count integer not null default 0 check (hit_count >= 1),
  primary key (ip_hash, window_start)
);
alter table private.public_form_rate_limits enable row level security;
revoke all on private.public_form_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on private.public_form_rate_limits to service_role;

create or replace function public.consume_public_form_rate_limit(p_ip_hash text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hits integer;
begin
  if p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid rate-limit key';
  end if;

  insert into private.public_form_rate_limits (ip_hash, window_start, hit_count)
  values (p_ip_hash, date_trunc('minute', clock_timestamp()), 1)
  on conflict (ip_hash, window_start)
  do update set hit_count = private.public_form_rate_limits.hit_count + 1
  returning hit_count into v_hits;

  delete from private.public_form_rate_limits
  where window_start < clock_timestamp() - interval '10 minutes';

  return v_hits;
end;
$$;
revoke all on function public.consume_public_form_rate_limit(text) from public, anon, authenticated;
grant execute on function public.consume_public_form_rate_limit(text) to service_role;

create or replace function public.record_public_campaign_metric(
  p_campaign_id text,
  p_metric text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day text := to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD');
begin
  if p_metric not in ('view', 'click', 'share') then
    return false;
  end if;

  update public.campaigns c
  set views = c.views + case when p_metric = 'view' then 1 else 0 end,
      cta_clicks = c.cta_clicks + case when p_metric = 'click' then 1 else 0 end,
      shares = c.shares + case when p_metric = 'share' then 1 else 0 end,
      daily = case when p_metric = 'share' then c.daily else jsonb_set(
        jsonb_set(
          coalesce(c.daily, '{}'::jsonb),
          array[v_day],
          coalesce(c.daily -> v_day, '{"views":0,"clicks":0,"responses":0}'::jsonb),
          true
        ),
        array[v_day, case when p_metric = 'view' then 'views' else 'clicks' end],
        to_jsonb(coalesce((c.daily -> v_day ->> case when p_metric = 'view' then 'views' else 'clicks' end)::integer, 0) + 1),
        true
      ) end
  where c.id = p_campaign_id
    and c.status = 'published'
    and c.starts_at <= now()
    and c.expires_at > now();

  return found;
end;
$$;
revoke all on function public.record_public_campaign_metric(text, text) from public, anon, authenticated;
grant execute on function public.record_public_campaign_metric(text, text) to service_role;

-- Metric updates should not reorder the owner's campaigns or look like content edits.
create or replace function public.set_campaign_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(new.id, new.owner_id, new.slug, new.title, new.purpose, new.status, new.visibility,
         new.theme, new.template, new.blocks, new.created_at, new.starts_at, new.expires_at,
         new.duration_days, new.expired_message, new.expired_contact, new.brief)
     is distinct from
     row(old.id, old.owner_id, old.slug, old.title, old.purpose, old.status, old.visibility,
         old.theme, old.template, old.blocks, old.created_at, old.starts_at, old.expires_at,
         old.duration_days, old.expired_message, old.expired_contact, old.brief) then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

drop trigger if exists campaigns_set_updated_at on public.campaigns;
create trigger campaigns_set_updated_at
before update on public.campaigns
for each row execute function public.set_campaign_updated_at();
