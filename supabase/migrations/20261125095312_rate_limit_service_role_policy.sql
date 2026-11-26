-- The limiter is only used by the trusted Edge Function service role.
create policy public_form_rate_limits_service_role
on private.public_form_rate_limits
for all to service_role
using (true)
with check (true);
