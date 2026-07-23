-- Supabase Auth owns the administrator login email. Keep the public
-- administrator directory synchronized only after Auth accepts the change.

create or replace function public.sync_admin_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email and new.email is not null then
    update public.admin_accounts
    set email = new.email
    where id = new.id;
  end if;

  return new;
end;
$$;

create trigger sync_admin_email_from_auth
after update of email on auth.users
for each row execute function public.sync_admin_email_from_auth();

-- Clients may edit administrator contact fields, but the login email can only
-- be changed through Supabase Auth and the synchronization trigger above.
revoke update on table public.admin_accounts from authenticated;
grant update(name, phone) on table public.admin_accounts to authenticated;

revoke all on function public.sync_admin_email_from_auth() from public;

