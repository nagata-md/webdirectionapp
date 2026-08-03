-- Phase 12: マスタ設定拡張（CMS構築費S/M/L・TOP専用レート表・スマホ対応メニュー単価）
alter table public.master
  add column cms_rates jsonb not null default '{}'::jsonb,       -- 複雑度(S/M/L) -> { days, cost }
  add column top_rates jsonb not null default '{}'::jsonb,       -- 複雑度 × コスト工程 -> { days, cost }（TOP専用、ratesとは別建て）
  add column mobile_menu_rate numeric not null default 0;        -- スマホ対応メニュー（メガメニュー）単価。複雑度区分なしの単一価格、工数設定はなし
