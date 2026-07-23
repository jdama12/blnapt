-- When an unregistered household later becomes an approved resident, attach
-- its previously submitted QR complaints to that resident account so the
-- resident can see the existing status and continue the conversation.

create or replace function public.claim_household_guest_complaints()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'resident'
     and new.approved = true
     and new.membership_status = 'active'
     and new.household_id is not null
     and (
       old.approved is distinct from new.approved
       or old.membership_status is distinct from new.membership_status
     ) then
    update public.complaints
    set author_id = new.id
    where household_id = new.household_id
      and author_id is null
      and source = 'qr';
  end if;

  return new;
end;
$$;

create trigger claim_household_guest_complaints
after update of approved, membership_status on public.profiles
for each row execute function public.claim_household_guest_complaints();

revoke all on function public.claim_household_guest_complaints() from public;

