-- 変更履歴画面（spec §4.6）での表示用に、編集者のメールアドレスを直接保持する。
-- auth.usersはSupabaseクライアントから直接JOINできないため、書き込み時点のメールを
-- スナップショットとして保持する方式にする（最低限のログのため、退職・改名等の追跡は行わない）。
alter table public.schedule_overrides
  add column edited_by_email text;
