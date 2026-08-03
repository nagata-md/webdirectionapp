-- 開発用シードデータ。`supabase db reset` 実行時に自動適用される。
-- masterはシングルトンのため、初期状態でも1件だけ用意しておく
-- （単価・工数・休日カレンダー等の中身はPhase 4のマスタ設定画面から入力する想定）。

insert into public.master (rates, standards, weekly_off, holidays, direction_monthly_rate, tax_rate, estimate_validity_days)
values ('{}'::jsonb, '{}'::jsonb, array[0,6], '[]'::jsonb, 0, 0.10, 30);
