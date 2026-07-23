-- Allow an unregistered household to submit a complaint through its private QR.
-- Guest complaints remain administrator-only until a resident account exists.

alter table public.complaints alter column author_id drop not null;

alter table public.resident_auth_attempts
  drop constraint resident_auth_attempts_attempt_type_check;
alter table public.resident_auth_attempts
  add constraint resident_auth_attempts_attempt_type_check
  check (attempt_type in ('register', 'login', 'qr-complaint'));

create or replace function public.set_complaint_household()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.author_id is null then
    if new.source <> 'qr' or new.household_id is null then
      raise exception '비회원 민원은 세대 QR을 통해서만 등록할 수 있습니다.';
    end if;

    if not exists(select 1 from public.households where id = new.household_id) then
      raise exception '등록되지 않은 세대입니다.';
    end if;
  else
    select household_id into new.household_id
    from public.profiles
    where id = new.author_id;

    if new.household_id is null then
      raise exception '세대가 확인되지 않는 회원입니다.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.track_complaint_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.complaint_history(complaint_id, status, note)
    values(
      new.id,
      new.status,
      case
        when public.is_admin() then '관리사무소 민원 등록'
        when new.author_id is null and new.source = 'qr' then 'QR 비회원 민원 등록'
        else '입주민 민원 등록'
      end
    );
  elsif new.status <> old.status then
    insert into public.complaint_history(complaint_id, status, note)
    values(new.id, new.status, '관리자가 처리 상태를 변경');
  end if;
  return new;
end;
$$;

