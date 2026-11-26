-- Cache the trusted JWT claim once per query in RLS policy expressions.

drop policy template_registry_read_published_or_owner_or_admin on public.template_registry;
create policy template_registry_read_published_or_owner_or_admin
on public.template_registry for select to anon, authenticated
using (
  published_version is not null
  or (select auth.uid()) = created_by
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy template_registry_update_admin on public.template_registry;
create policy template_registry_update_admin
on public.template_registry for update to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

drop policy template_versions_read_published_or_owner_or_admin on public.template_versions;
create policy template_versions_read_published_or_owner_or_admin
on public.template_versions for select to anon, authenticated
using (
  is_published
  or (select auth.uid()) = created_by
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy template_versions_update_admin on public.template_versions;
create policy template_versions_update_admin
on public.template_versions for update to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

drop policy template_reviews_read_owner_or_admin on public.template_reviews;
create policy template_reviews_read_owner_or_admin
on public.template_reviews for select to authenticated
using (
  exists (
    select 1 from public.template_registry r
    where r.id = template_reviews.template_id and r.created_by = (select auth.uid())
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy template_reviews_update_admin on public.template_reviews;
create policy template_reviews_update_admin
on public.template_reviews for update to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (
  ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  and status in ('approved', 'rejected')
  and reviewed_at is not null
  and reviewed_by = (select auth.uid())
);
