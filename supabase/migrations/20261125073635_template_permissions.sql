-- Keep template writes behind RLS. RPCs are SECURITY INVOKER; authenticated users
-- can submit only their own pending templates, while trusted app_metadata admins review.

create index template_registry_created_by_idx on public.template_registry (created_by);
create index template_reviews_reviewed_by_idx on public.template_reviews (reviewed_by);
create index template_reviews_template_version_idx on public.template_reviews (template_id, version);

drop policy template_registry_read_published_or_owner_or_admin on public.template_registry;
drop policy template_versions_read_published_or_owner_or_admin on public.template_versions;
drop policy template_reviews_read_owner_or_admin on public.template_reviews;

create policy template_registry_read_published_or_owner_or_admin
on public.template_registry for select to anon, authenticated
using (
  published_version is not null
  or (select auth.uid()) = created_by
  or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

create policy template_registry_insert_own_pending
on public.template_registry for insert to authenticated
with check (
  (select auth.uid()) = created_by
  and status = 'pending_review'
  and published_version is null
);

create policy template_registry_update_admin
on public.template_registry for update to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy template_versions_read_published_or_owner_or_admin
on public.template_versions for select to anon, authenticated
using (
  is_published
  or (select auth.uid()) = created_by
  or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

create policy template_versions_insert_own_unpublished
on public.template_versions for insert to authenticated
with check (
  (select auth.uid()) = created_by
  and not is_published
  and exists (
    select 1 from public.template_registry r
    where r.id = template_versions.template_id and r.created_by = (select auth.uid())
  )
);

create policy template_versions_update_admin
on public.template_versions for update to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy template_reviews_read_owner_or_admin
on public.template_reviews for select to authenticated
using (
  exists (
    select 1 from public.template_registry r
    where r.id = template_reviews.template_id and r.created_by = (select auth.uid())
  )
  or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

create policy template_reviews_insert_own_pending
on public.template_reviews for insert to authenticated
with check (
  status = 'pending'
  and reviewed_at is null
  and reviewed_by is null
  and exists (
    select 1 from public.template_registry r
    where r.id = template_reviews.template_id and r.created_by = (select auth.uid())
  )
);

create policy template_reviews_update_admin
on public.template_reviews for update to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check (
  (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  and status in ('approved', 'rejected')
  and reviewed_at is not null
  and reviewed_by = (select auth.uid())
);

grant select on public.template_registry, public.template_versions to anon, authenticated;
grant insert, update on public.template_registry, public.template_versions, public.template_reviews to authenticated;
grant insert on public.template_reviews to authenticated;

create or replace function public.submit_template_for_review(p_config jsonb)
returns public.template_registry
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_id text;
  v_version text;
  v_source text;
  v_result public.template_registry;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_config is null
    or jsonb_typeof(p_config) <> 'object'
    or octet_length(p_config::text) > 65536
    or p_config->>'schemaVersion' <> '1'
    or coalesce(p_config->>'id', '') !~ '^[a-z0-9][a-z0-9-]{1,47}$'
    or coalesce(p_config->>'version', '') !~ '^\d+\.\d+\.\d+$'
    or char_length(coalesce(p_config->>'name', '')) not between 1 and 48
    or coalesce(p_config->>'source', '') not in ('wiby', 'admin') then
    raise exception 'Template metadata is invalid';
  end if;

  v_id := p_config->>'id';
  v_version := p_config->>'version';
  v_source := p_config->>'source';

  select * into v_result
  from public.template_registry
  where id = v_id and created_by = v_user_id;
  if found then
    if v_result.status = 'pending_review'
      and v_result.current_version = v_version
      and exists (
        select 1 from public.template_versions v
        join public.template_reviews r on r.template_id = v.template_id and r.version = v.version
        where v.template_id = v_id and v.version = v_version
          and v.created_by = v_user_id and v.config = p_config and r.status = 'pending'
      ) then
      return v_result;
    end if;
    raise exception 'Template ID already exists; create a new template version';
  end if;

  insert into public.template_registry (id, name, source, status, current_version, created_by)
  values (v_id, p_config->>'name', v_source, 'pending_review', v_version, v_user_id)
  returning * into v_result;

  insert into public.template_versions (template_id, version, config, created_by)
  values (v_id, v_version, p_config, v_user_id);

  insert into public.template_reviews (id, template_id, version)
  values ('rev-' || gen_random_uuid()::text, v_id, v_version);

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
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null
    or (select auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'Administrator access required';
  end if;
  if p_decision is null
    or p_decision not in ('approved', 'rejected')
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

revoke all on function public.submit_template_for_review(jsonb) from public, anon;
revoke all on function public.review_template(text, text, text, text) from public, anon;
grant execute on function public.submit_template_for_review(jsonb) to authenticated;
grant execute on function public.review_template(text, text, text, text) to authenticated;
