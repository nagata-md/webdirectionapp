-- 制作進行オートメーター: 初期スキーマ（spec.md §6準拠）
-- チーム共有テーブルは marketingdept-llc.com ドメインの認証済みユーザーのみ読み書き可能（spec §2・§6）

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- 共通トリガー: updated_at 自動更新
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 認可ヘルパー: marketingdept-llc.com ドメインの認証済みユーザーか判定する
-- RLSは行単位の許可であり、これとは別にai_api_key列の露出防止は列単位の
-- GRANT/REVOKEで行う（本ファイル末尾）。
-- ---------------------------------------------------------------------------
create or replace function public.is_team_member()
returns boolean
language sql
stable
as $$
  select coalesce(auth.email(), '') ilike '%@marketingdept-llc.com';
$$;

-- ---------------------------------------------------------------------------
-- master（チーム共有・1件のみ）
-- ---------------------------------------------------------------------------
create table public.master (
  id                         uuid primary key default gen_random_uuid(),
  rates                      jsonb not null default '{}'::jsonb,
  standards                  jsonb not null default '{}'::jsonb,
  weekly_off                 int[] not null default array[0,6],
  holidays                   jsonb not null default '[]'::jsonb,
  direction_monthly_rate     numeric not null default 0,
  default_parallel_by_phase  jsonb not null default '{}'::jsonb,
  tax_rate                   numeric not null default 0.10,
  issuer_company_name        text,
  issuer_address             text,
  issuer_phone               text,
  issuer_stamp_image_url     text,
  estimate_validity_days     int not null default 30,
  ai_api_key                 text,
  ai_model                   text,
  updated_at                 timestamptz not null default now()
);

-- masterは1件のみ許可（定数式へのユニークインデックスによるシングルトン制約）
create unique index master_singleton on public.master ((true));

create trigger master_set_updated_at
  before update on public.master
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table public.projects (
  id                 uuid primary key default gen_random_uuid(),
  client_name        text,
  project_name       text not null,
  start_date         date,
  parallel_by_phase  jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- project_owners
-- ---------------------------------------------------------------------------
create table public.project_owners (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  role        text not null,
  name        text not null
);

create index project_owners_project_id_idx on public.project_owners(project_id);

-- ---------------------------------------------------------------------------
-- project_links（サーバー情報リンク・Figmaリンク共通、spec §4.1）
-- ---------------------------------------------------------------------------
create table public.project_links (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  category    text not null check (category in ('server', 'figma')),
  label       text not null,
  url         text not null,
  sort_order  int not null default 0
);

create index project_links_project_id_category_idx on public.project_links(project_id, category);

-- ---------------------------------------------------------------------------
-- progress_groups
-- ---------------------------------------------------------------------------
create table public.progress_groups (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  sort_order  int not null default 1
);

create index progress_groups_project_id_idx on public.progress_groups(project_id);

-- ---------------------------------------------------------------------------
-- pages
-- ---------------------------------------------------------------------------
create table public.pages (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  name         text not null,
  type         text not null check (type in ('top', 'lower', 'lp', 'blog', 'other')),
  complexity   text not null check (complexity in ('S', 'M', 'L')),
  parent_id    uuid references public.pages(id) on delete set null,
  wire_needed  boolean not null default true,
  copy_needed  boolean not null default true,
  extra_cost   numeric not null default 0,
  group_id     uuid references public.progress_groups(id) on delete set null,
  priority     int not null default 0,
  slug         text,
  title        text,
  description  text,
  keywords     text,
  due_date     date,
  status       text not null default '未着手'
    check (status in ('未着手', '構成中', 'デザイン中', 'コーディング中', 'テスト中', '公開済')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index pages_project_id_idx on public.pages(project_id);
create index pages_parent_id_idx on public.pages(parent_id);
create index pages_group_id_idx on public.pages(group_id);

create trigger pages_set_updated_at
  before update on public.pages
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- estimate_line_items（見積もりの手入力追加項目。素材費・値引き等、spec §4.7）
-- ---------------------------------------------------------------------------
create table public.estimate_line_items (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  label       text not null,
  amount      numeric not null default 0,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index estimate_line_items_project_id_idx on public.estimate_line_items(project_id);

create trigger estimate_line_items_set_updated_at
  before update on public.estimate_line_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- schedule_overrides（手動編集の記録、spec §4.6）
-- ---------------------------------------------------------------------------
create table public.schedule_overrides (
  id                 uuid primary key default gen_random_uuid(),
  page_id            uuid not null references public.pages(id) on delete cascade,
  phase_key          text not null
    check (phase_key in ('構成', 'デザイン', 'コーディング', 'テストアップ', '公開')),
  override_start     date not null,
  override_end       date not null,
  cascade_following  boolean not null default false,
  edited_by          uuid references auth.users(id) on delete set null,
  edited_at          timestamptz not null default now()
);

create index schedule_overrides_page_id_phase_key_idx on public.schedule_overrides(page_id, phase_key);

-- ---------------------------------------------------------------------------
-- ai_meta_generation_logs（AI一括生成の記録、spec §4.9）
-- ---------------------------------------------------------------------------
create table public.ai_meta_generation_logs (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  instruction    text not null,
  scope          text not null check (scope in ('empty_only', 'all')),
  page_count     int not null default 0,
  generated_by   uuid references auth.users(id) on delete set null,
  generated_at   timestamptz not null default now()
);

create index ai_meta_generation_logs_project_id_idx on public.ai_meta_generation_logs(project_id);

-- ---------------------------------------------------------------------------
-- estimate_versions（見積書バージョン管理・PDF発行、spec §4.11）
-- ---------------------------------------------------------------------------
create table public.estimate_versions (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  quote_number    text not null unique,
  version_number  int not null,
  issued_at       timestamptz not null default now(),
  valid_until     date not null,
  estimate_data   jsonb not null,
  pdf_url         text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index estimate_versions_project_id_idx on public.estimate_versions(project_id);

-- ---------------------------------------------------------------------------
-- share_links（外部共有、spec §4.10）
-- ---------------------------------------------------------------------------
create table public.share_links (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid not null references public.projects(id) on delete cascade,
  token                 text not null unique,
  mode                  text not null check (mode in ('live', 'estimateVersion')),
  estimate_version_id   uuid references public.estimate_versions(id) on delete set null,
  include_sections      jsonb not null default '{}'::jsonb,
  password_hash         text,
  expires_at            timestamptz,
  revoked               boolean not null default false,
  created_by            uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  view_count            int not null default 0,
  last_viewed_at        timestamptz
);

create index share_links_project_id_idx on public.share_links(project_id);

-- =============================================================================
-- RLS: チーム共有テーブルは marketingdept-llc.com ドメインの認証済みユーザーのみ
-- 読み書き可能（権限分離なし、spec §2・§6）。共有閲覧（share_view）はService Role
-- 経由のサーバー処理に閉じるため、anon向けのRLSポリシーは一切用意しない。
-- =============================================================================
alter table public.master enable row level security;
alter table public.projects enable row level security;
alter table public.project_owners enable row level security;
alter table public.project_links enable row level security;
alter table public.progress_groups enable row level security;
alter table public.pages enable row level security;
alter table public.estimate_line_items enable row level security;
alter table public.schedule_overrides enable row level security;
alter table public.ai_meta_generation_logs enable row level security;
alter table public.estimate_versions enable row level security;
alter table public.share_links enable row level security;

create policy team_member_all on public.master
  for all using (public.is_team_member()) with check (public.is_team_member());
create policy team_member_all on public.projects
  for all using (public.is_team_member()) with check (public.is_team_member());
create policy team_member_all on public.project_owners
  for all using (public.is_team_member()) with check (public.is_team_member());
create policy team_member_all on public.project_links
  for all using (public.is_team_member()) with check (public.is_team_member());
create policy team_member_all on public.progress_groups
  for all using (public.is_team_member()) with check (public.is_team_member());
create policy team_member_all on public.pages
  for all using (public.is_team_member()) with check (public.is_team_member());
create policy team_member_all on public.estimate_line_items
  for all using (public.is_team_member()) with check (public.is_team_member());
create policy team_member_all on public.schedule_overrides
  for all using (public.is_team_member()) with check (public.is_team_member());
create policy team_member_all on public.ai_meta_generation_logs
  for all using (public.is_team_member()) with check (public.is_team_member());
create policy team_member_all on public.estimate_versions
  for all using (public.is_team_member()) with check (public.is_team_member());
create policy team_member_all on public.share_links
  for all using (public.is_team_member()) with check (public.is_team_member());

-- =============================================================================
-- テーブル権限: authenticatedロールに対しテーブル単位のCRUDを許可する
-- （RLSに加えて必要。Postgresは「テーブル権限」と「RLS」の両方を満たさないと
-- アクセスできない）。anonロールには一切付与しない。
-- =============================================================================
grant usage on schema public to authenticated;

grant select, insert, update, delete on public.master to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.project_owners to authenticated;
grant select, insert, update, delete on public.project_links to authenticated;
grant select, insert, update, delete on public.progress_groups to authenticated;
grant select, insert, update, delete on public.pages to authenticated;
grant select, insert, update, delete on public.estimate_line_items to authenticated;
grant select, insert, update, delete on public.schedule_overrides to authenticated;
grant select, insert, update, delete on public.ai_meta_generation_logs to authenticated;
grant select, insert, update, delete on public.estimate_versions to authenticated;
grant select, insert, update, delete on public.share_links to authenticated;

-- =============================================================================
-- 列単位の秘匿（重要・spec §6・§8）: RLSは行単位の許可であり列単位の秘匿を
-- 保証しないため、master.ai_api_key はDBレベルでもauthenticatedからの
-- SELECTを明示的に禁止する。これにより、アプリ側で誤って select('*') を
-- 書いてしまってもDBが拒否する（多層防御）。設定・更新（INSERT/UPDATE）は
-- 可能なままにする。
-- =============================================================================
revoke select (ai_api_key) on public.master from authenticated;

-- service_roleはRLSをバイパスするが、列権限は明示的に確保しておく
-- （Claude API呼び出し時の復号はサーバーサイドのService Roleクライアントのみで行う、spec §4.9）
grant select (ai_api_key) on public.master to service_role;
