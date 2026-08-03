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

// weekly_off (int[]) の曜日番号。JSのDate#getDay()と同じ並び（0=日曜）
export const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export type RateEntry = { days: number; cost: number };
export type Rates = Record<Complexity, Record<CostPhase, RateEntry>>;

// TOPページ専用の単価・工数テーブル（Phase 12、通常のratesとは別建て。形状は同じ）
export type TopRates = Rates;

// CMS構築費（Phase 12）。複雑度ごとに金額・日数のみ（コスト工程の軸はない）
export type CmsRates = Record<Complexity, RateEntry>;

export type StandardEntry = { checkback: number; buffer: number };
export type Standards = Record<SchedulePhase, StandardEntry>;

export type ParallelByPhase = Record<SchedulePhase, number>;

export type Holiday = { date: string; label: string };

export function emptyRateEntry(): RateEntry {
  return { days: 0, cost: 0 };
}

export function emptyStandardEntry(): StandardEntry {
  return { checkback: 0, buffer: 0 };
}
