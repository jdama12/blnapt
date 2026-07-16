-- Keep privilege fields protected from application users while allowing
-- trusted database administration through the Supabase SQL Editor.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if session_user <> 'postgres'
     and not public.is_admin()
     and (
       new.role <> old.role
       or new.approved <> old.approved
       or new.id <> old.id
     ) then
    raise exception '권한 필드는 변경할 수 없습니다.';
  end if;

  return new;
end;
$$;

