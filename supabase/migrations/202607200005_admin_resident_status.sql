-- Allow an administrator to end an active resident's service without deleting
-- the authentication or historical records. A new resident still needs an
-- approved registration request before the household can become active again.

create or replace function public.deactivate_resident(target_resident_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  target_household_id bigint;
begin
  if not public.is_admin() then
    raise exception '관리자만 입주민 이용을 종료할 수 있습니다.';
  end if;

  select household_id into target_household_id
  from public.profiles
  where id = target_resident_id
    and role = 'resident'
    and approved = true
    and membership_status = 'active'
  for update;

  if target_household_id is null then
    raise exception '현재 가입완료 상태인 입주민이 아닙니다.';
  end if;

  perform 1
  from public.households
  where id = target_household_id
    and current_resident_id = target_resident_id
  for update;

  if not found then
    raise exception '세대의 현재 입주민 정보가 일치하지 않습니다.';
  end if;

  update public.households
  set current_resident_id = null
  where id = target_household_id;

  update public.profiles
  set approved = false,
      membership_status = 'rejected',
      replaced_at = now()
  where id = target_resident_id;

  update public.registration_requests
  set request_type = 'new',
      previous_resident_id = null
  where household_id = target_household_id
    and status = 'pending';

  return target_household_id;
end;
$$;

revoke all on function public.deactivate_resident(uuid) from public;
grant execute on function public.deactivate_resident(uuid) to authenticated;

