-- Administrators are management-office identities, not apartment residents.
-- Keep a shadow profiles row for existing author/comment foreign keys, while
-- making admin_accounts the source of truth for administrator authentication.

create table public.admin_accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.admin_accounts(id, email, name, phone, active, created_at)
select id, email, name, nullif(phone, ''), approved and membership_status = 'active', created_at
from public.profiles
where role = 'admin'
on conflict (id) do update
set email = excluded.email,
    name = excluded.name,
    phone = excluded.phone,
    active = excluded.active;

-- An administrator must not occupy one of the 734 resident households.
update public.households h
set current_resident_id = null
from public.profiles p
where p.id = h.current_resident_id
  and p.role = 'admin';

alter table public.profiles alter column household_id drop not null;

update public.profiles
set household_id = null,
    building = '관리',
    unit = '사무소',
    phone_last4 = '0000',
    approved = true,
    membership_status = 'active'
where role = 'admin';

create or replace function public.touch_admin_account()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_admin_account
before update on public.admin_accounts
for each row execute function public.touch_admin_account();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.admin_accounts
    where id = auth.uid() and active = true
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists(
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'resident'
      and approved = true
      and membership_status = 'active'
  );
$$;

create or replace function public.bootstrap_first_admin(
  target_building integer,
  target_unit integer,
  target_phone_last4 text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_request public.registration_requests%rowtype;
  target_profile public.profiles%rowtype;
begin
  if session_user <> 'postgres' then
    raise exception 'SQL Editor의 postgres 역할에서만 실행할 수 있습니다.';
  end if;

  if exists(select 1 from public.admin_accounts where active = true) then
    raise exception '이미 활성 관리자가 존재합니다.';
  end if;

  select r.* into target_request
  from public.registration_requests r
  join public.households h on h.id = r.household_id
  where h.building = target_building
    and h.unit = target_unit
    and r.phone_last4 = target_phone_last4
    and r.status = 'pending'
  order by r.created_at desc
  limit 1
  for update of r;

  if not found then
    raise exception '일치하는 가입 요청이 없습니다.';
  end if;

  select * into target_profile
  from public.profiles
  where id = target_request.applicant_id
  for update;

  insert into public.admin_accounts(id, email, name, phone, active)
  values (
    target_profile.id,
    target_profile.email,
    '관리자',
    nullif(target_profile.phone, ''),
    true
  );

  update public.profiles
  set role = 'admin',
      approved = true,
      membership_status = 'active',
      household_id = null,
      building = '관리',
      unit = '사무소',
      phone_last4 = '0000',
      replaced_at = null
  where id = target_request.applicant_id;

  update public.registration_requests
  set status = 'approved', reviewed_at = now()
  where id = target_request.id;

  return target_request.applicant_id;
end;
$$;

create or replace view public.profile_directory as
  select id, name, building, unit, role, approved, created_at
  from public.profiles
  where role = 'resident'
    and approved = true
    and membership_status = 'active';

alter table public.admin_accounts enable row level security;

create policy "admin accounts read"
on public.admin_accounts for select to authenticated
using (id = auth.uid() or public.is_admin());

create policy "admin accounts update"
on public.admin_accounts for update to authenticated
using (public.is_admin()) with check (public.is_admin());

revoke all on public.admin_accounts from anon;
grant select, update on public.admin_accounts to authenticated;
grant select, insert, update, delete on public.admin_accounts to service_role;

revoke all on function public.bootstrap_first_admin(integer, integer, text) from public;
