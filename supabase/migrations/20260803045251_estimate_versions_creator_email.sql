-- 見積もりバージョン一覧（spec §4.11）での発行者表示用に、発行者のメールアドレスを
-- 書き込み時点でスナップショット保持する（auth.usersを通常のクライアントから直接JOINできないため、
-- schedule_overrides.edited_by_emailと同じ方針）。
alter table public.estimate_versions
  add column created_by_email text;
