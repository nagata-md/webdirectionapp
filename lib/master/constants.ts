// マスタ設定関連の定数・型（spec §4.4・§6）。
// DB側のCHECK制約（schedule_overrides.phase_key等）と同じ日本語ラベルを
// jsonbのキーとしてもそのまま使い、変換テーブルを持たない。

export const COMPLEXITIES = ["S", "M", "L"] as const;
export type Complexity = (typeof COMPLEXITIES)[number];

// コスト工程（単価が発生する6種、spec §3）
export const COST_PHASES = [
  "ワイヤー",
  "コピー",
  "デザイン",
  "コーディング",
  "テストアップ",
  "公開",
] as const;
export type CostPhase = (typeof COST_PHASES)[number];

// スケジュール工程（ガントチャート上の期間単位、Phase 12でCMS構築を追加した6種）。
// 順序がそのままシーケンス上の並び（構成→デザイン→コーディング→CMS構築→テストアップ→公開）。
// CMS構築はcms_tierが設定されているページにのみ適用される（lib/schedule/computeSchedule.ts）。
export const SCHEDULE_PHASES = [
  "構成",
  "デザイン",
  "コーディング",
  "CMS構築",
  "テストアップ",
  "公開",
] as const;
export type SchedulePhase = (typeof SCHEDULE_PHASES)[number];

// ガントチャート表示用のラベル（2026-08-03改訂）。ページ単位の「公開」工程は、
// 実際にはサイト全体が同時公開されるまでの「作業完了」を意味するため表示名を変える。
// 内部キー（DB・standards・parallelByPhase等のjsonbキー）は従来通り"公開"のまま変更しない。
export function schedulePhaseLabel(phase: SchedulePhase): string {
  return phase === "公開" ? "作業完了" : phase;
}

// weekly_off (int[]) の曜日番号。JSのDate#getDay()と同じ並び（0=日曜）
export const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export type RateEntry = { days: number; cost: number };
export type Rates = Record<Complexity, Record<CostPhase, RateEntry>>;

// TOPページ専用の単価・工数テーブル（Phase 12、通常のratesとは別建て。形状は同じ）
export type TopRates = Rates;

// CMS構築費（Phase 12）。複雑度ごとに金額・日数のみ（コスト工程の軸はない）
export type CmsRates = Record<Complexity, RateEntry>;

// 2校期間（2026-08-03新規要件）：初稿提出→チェックバック→2校作業→2校チェックバック→バッファ→次工程。
// 構成・デザイン・コーディング・テストアップの4工程にのみ適用する（CMS構築・公開には適用しない、
// lib/schedule/computeSchedule.tsのSECOND_DRAFT_PHASESを参照）。
export type StandardEntry = {
  checkback: number;
  buffer: number;
  secondDraftDays: number;
  secondCheckbackDays: number;
};
export type Standards = Record<SchedulePhase, StandardEntry>;

// 2校期間を適用するスケジュール工程（構成・デザイン・コーディング・テストアップのみ）
export const SECOND_DRAFT_PHASES: readonly SchedulePhase[] = ["構成", "デザイン", "コーディング", "テストアップ"];

export type ParallelByPhase = Record<SchedulePhase, number>;

export type Holiday = { date: string; label: string };

export function emptyRateEntry(): RateEntry {
  return { days: 0, cost: 0 };
}

export function emptyStandardEntry(): StandardEntry {
  return { checkback: 0, buffer: 0, secondDraftDays: 0, secondCheckbackDays: 0 };
}
