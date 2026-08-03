-- Phase 12: ページの「個別費用（自由入力）」をCMS構築費ドロップダウンに置き換え、
-- TOPページ向けにスマホ対応メニュー（メガメニュー）要否フラグを追加する。
alter table public.pages
  drop column extra_cost;

alter table public.pages
  add column cms_tier text null check (cms_tier in ('S', 'M', 'L')),
  add column mobile_menu_needed boolean not null default false;
