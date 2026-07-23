-- A valid household QR may read resident-facing notices without creating an
-- authenticated session. The Edge Function still validates the private QR.

grant select on table public.notices to service_role;
