-- Progress photos storage bucket (private; signed URLs at read time)

insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

create policy "progress_photos_select_own"
on storage.objects for select
using (
  bucket_id = 'progress-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "progress_photos_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'progress-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "progress_photos_update_own"
on storage.objects for update
using (
  bucket_id = 'progress-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "progress_photos_delete_own"
on storage.objects for delete
using (
  bucket_id = 'progress-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);
