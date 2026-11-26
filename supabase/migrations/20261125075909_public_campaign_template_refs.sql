-- Allow a public campaign to render the exact reviewed template version it references.
-- Draft versions stay private unless an already-published campaign depends on them.
create index if not exists campaigns_public_template_ref_idx
on public.campaigns ((template ->> 'id'), (template ->> 'version'))
where status = 'published' and visibility = 'public' and template is not null;

drop policy if exists template_versions_read_published_or_owner_or_admin on public.template_versions;
create policy template_versions_read_published_or_owner_or_admin
on public.template_versions for select to anon, authenticated
using (
  is_published
  or (select auth.uid()) = created_by
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  or exists (
    select 1
    from public.campaigns c
    where c.status = 'published'
      and c.visibility = 'public'
      and c.template ->> 'id' = template_versions.template_id
      and c.template ->> 'version' = template_versions.version
  )
);
