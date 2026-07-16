-- RLS policies decide which rows an authenticated user may access.
-- These grants provide the underlying table/sequence privileges required by PostgREST.

grant usage on schema public to authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert, update on table public.complaints to authenticated;
grant select, insert on table public.complaint_comments to authenticated;
grant select on table public.complaint_history to authenticated;
grant select, insert, update, delete on table public.notices to authenticated;
grant select, insert, update, delete on table public.monthly_records to authenticated;
grant select, insert, update, delete on table public.monthly_items to authenticated;

grant usage, select on all sequences in schema public to authenticated;

