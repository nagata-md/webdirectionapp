-- 共有リンク一覧（spec §4.10）での発行者表示用に、発行者のメールアドレスを
-- 書き込み時点でスナップショット保持する（schedule_overrides.edited_by_emailと同じ方針）。
alter table public.share_links
  add column created_by_email text;
