create policy "chat read" on storage.objects for select to authenticated
  using (bucket_id = 'chat');
create policy "chat upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat');