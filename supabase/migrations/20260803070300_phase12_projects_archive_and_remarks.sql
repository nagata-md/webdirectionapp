-- Phase 12: プロジェクト完了（アーカイブ）機能・見積もり備考欄
alter table public.projects
  add column archived_at timestamptz null,   -- nullなら通常表示、値ありなら一覧から非表示（トグルで再表示可）
  add column estimate_remarks text null;      -- 見積もりの自由記述備考欄。PDF発行時にestimate_versionsへ凍結
