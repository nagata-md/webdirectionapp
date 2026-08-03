-- Phase 12: 運用者専用メモ機能（ログイン中のチームメンバーのみ閲覧可能。外部共有には一切含めない）
create table public.project_memos (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  author_email  text not null,   -- 保存時のログインユーザーのメールアドレスを自動記録
  content       text not null,
  created_at    timestamptz not null default now()
);

create index project_memos_project_id_idx on public.project_memos(project_id);

alter table public.project_memos enable row level security;

create policy team_member_all on public.project_memos
  for all using (public.is_team_member()) with check (public.is_team_member());

grant usage on schema public to authenticated;
-- ログ形式（追記・削除のみ）とするため、updateは付与しない
grant select, insert, delete on public.project_memos to authenticated;
