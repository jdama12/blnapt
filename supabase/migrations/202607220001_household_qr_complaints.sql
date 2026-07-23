-- Private QR identifiers for all 734 households and complaint source tracking.
-- QR codes identify a household only; the resident password is still required.

create table public.household_qr_codes (
  household_id bigint primary key references public.households(id) on delete cascade,
  qr_code uuid not null unique default gen_random_uuid(),
  rotated_by uuid references public.admin_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  rotated_at timestamptz not null default now()
);

insert into public.household_qr_codes(household_id)
select id from public.households
on conflict (household_id) do nothing;

do $$
begin
  if (select count(*) from public.household_qr_codes) <> 734 then
    raise exception '세대 QR은 정확히 734개여야 합니다.';
  end if;
end;
$$;

alter table public.complaints
  add column source text not null default 'app'
  check (source in ('app', 'qr'));

create or replace function public.rotate_household_qr(target_household_id bigint)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  next_qr_code uuid;
begin
  if not public.is_admin() then
    raise exception '관리자만 QR 코드를 재발급할 수 있습니다.';
  end if;

  update public.household_qr_codes
  set qr_code = gen_random_uuid(),
      rotated_by = auth.uid(),
      rotated_at = now()
  where household_id = target_household_id
  returning qr_code into next_qr_code;

  if next_qr_code is null then
    raise exception '세대 QR 정보를 찾을 수 없습니다.';
  end if;

  return next_qr_code;
end;
$$;

alter table public.household_qr_codes enable row level security;

create policy "admin household qr read"
on public.household_qr_codes for select to authenticated
using (public.is_admin());

revoke all on public.household_qr_codes from anon, authenticated;
grant select on public.household_qr_codes to authenticated;
grant select, insert, update, delete on public.household_qr_codes to service_role;

revoke all on function public.rotate_household_qr(bigint) from public;
grant execute on function public.rotate_household_qr(bigint) to authenticated;

