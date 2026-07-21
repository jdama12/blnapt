-- Optional notice image stored privately and served with short-lived signed URLs.

alter table public.notices
add column image_path text;

insert into storage.buckets(id, name, public)
values ('notice-images', 'notice-images', false)
on conflict (id) do nothing;

create policy "notice images read"
on storage.objects for select to authenticated
using (
  bucket_id = 'notice-images'
  and public.is_active_user()
);

create policy "admin notice images upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'notice-images'
  and public.is_admin()
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "admin notice images update"
on storage.objects for update to authenticated
using (bucket_id = 'notice-images' and public.is_admin())
with check (bucket_id = 'notice-images' and public.is_admin());

create policy "admin notice images delete"
on storage.objects for delete to authenticated
using (bucket_id = 'notice-images' and public.is_admin());

