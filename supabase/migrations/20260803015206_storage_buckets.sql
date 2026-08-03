-- Supabase Storageバケット（見積書PDF・角印画像、spec §4.11・§8）
-- いずれも非公開バケット。ダウンロードは認証済みチームメンバーの署名付きURL経由のみ
-- （外部共有閲覧画面からのPDFダウンロードは提供しない、spec §4.11）。

insert into storage.buckets (id, name, public)
values
  ('estimate-pdfs', 'estimate-pdfs', false),
  ('stamps', 'stamps', false)
on conflict (id) do nothing;

create policy team_member_select_estimate_assets on storage.objects
  for select using (bucket_id in ('estimate-pdfs', 'stamps') and public.is_team_member());

create policy team_member_insert_estimate_assets on storage.objects
  for insert with check (bucket_id in ('estimate-pdfs', 'stamps') and public.is_team_member());

create policy team_member_update_estimate_assets on storage.objects
  for update using (bucket_id in ('estimate-pdfs', 'stamps') and public.is_team_member());

create policy team_member_delete_estimate_assets on storage.objects
  for delete using (bucket_id in ('estimate-pdfs', 'stamps') and public.is_team_member());
