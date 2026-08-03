-- Phase 12追加要望: 構成・デザイン・コーディング・テストアップの各工程について、
-- 「初稿提出→チェックバック1→2校作業→チェックバック2→バッファ→次工程」のうち
-- チェックバック1・チェックバック2をガント上で個別に手動編集できるようにする。
-- schedule_overrides.phase_keyのCHECK制約に、この8つの仮想セグメントキーを追加する。
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
  check (phase_key in (
    '構成', 'デザイン', 'コーディング', 'CMS構築', 'テストアップ', '公開',
    '構成チェックバック1', '構成チェックバック2',
    'デザインチェックバック1', 'デザインチェックバック2',
    'コーディングチェックバック1', 'コーディングチェックバック2',
    'テストアップチェックバック1', 'テストアップチェックバック2'
  ));
