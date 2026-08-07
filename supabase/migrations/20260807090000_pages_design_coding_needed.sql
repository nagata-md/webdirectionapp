-- ページ単位で「デザイン不要」「コーディング不要」を設定できるようにする（2026-08-07新規要件）。
-- wire_needed/copy_needed と同じ方針：trueが既定（=従来通り両工程あり）で、falseにした工程は
-- スケジュール自動生成（該当スケジュール工程自体を挿入しない）・見積もり（該当コストを計上しない）
-- の両方から除外する。テストアップ・公開には影響しない。
alter table public.pages
  add column design_needed boolean not null default true,
  add column coding_needed boolean not null default true;
