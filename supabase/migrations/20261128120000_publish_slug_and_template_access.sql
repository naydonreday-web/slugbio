-- Let signed-in campaign owners check global slug availability without
-- exposing other owners' campaign rows through the campaigns table.
create or replace function public.is_campaign_slug_available(p_slug text, p_campaign_id text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.campaigns c
    where c.id = p_campaign_id
      and c.owner_id = auth.uid()
  ) then
    raise exception 'Campaign not found or not owned by the current user.'
      using errcode = '42501';
  end if;

  return not exists (
    select 1
    from public.campaigns c
    where c.slug = p_slug
      and c.id <> p_campaign_id
  );
end;
$$;

revoke all on function public.is_campaign_slug_available(text, text) from public, anon;
grant execute on function public.is_campaign_slug_available(text, text) to authenticated;

-- Published campaigns are accessible by anyone with their link, even when
-- visibility is private (private means no public discovery listing). Let the
-- poster load the exact template version it references.
create or replace function public.is_template_version_referenced_by_published_campaign(
  p_template_id text,
  p_version text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.campaigns c
    where c.status = 'published'
      and c.template ->> 'id' = p_template_id
      and c.template ->> 'version' = p_version
  );
$$;

revoke all on function public.is_template_version_referenced_by_published_campaign(text, text)
  from public;
grant execute on function public.is_template_version_referenced_by_published_campaign(text, text)
  to anon, authenticated;

drop index if exists public.campaigns_public_template_ref_idx;
create index campaigns_public_template_ref_idx
  on public.campaigns ((template ->> 'id'), (template ->> 'version'))
  where status = 'published' and template is not null;

drop policy if exists template_versions_read_published_or_owner_or_admin on public.template_versions;
create policy template_versions_read_published_or_owner_or_admin
on public.template_versions for select to anon, authenticated
using (
  is_published
  or (select auth.uid()) = created_by
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  or public.is_template_version_referenced_by_published_campaign(template_id, version)
);
