-- Phase 12: CMS構築をスケジュール工程に追加（構成→デザイン→コーディング→CMS構築→テストアップ→公開）
-- schedule_overrides.phase_keyのCHECK制約に'CMS構築'を追加する。
-- 制約は無名（インライン）で定義されているため、自動生成された名前に依存せず
-- pg_constraintから動的に探して付け替える。
do $$
declare
  existing_constraint text;
begin
  select con.conname into existing_constraint
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'schedule_overrides'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%phase_key%';

  if existing_constraint is not null then
    execute format('alter table public.schedule_overrides drop constraint %I', existing_constraint);
  end if;
end $$;

alter table public.schedule_overrides
  add constraint schedule_overrides_phase_key_check
  check (phase_key in ('構成', 'デザイン', 'コーディング', 'CMS構築', 'テストアップ', '公開'));
