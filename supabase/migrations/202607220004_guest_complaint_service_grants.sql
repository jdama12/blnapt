-- The public QR Edge Function uses the service role to create complaints for
-- households that do not yet have an authenticated resident account.
-- RLS bypass alone does not provide the underlying table privileges.

grant select, insert on table public.complaints to service_role;
grant usage, select on sequence public.complaints_id_seq to service_role;
